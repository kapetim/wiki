// JSON hygiene — every .json file parses cleanly.

import path from 'node:path';
import { readFile, readdir } from 'node:fs/promises';

export async function checkJson(repoDir) {
  const errors = [];
  const files = [];
  const walk = async (dir) => {
    for (const e of await readdir(dir, { withFileTypes: true })) {
      if (e.name === '.git' || e.name === 'node_modules') continue;
      const p = path.join(dir, e.name);
      if (e.isDirectory()) await walk(p);
      else if (e.name.endsWith('.json')) files.push(p);
    }
  };
  await walk(repoDir);

  for (const f of files) {
    const rel = path.relative(repoDir, f).split(path.sep).join('/');
    try {
      JSON.parse(await readFile(f, 'utf8'));
    } catch (e) {
      errors.push(`${rel}: invalid JSON (${e.message})`);
    }
  }

  return errors;
}
