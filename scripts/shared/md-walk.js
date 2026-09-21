import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';

export const FRONT_MATTER = /^---\n[\s\S]*?\n---\n?/;

// Walks every .md under repoDir. Skip-list: version control, dependencies, and
// test directories (test/ is fixtures + unit/integration test files — never
// repo content). .opencode is opencode tooling, not repo content.
export async function walkMd(repoDir) {
  const files = [];
  const walk = async (dir) => {
    const entries = await readdir(dir, { withFileTypes: true });
    for (const e of entries) {
      if (e.name === '.git' || e.name === 'node_modules' || e.name === '.opencode' || e.name === 'test') continue;
      const full = path.join(dir, e.name);
      if (e.isDirectory()) await walk(full);
      else if (e.name.endsWith('.md')) files.push(full);
    }
  };
  await walk(repoDir);
  return files;
}

export async function readMdStrings(files) {
  const strings = {};
  for (const f of files) strings[f] = await readFile(f, 'utf8');
  return strings;
}
