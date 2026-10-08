// Front-matter validity — the `---…---` block at the top of a file must parse
// as a single YAML mapping. markdownlint strips front matter, so nothing else
// validates it.

import path from 'node:path';
import { readFile } from 'node:fs/promises';
import { load } from 'js-yaml';
import { walkMd, FRONT_MATTER } from '../shared/md-walk.js';

export async function checkFrontMatter(repoDir) {
  const errors = [];
  const files = await walkMd(repoDir);

  for (const f of files) {
    const rel = path.relative(repoDir, f).split(path.sep).join('/');
    const text = await readFile(f, 'utf8');
    const m = text.match(FRONT_MATTER);
    if (!m) continue;

    const body = m[0].replace(/^---\n/, '').replace(/\n---\n?$/, '');
    let doc;
    try {
      doc = load(body, { filename: rel });
    } catch (e) {
      errors.push(`${rel}: front matter is not valid YAML — ${e.message.split('\n')[0]}`);
      continue;
    }
    if (doc === undefined) {
      errors.push(`${rel}: front matter is empty`);
    } else if (typeof doc !== 'object' || Array.isArray(doc)) {
      errors.push(`${rel}: front matter must be a YAML mapping`);
    }
  }

  return errors;
}
