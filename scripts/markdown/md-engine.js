// Markdown validation engine — parses each file once into a token tree
// (md-ast.js) and runs the four rule modules against the shared tree.
// Produces detect-only errors: { line, col, rule, message }.

import path from 'node:path';
import { readFile } from 'node:fs/promises';
import { walkMd } from '../shared/md-walk.js';
import { parse } from './md-ast.js';
import { checkMdShape } from './md-rules-shape.js';
import { checkMdFormat } from './md-rules-format.js';
import { checkMdInline } from './md-rules-inline.js';
import { checkMdStyle } from './md-rules-style.js';

export const FRONT_MATTER = /^---\n[\s\S]*?\n---\n?/;

function removeFrontMatter(content) {
  let frontMatterLines = [];
  const frontMatterMatch = content.match(FRONT_MATTER);
  if (frontMatterMatch && !frontMatterMatch.index) {
    const contentMatched = frontMatterMatch[0];
    content = content.slice(contentMatched.length);
    frontMatterLines = contentMatched.split(/\r\n?|\n/g);
    if ((frontMatterLines.length > 0) && (frontMatterLines[frontMatterLines.length - 1] === '')) {
      frontMatterLines.length--;
    }
  }
  return { content, frontMatterLines };
}

export function parseFile(raw) {
  const { content, frontMatterLines } = removeFrontMatter(raw);
  const lines = content.split('\n');
  const tokens = parse(content);
  return { tokens, lines, frontMatterLines };
}

export function runRules(params, config) {
  const errors = [];
  const ctx = {
    name: params.name,
    tokens: params.parsers.micromark.tokens,
    lines: params.lines,
    frontMatterLines: params.frontMatterLines,
    config,
    err(line, col, rule, message) {
      errors.push({ line, col, rule, message });
    },
  };
  checkMdShape(ctx);
  checkMdFormat(ctx);
  checkMdInline(ctx);
  checkMdStyle(ctx);
  return errors;
}

export async function checkMdValidation(repoDir, config) {
  const errors = [];
  const files = await walkMd(repoDir);
  for (const file of files) {
    const rel = path.relative(repoDir, file).split(path.sep).join('/');
    const raw = await readFile(file, 'utf8');
    const { tokens, lines, frontMatterLines } = parseFile(raw);
    const ruleErrors = runRules(
      { name: rel, parsers: { micromark: { tokens } }, lines, frontMatterLines },
      config,
    );
    for (const e of ruleErrors) {
      errors.push(`${rel}:${e.line}:${e.col} ${e.rule} ${e.message}`);
    }
  }
  return errors;
}

// Integration-check wrapper — validates src/ (matching the former markdownlint
// gate, which also ran on src/ only), reads the central config, and returns
// string errors like the other check* functions in scripts/checks.
export async function checkMarkdownRules(repoDir) {
  const configPath = path.join(repoDir, 'scripts', 'markdown', 'markdown-rules.json');
  const config = JSON.parse(await readFile(configPath, 'utf8'));
  const srcDir = path.join(repoDir, 'src');
  return checkMdValidation(srcDir, config);
}
