// Shared helpers for the token-based validation rules. Ported from
// markdownlint's helpers/micromark-helpers.cjs and helpers/helpers.cjs
// (MIT, David Anson), trimmed to what this suite uses.

import { flatTokensSymbol, htmlFlowSymbol, newlineRe } from './md-ast.js';

export const nextLinesRe = /[\r\n][\s\S]*$/;

export function inHtmlFlow(token) {
  return Object.hasOwn(token, htmlFlowSymbol);
}

export function isHtmlFlowComment(token) {
  const { text, type } = token;
  if (type === 'htmlFlow' && text.startsWith('<!--') && text.endsWith('-->')) {
    const comment = text.slice(4, -3);
    return !comment.startsWith('>') && !comment.startsWith('->') && !comment.endsWith('-');
  }
  return false;
}

export function addRangeToSet(set, start, end) {
  for (let i = start; i <= end; i++) set.add(i);
}

export function filterByPredicate(tokens, allowed, transformChildren) {
  const result = [];
  const queue = [{ array: tokens, index: 0 }];
  while (queue.length > 0) {
    const current = queue[queue.length - 1];
    const { array, index } = current;
    if (index < array.length) {
      const token = array[current.index++];
      if (allowed(token)) result.push(token);
      const { children } = token;
      if (children.length > 0) {
        const transformed = transformChildren ? transformChildren(token) : children;
        queue.push({ array: transformed, index: 0 });
      }
    } else {
      queue.pop();
    }
  }
  return result;
}

export function filterByTypes(tokens, types, htmlFlow) {
  const predicate = (token) => types.includes(token.type) && (htmlFlow || !inHtmlFlow(token));
  const flat = tokens[flatTokensSymbol];
  if (flat) return flat.filter(predicate);
  return filterByPredicate(tokens, predicate);
}

export function getBlockQuotePrefixText(tokens, lineNumber, count = 1) {
  return filterByTypes(tokens, ['blockQuotePrefix', 'linePrefix'])
    .filter((prefix) => prefix.startLine === lineNumber)
    .map((prefix) => prefix.text)
    .join('')
    .trimEnd()
    .concat('\n')
    .repeat(count);
}

export function getDescendantsByType(parent, typePath) {
  let tokens = Array.isArray(parent) ? parent : [parent];
  for (const type of typePath) {
    const predicate = (token) => (Array.isArray(type) ? type.includes(token.type) : type === token.type);
    tokens = tokens.flatMap((t) => t.children.filter(predicate));
  }
  return tokens;
}

export function getHeadingLevel(heading) {
  let level = 1;
  const headingSequence = heading.children.find(
    (child) => child.type === 'atxHeadingSequence' || child.type === 'setextHeadingLine',
  );
  const { text } = headingSequence;
  if (text[0] === '#') {
    level = Math.min(text.length, 6);
  } else if (text[0] === '-') {
    level = 2;
  }
  return level;
}

export function getHeadingStyle(heading) {
  if (heading.type === 'setextHeading') return 'setext';
  const atxHeadingSequenceLength = heading.children.filter(
    (child) => child.type === 'atxHeadingSequence',
  ).length;
  return atxHeadingSequenceLength === 1 ? 'atx' : 'atx_closed';
}

export function getHeadingText(heading) {
  return getDescendantsByType(heading, [['atxHeadingText', 'setextHeadingText']])
    .flatMap((descendant) => descendant.children.filter((child) => child.type !== 'htmlText'))
    .map((data) => data.text)
    .join('')
    .replace(newlineRe, ' ');
}

export function getHtmlTagInfo(token) {
  const htmlTagNameRe = /^<([^!>][^/\s>]*)/;
  if (token.type === 'htmlText') {
    const match = htmlTagNameRe.exec(token.text);
    if (match) {
      const name = match[1];
      const close = name.startsWith('/');
      return { close, name: close ? name.slice(1) : name };
    }
  }
  return null;
}

export function getParentOfType(token, types) {
  let current = token;
  while ((current = current.parent) && !types.includes(current.type)) {
    // climb
  }
  return current;
}

export const nonContentTokens = new Set([
  'blockQuoteMarker',
  'blockQuotePrefix',
  'blockQuotePrefixWhitespace',
  'gfmFootnoteDefinitionIndent',
  'lineEnding',
  'lineEndingBlank',
  'linePrefix',
  'listItemIndent',
  'undefinedReference',
  'undefinedReferenceCollapsed',
  'undefinedReferenceFull',
  'undefinedReferenceShortcut',
]);

export function isBlankLine(line) {
  const startComment = '<!--';
  const endComment = '-->';
  const removeComments = (s) => {
    while (true) {
      const start = s.indexOf(startComment);
      const end = s.indexOf(endComment);
      if ((end !== -1) && ((start === -1) || (end < start))) {
        s = s.slice(end + endComment.length);
      } else if ((start !== -1) && (end !== -1)) {
        s = s.slice(0, start) + s.slice(end + endComment.length);
      } else if ((start !== -1) && (end === -1)) {
        s = s.slice(0, start);
      } else {
        return s;
      }
    }
  };
  return !line || !line.trim() || !removeComments(line).replace(/>/g, '').trim();
}

export function getHtmlAttributeRe(name) {
  return new RegExp(`\\s${name}\\s*=\\s*['"]?([^'"\\s>]*)`, 'iu');
}

export function escapeForRegExp(str) {
  return str.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&');
}

export function ellipsify(text, start, end) {
  const length = text.length;
  const MAX_LENGTH = 40;
  if (length <= MAX_LENGTH) return text;
  if (start && !end) {
    return `...${text.slice(length - MAX_LENGTH + 3)}`;
  }
  if (end && !start) {
    return `${text.slice(0, MAX_LENGTH - 3)}...`;
  }
  const startOffset = Math.ceil((MAX_LENGTH - 3) / 2);
  const endOffset = MAX_LENGTH - 3 - startOffset;
  return `${text.slice(0, startOffset)}...${text.slice(length - endOffset)}`;
}

const positionLessThanOrEqual = (lineA, columnA, lineB, columnB) => (
  (lineA < lineB) || ((lineA === lineB) && (columnA <= columnB))
);

export function hasOverlap(rangeA, rangeB) {
  const lte = positionLessThanOrEqual(
    rangeA.startLine, rangeA.startColumn,
    rangeB.startLine, rangeB.startColumn,
  );
  const first = lte ? rangeA : rangeB;
  const second = lte ? rangeB : rangeA;
  return positionLessThanOrEqual(
    second.startLine, second.startColumn,
    first.endLine, first.endColumn,
  );
}

export function frontMatterHasTitle(frontMatterLines, frontMatterTitlePattern) {
  const ignoreFrontMatter = (frontMatterTitlePattern !== undefined) && !frontMatterTitlePattern;
  const frontMatterTitleRe = new RegExp(
    String(frontMatterTitlePattern || '^\\s*"?title"?\\s*[:=]'),
    'i',
  );
  return !ignoreFrontMatter && frontMatterLines.some((line) => frontMatterTitleRe.test(line));
}

export function getReferenceLinkImageData(tokens) {
  const normalizeReference = (s) => s.toLowerCase().trim().replace(/\s+/g, ' ');
  const getText = (t) => t?.children.filter((c) => c.type !== 'blockQuotePrefix').map((c) => c.text).join('');
  const references = new Map();
  const shortcuts = new Map();
  const addReferenceToDictionary = (token, label, isShortcut) => {
    const referenceDatum = [
      token.startLine - 1,
      token.startColumn - 1,
      token.text.length,
    ];
    const reference = normalizeReference(label);
    const dictionary = isShortcut ? shortcuts : references;
    const referenceData = dictionary.get(reference) || [];
    referenceData.push(referenceDatum);
    dictionary.set(reference, referenceData);
  };
  const definitions = new Map();
  const definitionLineIndices = [];
  const duplicateDefinitions = [];
  const filteredTokens = filterByTypes(tokens, [
    'definition', 'gfmFootnoteDefinition',
    'definitionLabelString', 'gfmFootnoteDefinitionLabelString',
    'gfmFootnoteCall', 'image', 'link',
    'undefinedReferenceCollapsed', 'undefinedReferenceFull', 'undefinedReferenceShortcut',
  ]);
  for (const token of filteredTokens) {
    let labelPrefix = '';
    switch (token.type) {
      case 'definition':
      case 'gfmFootnoteDefinition':
        for (let i = token.startLine; i <= token.endLine; i++) {
          definitionLineIndices.push(i - 1);
        }
        break;
      case 'gfmFootnoteDefinitionLabelString':
        labelPrefix = '^';
        // eslint-disable-next-line no-fallthrough
      case 'definitionLabelString': {
        const reference = normalizeReference(`${labelPrefix}${token.text}`);
        if (definitions.has(reference)) {
          duplicateDefinitions.push([reference, token.startLine - 1]);
        } else {
          const parent = getParentOfType(token, ['definition']);
          const destinationString = parent
            && getDescendantsByType(parent, ['definitionDestination', 'definitionDestinationRaw', 'definitionDestinationString'])[0]?.text;
          definitions.set(reference, [token.startLine - 1, destinationString || '']);
        }
        break;
      }
      case 'gfmFootnoteCall':
      case 'image':
      case 'link': {
        let isShortcut = (token.children.length === 1);
        const isFullOrCollapsed = (token.children.length === 2) && !token.children.some((t) => t.type === 'resource');
        const [labelText] = getDescendantsByType(token, ['label', 'labelText']);
        const [referenceString] = getDescendantsByType(token, ['reference', 'referenceString']);
        let label = getText(labelText);
        if (!isShortcut && !isFullOrCollapsed) {
          const [footnoteCallMarker, footnoteCallString] = token.children.filter(
            (t) => ['gfmFootnoteCallMarker', 'gfmFootnoteCallString'].includes(t.type),
          );
          if (footnoteCallMarker && footnoteCallString) {
            label = `${footnoteCallMarker.text}${footnoteCallString.text}`;
            isShortcut = true;
          }
        }
        if (isShortcut || isFullOrCollapsed) {
          addReferenceToDictionary(token, getText(referenceString) || label, isShortcut);
        }
        break;
      }
      case 'undefinedReferenceCollapsed':
      case 'undefinedReferenceFull':
      case 'undefinedReferenceShortcut': {
        const undefinedReference = getDescendantsByType(token, ['undefinedReference'])[0];
        const label = undefinedReference.children.map((t) => t.text).join('');
        const isShortcut = (token.type === 'undefinedReferenceShortcut');
        addReferenceToDictionary(token, label, isShortcut);
        break;
      }
    }
  }
  return { references, shortcuts, definitions, duplicateDefinitions, definitionLineIndices };
}

export function clearHtmlCommentText(text) {
  const htmlCommentBegin = '<!--';
  const htmlCommentEnd = '-->';
  const safeCommentCharacter = '.';
  const startsWithPipeRe = /^ *\|/;
  const notCrLfRe = /[^\r\n]/g;
  const notSpaceCrLfRe = /[^ \r\n]/g;
  const trailingSpaceRe = / +[\r\n]/g;
  const replaceTrailingSpace = (s) => s.replace(notCrLfRe, safeCommentCharacter);
  let i = 0;
  while ((i = text.indexOf(htmlCommentBegin, i)) !== -1) {
    const j = text.indexOf(htmlCommentEnd, i + 2);
    if (j === -1) break;
    if (j > i + htmlCommentBegin.length) {
      const content = text.slice(i + htmlCommentBegin.length, j);
      const lastLf = text.lastIndexOf('\n', i) + 1;
      const preText = text.slice(lastLf, i);
      const isBlock = preText.trim().length === 0;
      const couldBeTable = startsWithPipeRe.test(preText);
      const spansTableCells = couldBeTable && content.includes('\n');
      const isValid = isBlock
        || !(spansTableCells || content.startsWith('>') || content.startsWith('->')
          || content.endsWith('-') || content.includes('--'));
      if (isValid) {
        const clearedContent = content
          .replace(notSpaceCrLfRe, safeCommentCharacter)
          .replace(trailingSpaceRe, replaceTrailingSpace);
        text = text.slice(0, i + htmlCommentBegin.length) + clearedContent + text.slice(j);
      }
    }
    i = j + htmlCommentEnd.length;
  }
  return text;
}
