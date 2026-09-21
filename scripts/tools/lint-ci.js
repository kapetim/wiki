#!/usr/bin/env node

// CI workflow lint — runs actionlint over .github/workflows/*.yml. Part of the
// local lint batch (npm run local). Fails hard if actionlint is missing (the
// docker image ships it).

import path from 'node:path';
import fs from 'node:fs';
import { spawnSync } from 'node:child_process';
import { REPO_DIR } from '../shared/config.js';

const workflows = path.join(REPO_DIR, '.github', 'workflows');
if (!fs.existsSync(workflows)) {
  console.error('[FAIL] .github/workflows not found — nothing to lint');
  process.exit(1);
}

const r = spawnSync('actionlint', ['-ignore', 'get action metadata failed'], {
  cwd: REPO_DIR,
  encoding: 'utf8',
});
if (r.error) {
  console.error('[FAIL] actionlint not found - required for CI workflow lint (use the docker image)');
  process.exit(1);
}

const out = (r.stdout || '').trim();
if (out) console.log(out);
if (r.status !== 0) {
  console.error('\n[FAIL] actionlint found problems in .github/workflows/');
  process.exit(1);
}
console.log('[OK] actionlint clean');
