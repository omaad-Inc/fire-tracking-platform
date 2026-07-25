#!/usr/bin/env python3
"""Scrape le calendrier officiel des paiements de dividendes BRVM.

Source : https://www.brvm.org/fr/esv/paiement-de-dividendes (tableau paginé,
dates machine-readable en xsd:dateTime). Lancé par la GitHub Action
`.github/workflows/brvm-data.yml` (cron quotidien) et exécutable à la main :

    python3 tools/brvm/scrape_detachements.py

Produit :
  1. src/app/pages/tools/strategie-brvm/data/detachements.json — consommé par
     l'outil public (fenêtre glissante ~15 mois + entrées non datées récentes).
     `updated_at` ne bouge QUE si les données changent, pour que la GitHub
     Action ne committe pas des diffs vides.
  2. data/brvm/detachements_history.parquet — historique complet dédupliqué
     (via DuckDB si disponible, sinon étape sautée avec un avertissement).

Règles : 1 requête/seconde max (courtoisie), échec bruyant (exit 1) si le
format de la page source change (aucune ligne parsée).
"""
from __future__ import annotations

import html as html_lib
import json
import re
import ssl
import sys
import time
import urllib.request
from pathlib import Path

BASE_URL = "https://www.brvm.org/fr/esv/paiement-de-dividendes"
REPO_ROOT = Path(__file__).resolve().parents[2]
SITE_JSON = REPO_ROOT / "src/app/pages/tools/strategie-brvm/data/detachements.json"
HISTORY_PARQUET = REPO_ROOT / "data/brvm/detachements_history.parquet"
EMETTEURS_JSON = Path(__file__).resolve().parent / "emetteurs.json"

MAX_PAGES = 60
REQUEST_DELAY_S = 1.0
# Fenêtre servie au site : ex-dates depuis ~15 mois (saison N-1 complète pour
# comparaison) ; le parquet garde tout.
SITE_WINDOW_DAYS = 460

# brvm.org sert une chaîne de certificats incomplète (constaté aussi par la
# Netlify Function historique) : on désactive la vérification pour CE domaine
# uniquement. Aucune donnée sensible ne transite (lecture publique).
SSL_CTX = ssl.create_default_context()
SSL_CTX.check_hostname = False
SSL_CTX.verify_mode = ssl.CERT_NONE

ROW_RE = re.compile(r"<tr[^>]*>(.*?)</tr>", re.S)
TD_RE = re.compile(r"<td[^>]*>(.*?)</td>", re.S)
TABLE_RE = re.compile(r"<table[^>]*>(.*?)</table>", re.S)
ISO_DATE_RE = re.compile(r'content="(\d{4}-\d{2}-\d{2})T')
PDF_RE = re.compile(r'href="([^"]+\.pdf)"')
TAG_RE = re.compile(r"<[^>]+>")


def fetch(url: str) -> str:
    req = urllib.request.Request(url, headers={
        "User-Agent": "Mozilla/5.0 (compatible; OmaadTools/1.0; +https://omaad.africa)",
        "Accept": "text/html",
    })
    with urllib.request.urlopen(req, timeout=30, context=SSL_CTX) as resp:
        return resp.read().decode("utf-8", errors="replace")


def text_of(cell: str) -> str:
    return re.sub(r"\s+", " ", html_lib.unescape(TAG_RE.sub(" ", cell))).strip()


def parse_amount(cell: str) -> float | None:
    # "570 FCFA", "594,528 FCFA", "1 315 FCFA"
    raw = text_of(cell).replace("FCFA", "").replace(" ", " ").replace("\xa0", " ")
    raw = raw.replace(" ", "").replace(",", ".").strip()
    if not raw:
        return None
    try:
        return float(raw)
    except ValueError:
        return None


def iso_date(cell: str) -> str | None:
    m = ISO_DATE_RE.search(cell)
    return m.group(1) if m else None


def parse_page(html: str) -> list[dict]:
    rows_out: list[dict] = []
    for table in TABLE_RE.findall(html):
        if "ex-dividende" not in table:
            continue
        for row in ROW_RE.findall(table):
            tds = TD_RE.findall(row)
            if len(tds) < 8:
                continue
            emetteur = text_of(tds[0])
            if not emetteur:
                continue
            exercice_iso = iso_date(tds[3])
            pdf = PDF_RE.search(tds[7])
            rows_out.append({
                "emetteur": emetteur,
                "exercice": int(exercice_iso[:4]) if exercice_iso else None,
                "date_paiement": iso_date(tds[4]),
                "date_ex_dividende": iso_date(tds[5]),
                "montant_net_fcfa": parse_amount(tds[6]),
                "avis_url": pdf.group(1) if pdf else None,
            })
    return rows_out


def scrape_all() -> list[dict]:
    all_rows: list[dict] = []
    for page in range(MAX_PAGES):
        url = BASE_URL if page == 0 else f"{BASE_URL}?page={page}"
        html = fetch(url)
        rows = parse_page(html)
        if not rows:
            if page == 0:
                print("ERREUR : aucune ligne parsée sur la première page, "
                      "le format de brvm.org a probablement changé.", file=sys.stderr)
                sys.exit(1)
            break
        all_rows.extend(rows)
        time.sleep(REQUEST_DELAY_S)
    # Déduplication (une même ligne peut apparaître pendant une rotation de page)
    seen: set[tuple] = set()
    unique: list[dict] = []
    for r in all_rows:
        key = (r["emetteur"], r["exercice"], r["date_ex_dividende"], r["montant_net_fcfa"])
        if key in seen:
            continue
        seen.add(key)
        unique.append(r)
    return unique


def enrich(rows: list[dict]) -> tuple[list[dict], list[str]]:
    mapping: dict = json.loads(EMETTEURS_JSON.read_text(encoding="utf-8")) if EMETTEURS_JSON.exists() else {}
    unmapped: set[str] = set()
    for r in rows:
        info = mapping.get(r["emetteur"])
        if info:
            r["ticker"] = info.get("ticker")
            r["nom"] = info.get("nom", r["emetteur"])
            r["secteur"] = info.get("secteur")
        else:
            r["ticker"] = None
            r["nom"] = r["emetteur"]
            r["secteur"] = None
            unmapped.add(r["emetteur"])
    return rows, sorted(unmapped)


def sort_key(r: dict) -> tuple:
    return (r["date_ex_dividende"] or "9999-99-99", r["emetteur"])


def write_site_json(rows: list[dict], today_iso: str) -> bool:
    """Écrit le JSON du site. Retourne True si les données ont changé."""
    import datetime as dt
    today = dt.date.fromisoformat(today_iso)
    floor = (today - dt.timedelta(days=SITE_WINDOW_DAYS)).isoformat()
    recent = [r for r in rows
              if (r["date_ex_dividende"] or r["date_paiement"] or "9999") >= floor
              or (r["date_ex_dividende"] is None and (r["exercice"] or 0) >= today.year - 1)]
    recent.sort(key=sort_key, reverse=True)

    old = json.loads(SITE_JSON.read_text(encoding="utf-8")) if SITE_JSON.exists() else {}
    payload = {
        "source": BASE_URL,
        "updated_at": old.get("updated_at", today_iso),
        "entries": recent,
    }
    if old.get("entries") != recent:
        payload["updated_at"] = today_iso
    changed = old != payload
    if changed:
        SITE_JSON.parent.mkdir(parents=True, exist_ok=True)
        SITE_JSON.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    return changed


def write_history(rows: list[dict]) -> None:
    try:
        import duckdb
    except ImportError:
        print("AVERTISSEMENT : duckdb indisponible, historisation parquet sautée.", file=sys.stderr)
        return
    HISTORY_PARQUET.parent.mkdir(parents=True, exist_ok=True)
    con = duckdb.connect()
    con.execute("""
        CREATE TABLE scraped(
            emetteur VARCHAR, ticker VARCHAR, nom VARCHAR, secteur VARCHAR,
            exercice INTEGER, date_paiement DATE, date_ex_dividende DATE,
            montant_net_fcfa DOUBLE, avis_url VARCHAR)
    """)
    con.executemany(
        "INSERT INTO scraped VALUES (?,?,?,?,?,?,?,?,?)",
        [(r["emetteur"], r["ticker"], r["nom"], r["secteur"], r["exercice"],
          r["date_paiement"], r["date_ex_dividende"], r["montant_net_fcfa"], r["avis_url"])
         for r in rows],
    )
    if HISTORY_PARQUET.exists():
        con.execute(f"CREATE TABLE hist AS SELECT * FROM read_parquet('{HISTORY_PARQUET}')")
        con.execute("INSERT INTO hist SELECT * FROM scraped")
    else:
        con.execute("CREATE TABLE hist AS SELECT * FROM scraped")
    con.execute(f"""
        COPY (
            SELECT DISTINCT ON (emetteur, exercice, date_ex_dividende, montant_net_fcfa) *
            FROM hist
            ORDER BY emetteur, exercice, date_ex_dividende, montant_net_fcfa, date_paiement
        ) TO '{HISTORY_PARQUET}' (FORMAT PARQUET)
    """)


def main() -> None:
    import datetime as dt
    today_iso = dt.date.today().isoformat()
    rows = scrape_all()
    rows, unmapped = enrich(rows)
    print(f"{len(rows)} lignes scrapées.")
    if unmapped:
        print(f"AVERTISSEMENT : {len(unmapped)} émetteur(s) sans correspondance ticker "
              f"(tools/brvm/emetteurs.json) : {', '.join(unmapped)}", file=sys.stderr)
    changed = write_site_json(rows, today_iso)
    print("detachements.json :", "mis à jour" if changed else "inchangé")
    write_history(rows)


if __name__ == "__main__":
    main()
