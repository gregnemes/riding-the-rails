#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
OUTDIR="$ROOT/static/images/mirrored"
LIMIT="${1:-12}"
mkdir -p "$OUTDIR"
TMPDIR="$(mktemp -d)"
URLS_ALL="$TMPDIR/all_urls.txt"
URLMAP="$TMPDIR/url_map.tsv"
FAILS="$TMPDIR/download_fail.txt"
: > "$FAILS"

# 1) Collect remote URLs from HTML (img src, data-resize-src) and inline url()
find "$ROOT" -type f -name '*.html' -print0 | xargs -0 grep -Eo 'src="https?://[^")]+"' | sed -E 's/.*src="([^"]+)".*/\1/' > "$URLS_ALL" || true
find "$ROOT" -type f -name '*.html' -print0 | xargs -0 grep -Eo 'data-resize-src="https?://[^")]+"' | sed -E 's/.*data-resize-src="([^"]+)".*/\1/' >> "$URLS_ALL" || true
{ find "$ROOT" -type f -name '*.html' -print0; find "$ROOT" -type f -name '*.css' -print0; } | xargs -0 grep -Eo 'url\\((https\\?://[^)]+)\\)' | sed -E 's/.*url\\(([^)]+)\\).*/\\1/' >> "$URLS_ALL" || true

# Unique & filter http(s) only
sort -u "$URLS_ALL" | grep -E '^https?://' | head -n "$LIMIT" > "$TMPDIR/urls_sample.txt"

# 2) Build mapping: remote URL -> sanitized filename
: > "$URLMAP"
while IFS= read -r url; do
  base="$url"
  base="${base%%\?*}"
  raw="${base%%=*}"
  # Ensure https scheme
  raw="${raw/http:/https:}"
  # Derive filename from last path segment; fall back to hash
  name="${raw##*/}"
  if [[ -z "$name" ]]; then
    name="$(printf "%s" "$raw" | openssl md5 | awk '{print $2}')"
  fi
  # Ensure extension
  if [[ ! "$name" =~ \.[A-Za-z0-9]{2,4}$ ]]; then
    name="$name.jpg"
  fi
  echo -e "$url\t$name\t$raw" >> "$URLMAP"
done < "$TMPDIR/urls_sample.txt"

# 3) Download each with high-res attempts (raw, s0, w3000, w2000)
while IFS=$'\t' read -r orig fname raw; do
  dest="$OUTDIR/$fname"
  if [[ -f "$dest" ]]; then continue; fi
  for try in "$raw" "${raw}=s0" "${raw}=w3000" "${raw}=w2000"; do
    if curl -fsSL "$try" -o "$dest"; then
      break
    fi
  done
  if [[ ! -s "$dest" ]]; then
    echo "$orig" >> "$FAILS"
    rm -f "$dest"
  fi
done < "$URLMAP"

# 4) Rewrite references in HTML to local path and remove data-resize-src
while IFS=$'\t' read -r orig fname raw; do
  local="/static/images/mirrored/$fname"
  esc_orig=$(printf '%s' "$orig" | sed -E 's/[][(){}.^$|?*+\\/]/\\&/g')
  esc_raw=$(printf '%s' "$raw" | sed -E 's/[][(){}.^$|?*+\\/]/\\&/g')
  find "$ROOT" -type f \( -name '*.html' -o -name '*.css' \) -print0 | xargs -0 perl -0777 -pi -e "s/(src=\")$esc_orig(?:=[^\"']*)?(\")/
\$1$local\$2/g; s/(src=\")$esc_raw(?:=[^\"']*)?(\")/\$1$local\$2/g; s/\sdata-resize-src=\"$esc_orig[^\"]*\"//g; s/\sdata-resize-src=\"$esc_raw[^\"]*\"//g; s/url\((?:\"|')?$esc_orig(?:=[^\"')]+)?(?:\"|')?\)/url($local)/g; s/url\((?:\"|')?$esc_raw(?:=[^\"')]+)?(?:\"|')?\)/url($local)/g;"
done < "$URLMAP"

echo "Done. Sample mirrored to: $OUTDIR"
if [[ -s "$FAILS" ]]; then
  echo "Some downloads failed; see $FAILS"
fi
