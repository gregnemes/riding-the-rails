#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
MAP="/tmp/sample_map.tsv"
while IFS=$'\t' read -r orig fname raw; do
  localPath="/static/images/mirrored/$fname"
  esc_orig=$(printf '%s' "$orig" | sed -E 's/[][(){}.^$|?*+\\/]/\\&/g')
  esc_raw=$(printf '%s' "$raw" | sed -E 's/[][(){}.^$|?*+\\/]/\\&/g')
  find "$ROOT" -type f -name '*.html' -print0 | xargs -0 perl -0777 -pi -e "s/(src=\")$esc_orig(?:=[^\"']*)?(\")/\$1$localPath\$2/g; s/(src=\")$esc_raw(?:=[^\"']*)?(\")/\$1$localPath\$2/g; s/\sdata-resize-src=\"$esc_orig[^\"]*\"//g; s/\sdata-resize-src=\"$esc_raw[^\"]*\"//g;"
done < "$MAP"
