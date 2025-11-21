#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const OUTDIR = path.join(ROOT, 'static', 'images', 'mirrored');

function walk(dir, exts) {
  const out = [];
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) {
      out.push(...walk(p, exts));
    } else {
      const ext = path.extname(e.name).toLowerCase();
      if (exts.includes(ext)) out.push(p);
    }
  }
  return out;
}

function toRaw(url) {
  let u = url.split('?')[0];
  const eq = u.lastIndexOf('=');
  if (eq !== -1) u = u.slice(0, eq);
  if (u.startsWith('http:')) u = 'https:' + u.slice(5);
  return u;
}

function filenameFor(raw) {
  let name = raw.split('/').pop() || '';
  if (!/\.[A-Za-z0-9]{2,4}$/.test(name)) name = name + '.jpg';
  return name;
}

function escReg(s) {
  return s.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&');
}

function buildMap(urls) {
  const map = new Map();
  for (const url of urls) {
    const raw = toRaw(url);
    const fname = filenameFor(raw);
    const local = '/static/images/mirrored/' + fname;
    map.set(url, local);
    map.set(raw, local);
  }
  return map;
}

function collectUrls(files) {
  const urls = new Set();
  const reSrc = /(src|data-resize-src)=["'](https?:\/\/[^"')\s]+)["']/g;
  const reUrl = /url\((["']?)(https?:\/\/[^"')\s]+)\1\)/g;
  for (const f of files) {
    const txt = fs.readFileSync(f, 'utf8');
    let m;
    while ((m = reSrc.exec(txt))) urls.add(m[2]);
    while ((m = reUrl.exec(txt))) urls.add(m[2]);
  }
  return Array.from(urls);
}

function rewriteFile(p, map) {
  let txt = fs.readFileSync(p, 'utf8');
  let changed = false;

  // Replace src/data-resize-src and url(...) for each mapping entry
  for (const [remote, local] of map.entries()) {
    const esc = escReg(remote);
    // Replace src="remote[=...]" -> src="local"
    const reSrc = new RegExp(`(src=["'])${esc}(?:=[^"']*)?(["'])`, 'g');
    const origTxt = txt;
    txt = txt.replace(reSrc, `$1${local}$2`);
    if (txt !== origTxt) changed = true;

    // Remove data-resize-src="remote[...]" attributes
    const reData = new RegExp(`\\sdata-resize-src="${esc}[^"]*"`, 'g');
    const txt2 = txt.replace(reData, '');
    if (txt2 !== txt) {
      txt = txt2;
      changed = true;
    }

    // Replace background-image url(remote[=...])
    const reBg = new RegExp(`url\\((["']?)${esc}(?:=[^"')]+)?\\1\\)`, 'g');
    const txt3 = txt.replace(reBg, `url(${local})`);
    if (txt3 !== txt) {
      txt = txt3;
      changed = true;
    }
  }

  if (changed) fs.writeFileSync(p, txt);
  return changed;
}

(function main() {
  // Ensure mirrored folder exists
  if (!fs.existsSync(OUTDIR)) {
    console.error('Mirrored directory missing:', OUTDIR);
    process.exit(1);
  }

  const htmlFiles = walk(ROOT, ['.html', '.css']);
  const urls = collectUrls(htmlFiles);
  const map = buildMap(urls);

  let changedCount = 0;
  for (const f of htmlFiles) {
    if (rewriteFile(f, map)) changedCount++;
  }
  console.log('Rewritten files:', changedCount);
})(); 

