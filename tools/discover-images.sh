#!/usr/bin/env bash
# Discover cards (home carousel) photo pipeline.
#
# Drop a licensed photo (Pexels / Pixabay, commercial use, no identifiable
# people implying endorsement, no readable third-party brands) in
# tools/discover-src/<card_key>.jpg|jpeg|png, then run this script from
# frontend/. It writes src/assets/discover/<card_key>-1200.webp and -800.webp,
# cropped to 16:10 around the centre (pass a gravity as 2nd arg per file via
# the GRAVITY_<key> env var, e.g. GRAVITY_brvm_performance=south).
# Always DOWNscales (never upscales): the source must be at least 1200 px wide.
# Record the source page + author in src/assets/discover/PROVENANCE.md.
set -euo pipefail
cd "$(dirname "$0")/.."
command -v magick >/dev/null || { echo "ImageMagick (magick) is required: brew install imagemagick"; exit 1; }
shopt -s nullglob
for src in tools/discover-src/*.{jpg,jpeg,png,JPG,JPEG,PNG}; do
  key="$(basename "${src%.*}")"
  width="$(magick identify -format '%w' "$src")"
  if [ "$width" -lt 1200 ]; then echo "skip $key: source is ${width}px wide, need 1200+ (never upscale)"; continue; fi
  gvar="GRAVITY_${key}"; gravity="${!gvar:-center}"
  for w in 1200 800; do
    h=$(( w * 10 / 16 ))
    magick "$src" -auto-orient -strip -resize "${w}x${h}^" -gravity "$gravity" -extent "${w}x${h}" \
      -quality ${QUALITY:-70} -define webp:method=6 "src/assets/discover/${key}-${w}.webp"
  done
  echo "ok $key: $(magick identify -format '%wx%h %b' "src/assets/discover/${key}-1200.webp") / $(magick identify -format '%b' "src/assets/discover/${key}-800.webp")"
done
