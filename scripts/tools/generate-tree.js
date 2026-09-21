#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const SCRIPT_DIR = import.meta.dirname;

const REPO_DIR = process.env.REPO_DIR
  ? path.resolve(process.env.REPO_DIR)
  : path.resolve(SCRIPT_DIR, '..', '..');

const pkg = JSON.parse(fs.readFileSync(path.join(SCRIPT_DIR, '..', 'package.json'), 'utf8'));
const SRC = path.join(REPO_DIR, 'src');
const OUT = path.join(REPO_DIR, 'scripts', pkg.config.tree);

function walk(dir, rel, out) {
  for (const name of fs.readdirSync(dir).sort()) {
    const p = path.join(dir, name);
    const r = rel ? `${rel}/${name}` : name;
    const st = fs.statSync(p);
    if (st.isDirectory()) {
      walk(p, r, out);
    } else if (name.endsWith('.md') || name.endsWith('.json')) {
      // annotations live beside the documents but are not immutable records
    } else {
      const hash = crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');
      out.push({ path: r, sha256: hash, size: st.size });
    }
  }
}

const tree = [];
if (fs.existsSync(SRC)) {
  walk(SRC, '', tree);
}
tree.sort((a, b) => {
  if (a.path < b.path) return -1;
  if (a.path > b.path) return 1;
  return 0;
});

fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, JSON.stringify(tree, null, 2) + '\n');
console.log(`[OK] Picked ${tree.length} files into ${pkg.config.tree}`);
