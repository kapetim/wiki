import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { REPO_DIR } from '../../shared/config.js';

const workflows = path.join(REPO_DIR, '.github', 'workflows');
const probe = spawnSync('actionlint', ['-version'], { encoding: 'utf8' });
let skip;
if (!fs.existsSync(workflows)) skip = 'no .github/workflows';
else if (probe.error) skip = 'actionlint not installed (use the docker image)';

test('CI workflows pass actionlint', { skip }, () => {
  const r = spawnSync('actionlint', ['-ignore', 'get action metadata failed'], {
    cwd: REPO_DIR,
    encoding: 'utf8',
  });
  const out = `${r.stdout || ''}${r.stderr || ''}`.trim();
  assert.equal(r.status, 0, out || `actionlint exit ${r.status}`);
});
