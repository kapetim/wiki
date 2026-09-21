#!/usr/bin/env node

// Regenerates the README "Coverage" section numbers + missing-emoji table from
// the live repo: total headings, with-emoji count, coverage %, and the per-file
// missing list. Run after heading changes, then run `npm run table-cols` if the
// README table count changes.

import fs from 'node:fs';
import path from 'node:path';
import { computeCoverage, renderCoverage } from '../checks/coverage.js';

const SCRIPT_DIR = import.meta.dirname;
const REPO_DIR = process.env.REPO_DIR
  ? path.resolve(process.env.REPO_DIR)
  : path.resolve(SCRIPT_DIR, '..', '..');

const README = path.join(REPO_DIR, 'README.md');

const cov = await computeCoverage(REPO_DIR);
const want = renderCoverage(cov);

const lines = fs.readFileSync(README, 'utf8').split('\n');
const secIdx = lines.findIndex((l) => l.startsWith('### 📊 Coverage'));
if (secIdx === -1) throw new Error('README: missing "### 📊 Coverage" section');

// Replace the summary line (the one containing **Total: ... headings ... coverage.**)
const summaryIdx = lines.findIndex((l, i) => i >= secIdx && l.includes('**Total:') && l.includes('headings'));
if (summaryIdx === -1) throw new Error('README: Coverage summary line not found');
lines[summaryIdx] = want.summary;

// Replace the missing-files line
const filesIdx = lines.findIndex((l, i) => i >= secIdx && l.startsWith('Files with headings missing an emoji'));
if (filesIdx !== -1) lines[filesIdx] = want.files;

// Replace the table block (begin/end pair after the section)
const tblStart = lines.findIndex((l, i) => i >= secIdx && l.trim() === '<!-- begin table -->');
if (tblStart === -1) throw new Error('README: Coverage table not found');
let tblEnd = -1;
for (let i = tblStart + 1; i < lines.length; i++) {
  if (lines[i].trim() === '<!-- end table -->') { tblEnd = i; break; }
}
if (tblEnd === -1) throw new Error('README: Coverage table unclosed');
lines.splice(tblStart, tblEnd - tblStart + 1, ...want.table);

fs.writeFileSync(README, lines.join('\n'));
console.log(
  `heading coverage: ${cov.total} headings, ${cov.withEmoji} with emoji (${cov.pct.toFixed(2)}%), ${cov.missing.size} file(s) missing`,
);
