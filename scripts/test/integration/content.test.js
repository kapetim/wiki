import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { REPO_DIR } from '../../shared/config.js';
import { checkFood, checkBuyTables, checkBuyPlans, checkNutrition } from '../../checks/food.js';
import { checkStatus } from '../../checks/diet.js';
import { checkCatalog } from '../../checks/catalog.js';
import { checkTasks } from '../../checks/tasks.js';
import { checkMusicTables } from '../../checks/music.js';
import { checkTimelineChain } from '../../checks/reflect.js';
import { checkIndexes, checkProblems, checkInterpretations } from '../../checks/indexes.js';
import { checkLinks } from '../../checks/links.js';
import { checkMarkdownRules } from '../../markdown/md-engine.js';
import { checkTables, checkTableCells, checkTableColumns, checkHeadingTemplates, checkHeadingEmoji, checkHeadingSlugs } from '../../checks/structure.js';
import { checkJson } from '../../checks/json.js';
import { checkFrontMatter } from '../../checks/frontmatter.js';
import { checkSecrets, checkHistory } from '../../checks/secrets.js';
import { checkLfsPolicy, checkCaseCollisions } from '../../checks/tooling.js';
import { checkContent } from '../../checks/content.js';
import { checkCoverage } from '../../checks/coverage.js';

function checkGitFsck(repoDir) {
  const r = spawnSync('git', ['fsck', '--full'], { cwd: repoDir, encoding: 'utf8' });
  if (r.error || r.status !== 0) {
    const detail = `${r.stderr || r.stdout || ''}`.trim().split('\n').slice(0, 8).join(' | ');
    return [`git fsck failed: ${detail || `exit ${r.status}`}`];
  }
  return [];
}

const checks = [
  checkLinks,
  checkMarkdownRules,
  checkTables,
  checkTableCells,
  checkTableColumns,
  checkHeadingTemplates,
  checkHeadingEmoji,
  checkHeadingSlugs,
  checkJson,
  checkFrontMatter,
  checkFood,
  checkBuyTables,
  checkBuyPlans,
  checkNutrition,
  checkStatus,
  checkCatalog,
  checkTasks,
  checkMusicTables,
  checkTimelineChain,
  checkIndexes,
  checkProblems,
  checkInterpretations,
  checkSecrets,
  checkHistory,
  checkLfsPolicy,
  checkCaseCollisions,
  checkGitFsck,
  checkContent,
  checkCoverage,
];

test('content checks pass on the entire repo', async () => {
  const errors = [];
  for (const check of checks) {
    errors.push(...(await check(REPO_DIR)));
  }
  assert.equal(errors.length, 0, errors.slice(0, 20).join('\n'));
});
