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
{ find "$ROOT" -type f -name '*.html' -print0; find "$ROOT" -type f -name '*.css' -print0; } | xargs -0 grep -Eo 'url\((https?://[^)]+)\)' | sed -E 's/.*url\(([^)]+)\).*/\1/' >> "$URLS_ALL" || true

# Unique & filter http(s) only
sort -u "$URLS_ALL" | grep -E '^https?://' | head -n "$LIMIT" > "$TMPDIR/urls_sample.txt" || true

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

# 3) Download each with high-res attempts (enhanced attempts will run later for missing)
while IFS=$'\t' read -r orig fname raw; do
  dest="$OUTDIR/$fname"
  if [[ -f "$dest" ]]; then continue; fi
  for try in "${raw}=w1024" "${raw}=w768" "$raw"; do
    if curl -fsSL -A "Mozilla/5.0 (Macintosh; Intel Mac OS X 14_5) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36" \
          -H "Accept: image/avif,image/webp,image/apng,image/*,*/*;q=0.8" \
          -H "Accept-Language: en-US,en;q=0.9" \
          -H "Sec-Fetch-Dest: image" \
          -H "Sec-Fetch-Mode: no-cors" \
          -H "Sec-Fetch-Site: cross-site" \
          -e "https://www.ridingtherails.org" -L --compressed "$try" -o "$dest"; then
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

# 5) Missing-only reattempts with broader sizes and headers
#    Detect any '/static/images/mirrored/...'(referenced) files that do not exist and try to fetch from lh3
MISSMAP="$TMPDIR/missing_map.tsv"
: > "$MISSMAP"

# Gather unique mirrored refs from HTML
refs_tmp="$TMPDIR/mirrored_refs.txt"
{ find "$ROOT" -type f -name '*.html' -print0 | xargs -0 grep -Eo "/static/images/mirrored/[^\"')[:space:]]+" || true; } | \
  sort -u > "$refs_tmp"

while IFS= read -r ref; do
  # Ensure absolute path for existence check
  rel="$ref"
  [[ "$rel" == /* ]] || rel="/$rel"
  f="$ROOT$rel"
  fname="${rel##*/}"
  if [[ ! -f "$f" ]]; then
    id="${fname%.*}"
    raw="https://lh3.googleusercontent.com/$id"
    echo -e "$raw\t$fname\t$raw" >> "$MISSMAP"
  fi
done < "$refs_tmp"

if [[ -s "$MISSMAP" ]]; then
  echo "Re-attempting missing downloads with extended strategies..."
  while IFS=$'\t' read -r orig fname raw; do
    dest="$OUTDIR/$fname"
    [[ -f "$dest" ]] && continue
    UA="Mozilla/5.0 (Macintosh; Intel Mac OS X 14_5) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
    declare -a SIZES=("w2048" "s2048" "s0" "w1600" "w1440" "w1280" "w1024" "w768" "")
    declare -a REFS=("https://photos.google.com/" "https://www.ridingtherails.org" "")
    success=0
    for sz in "${SIZES[@]}"; do
      if [[ -n "$sz" ]]; then
        try="${raw}=${sz}"
      else
        try="$raw"
      fi
      for rf in "${REFS[@]}"; do
        # Build curl args
        args=( -fsSL -A "$UA" -H "Accept: image/avif,image/webp,image/apng,image/*,*/*;q=0.8" \
               -H "Accept-Language: en-US,en;q=0.9" -H "Sec-Fetch-Dest: image" \
               -H "Sec-Fetch-Mode: no-cors" -H "Sec-Fetch-Site: cross-site" \
               -L --compressed )
        if [[ -n "$rf" ]]; then
          args+=( -e "$rf" )
        fi
        if curl "${args[@]}" "$try" -o "$dest"; then
          if [[ -s "$dest" ]]; then
            success=1
            break
          else
            rm -f "$dest"
          fi
        fi
      done
      if [[ "$success" -eq 1 ]]; then break; fi
    done
    if [[ "$success" -ne 1 ]]; then
      echo "$orig" >> "$FAILS"
      rm -f "$dest" || true
    fi
  done < "$MISSMAP"
fi

echo "Done. Sample mirrored to: $OUTDIR"
if [[ -s "$FAILS" ]]; then
  echo "Some downloads failed; see $FAILS"
fi
