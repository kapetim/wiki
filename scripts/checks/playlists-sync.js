// The playlists views must match the JSON source of truth (scripts/data/playlists).
import path from 'node:path';
import { readFile } from 'node:fs/promises';
import { buildViews } from '../tools/sync-playlists.js';

export async function checkPlaylistsSync(repoDir) {
  const errors = [];
  const views = await buildViews(repoDir);
  for (const [rel, expected] of Object.entries(views)) {
    let actual;
    try {
      actual = await readFile(path.join(repoDir, rel), 'utf8');
    } catch {
      errors.push(`${rel}: missing (run: npm run playlists)`);
      continue;
    }
    if (actual !== expected) errors.push(`${rel}: out of sync with the JSON source (run: npm run playlists)`);
  }
  return errors;
}
