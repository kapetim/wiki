// Internal link integrity for src/ — relative targets exist and anchors
// resolve to a heading. Fragment matching uses the same GitHub/MD051 algorithm
// as markdownlint (see fragments.js) for same-file and cross-file anchors.

import path from 'node:path';
import { readFile, access } from 'node:fs/promises';
import { walkMd } from '../shared/md-walk.js';
import { fragment, anchorFragment } from '../shared/fragments.js';

const LINK_RE = /\[[^\]]*\]\(([^()\s]+)\)/g;
const LINE_REF_RE = /^L\d+(?:C\d+)?(?:-L\d+(?:C\d+)?)?$/;

async function headingFragments(file) {
  const text = await readFile(file, 'utf8');
  const slugs = new Set(['top']);
  for (const line of text.split('\n')) {
    const m = line.match(/^#{1,6}\s+(.*)$/);
    if (m) {
      const heading = m[1].replace(/\[([^\]]*)\]\([^)]*\)/g, '$1');
      slugs.add(fragment(heading));
    }
  }
  return slugs;
}

export async function checkLinks(repoDir) {
  const errors = [];
  const files = await walkMd(repoDir);

  for (const file of files) {
    const rel = path.relative(repoDir, file).split(path.sep).join('/');
    const text = await readFile(file, 'utf8');
    let m;
    LINK_RE.lastIndex = 0;
    while ((m = LINK_RE.exec(text)) !== null) {
      const target = m[1];
      if (/^(https?:|mailto:|tel:)/.test(target)) continue;

      const [p, anchor] = target.split('#');
      let resolved = null;
      if (p) {
        resolved = path.resolve(path.dirname(file), p);
        try {
          await access(resolved);
        } catch {
          errors.push(`${rel}: broken link -> ${target}`);
          continue;
        }
      }

      if (anchor) {
        // Line refs (#L123 / #L12C5-L34C9) point at a line, not a heading — skip the slug check.
        if (LINE_REF_RE.test(decodeURIComponent(anchor))) continue;
        const anchorFile = resolved ? resolved : file;
        const slugs = await headingFragments(anchorFile);
        if (!slugs.has(anchorFragment(anchor))) {
          errors.push(`${rel}: broken anchor -> ${target}`);
        }
      }
    }
  }

  return errors;
}
