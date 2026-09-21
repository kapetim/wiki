// Shape/structure rules — document renderability, heading structure, code
// fences, and the repo's emoji-heading convention. Ported from markdownlint
// (MD001/013/025/040/041/046/048) plus custom renderability + emoji checks.

import { micromark } from 'micromark';
import {
  filterByTypes, getHeadingLevel, getHeadingText,
  addRangeToSet, getReferenceLinkImageData, frontMatterHasTitle,
  nonContentTokens, isHtmlFlowComment, getHtmlTagInfo, getDescendantsByType,
} from './md-helpers.js';
import { htmlFlowSymbol } from './md-ast.js';

const headingTagNameRe = /^h[1-6]$/;
const notWrappableRe = /^(?:[#>\s]*\s)?\S*$/;

function renderedLength(line) {
  const html = micromark(line, { allowDangerousHtml: true });
  const text = html
    .replace(/<[^>]*>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"');
  return [...text.trim()].length;
}

function md001(ctx) {
  const { tokens, config } = ctx;
  const hasTitle = frontMatterHasTitle(ctx.frontMatterLines, config.heading_front_matter_title);
  let prevLevel = hasTitle ? 1 : Number.MAX_SAFE_INTEGER;
  for (const heading of filterByTypes(tokens, ['atxHeading', 'setextHeading'])) {
    const level = getHeadingLevel(heading);
    if (level > prevLevel) {
      const expected = prevLevel + 1;
      if (level !== expected) {
        ctx.err(heading.startLine, heading.startColumn, 'MD001', `Heading level jumps from h${prevLevel} to h${level} (expected h${expected})`);
      }
    }
    prevLevel = level;
  }
}

function md013(ctx) {
  const { tokens, lines, config } = ctx;
  const lineLength = Number(config.line_length?.line_length ?? 80);
  const headingLineLength = Number(config.line_length?.heading_line_length ?? lineLength);
  const codeLineLength = Number(config.line_length?.code_block_line_length ?? lineLength);
  const strict = !!config.line_length?.strict;
  const stern = !!config.line_length?.stern;
  const includeCodeBlocks = config.line_length?.code_blocks ?? true;
  const includeTables = config.line_length?.tables ?? true;
  const includeHeadings = config.line_length?.headings ?? true;

  const headingLineNumbers = new Set();
  for (const heading of filterByTypes(tokens, ['atxHeading', 'setextHeading'])) {
    addRangeToSet(headingLineNumbers, heading.startLine, heading.endLine);
  }
  const codeBlockLineNumbers = new Set();
  for (const codeBlock of filterByTypes(tokens, ['codeFenced', 'codeIndented'])) {
    addRangeToSet(codeBlockLineNumbers, codeBlock.startLine, codeBlock.endLine);
  }
  const tableLineNumbers = new Set();
  for (const table of filterByTypes(tokens, ['table'])) {
    addRangeToSet(tableLineNumbers, table.startLine, table.endLine);
  }
  const linkLineNumbers = new Set();
  for (const link of filterByTypes(tokens, ['autolink', 'image', 'link', 'literalAutolink'])) {
    addRangeToSet(linkLineNumbers, link.startLine, link.endLine);
  }
  const paragraphDataLineNumbers = new Set();
  for (const paragraph of filterByTypes(tokens, ['paragraph'])) {
    for (const data of getDescendantsByType(paragraph, ['data'])) {
      addRangeToSet(paragraphDataLineNumbers, data.startLine, data.endLine);
    }
  }
  const linkOnlyLineNumbers = new Set();
  for (const lineNumber of linkLineNumbers) {
    if (!paragraphDataLineNumbers.has(lineNumber)) linkOnlyLineNumbers.add(lineNumber);
  }
  const definitionLineIndices = new Set(getReferenceLinkImageData(tokens).definitionLineIndices);

  for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
    const line = lines[lineIndex];
    const lineNumber = lineIndex + 1;
    const isHeading = headingLineNumbers.has(lineNumber);
    const inCode = codeBlockLineNumbers.has(lineNumber);
    const inTable = tableLineNumbers.has(lineNumber);
    let maxLength = lineLength;
    if (inCode) maxLength = codeLineLength;
    else if (isHeading) maxLength = headingLineLength;
    const text = (strict || stern) ? line : line.replace(/\S*$/u, '#');
    if (
      maxLength > 0
      && (includeCodeBlocks || !inCode)
      && (includeTables || !inTable)
      && (includeHeadings || !isHeading)
      && !definitionLineIndices.has(lineIndex)
      && (strict || (!(stern && notWrappableRe.test(line)) && !linkOnlyLineNumbers.has(lineNumber)))
      && (renderedLength(text) > maxLength)
    ) {
      ctx.err(lineNumber, maxLength + 1, 'MD013', `Line renders to ${renderedLength(text)} chars (max ${maxLength})`);
    }
  }
}

function md025(ctx) {
  const { tokens, config } = ctx;
  const level = Number(config.heading_level ?? 1);
  const matchingHeadings = filterByTypes(tokens, ['atxHeading', 'setextHeading'])
    .filter((heading) => level === getHeadingLevel(heading));
  if (matchingHeadings.length > 0) {
    const foundFrontMatterTitle = frontMatterHasTitle(ctx.frontMatterLines, config.heading_front_matter_title);
    let hasTopLevelHeading = foundFrontMatterTitle;
    if (!hasTopLevelHeading) {
      const previousTokens = tokens.slice(0, tokens.indexOf(matchingHeadings[0]));
      hasTopLevelHeading = previousTokens.every(
        (token) => nonContentTokens.has(token.type) || isHtmlFlowComment(token),
      );
    }
    if (hasTopLevelHeading) {
      for (const heading of matchingHeadings.slice(foundFrontMatterTitle ? 0 : 1)) {
        ctx.err(heading.startLine, heading.startColumn, 'MD025', `Multiple top-level headings — "${getHeadingText(heading)}"`);
      }
    }
  }
}

function md040(ctx) {
  const { tokens, config } = ctx;
  const allowed = config.fenced_code_languages ?? [];
  const fencedCodes = filterByTypes(tokens, ['codeFenced']);
  for (const fencedCode of fencedCodes) {
    const openingFence = getDescendantsByType(fencedCode, ['codeFencedFence'])[0];
    const info = getDescendantsByType(openingFence, ['codeFencedFenceInfo'])[0]?.text;
    if (!info) {
      ctx.err(fencedCode.startLine, fencedCode.startColumn, 'MD040', 'Fenced code block missing a language');
    } else if (allowed.length > 0 && !allowed.includes(info)) {
      ctx.err(fencedCode.startLine, fencedCode.startColumn, 'MD040', `"${info}" is not an allowed language`);
    }
  }
}

function md041(ctx) {
  const { tokens, config } = ctx;
  const allowPreamble = !!config.heading_allow_preamble;
  const level = Number(config.heading_level ?? 1);
  if (!frontMatterHasTitle(ctx.frontMatterLines, config.heading_front_matter_title)) {
    let errorLineNumber = 0;
    for (const token of tokens) {
      const { startLine, type } = token;
      if (!nonContentTokens.has(type) && !isHtmlFlowComment(token)) {
        if (type === 'atxHeading' || type === 'setextHeading') {
          if (getHeadingLevel(token) !== level) errorLineNumber = startLine;
          break;
        } else if (Object.hasOwn(token, htmlFlowSymbol)) {
          const htmlTexts = filterByTypes(token.children, ['htmlText'], true);
          const tagInfo = (htmlTexts.length > 0) && getHtmlTagInfo(htmlTexts[0]);
          if (tagInfo && headingTagNameRe.test(tagInfo.name)) {
            if (tagInfo.name !== `h${level}`) errorLineNumber = startLine;
            break;
          }
          if (!allowPreamble) { errorLineNumber = startLine; break; }
        } else if (!allowPreamble) {
          errorLineNumber = startLine;
          break;
        }
      }
    }
    if (errorLineNumber > 0) {
      ctx.err(errorLineNumber, 1, 'MD041', 'File must start with a top-level heading');
    }
  }
}

function md046(ctx) {
  const { tokens } = ctx;
  for (const token of filterByTypes(tokens, ['codeFenced', 'codeIndented'])) {
    const style = token.type === 'codeFenced' ? 'fenced' : 'indented';
    if (style !== 'fenced') {
      ctx.err(token.startLine, token.startColumn, 'MD046', 'Indented code block — use fenced code blocks');
    }
  }
}

function md048(ctx) {
  const { tokens } = ctx;
  for (const codeBlock of filterByTypes(tokens, ['codeFenced'])) {
    const sequences = getDescendantsByType(codeBlock, ['codeFencedFence', 'codeFencedFenceSequence']);
    for (const sequence of sequences) {
      if (!sequence.text.startsWith('`')) {
        ctx.err(sequence.startLine, sequence.startColumn, 'MD048', 'Code fences must use backticks');
      }
    }
  }
}

function emojiHeading(ctx) {
  const { tokens } = ctx;
  for (const heading of filterByTypes(tokens, ['atxHeading', 'setextHeading'])) {
    const headingText = getHeadingText(heading);
    const first = headingText.trimStart()[0];
    if (first === undefined || /\p{ASCII}/u.test(first)) {
      ctx.err(heading.startLine, heading.startColumn, 'emoji-heading', 'Heading must start with an emoji');
    }
  }
}

function renderability(ctx) {
  const { tokens } = ctx;
  // The token tree is built by micromark regardless of malformed input, so
  // "renderability" here is a light structural sanity check: every fenced
  // code block and table is well-formed per the token tree. Table column
  // counts / cell lengths are enforced by the structure.js superset.
  for (const token of filterByTypes(tokens, ['codeFenced'])) {
    const fence = getDescendantsByType(token, ['codeFencedFence']);
    if (fence.length === 0 || fence.length > 2) {
      ctx.err(token.startLine, token.startColumn, 'renderability', 'Malformed fenced code block');
    }
  }
}

export function checkMdShape(ctx) {
  md001(ctx);
  md013(ctx);
  md025(ctx);
  md040(ctx);
  md041(ctx);
  md046(ctx);
  md048(ctx);
  emojiHeading(ctx);
  renderability(ctx);
}
