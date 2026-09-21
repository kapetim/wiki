// Format rules — whitespace, blank lines, ATX heading spacing, blockquotes,
// fences, hr, emphasis-as-heading, EOF newline. Ported from markdownlint
// (MD009/010/012/014/018/019/020/021/022/023/026/027/028/031/032/035/036/047).

import {
  filterByTypes, getDescendantsByType, getHeadingStyle,
  addRangeToSet,
  isBlankLine, escapeForRegExp, nonContentTokens, filterByPredicate,
  hasOverlap,
} from './md-helpers.js';

const allPunctuationNoQuestion = '.,;:!\u3002\uff0c\uff1b\uff1a\uff01';
const allPunctuation = '.,;:!?\u3002\uff0c\uff1b\uff1a\uff01\uff1f';

function md009(ctx) {
  const { tokens, lines, config } = ctx;
  const brSpaces = Number(config.trailing_spaces_br ?? 2);
  const includeCode = config.trailing_spaces_code ?? false;
  const strict = config.trailing_spaces_strict ?? false;
  const codeBlockLineNumbers = new Set();
  if (!includeCode) {
    for (const codeBlock of filterByTypes(tokens, ['codeFenced'])) {
      addRangeToSet(codeBlockLineNumbers, codeBlock.startLine + 1, codeBlock.endLine - 1);
    }
    for (const codeBlock of filterByTypes(tokens, ['codeIndented'])) {
      addRangeToSet(codeBlockLineNumbers, codeBlock.startLine, codeBlock.endLine);
    }
  }
  const paragraphLineNumbers = new Set();
  const codeInlineLineNumbers = new Set();
  if (strict) {
    for (const paragraph of filterByTypes(tokens, ['paragraph'])) {
      addRangeToSet(paragraphLineNumbers, paragraph.startLine, paragraph.endLine - 1);
    }
    for (const codeText of filterByTypes(tokens, ['codeText'])) {
      addRangeToSet(codeInlineLineNumbers, codeText.startLine, codeText.endLine - 1);
    }
  }
  const expected = (brSpaces < 2) ? 0 : brSpaces;
  for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
    const line = lines[lineIndex];
    const lineNumber = lineIndex + 1;
    const trailingSpaces = line.length - line.trimEnd().length;
    if (
      trailingSpaces
      && !codeBlockLineNumbers.has(lineNumber)
      && (expected !== trailingSpaces || (strict && (!paragraphLineNumbers.has(lineNumber) || codeInlineLineNumbers.has(lineNumber))))
    ) {
      ctx.err(lineNumber, line.length - trailingSpaces + 1, 'MD009', `Trailing spaces (${trailingSpaces})`);
    }
  }
}

function md010(ctx) {
  const { tokens, lines, config } = ctx;
  const tabRe = /\t+/g;
  const includeCode = config.hard_tabs_code ?? true;
  const exclusionTypes = [];
  if (!includeCode) exclusionTypes.push('codeFenced', 'codeIndented', 'codeText');
  const codeTokens = filterByTypes(tokens, exclusionTypes);
  const codeRanges = codeTokens.map((token) => {
    const { type, startLine, startColumn, endLine, endColumn } = token;
    const codeFenced = type === 'codeFenced';
    return {
      startLine: startLine + (codeFenced ? 1 : 0),
      startColumn: codeFenced ? 0 : startColumn,
      endLine: endLine - (codeFenced ? 1 : 0),
      endColumn: codeFenced ? Number.MAX_SAFE_INTEGER : endColumn,
    };
  });
  for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
    const line = lines[lineIndex];
    let match;
    while ((match = tabRe.exec(line)) !== null) {
      const lineNumber = lineIndex + 1;
      const column = match.index + 1;
      const length = match[0].length;
      const range = { startLine: lineNumber, startColumn: column, endLine: lineNumber, endColumn: column + length - 1 };
      if (!codeRanges.some((codeRange) => hasOverlap(codeRange, range))) {
        ctx.err(lineNumber, column, 'MD010', 'Hard tab');
      }
    }
  }
}

function md012(ctx) {
  const { tokens, lines } = ctx;
  const maximum = 1;
  const codeBlockLineNumbers = new Set();
  for (const codeBlock of filterByTypes(tokens, ['codeFenced', 'codeIndented'])) {
    addRangeToSet(codeBlockLineNumbers, codeBlock.startLine, codeBlock.endLine);
  }
  let count = 0;
  for (const [lineIndex, line] of lines.entries()) {
    const inCode = codeBlockLineNumbers.has(lineIndex + 1);
    count = (inCode || (line.trim().length > 0)) ? 0 : count + 1;
    if (maximum < count) {
      ctx.err(lineIndex + 1, 1, 'MD012', `Multiple consecutive blank lines (${count})`);
    }
  }
}

function md014(ctx) {
  const { tokens } = ctx;
  const dollarCommandRe = /^(\s*)(\$\s+)/;
  for (const codeBlock of filterByTypes(tokens, ['codeFenced', 'codeIndented'])) {
    const codeFlowValues = codeBlock.children.filter((child) => child.type === 'codeFlowValue');
    const dollarMatches = codeFlowValues
      .map((codeFlowValue) => ({
        result: codeFlowValue.text.match(dollarCommandRe),
        startColumn: codeFlowValue.startColumn,
        startLine: codeFlowValue.startLine,
        text: codeFlowValue.text,
      }))
      .filter((dollarMatch) => dollarMatch.result);
    if (dollarMatches.length === codeFlowValues.length) {
      for (const dollarMatch of dollarMatches) {
        ctx.err(dollarMatch.startLine, dollarMatch.startColumn + dollarMatch.result[1].length, 'MD014', 'Dollar sign used for command without showing output');
      }
    }
  }
}

function validateHeadingSpaces(ctx, heading, delta) {
  const { children, startLine, text } = heading;
  let index = delta > 0 ? 0 : (children.length - 1);
  while (children[index] && children[index].type !== 'atxHeadingSequence') {
    index += delta;
  }
  const headingSequence = children[index];
  const whitespace = children[index + delta];
  if (headingSequence?.type === 'atxHeadingSequence' && whitespace?.type === 'whitespace' && whitespace.text.length > 1) {
    const column = whitespace.startColumn + 1;
    ctx.err(startLine, column, delta > 0 ? 'MD019' : 'MD021', `Multiple spaces in ${delta > 0 ? 'leading' : 'trailing'} ATX heading — "${text.trim()}"`);
  }
}

function md018(ctx) {
  const { tokens, lines } = ctx;
  const ignoreBlockLineNumbers = new Set();
  for (const ignoreBlock of filterByTypes(tokens, ['codeFenced', 'codeIndented', 'htmlFlow'])) {
    addRangeToSet(ignoreBlockLineNumbers, ignoreBlock.startLine, ignoreBlock.endLine);
  }
  for (const [lineIndex, line] of lines.entries()) {
    if (!ignoreBlockLineNumbers.has(lineIndex + 1) && /^#+[^# \t]/.test(line) && !/#\s*$/.test(line) && !line.startsWith('#️⃣')) {
      const hashCount = /^#+/.exec(line)[0].length;
      ctx.err(lineIndex + 1, hashCount + 1, 'MD018', 'No space after hash on ATX heading');
    }
  }
}

function md020(ctx) {
  const { tokens, lines } = ctx;
  const ignoreBlockLineNumbers = new Set();
  for (const ignoreBlock of filterByTypes(tokens, ['codeFenced', 'codeIndented', 'htmlFlow'])) {
    addRangeToSet(ignoreBlockLineNumbers, ignoreBlock.startLine, ignoreBlock.endLine);
  }
  for (const [lineIndex, line] of lines.entries()) {
    if (!ignoreBlockLineNumbers.has(lineIndex + 1)) {
      const match = /^(#+)([ \t]*)([^# \t\\]|[^# \t][^#]*?[^# \t\\])([ \t]*)((?:\\#)?)(#+)(\s*)$/.exec(line);
      if (match) {
        const [, , , , , rightEscape, , trailSpaceLengthStr] = match;
        const trailSpaceLength = trailSpaceLengthStr.length;
        const rightHash = match[6];
        const rightHashLength = rightHash.length;
        const leftSpaceLength = match[2].length;
        const left = !leftSpaceLength;
        const right = !match[4].length || !!rightEscape;
        if (left || right) {
          const column = left ? 1 : line.length - trailSpaceLength - rightHashLength;
          ctx.err(lineIndex + 1, column, 'MD020', 'No space inside closed ATX heading');
        }
      }
    }
  }
}

function md019md021(ctx) {
  const { tokens } = ctx;
  for (const heading of filterByTypes(tokens, ['atxHeading'])) {
    const style = getHeadingStyle(heading);
    if (style === 'atx') {
      validateHeadingSpaces(ctx, heading, 1);
    } else if (style === 'atx_closed') {
      validateHeadingSpaces(ctx, heading, 1);
      validateHeadingSpaces(ctx, heading, -1);
    }
  }
}

function md022(ctx) {
  const { tokens, lines } = ctx;
  const linesAbove = 1;
  const linesBelow = 1;
  for (const heading of filterByTypes(tokens, ['atxHeading', 'setextHeading'])) {
    const { startLine, endLine } = heading;
    let actualAbove = 0;
    for (let i = 0; (i < linesAbove) && isBlankLine(lines[startLine - 2 - i]); i++) actualAbove++;
    if (actualAbove < linesAbove) {
      ctx.err(startLine, 1, 'MD022', `Heading must have ${linesAbove} blank line(s) above`);
    }
    let actualBelow = 0;
    for (let i = 0; (i < linesBelow) && isBlankLine(lines[endLine + i]); i++) actualBelow++;
    if (actualBelow < linesBelow) {
      ctx.err(endLine + 1, 1, 'MD022', `Heading must have ${linesBelow} blank line(s) below`);
    }
  }
}

function md023(ctx) {
  const { tokens } = ctx;
  const headings = filterByTypes(tokens, ['atxHeading', 'linePrefix', 'setextHeading']);
  for (let i = 0; i < headings.length - 1; i++) {
    if (headings[i].type === 'linePrefix' && headings[i + 1].type !== 'linePrefix' && headings[i].startLine === headings[i + 1].startLine) {
      ctx.err(headings[i].startLine, headings[i].startColumn, 'MD023', 'Heading must start at the beginning of the line');
    }
  }
}

function md026(ctx) {
  const { tokens, config } = ctx;
  const punctuation = String(config.heading_trailing_punctuation ?? allPunctuationNoQuestion);
  const trailingPunctuationRe = new RegExp(`\\s*[${escapeForRegExp(punctuation)}]+$`);
  for (const heading of filterByTypes(tokens, ['atxHeadingText', 'setextHeadingText'])) {
    const { endColumn, endLine, text } = heading;
    const match = trailingPunctuationRe.exec(text);
    if (match) {
      const fullMatch = match[0];
      ctx.err(endLine, endColumn - fullMatch.length, 'MD026', `Heading ends with punctuation '${fullMatch.trim()}'`);
    }
  }
}

function md027(ctx) {
  const { tokens } = ctx;
  const linePrefixes = filterByTypes(tokens, ['linePrefix']);
  for (const token of linePrefixes) {
    const parent = token.parent;
    const codeIndented = parent?.type === 'codeIndented';
    const siblings = parent?.children || tokens;
    if (!codeIndented && siblings[siblings.indexOf(token) - 1]?.type === 'blockQuotePrefix') {
      const { startColumn, startLine } = token;
      ctx.err(startLine, startColumn, 'MD027', 'Multiple spaces after blockquote marker');
    }
  }
}

function md028(ctx) {
  const { tokens } = ctx;
  const ignoreTypes = new Set(['lineEnding', 'listItemIndent', 'linePrefix']);
  for (const token of filterByTypes(tokens, ['blockQuote'])) {
    const siblings = token.parent?.children || tokens;
    const errorLineNumbers = [];
    for (let i = siblings.indexOf(token) + 1; i < siblings.length; i++) {
      const sibling = siblings[i];
      const { startLine, type } = sibling;
      if (type === 'lineEndingBlank') {
        errorLineNumbers.push(startLine);
      } else if (ignoreTypes.has(type)) {
        // ignore
      } else if (type === 'blockQuote') {
        for (const lineNumber of errorLineNumbers) ctx.err(lineNumber, 1, 'MD028', 'Blank line inside blockquote');
        break;
      } else {
        break;
      }
    }
  }
}

function md031(ctx) {
  const { tokens, lines } = ctx;
  for (const codeBlock of filterByTypes(tokens, ['codeFenced'])) {
    if (!isBlankLine(lines[codeBlock.startLine - 2])) {
      ctx.err(codeBlock.startLine, 1, 'MD031', 'Fenced code block must be preceded by a blank line');
    }
    if (!isBlankLine(lines[codeBlock.endLine]) && !isBlankLine(lines[codeBlock.endLine - 1])) {
      ctx.err(codeBlock.endLine, 1, 'MD031', 'Fenced code block must be followed by a blank line');
    }
  }
}

function md032(ctx) {
  const { tokens, lines } = ctx;
  const isList = (token) => token.type === 'listOrdered' || token.type === 'listUnordered';
  const topLevelLists = filterByPredicate(
    tokens,
    isList,
    (token) => (isList(token) || token.type === 'htmlFlow') ? [] : token.children,
  );
  for (const list of topLevelLists) {
    const firstLineNumber = list.startLine;
    if (!isBlankLine(lines[firstLineNumber - 2])) {
      ctx.err(firstLineNumber, 1, 'MD032', 'List must be preceded by a blank line');
    }
    const flattenedChildren = filterByPredicate(
      list.children,
      (token) => !nonContentTokens.has(token.type),
      (token) => (nonContentTokens.has(token.type) ? [] : token.children),
    );
    const endLine = (flattenedChildren.length > 0 ? flattenedChildren[flattenedChildren.length - 1] : list).endLine;
    if (!isBlankLine(lines[endLine])) {
      ctx.err(endLine, 1, 'MD032', 'List must be followed by a blank line');
    }
  }
}

function md035(ctx) {
  const { tokens } = ctx;
  for (const token of filterByTypes(tokens, ['thematicBreak'])) {
    if (token.text.trim() !== '---') {
      ctx.err(token.startLine, token.startColumn, 'MD035', 'Horizontal rule must use ---');
    }
  }
}

function md036(ctx) {
  const { tokens, config } = ctx;
  const punctuation = String(config.emphasis_as_heading_punctuation ?? allPunctuation);
  const punctuationRe = new RegExp(`[${punctuation}]$`);
  const emphasisTypes = [['emphasis', 'emphasisText'], ['strong', 'strongText']];
  const isParagraphChildMeaningful = (token) => !(
    token.type === 'htmlText'
    || (token.type === 'data' && token.text.trim().length === 0)
  );
  const paragraphTokens = filterByTypes(tokens, ['paragraph'], true)
    .filter((token) => token.parent?.type === 'content'
      && (!token.parent?.parent || (token.parent?.parent?.type === 'htmlFlow' && !token.parent?.parent?.parent))
      && (token.children.filter(isParagraphChildMeaningful).length === 1));
  for (const emphasisType of emphasisTypes) {
    const textTokens = getDescendantsByType(paragraphTokens, emphasisType);
    for (const textToken of textTokens) {
      if (textToken.children.length === 1 && textToken.children[0].type === 'data' && !punctuationRe.test(textToken.text)) {
        ctx.err(textToken.startLine, textToken.startColumn, 'MD036', 'Emphasis used instead of a heading');
      }
    }
  }
}

function md047(ctx) {
  const { lines } = ctx;
  const lastLineNumber = lines.length;
  const lastLine = lines[lastLineNumber - 1];
  if (!isBlankLine(lastLine)) {
    ctx.err(lastLineNumber, lastLine.length + 1, 'MD047', 'File must end with a single newline');
  }
}

export function checkMdFormat(ctx) {
  md009(ctx);
  md010(ctx);
  md012(ctx);
  md014(ctx);
  md018(ctx);
  md019md021(ctx);
  md020(ctx);
  md022(ctx);
  md023(ctx);
  md026(ctx);
  md027(ctx);
  md028(ctx);
  md031(ctx);
  md032(ctx);
  md035(ctx);
  md036(ctx);
  md047(ctx);
}
