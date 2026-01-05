#!/usr/bin/env node
/**
 * Replace image references across the site using replace-images/replace_images.csv,
 * and copy the replacement image files into static/images/mirrored/.
 *
 * CSV columns used:
 * - "Site Image Name" (old filename, referenced in HTML)
 * - "New Image Name"  (replacement filename, present in replace-images/)
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const CSV_PATH = path.join(ROOT, 'replace-images', 'replace_images.csv');
const REPLACEMENTS_DIR = path.join(ROOT, 'replace-images');
const MIRRORED_DIR = path.join(ROOT, 'static', 'images', 'mirrored');

function parseCsv(text) {
	const rows = [];
	let row = [];
	let field = '';
	let inQuotes = false;

	for (let i = 0; i < text.length; i++) {
		const c = text[i];

		if (inQuotes) {
			if (c === '"') {
				const next = text[i + 1];
				if (next === '"') {
					field += '"';
					i++;
				} else {
					inQuotes = false;
				}
			} else {
				field += c;
			}
			continue;
		}

		if (c === '"') {
			inQuotes = true;
			continue;
		}

		if (c === ',') {
			row.push(field);
			field = '';
			continue;
		}

		if (c === '\n') {
			row.push(field);
			field = '';
			// Drop empty trailing rows
			if (row.some((v) => String(v || '').trim() !== '')) rows.push(row);
			row = [];
			continue;
		}

		if (c === '\r') continue; // ignore

		field += c;
	}

	// Last row
	row.push(field);
	if (row.some((v) => String(v || '').trim() !== '')) rows.push(row);
	return rows;
}

function walkHtmlFiles(dir) {
	const out = [];
	const denyDirs = new Set([
		path.join(ROOT, 'static'),
		path.join(ROOT, 'replace-images'),
	]);

	function rec(d) {
		// Skip big/static content trees
		for (const deny of denyDirs) {
			if (d === deny || d.startsWith(deny + path.sep)) return;
		}

		for (const e of fs.readdirSync(d, { withFileTypes: true })) {
			const p = path.join(d, e.name);
			if (e.isDirectory()) rec(p);
			else if (/\.html$/i.test(e.name)) out.push(p);
		}
	}

	rec(dir);
	return out;
}

function countOccurrences(haystack, needle) {
	if (!needle) return 0;
	let count = 0;
	let idx = 0;
	while (true) {
		idx = haystack.indexOf(needle, idx);
		if (idx === -1) break;
		count++;
		idx += needle.length;
	}
	return count;
}

function safeCopy(from, to) {
	fs.mkdirSync(path.dirname(to), { recursive: true });
	fs.copyFileSync(from, to);
}

function normalizeForMatch(filename) {
	const base = String(filename || '')
		.trim()
		.replace(/\.[A-Za-z0-9]+$/, '') // drop extension
		.toLowerCase();

	// Keep alphanumerics, normalize numeric chunks to remove leading zeros.
	const parts = base.match(/[a-z]+|\d+/g) || [];
	return parts
		.map((p) => (/^\d+$/.test(p) ? String(parseInt(p, 10)) : p))
		.join('');
}

function buildReplacementIndex(dir) {
	const files = fs.readdirSync(dir, { withFileTypes: true })
		.filter((e) => e.isFile())
		.map((e) => e.name);

	const byNormalized = new Map();
	for (const name of files) {
		const key = normalizeForMatch(name);
		if (!key) continue;
		const arr = byNormalized.get(key) || [];
		arr.push(name);
		byNormalized.set(key, arr);
	}
	return { files, byNormalized };
}

(function main() {
	if (!fs.existsSync(CSV_PATH)) {
		console.error('CSV not found:', CSV_PATH);
		process.exit(1);
	}
	if (!fs.existsSync(MIRRORED_DIR)) {
		console.error('Mirrored dir not found:', MIRRORED_DIR);
		process.exit(1);
	}

	const csvText = fs.readFileSync(CSV_PATH, 'utf8');
	const rows = parseCsv(csvText);
	if (rows.length < 2) {
		console.error('CSV appears empty or missing data rows:', CSV_PATH);
		process.exit(1);
	}

	const header = rows[0].map((h) => String(h || '').trim());
	const idxOld = header.indexOf('Site Image Name');
	const idxNew = header.indexOf('New Image Name');
	if (idxOld === -1 || idxNew === -1) {
		console.error('CSV header must include "Site Image Name" and "New Image Name". Got:', header);
		process.exit(1);
	}

	const mappings = [];
	for (let r = 1; r < rows.length; r++) {
		const row = rows[r];
		const oldName = String(row[idxOld] || '').trim();
		const newName = String(row[idxNew] || '').trim();
		if (!oldName || !newName) continue;
		if (oldName === newName) continue;
		mappings.push({ oldName, newName });
	}

	if (!mappings.length) {
		console.log('No mappings found in CSV (nothing to do).');
		return;
	}

	// 1) Copy replacement images into mirrored/ under their new names (with fuzzy matching for filenames)
	let copied = 0;
	const missingReplacements = [];
	const resolvedNameMap = new Map(); // csvNewName -> actualFilenameInReplaceImages
	const replacementIndex = buildReplacementIndex(REPLACEMENTS_DIR);

	for (const { newName } of mappings) {
		let actual = newName;
		let src = path.join(REPLACEMENTS_DIR, actual);

		if (!fs.existsSync(src)) {
			const key = normalizeForMatch(newName);
			const candidates = replacementIndex.byNormalized.get(key) || [];
			if (candidates.length === 1) {
				actual = candidates[0];
				src = path.join(REPLACEMENTS_DIR, actual);
			}
		}

		if (!fs.existsSync(src)) {
			missingReplacements.push(newName);
			continue;
		}

		resolvedNameMap.set(newName, actual);
		const dest = path.join(MIRRORED_DIR, actual);
		safeCopy(src, dest);
		copied++;
	}

	// We'll warn on missing but still rewrite what we can.
	if (missingReplacements.length) {
		console.warn('WARNING: Some replacement files listed in CSV were not found in replace-images/ and will be skipped:');
		for (const n of missingReplacements) console.warn(' -', n);
	}

	// 2) Rewrite HTML references: old filename -> new filename
	const htmlFiles = walkHtmlFiles(ROOT);
	let changedFiles = 0;
	let totalReplacements = 0;
	let skippedMappings = 0;

	for (const file of htmlFiles) {
		let txt = fs.readFileSync(file, 'utf8');
		let changed = false;

		for (const { oldName, newName } of mappings) {
			const resolvedNew = resolvedNameMap.get(newName);
			if (!resolvedNew) {
				// replacement image missing; don't rewrite HTML for this mapping
				continue;
			}
			const hits = countOccurrences(txt, oldName);
			if (!hits) continue;
			txt = txt.split(oldName).join(resolvedNew);
			totalReplacements += hits;
			changed = true;
		}

		if (changed) {
			fs.writeFileSync(file, txt);
			changedFiles++;
		}
	}

	console.log('Mappings processed:', mappings.length);
	console.log('Replacement images copied to mirrored/:', copied);
	skippedMappings = missingReplacements.length;
	if (skippedMappings) console.log('Mappings skipped due to missing replacement files:', skippedMappings);
	console.log('HTML files updated:', changedFiles);
	console.log('Total filename swaps in HTML:', totalReplacements);
})();


