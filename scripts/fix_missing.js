#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const PLACEHOLDER = '/static/images/mirrored/missing-placeholder.svg';
const missingListPath = '/tmp/_missing_refs.txt';

function injectClass(openTag, className) {
  // If class exists, inject; otherwise add new class attribute before '>'
  if (/class\s*=/.test(openTag)) {
    return openTag.replace(/class\s*=\s*"(.*?)"/, (m, g1) => `class="${g1} ${className}"`);
  }
  return openTag.replace(/>$/, ` class="${className}">`);
}

function fixHtmlFile(p, missingPaths) {
  let txt = fs.readFileSync(p, 'utf8');
  let changed = false;
  for (const mp of missingPaths) {
    const esc = mp.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&');
    // Try parent <a>
    let re = new RegExp(`(<a[^>]*>)(\\s*)<img([^>]*?)\\s+src="${esc}"`, 'g');
    if (re.test(txt)) {
      txt = txt.replace(re, (m, open, ws, rest) => `${injectClass(open, 'missing-image')}${ws}<img${rest} src="${PLACEHOLDER}"`);
      changed = true;
      continue;
    }
    // Try parent <figure>
    re = new RegExp(`(<figure[^>]*>)(\\s*)<img([^>]*?)\\s+src="${esc}"`, 'g');
    if (re.test(txt)) {
      txt = txt.replace(re, (m, open, ws, rest) => `${injectClass(open, 'missing-image')}${ws}<img${rest} src="${PLACEHOLDER}"`);
      changed = true;
      continue;
    }
    // Try parent <div>
    re = new RegExp(`(<div[^>]*>)(\\s*)<img([^>]*?)\\s+src="${esc}"`, 'g');
    if (re.test(txt)) {
      txt = txt.replace(re, (m, open, ws, rest) => `${injectClass(open, 'missing-image')}${ws}<img${rest} src="${PLACEHOLDER}"`);
      changed = true;
      continue;
    }
    // Fallback: add class on img and swap src
    re = new RegExp(`<img([^>]*?)\\s+src="${esc}"`, 'g');
    if (re.test(txt)) {
      txt = txt.replace(re, (m, rest) => {
        if (/class\s*=/.test(rest)) {
          rest = rest.replace(/class\s*=\s*"(.*?)"/, (mm, g1) => `class="${g1} missing-image"`);
        } else {
          rest = ` class="missing-image"${rest}`;
        }
        return `<img${rest} src="${PLACEHOLDER}"`;
      });
      changed = true;
    }
  }
  if (changed) fs.writeFileSync(p, txt);
  return changed;
}

function walk(dir, out) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else if (/\.(html|css)$/i.test(e.name)) out.push(p);
  }
}

(function main() {
  if (!fs.existsSync(missingListPath)) {
    console.error('Missing list not found:', missingListPath);
    process.exit(1);
  }
  const missing = fs.readFileSync(missingListPath, 'utf8').trim().split('\n').filter(Boolean);
  const files = [];
  walk(ROOT, files);
  let changedCount = 0;
  for (const f of files) {
    if (fixHtmlFile(f, missing)) changedCount++;
  }
  console.log('Updated files with placeholders:', changedCount);
})(); 

