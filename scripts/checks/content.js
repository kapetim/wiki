// Unified content gate — FORBID regexes vs ALLOW regexes.
// For each line with a forbidden match, the whole matched word is extracted;
// if any ALLOW regex matches that word, the hit is allowed, otherwise it's an error.

import path from 'node:path';
import { readFile } from 'node:fs/promises';
import { walkMd } from '../shared/md-walk.js';

export const FORBID = [
  // racism / slurs (starter — curate as needed; `spic` is exact so "Spicer" never matches)
  { name: 'racial slur', re: /\b(nigg\w*|chink|gook|kike|wetback|beaner|spic|coon|darkie|darky|redskin)\b/gi },
  // piracy
  { name: 'torrent', re: /\btorrent\w*/gi },
  // catch-all URLs — one entry in the same forbid list
  { name: 'external URL', re: /https?:\/\/[^\s"'<>)\]>]+/gi },
];

// Whole-domain allow entries (any path under the domain is fine).
// xvideos.com / pornhub.com are whole-domain because their bare root is in use.
const WHOLE_DOMAINS = [
  'google.com', 'github.com', 'youtube.com', 'youtu.be', 'spotify.com',
  'deepseek.com', 'webex.com',
  // news / podcast sources
  'npr.org', 'wsj.com', 'nytimes.com', 'bbc.co.uk', 'economist.com',
  'radiolab.org', 'radioambulante.org', 'ke-buena.com', 'dancarlin.com',
  'vox.com', 'philosophybites.com', 'tim.blog', 'b9.com.br',
  // porn sites
  'xvideos.com', 'pornhub.com',
  'erome.tv', 'redtube.com', 'xhamster.com', 'xnxx.com', 'youporn.com',
  'x-video.tube', 'x-x-x.tube', 'erothots.co', 'pornolandia.xxx', 'xxbrits.com', 'eporner.com',
  'celebexposed.com', 'fapeza.com',
  'bodgirls.com', 'ultrathots.com', 'theyarehuge.com', 'fappeningbook.com',
  'leakedzone.com', 'leakgallery.com', 'noodlemagazine.com', 'boobieblog.com',
  'goonello.com', 'babepedia.com', 'bustysource.com', 'thefap.net',
  'oneprotests.thefap.net', 'pimpbunny.com', 'twpornstars.com', 'bingato.com',
  'filavi.com', 'tik.porn', 'collections.porn', 'cnnamador.com',
];

// Prefix-restricted porn entries — only these paths are allowed.
const PORN_PREFIXES = [
  'reddit.com/user', 'reddit.com/r',
  'tnaflix.com/search', 'tnaflix.com/big-boobs',
];

function escape(segment) {
  return segment.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function prefixRe(host, pathSegments) {
  const hostRe = `(?:[^/]*\\.)?${escape(host)}`;
  const pathRe = pathSegments.length
    ? '/' + pathSegments.map(escape).join('/')
    : '';
  return new RegExp(`^https?://${hostRe}${pathRe}`, 'i');
}

export const ALLOW = [
  ...WHOLE_DOMAINS.map((d) => prefixRe(d, [])),
  ...PORN_PREFIXES.map((p) => {
    const [host, ...rest] = p.split('/');
    return prefixRe(host, rest);
  }),
];

export async function checkContent(repoDir) {
  const errors = [];
  const files = await walkMd(repoDir);
  for (const file of files) {
    const rel = path.relative(repoDir, file).split(path.sep).join('/');
    const lines = (await readFile(file, 'utf8')).split('\n');
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      for (const { name, re } of FORBID) {
        re.lastIndex = 0;
        for (const m of line.matchAll(re)) {
          const word = m[0];
          if (ALLOW.some((a) => a.test(word))) continue;
          errors.push(`${rel}:${i + 1}:${m.index + 1} forbidden "${name}": "${word}"`);
        }
      }
    }
  }
  return errors;
}
