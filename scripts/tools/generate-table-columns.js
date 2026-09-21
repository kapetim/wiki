#!/usr/bin/env node

// Walks every .md in the repository (matching the scope checkTableColumns
// validates) and writes scripts/config/table-columns.json: file path -> array
// of column counts, one per <!-- begin table --> block in order. The manifest
// is the source of truth enforced by checkTableColumns in the integration tests.

import fs from 'node:fs';
import path from 'node:path';
import { walkMd } from '../shared/md-walk.js';

const SCRIPT_DIR = import.meta.dirname;

const REPO_DIR = process.env.REPO_DIR
  ? path.resolve(process.env.REPO_DIR)
  : path.resolve(SCRIPT_DIR, '..', '..');

const OUT = path.join(REPO_DIR, 'scripts', 'config', 'table-columns.json');

const DELIMITER = /^\|\s*:?-+:?\s*(\|\s*:?-+:?\s*)+\|$/;

function columnCounts(file) {
  const lines = fs.readFileSync(file, 'utf8').split('\n');
  const counts = [];
  let inTable = false;
  let inCode = false;
  for (const line of lines) {
    const s = line.trim();
    if (/^\s*(```+|~~~+)/.test(line)) {
      inCode = !inCode;
      continue;
    }
    if (inCode) continue;
    if (s === '<!-- begin table -->') {
      inTable = true;
      continue;
    }
    if (s === '<!-- end table -->') {
      inTable = false;
      continue;
    }
    if (!inTable) continue;
    if (DELIMITER.test(s)) continue;
    const body = s.replace(/^\|/, '').replace(/\|$/, '');
    counts.push(body.split(/(?<!\\)\|/).length);
    inTable = false; // only the header row defines the column count
  }
  return counts;
}

const files = (await walkMd(REPO_DIR)).sort();
const manifest = {};
for (const f of files) {
  const rel = path.relative(REPO_DIR, f).split(path.sep).join('/');
  const counts = columnCounts(f);
  if (counts.length) manifest[rel] = counts;
}

fs.writeFileSync(OUT, JSON.stringify(manifest, null, 2) + '\n');
const total = Object.values(manifest).reduce((n, c) => n + c.length, 0);
console.log(`[OK] table-columns.json: ${Object.keys(manifest).length} files, ${total} tables`);
