#!/usr/bin/env node
/**
 * Serve the production build the way Netlify does, so the PWA can actually be
 * tested locally (P0-2).
 *
 * This exists because `http-server dist/…` does NOT reproduce production: it
 * 404s every application route, since those have no file on disk. Netlify
 * falls them back to the client-side-render shell (`public/_redirects`:
 * `/* /index.csr.html 200`). That gap is a large part of why the broken offline
 * shell went unnoticed for so long: nobody could load an app route from the
 * built output in the first place.
 *
 * The rules below mirror `public/_redirects` exactly. Keep them in sync.
 *
 *   1. an existing file wins (hashed bundles, ngsw.json, icons, /index.html)
 *   2. a directory with an index.html wins (the 83 prerendered routes)
 *   3. the two indexed privacy URLs 301 to /confidentialite/
 *   4. everything else is the CSR shell, with a 200 (never a 302: the service
 *      worker's navigation fallback and the router both need the real status)
 *
 * Usage: npm run serve:pwa   (add PORT=… to move it off 8080)
 */
import { createServer } from 'node:http';
import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import { extname, join, normalize, resolve } from 'node:path';

const ROOT = resolve(process.argv[2] || 'dist/omaad-wealth/browser');
const PORT = Number(process.env.PORT || 8080);
const SHELL = '/index.csr.html';

/** Mirrors the 301s at the top of public/_redirects. */
const REDIRECTS = new Map([
    ['/fr/legal/privacy', '/confidentialite/'],
    ['/en/legal/privacy', '/confidentialite/'],
]);

const TYPES = {
    '.html': 'text/html; charset=utf-8',
    '.js': 'text/javascript; charset=utf-8',
    '.mjs': 'text/javascript; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.webmanifest': 'application/manifest+json; charset=utf-8',
    '.svg': 'image/svg+xml',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.webp': 'image/webp',
    '.avif': 'image/avif',
    '.gif': 'image/gif',
    '.ico': 'image/x-icon',
    '.woff': 'font/woff',
    '.woff2': 'font/woff2',
    '.ttf': 'font/ttf',
    '.otf': 'font/otf',
    '.txt': 'text/plain; charset=utf-8',
    '.xml': 'application/xml; charset=utf-8',
    '.pdf': 'application/pdf',
};

/** Resolve a URL path to a readable file inside ROOT, or null. Also the path
 *  traversal guard: anything resolving outside ROOT is refused. */
async function resolveFile(urlPath) {
    const candidate = resolve(join(ROOT, normalize(decodeURIComponent(urlPath))));
    if (candidate !== ROOT && !candidate.startsWith(ROOT + '/')) return null;
    try {
        const st = await stat(candidate);
        if (st.isFile()) return candidate;
        if (st.isDirectory()) {
            const index = join(candidate, 'index.html');
            const ist = await stat(index).catch(() => null);
            if (ist?.isFile()) return index;
        }
    } catch {
        /* not on disk */
    }
    return null;
}

function send(res, status, file) {
    res.writeHead(status, {
        'Content-Type': TYPES[extname(file)] || 'application/octet-stream',
        // No caching, so an edit + rebuild is visible on reload and the service
        // worker's own update cycle is what gets exercised, not the HTTP cache.
        'Cache-Control': 'no-store',
        // ngsw-worker.js must be allowed to control the whole origin.
        'Service-Worker-Allowed': '/',
    });
    createReadStream(file).pipe(res);
}

const server = createServer(async (req, res) => {
    const { pathname } = new URL(req.url, 'http://localhost');

    const to = REDIRECTS.get(pathname.replace(/\/$/, ''));
    if (to) {
        res.writeHead(301, { Location: to });
        res.end();
        return;
    }

    const file = await resolveFile(pathname);
    if (file) {
        send(res, 200, file);
        return;
    }

    // The catch-all: an app route, served as the CSR shell with a 200.
    const shell = await resolveFile(SHELL);
    if (!shell) {
        res.writeHead(500, { 'Content-Type': 'text/plain' });
        res.end(`${SHELL} is missing from ${ROOT}. Run: npm run build`);
        return;
    }
    send(res, 200, shell);
});

server.listen(PORT, () => {
    console.log(`serve-pwa: ${ROOT}`);
    console.log(`serve-pwa: http://localhost:${PORT} (SPA fallback -> ${SHELL})`);
});
