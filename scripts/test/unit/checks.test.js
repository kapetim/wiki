import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { readdir, readFile } from 'node:fs/promises';
import { REPO_DIR } from '../../shared/config.js';

// Guard: every custom check export must be registered in the integration
// content test's checks array, and the owned checks (fragments, links,
// accounts, markdown-rules) must be covered by a dedicated unit test.
// Prevents a new check from being added unvalidated, or an existing one
// from silently rotting.
// Directories that may export check* functions (validators + markdown engine).
const LIB_DIRS = ['checks', 'markdown'];
const UNIT = path.join(REPO_DIR, 'scripts', 'test', 'unit');
const INTEGRATION = path.join(REPO_DIR, 'scripts', 'test', 'integration', 'content.test.js');

// Checks that must be covered by a dedicated unit test.
const REQUIRED_COVERAGE = new Set([
  'checkLinks',
  'checkAccounts',
  'checkMarkdownRules',
]);

async function checkExports() {
  const out = [];
  for (const dir of LIB_DIRS) {
    const dirPath = path.join(REPO_DIR, 'scripts', dir);
    const entries = await readdir(dirPath);
    for (const e of entries) {
      if (!e.endsWith('.js')) continue;
      const text = await readFile(path.join(dirPath, e), 'utf8');
      for (const m of text.matchAll(/export (?:async )?function (check\w+)\(/g)) {
        out.push({ name: m[1], file: `${dir}/${e}` });
      }
    }
  }
  return out;
}

// Checks covered by a dedicated integration file (not content.test.js).
const INTEGRATION_EXCEPT = new Set([
  'checkTree', // records.test.js (tree.json integrity)
  'checkCellLengths', // pure helper, tested directly in cells.test.js
  'checkMdValidation', // internal, dispatched via checkMarkdownRules
  'checkMdShape', // internal, dispatched via checkMarkdownRules
  'checkMdFormat', // internal, dispatched via checkMarkdownRules
  'checkMdInline', // internal, dispatched via checkMarkdownRules
  'checkMdStyle', // internal, dispatched via checkMarkdownRules
]);

test('every check* export appears in the integration content test', async () => {
  const exports = await checkExports();
  const integration = await readFile(INTEGRATION, 'utf8');
  const problems = [];
  for (const { name } of exports) {
    if (INTEGRATION_EXCEPT.has(name)) continue;
    if (!integration.includes(name)) {
      problems.push(`${name}: missing from content.test.js checks array`);
    }
  }
  assert.equal(problems.length, 0, problems.join('\n'));
});

test('strictness-owned checks have dedicated unit coverage', async () => {
  const unitTests = (await readdir(UNIT)).filter((f) => f.endsWith('.test.js'));
  const bodies = [];
  for (const f of unitTests) {
    bodies.push(await readFile(path.join(UNIT, f), 'utf8'));
  }
  const all = bodies.join('\n');
  const problems = [];
  for (const name of REQUIRED_COVERAGE) {
    if (!all.includes(name)) problems.push(`${name}: missing dedicated unit test`);
  }
  assert.equal(problems.length, 0, problems.join('\n'));
});
