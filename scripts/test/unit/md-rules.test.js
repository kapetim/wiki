import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { readFile } from 'node:fs/promises';
import { REPO_DIR } from '../../shared/config.js';
import { parseFile, runRules } from '../../markdown/md-engine.js';

const CONFIG = JSON.parse(
  await readFile(path.join(REPO_DIR, 'scripts', 'markdown', 'markdown-rules.json'), 'utf8'),
);

function errorsFor(content) {
  const { tokens, lines, frontMatterLines } = parseFile(content);
  return runRules(
    { name: 'f', parsers: { micromark: { tokens } }, lines, frontMatterLines },
    CONFIG,
  );
}

function hasRule(errors, rule) {
  return errors.some((e) => e.rule === rule);
}

test('emoji-heading: heading without emoji fails', () => {
  const errs = errorsFor('# Plain heading\n');
  assert.ok(hasRule(errs, 'emoji-heading'));
});

test('emoji-heading: emoji heading passes', () => {
  const errs = errorsFor('# 🏢 Providers\n\n## 🧭 Index\n');
  assert.equal(hasRule(errs, 'emoji-heading'), false);
});

test('MD013: line renders under 200 passes even if raw is longer', () => {
  const longUrl = `[a](https://example.com/${'x'.repeat(300)})`;
  const errs = errorsFor(`# 🏢 T\n\n${longUrl}\n`);
  assert.equal(hasRule(errs, 'MD013'), false);
});

test('MD013: line rendering over 200 fails', () => {
  const longText = `${'y'.repeat(220)}`;
  const errs = errorsFor(`# 🏢 T\n\n${longText}\n`);
  assert.ok(hasRule(errs, 'MD013'));
});

test('MD013: heading over 60 fails', () => {
  const longHeading = `# 🏢 ${'h'.repeat(70)}`;
  const errs = errorsFor(`${longHeading}\n`);
  assert.ok(hasRule(errs, 'MD013'));
});

test('MD040: fenced code without language fails', () => {
  const errs = errorsFor('# 🏢 T\n\n```\ncode\n```\n');
  assert.ok(hasRule(errs, 'MD040'));
});

test('MD040: fenced code with allowed language passes', () => {
  const errs = errorsFor('# 🏢 T\n\n```text\ncode\n```\n');
  assert.equal(hasRule(errs, 'MD040'), false);
});

test('MD047: missing trailing newline fails', () => {
  const errs = errorsFor('# 🏢 T\n\nSome text');
  assert.ok(hasRule(errs, 'MD047'));
});

test('MD025: multiple H1 fails', () => {
  const errs = errorsFor('# 🏢 A\n\n# 🏢 B\n');
  assert.ok(hasRule(errs, 'MD025'));
});
