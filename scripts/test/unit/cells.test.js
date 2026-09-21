import test from 'node:test';
import assert from 'node:assert/strict';
import os from 'node:os';
import path from 'node:path';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { checkCellLengths, checkTableCells } from '../../checks/structure.js';

const FIXTURES = path.join(import.meta.dirname, '..', 'fixtures');
const read = (p) => readFile(path.join(FIXTURES, p), 'utf8');

test('cell: 99-char rendered cell passes', async () => {
  assert.deepEqual(checkCellLengths(await read('cells/pass/cell-99.md'), 'cell-99.md'), []);
});

test('cell: 100-char rendered cell fails', async () => {
  const errors = checkCellLengths(await read('cells/fail/cell-100.md'), 'cell-100.md');
  assert.equal(errors.length, 1);
  assert.match(errors[0], /renders to 100 chars \(exceeds 99\)/);
});

test('cell: markdown syntax is stripped before measuring', async () => {
  assert.deepEqual(checkCellLengths(await read('cells/pass/link-rendered.md'), 'link-rendered.md'), []);
});

test('checkTableCells walks files and reports over-limit cells', async () => {
  const dir = await mkdtemp(path.join(os.tmpdir(), 'cells-'));
  try {
    await writeFile(path.join(dir, 'ok.md'), await read('cells/pass/cell-99.md'));
    await writeFile(path.join(dir, 'bad.md'), await read('cells/fail/cell-100.md'));
    const errors = await checkTableCells(dir);
    assert.equal(errors.filter((e) => e.includes('bad.md')).length, 1);
    assert.equal(errors.filter((e) => e.includes('ok.md')).length, 0);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
