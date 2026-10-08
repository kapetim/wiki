// The tasks views must match scripts/data/tasks/*.json.
import path from 'node:path';
import { readFile } from 'node:fs/promises';
import { buildViews } from '../tools/sync-tasks.js';

export async function checkTasksSync(repoDir) {
  const errors = [];
  const views = await buildViews(repoDir);
  for (const [rel, expected] of Object.entries(views)) {
    let actual;
    try { actual = await readFile(path.join(repoDir, rel), 'utf8'); }
    catch { errors.push(`${rel}: missing (run: npm run tasks)`); continue; }
    if (actual !== expected) errors.push(`${rel}: out of sync with the tasks data (run: npm run tasks)`);
  }
  return errors;
}
