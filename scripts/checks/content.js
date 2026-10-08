// Unified content gate — FORBID regexes vs ALLOW regexes.
// For each line with a forbidden match, the whole matched word is extracted;
// if any ALLOW regex matches that word, the hit is allowed, otherwise it's an error.

import fs from 'node:fs';
import path from 'node:path';
import { readFile } from 'node:fs/promises';
import { walkMd } from '../shared/md-walk.js';

function escape(segment) {
  return segment.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Forbidden-word tiers live in scripts/config/blocklist.json. Exact matchers are
// word-boundary anchored; prefix matchers allow trailing letters (plural/derived).
const BLOCKLIST = JSON.parse(
  fs.readFileSync(new URL('../config/blocklist.json', import.meta.url), 'utf8'),
);

// `exact` = whole word; `prefix` = word + any trailing letters; `contains` =
// any letters around the root (catches embedded/compounded forms); `regex` =
// raw patterns for things a word list can't express (PII, formats).
function tierRe({ exact = [], prefix = [], contains = [], regex = [] }) {
  const wordParts = [
    ...exact.map((w) => escape(w)),
    ...prefix.map((w) => `${escape(w)}\\w*`),
    ...contains.map((w) => `\\w*${escape(w)}\\w*`),
  ];
  const parts = [];
  if (wordParts.length) parts.push(`\\b(${wordParts.join('|')})\\b`);
  parts.push(...regex);
  return parts.length ? new RegExp(parts.join('|'), 'gi') : null;
}

export const FORBID = [
  ...Object.entries(BLOCKLIST)
    .map(([name, spec]) => ({ name, re: tierRe(spec) }))
    .filter(({ re }) => re),
  // catch-all URLs — one entry in the same forbid list
  { name: 'external URL', re: /https?:\/\/[^\s"'<>)\]>]+/gi },
];

// Whole-domain allow entries (any path under the domain is fine).
const WHOLE_DOMAINS = [
  'google.com', 'github.com', 'youtube.com', 'youtu.be', 'spotify.com',
  'deepseek.com', 'webex.com',
  // news / podcast sources
  'npr.org', 'wsj.com', 'nytimes.com', 'bbc.co.uk', 'economist.com',
  'radiolab.org', 'radioambulante.org', 'ke-buena.com', 'dancarlin.com',
  'vox.com', 'philosophybites.com', 'tim.blog', 'b9.com.br',
];

function prefixRe(host, pathSegments) {
  const hostRe = `(?:[^/]*\\.)?${escape(host)}`;
  const pathRe = pathSegments.length
    ? '/' + pathSegments.map(escape).join('/')
    : '';
  return new RegExp(`^https?://${hostRe}${pathRe}`, 'i');
}

export const ALLOW = [
  ...WHOLE_DOMAINS.map((d) => prefixRe(d, [])),
];

export async function checkContent(repoDir) {
  const errors = [];
  const files = await walkMd(repoDir);
  for (const file of files) {
    const rel = path.relative(repoDir, file).split(path.sep).join('/');
    const lines = (await readFile(file, 'utf8')).split('\n');
    const seen = new Set();
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      for (const { name, re } of FORBID) {
        re.lastIndex = 0;
        for (const m of line.matchAll(re)) {
          const word = m[0];
          if (!word) continue;
          if (ALLOW.some((a) => a.test(word))) continue;
          const key = `${i}:${m.index}:${word.toLowerCase()}`;
          if (seen.has(key)) continue;
          seen.add(key);
          errors.push(`${rel}:${i + 1}:${m.index + 1} forbidden "${name}": "${word}"`);
        }
      }
    }
  }
  return errors;
}
