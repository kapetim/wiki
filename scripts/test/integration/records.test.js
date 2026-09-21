import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { checkTree } from '../../checks/records.js';
import { REPO_DIR } from '../../shared/config.js';

const probeQpdf = spawnSync('qpdf', ['--version'], { encoding: 'utf8' });
const probeRender = spawnSync('pdftoppm', ['-v'], { encoding: 'utf8' });
const skip = probeQpdf.error || probeRender.error
  ? 'qpdf/pdftoppm not installed (use the docker image)'
  : undefined;

test('src/ records match tree.json (integrity + render)', { skip }, () => {
  const errors = checkTree(REPO_DIR);
  assert.equal(errors.length, 0, errors.slice(0, 20).join('\n'));
});
