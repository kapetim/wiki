// Inline rules — links, images, emphasis, code spans, proper names, HTML,
// reference definitions. Ported from markdownlint
// (MD011/033/034/037/038/039/042/044/045/049/050/052/053/054/059).

import {
  filterByTypes, getDescendantsByType, addRangeToSet,
  getReferenceLinkImageData, escapeForRegExp, getHtmlAttributeRe,
  getHtmlTagInfo, inHtmlFlow, hasOverlap, filterByPredicate,
} from './md-helpers.js';
import { parse } from './md-ast.js';

const nextLinesRe = /[\r\n][\s\S]*$/;
const autolinkDisallowedRe = /[ <>]/;
const autolinkAble = (destination) => {
  try {
    new URL(destination);
  } catch {
    return false;
  }
  return !autolinkDisallowedRe.test(destination);
};
const intrawordRe = /^\w$/;

function md011(ctx) {
  const { tokens, lines } = ctx;
  const reversedLinkRe = /(^|[^\\])\(([^()]+)\)\[([^\]^][^\]]*)\](?!\()/g;
  const ignoreBlockLineNumbers = new Set();
  for (const ignoreBlock of filterByTypes(tokens, ['codeFenced', 'codeIndented'])) {
    addRangeToSet(ignoreBlockLineNumbers, ignoreBlock.startLine, ignoreBlock.endLine);
  }
  const ignoreTexts = filterByTypes(tokens, ['codeText']);
  for (const [lineIndex, line] of lines.entries()) {
    const lineNumber = lineIndex + 1;
    if (!ignoreBlockLineNumbers.has(lineNumber)) {
      let match;
      while ((match = reversedLinkRe.exec(line)) !== null) {
        const [reversedLink, preChar, linkText, linkDestination] = match;
        if (!linkText.endsWith('\\') && !linkDestination.endsWith('\\')) {
          const column = match.index + preChar.length + 1;
          const length = match[0].length - preChar.length;
          const range = { startLine: lineNumber, startColumn: column, endLine: lineNumber, endColumn: column + length - 1 };
          if (!ignoreTexts.some((ignoreText) => hasOverlap(ignoreText, range))) {
            ctx.err(lineNumber, column, 'MD011', `Reversed link syntax: ${reversedLink.slice(preChar.length)}`);
          }
        }
      }
    }
  }
}

function md033(ctx) {
  const { tokens } = ctx;
  for (const token of filterByTypes(tokens, ['htmlText'], true)) {
    const htmlTagInfo = getHtmlTagInfo(token);
    if (htmlTagInfo && !htmlTagInfo.close) {
      ctx.err(token.startLine, token.startColumn, 'MD033', `Inline HTML: ${htmlTagInfo.name}`);
    }
  }
}

function md034(ctx) {
  const { tokens } = ctx;
  const literalAutolinks = filterByPredicate(
    tokens,
    (token) => token.type === 'literalAutolink' && !inHtmlFlow(token),
  );
  for (const token of literalAutolinks) {
    ctx.err(token.startLine, token.startColumn, 'MD034', `Bare URL — wrap in <>: ${token.text}`);
  }
}

function md037(ctx) {
  const { tokens, lines } = ctx;
  const emphasisTokensByMarker = new Map();
  for (const marker of ['_', '__', '___', '*', '**', '***']) {
    emphasisTokensByMarker.set(marker, []);
  }
  const contentTokens = filterByPredicate(
    tokens,
    (token) => token.children.some((child) => child.type === 'data'),
  );
  for (const token of contentTokens) {
    for (const list of emphasisTokensByMarker.values()) list.length = 0;
    for (const child of token.children) {
      const { text, type } = child;
      if (type === 'data' && text.length <= 3) {
        const emphasisTokens = emphasisTokensByMarker.get(text);
        if (emphasisTokens && !inHtmlFlow(child)) emphasisTokens.push(child);
      }
    }
    for (const [marker, emphasisTokens] of emphasisTokensByMarker) {
      for (let i = 0; i + 1 < emphasisTokens.length; i += 2) {
        const startToken = emphasisTokens[i];
        const startLine = lines[startToken.startLine - 1];
        const startSlice = startLine.slice(startToken.endColumn - 1);
        const startMatch = startSlice.match(/^\s+\S/);
        if (startMatch) {
          const startSpaceCharacter = startMatch[0];
          ctx.err(startToken.startLine, startToken.endColumn, 'MD037', `Space inside emphasis: ${marker}${startSpaceCharacter}`);
        }
        const endToken = emphasisTokens[i + 1];
        const endLine = lines[endToken.startLine - 1];
        const endSlice = endLine.slice(0, endToken.startColumn - 1);
        const endMatch = endSlice.match(/\S\s+$/);
        if (endMatch) {
          ctx.err(endToken.startLine, endToken.startColumn - (endMatch[0].length - 1), 'MD037', `Space inside emphasis: ${endMatch[0]}${marker}`);
        }
      }
    }
  }
}

function md038(ctx) {
  const { tokens } = ctx;
  for (const codeText of filterByTypes(tokens, ['codeText'])) {
    const datas = getDescendantsByType(codeText, ['codeTextData']);
    if (datas.length > 0) {
      const paddings = getDescendantsByType(codeText, ['codeTextPadding']);
      const startPadding = paddings[0];
      const startData = datas[0];
      const startMatch = /^(\s+)(\S)/.exec(startData.text) || [null, '', ''];
      const startBacktick = (startMatch[2] === '`');
      const startCount = startMatch[1].length - ((startBacktick && !startPadding) ? 1 : 0);
      if (startCount > 0) {
        ctx.err(startData.startLine, startData.startColumn, 'MD038', 'Extra space at start of code span');
      }
      const endPadding = paddings[paddings.length - 1];
      const endData = datas[datas.length - 1];
      const endMatch = /(\S)(\s+)$/.exec(endData.text) || [null, '', ''];
      const endBacktick = (endMatch[1] === '`');
      const endCount = endMatch[2].length - ((endBacktick && !endPadding) ? 1 : 0);
      if (endCount > 0) {
        ctx.err(endData.endLine, endData.endColumn - endCount, 'MD038', 'Extra space at end of code span');
      }
    }
  }
}

function md039(ctx) {
  const { tokens } = ctx;
  const labels = filterByTypes(tokens, ['label']).filter((label) => label.parent?.type === 'link');
  for (const label of labels) {
    const labelTexts = label.children.filter((child) => child.type === 'labelText');
    for (const labelText of labelTexts) {
      if (labelText.text.trimStart().length !== labelText.text.length) {
        ctx.err(labelText.startLine, labelText.startColumn, 'MD039', 'Space at start of link text');
      }
      if (labelText.text.trimEnd().length !== labelText.text.length) {
        ctx.err(labelText.endLine, labelText.endColumn - (labelText.text.length - labelText.text.trimEnd().length), 'MD039', 'Space at end of link text');
      }
    }
  }
}

function md042(ctx) {
  const { tokens } = ctx;
  const { definitions } = getReferenceLinkImageData(tokens);
  const isReferenceDefinitionHash = (token) => {
    const definition = definitions.get(token.text.trim());
    return Boolean(definition && (definition[1] === '#'));
  };
  for (const link of filterByTypes(tokens, ['link'])) {
    const labelText = getDescendantsByType(link, ['label', 'labelText']);
    const reference = getDescendantsByType(link, ['reference']);
    const resource = getDescendantsByType(link, ['resource']);
    const referenceString = getDescendantsByType(reference, ['referenceString']);
    const resourceDestinationString = getDescendantsByType(resource, ['resourceDestination', ['resourceDestinationLiteral', 'resourceDestinationRaw'], 'resourceDestinationString']);
    const hasLabelText = labelText.length > 0;
    const hasReference = reference.length > 0;
    const hasResource = resource.length > 0;
    const hasReferenceString = referenceString.length > 0;
    const hasResourceDestinationString = resourceDestinationString.length > 0;
    let error = false;
    if (hasLabelText && ((!hasReference && !hasResource) || (hasReference && !hasReferenceString))) {
      error = isReferenceDefinitionHash(labelText[0]);
    } else if (hasReferenceString && !hasResourceDestinationString) {
      error = isReferenceDefinitionHash(referenceString[0]);
    } else if (!hasReferenceString && hasResourceDestinationString) {
      error = (resourceDestinationString[0].text.trim() === '#');
    } else if (!hasReferenceString && !hasResourceDestinationString) {
      error = true;
    }
    if (error) {
      ctx.err(link.startLine, link.startColumn, 'MD042', 'Empty link');
    }
  }
}

function md044(ctx) {
  const { tokens, config } = ctx;
  let names = config.proper_names ?? [];
  names = [...names].sort((a, b) => (b.length - a.length) || a.localeCompare(b));
  if (names.length === 0) return;
  const includeCodeBlocks = config.proper_names_include_code ?? true;
  const scannedTypes = new Set(['data']);
  if (includeCodeBlocks) {
    scannedTypes.add('codeFlowValue');
    scannedTypes.add('codeTextData');
  }
  const contentTokens = filterByPredicate(
    tokens,
    (token) => scannedTypes.has(token.type),
    (token) => (token.children.filter((t) => !['codeFencedFence', 'definition', 'reference', 'resource'].includes(t.type))),
  );
  const exclusions = [];
  const scannedTokens = new Set();
  for (const name of names) {
    const escapedName = escapeForRegExp(name);
    const startNamePattern = /^\W/.test(name) ? '' : '\\b_*';
    const endNamePattern = /\W$/.test(name) ? '' : '_*\\b';
    const namePattern = `(${startNamePattern})(${escapedName})${endNamePattern}`;
    const nameRe = new RegExp(namePattern, 'gi');
    for (const token of contentTokens) {
      let match;
      while ((match = nameRe.exec(token.text)) !== null) {
        const [, leftMatch, nameMatch] = match;
        const column = token.startColumn + match.index + leftMatch.length;
        const length = nameMatch.length;
        const lineNumber = token.startLine;
        const nameRange = { startLine: lineNumber, startColumn: column, endLine: lineNumber, endColumn: column + length - 1 };
        if (!names.includes(nameMatch) && !exclusions.some((exclusion) => hasOverlap(exclusion, nameRange))) {
          let autolinkRanges = [];
          if (!scannedTokens.has(token)) {
            autolinkRanges = filterByTypes(parse(token.text), ['literalAutolink'])
              .map((tok) => ({
                startLine: lineNumber,
                startColumn: token.startColumn + tok.startColumn - 1,
                endLine: lineNumber,
                endColumn: token.endColumn + tok.endColumn - 1,
              }));
            exclusions.push(...autolinkRanges);
            scannedTokens.add(token);
          }
          if (!autolinkRanges.some((autolinkRange) => hasOverlap(autolinkRange, nameRange))) {
            ctx.err(token.startLine, column, 'MD044', `Proper name should be "${name}" (got "${nameMatch}")`);
          }
        }
        exclusions.push(nameRange);
      }
    }
  }
}

function md045(ctx) {
  const { tokens } = ctx;
  const altRe = getHtmlAttributeRe('alt');
  const ariaHiddenRe = getHtmlAttributeRe('aria-hidden');
  for (const image of filterByTypes(tokens, ['image'])) {
    const labelTexts = getDescendantsByType(image, ['label', 'labelText']);
    if (labelTexts.some((labelText) => labelText.text.length === 0)) {
      ctx.err(image.startLine, image.startColumn, 'MD045', 'Image has no alt text');
    }
  }
  const htmlTexts = filterByTypes(tokens, ['htmlText'], true);
  for (const htmlText of htmlTexts) {
    const htmlTagInfo = getHtmlTagInfo(htmlText);
    if (htmlTagInfo && !htmlTagInfo.close && htmlTagInfo.name.toLowerCase() === 'img'
      && !altRe.test(htmlText.text) && (ariaHiddenRe.exec(htmlText.text)?.[1].toLowerCase() !== 'true')) {
      ctx.err(htmlText.startLine, htmlText.startColumn, 'MD045', 'HTML image has no alt text');
    }
  }
}

function emphasisOrStrongStyleFor(markup) {
  return markup[0] === '*' ? 'asterisk' : 'underscore';
}

function md049md050(ctx, type, typeSequence, asterisk, underline, style) {
  const { tokens, lines } = ctx;
  const emphasisTokens = filterByPredicate(
    tokens,
    (token) => token.type === type,
    (token) => (token.type === 'htmlFlow' ? [] : token.children),
  );
  for (const token of emphasisTokens) {
    const sequences = getDescendantsByType(token, [typeSequence]);
    const startSequence = sequences[0];
    const endSequence = sequences[sequences.length - 1];
    if (startSequence && endSequence) {
      const markupStyle = emphasisOrStrongStyleFor(startSequence.text);
      if (style !== markupStyle) {
        const underscoreIntraword = style === 'underscore' && (
          intrawordRe.test(lines[startSequence.startLine - 1][startSequence.startColumn - 2])
          || intrawordRe.test(lines[endSequence.endLine - 1][endSequence.endColumn - 1])
        );
        if (!underscoreIntraword) {
          ctx.err(startSequence.startLine, startSequence.startColumn, type === 'emphasis' ? 'MD049' : 'MD050',
            `Expected ${style} emphasis; got ${markupStyle}`);
        }
      }
    }
  }
}

function md052(ctx) {
  const { tokens, config } = ctx;
  const ignoredLabels = new Set(config.reference_ignored_labels ?? ['x']);
  const shortcutSyntax = config.reference_shortcut_syntax ?? false;
  const { definitions, references, shortcuts } = getReferenceLinkImageData(tokens);
  const entries = shortcutSyntax
    ? [...references.entries(), ...shortcuts.entries()]
    : references.entries();
  for (const [label, datas] of entries) {
    if (!definitions.has(label) && !ignoredLabels.has(label)) {
      for (const data of datas) {
        const [lineIndex] = data;
        ctx.err(lineIndex + 1, 1, 'MD052', `Missing link reference definition: "${label}"`);
      }
    }
  }
}

function md053(ctx) {
  const { tokens, config } = ctx;
  const ignored = new Set(config.reference_ignored_definitions ?? ['//']);
  const { references, shortcuts, definitions, duplicateDefinitions } = getReferenceLinkImageData(tokens);
  for (const [label, [lineIndex]] of definitions.entries()) {
    if (!ignored.has(label) && !references.has(label) && !shortcuts.has(label)) {
      ctx.err(lineIndex + 1, 1, 'MD053', `Unused link reference definition: "${label}"`);
    }
  }
  for (const [label, lineIndex] of duplicateDefinitions) {
    if (!ignored.has(label)) {
      ctx.err(lineIndex + 1, 1, 'MD053', `Duplicate link reference definition: "${label}"`);
    }
  }
}

function md054(ctx) {
  const { tokens, config } = ctx;
  const c = config.link_style ?? {};
  const autolink = c.autolink ?? true;
  const inline = c.inline ?? true;
  const full = c.full ?? true;
  const collapsed = c.collapsed ?? true;
  const shortcut = c.shortcut ?? true;
  const urlInline = c.url_inline ?? true;
  if (autolink && inline && full && collapsed && shortcut && urlInline) return;
  const { definitions } = getReferenceLinkImageData(tokens);
  for (const link of filterByTypes(tokens, ['autolink', 'image', 'link'])) {
    const { startLine, startColumn, text, type } = link;
    const image = type === 'image';
    let isError;
    if (type === 'autolink') {
      const destination = getDescendantsByType(link, [['autolinkEmail', 'autolinkProtocol']])[0]?.text;
      isError = !autolink && Boolean(destination);
    } else {
      const label = getDescendantsByType(link, ['label', 'labelText'])[0].text;
      const destination = getDescendantsByType(link, ['resource', 'resourceDestination', ['resourceDestinationLiteral', 'resourceDestinationRaw'], 'resourceDestinationString'])[0]?.text;
      if (destination) {
        const title = getDescendantsByType(link, ['resource', 'resourceTitle', 'resourceTitleString'])[0]?.text;
        isError = !inline || (!urlInline && autolink && !image && !title && (label === destination) && autolinkAble(destination));
      } else {
        const isShortcut = getDescendantsByType(link, ['reference']).length === 0;
        const referenceString = getDescendantsByType(link, ['reference', 'referenceString'])[0]?.text;
        const isCollapsed = (referenceString === undefined);
        const definition = definitions.get(referenceString || label);
        const defDestination = (definition && definition[1]) || '';
        let styleAllowed;
        if (isShortcut) styleAllowed = shortcut;
        else if (isCollapsed) styleAllowed = collapsed;
        else styleAllowed = full;
        isError = Boolean(defDestination && !styleAllowed);
      }
    }
    if (isError) {
      ctx.err(startLine, startColumn, 'MD054', `Link style not allowed: ${text.replace(nextLinesRe, '').slice(0, 40)}`);
    }
  }
}

function md059(ctx) {
  const { tokens, config } = ctx;
  const normalize = (str) => str.replace(/[\W_]+/g, ' ').replace(/\s+/g, ' ').toLowerCase().trim();
  const prohibitedTexts = new Set((config.prohibited_link_texts ?? ['click here', 'here', 'link', 'more']).map(normalize));
  if (prohibitedTexts.size === 0) return;
  const allowedChildrenTypes = new Set(['codeText', 'htmlText']);
  for (const link of filterByTypes(tokens, ['link'])) {
    const labelTexts = getDescendantsByType(link, ['label', 'labelText']);
    for (const labelText of labelTexts) {
      const { children, startLine, startColumn, text } = labelText;
      if (!children.some((child) => allowedChildrenTypes.has(child.type)) && prohibitedTexts.has(normalize(text))) {
        ctx.err(startLine, startColumn, 'MD059', `Descriptive link text required — "${text}" is too generic`);
      }
    }
  }
}

export function checkMdInline(ctx) {
  md011(ctx);
  md033(ctx);
  md034(ctx);
  md037(ctx);
  md038(ctx);
  md039(ctx);
  md042(ctx);
  md044(ctx);
  md045(ctx);
  md049md050(ctx, 'emphasis', 'emphasisSequence', '*', '_', 'asterisk');
  md049md050(ctx, 'strong', 'strongSequence', '**', '__', 'asterisk');
  md052(ctx);
  md053(ctx);
  md054(ctx);
  md059(ctx);
}
