// The consumables views must match scripts/data/consumables/*.json.
import path from 'node:path';
import { readFile } from 'node:fs/promises';
import { buildViews } from '../tools/sync-consumables.js';

export async function checkConsumablesSync(repoDir) {
  const errors = [];
  const views = await buildViews(repoDir);
  for (const [rel, expected] of Object.entries(views)) {
    let actual;
    try { actual = await readFile(path.join(repoDir, rel), 'utf8'); }
    catch { errors.push(`${rel}: missing (run: npm run consumables)`); continue; }
    if (actual !== expected) errors.push(`${rel}: out of sync with the consumables data (run: npm run consumables)`);
  }
  return errors;
}
