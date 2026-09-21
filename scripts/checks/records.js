// Records integrity — checks src/ against scripts/config/tree.json: sha256 +
// size integrity, PDF validity (encrypted or unprocessable PDFs rejected;
// non-fatal qpdf warnings accepted — an original, hash-verified file that
// renders is valid), render smoke (pdftoppm), image signatures, and
// EXTRA FILE detection. Runs as an integration test over the whole repo.

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';

const HEX64 = /^[0-9a-f]{64}$/;
const PNG_SIG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const JPG_SIG = Buffer.from([0xff, 0xd8, 0xff]);

function toolError(bin, versionFlag, extra) {
  const r = spawnSync(bin, [versionFlag], { encoding: 'utf8' });
  if (r.error || r.status !== 0) return `${bin} not found - required for ${extra} (use the docker image)`;
  return null;
}

function checkPdf(rel, abs) {
  const r = spawnSync('qpdf', ['--check', '--password=', abs], { encoding: 'utf8' });
  const out = `${r.stdout || ''}\n${r.stderr || ''}`;
  if (/file is encrypted/i.test(out)) return `ENCRYPTED: ${rel} (password-protected)`;
  // qpdf exits 3 ("operation succeeded with warnings") for non-conformant but
  // processable files. Accepted: an original (hash-verified) file that renders
  // is valid. Any other non-zero status means qpdf could not process the file.
  if (r.error || (r.status !== 0 && r.status !== 3)) {
    const detail = out.trim().split('\n').slice(0, 8).join(' | ') || `qpdf exit ${r.status}`;
    return `BAD PDF: ${rel} (${detail})`;
  }
  return null;
}

function renderPdf(rel, abs) {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'private-pdf-'));
  try {
    const r = spawnSync('pdftoppm', ['-f', '1', '-l', '1', '-singlefile', '-r', '20', '-png', abs, path.join(tmp, 'page')], { encoding: 'utf8' });
    if (r.error || r.status !== 0) {
      const out = `${r.stdout || ''}\n${r.stderr || ''}`.trim().split('\n').slice(0, 3).join(' ');
      return `UNRENDERABLE: ${rel} (${out || `pdftoppm exit ${r.status}`})`;
    }
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
  return null;
}

function checkImage(rel, buf) {
  if (/\.png$/i.test(rel)) {
    if (!buf.subarray(0, 8).equals(PNG_SIG)) return `NOT A PNG: ${rel} (bad signature)`;
  } else if (/\.jpe?g$/i.test(rel)) {
    if (!buf.subarray(0, 3).equals(JPG_SIG)) return `NOT A JPEG: ${rel} (bad signature)`;
  }
  return null;
}

function listFiles(root) {
  const out = [];
  const walk = (dir) => {
    let entries;
    try { entries = fs.readdirSync(dir); } catch { return; }
    for (const name of entries) {
      const p = path.join(dir, name);
      let st;
      try { st = fs.statSync(p); } catch { continue; }
      if (st.isDirectory()) walk(p);
      else if (/\.md$/i.test(name) || /\.json$/i.test(name)) continue; // annotations and task cards are not manifested records
      else out.push(path.relative(root, p).split(path.sep).join('/'));
    }
  };
  walk(root);
  return out;
}

export function checkTree(repoDir) {
  const errors = [];

  const qpdfErr = toolError('qpdf', '--version', 'PDF integrity check');
  const renderErr = toolError('pdftoppm', '-v', 'PDF render check');
  if (qpdfErr) errors.push(qpdfErr);
  if (renderErr) errors.push(renderErr);
  if (errors.length) return errors; // no point proceeding without the tools

  const pkg = JSON.parse(fs.readFileSync(path.join(repoDir, 'scripts', 'package.json'), 'utf8'));
  const src = path.join(repoDir, 'src');
  const tree = path.join(repoDir, 'scripts', pkg.config.tree);

  if (!fs.existsSync(tree)) { errors.push('tree.json not found - run generate-tree.js first'); return errors; }
  let data;
  try {
    data = JSON.parse(fs.readFileSync(tree, 'utf8'));
  } catch (e) {
    errors.push(`tree.json is not valid JSON: ${e.message}`);
    return errors;
  }

  if (!Array.isArray(data)) { errors.push('tree.json must be an array of file entries'); return errors; }
  if (data.length === 0) { errors.push('tree.json is empty - run generate-tree.js'); return errors; }

  const byPath = new Map();
  for (const entry of data) {
    if (!entry || typeof entry !== 'object' || typeof entry.path !== 'string' ||
        typeof entry.sha256 !== 'string' || typeof entry.size !== 'number' ||
        entry.size <= 0 || !HEX64.test(entry.sha256)) {
      errors.push(`INVALID ENTRY: ${JSON.stringify(entry)}`);
      continue;
    }
    if (byPath.has(entry.path)) {
      errors.push(`DUPLICATE PATH: ${entry.path}`);
      continue;
    }
    byPath.set(entry.path, entry);
  }

  for (const [rel, expected] of byPath) {
    const abs = path.join(src, rel);
    if (!fs.existsSync(abs)) { errors.push(`LOST FILE: ${rel} (missing on disk)`); continue; }
    const buf = fs.readFileSync(abs);
    if (buf.length !== expected.size) {
      errors.push(`SIZE MISMATCH: ${rel} (expected ${expected.size}, got ${buf.length})`);
      continue;
    }
    const actual = crypto.createHash('sha256').update(buf).digest('hex');
    if (actual !== expected.sha256) {
      errors.push(`CORRUPTED: ${rel} (sha256 mismatch)`);
      continue;
    }
    if (/\.pdf$/i.test(rel)) {
      const e = checkPdf(rel, abs) || renderPdf(rel, abs);
      if (e) errors.push(e);
    } else {
      const e = checkImage(rel, buf);
      if (e) errors.push(e);
    }
  }

  for (const rel of listFiles(src)) {
    if (!byPath.has(rel)) errors.push(`EXTRA FILE: ${rel} (not in tree.json - run generate-tree.js)`);
  }

  return errors;
}
