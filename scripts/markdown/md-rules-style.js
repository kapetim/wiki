// Style rules — heading/list/emphasis style consistency. Ported from
// markdownlint (MD003/004/005/007/029/030).

import {
  filterByTypes, getHeadingLevel, getHeadingStyle, getDescendantsByType,
  getParentOfType,
} from './md-helpers.js';

const markerToStyle = (marker) => {
  if (marker === '-') return 'dash';
  if (marker === '+') return 'plus';
  return 'asterisk';
};

function md003(ctx) {
  const { tokens, config } = ctx;
  const style = String(config.styles?.heading ?? 'atx');
  for (const heading of filterByTypes(tokens, ['atxHeading', 'setextHeading'])) {
    const styleForToken = getHeadingStyle(heading);
    if (styleForToken !== style) {
      const h12 = getHeadingLevel(heading) <= 2;
      const setextWithAtx = style === 'setext_with_atx'
        && ((h12 && styleForToken === 'setext') || (!h12 && styleForToken === 'atx'));
      const setextWithAtxClosed = style === 'setext_with_atx_closed'
        && ((h12 && styleForToken === 'setext') || (!h12 && styleForToken === 'atx_closed'));
      if (!setextWithAtx && !setextWithAtxClosed) {
        ctx.err(heading.startLine, heading.startColumn, 'MD003', `Expected ${style} heading style; got ${styleForToken}`);
      }
    }
  }
}

function md004(ctx) {
  const { tokens, config } = ctx;
  const style = String(config.styles?.ul ?? 'dash');
  let expectedStyle = ['asterisk', 'consistent', 'dash', 'plus', 'sublist'].includes(style) ? style : 'dash';
  const nestingStyles = [];
  for (const listUnordered of filterByTypes(tokens, ['listUnordered'])) {
    let nesting = 0;
    if (style === 'sublist') {
      let parent = listUnordered;
      while ((parent = getParentOfType(parent, ['listOrdered', 'listUnordered']))) nesting++;
    }
    const listItemMarkers = getDescendantsByType(listUnordered, ['listItemPrefix', 'listItemMarker']);
    for (const listItemMarker of listItemMarkers) {
      const itemStyle = markerToStyle(listItemMarker.text);
      if (style === 'sublist') {
        if (!nestingStyles[nesting]) {
          let different = 'dash';
          if (itemStyle === 'dash') different = 'plus';
          else if (itemStyle === 'plus') different = 'asterisk';
          nestingStyles[nesting] = itemStyle === nestingStyles[nesting - 1] ? different : itemStyle;
        }
        expectedStyle = nestingStyles[nesting];
      } else if (expectedStyle === 'consistent') {
        expectedStyle = itemStyle;
      }
      if (itemStyle !== expectedStyle) {
        ctx.err(listItemMarker.startLine, listItemMarker.startColumn, 'MD004', `Expected ${expectedStyle} list marker; got ${itemStyle}`);
      }
    }
  }
}

function md005(ctx) {
  const { tokens } = ctx;
  for (const list of filterByTypes(tokens, ['listOrdered', 'listUnordered'])) {
    const expectedIndent = list.startColumn - 1;
    const listItemPrefixes = list.children.filter((token) => token.type === 'listItemPrefix');
    for (const listItemPrefix of listItemPrefixes) {
      const lineNumber = listItemPrefix.startLine;
      const actualIndent = listItemPrefix.startColumn - 1;
      if (list.type === 'listUnordered') {
        if (actualIndent !== expectedIndent) {
          ctx.err(lineNumber, 1, 'MD005', `Inconsistent list indentation (expected ${expectedIndent}, got ${actualIndent})`);
        }
      }
    }
  }
}

function md007(ctx) {
  const { tokens, config } = ctx;
  const indent = Number(config.list_indent ?? 2);
  const unorderedListTypes = ['blockQuotePrefix', 'listItemPrefix', 'listUnordered'];
  const unorderedParentTypes = ['blockQuote', 'listOrdered', 'listUnordered'];
  const unorderedListNesting = new Map();
  let lastBlockQuotePrefix = null;
  for (const token of filterByTypes(tokens, unorderedListTypes)) {
    const { parent, startColumn, startLine, type } = token;
    if (type === 'blockQuotePrefix') {
      lastBlockQuotePrefix = token;
    } else if (type === 'listUnordered') {
      let nesting = 0;
      let current = token;
      while ((current = getParentOfType(current, unorderedParentTypes))) {
        if (current.type === 'listUnordered') {
          nesting++;
          continue;
        } else if (current.type === 'listOrdered') {
          nesting = -1;
        }
        break;
      }
      if (nesting >= 0) unorderedListNesting.set(token, nesting);
    } else if (parent) {
      const nesting = unorderedListNesting.get(parent);
      if (nesting !== undefined) {
        const expectedIndent = (getParentOfType(token, ['gfmFootnoteDefinition']) ? 4 : 0) + (nesting * indent);
        const blockQuoteAdjustment = (lastBlockQuotePrefix?.endLine === startLine) ? (lastBlockQuotePrefix.endColumn - 1) : 0;
        const actualIndent = startColumn - 1 - blockQuoteAdjustment;
        if (actualIndent !== expectedIndent) {
          ctx.err(startLine, startColumn, 'MD007', `Expected ul indent ${expectedIndent}; got ${actualIndent}`);
        }
      }
    }
  }
}

function md029(ctx) {
  const { tokens, config } = ctx;
  const style = String(config.styles?.ol_prefix ?? 'ordered');
  for (const listOrdered of filterByTypes(tokens, ['listOrdered'])) {
    const listItemPrefixes = getDescendantsByType(listOrdered, ['listItemPrefix']);
    let expectedNumber = 1;
    let incrementing = false;
    if (listItemPrefixes.length > 1) {
      const getValue = (prefix) => Number(getDescendantsByType(prefix, ['listItemValue'])[0].text);
      const firstValue = getValue(listItemPrefixes[0]);
      const secondValue = getValue(listItemPrefixes[1]);
      if (secondValue !== 1 || firstValue === 0) {
        incrementing = true;
        if (firstValue === 0) expectedNumber = 0;
      }
    }
    let listStyle = style;
    if (!['zero', 'one', 'ordered'].includes(listStyle)) listStyle = incrementing ? 'ordered' : 'one';
    if (listStyle === 'zero') expectedNumber = 0;
    else if (listStyle === 'one') expectedNumber = 1;
    for (const listItemPrefix of listItemPrefixes) {
      const value = getDescendantsByType(listItemPrefix, ['listItemValue'])[0];
      const actualNumber = Number(value.text);
      if (actualNumber !== expectedNumber) {
        ctx.err(listItemPrefix.startLine, listItemPrefix.startColumn, 'MD029', `Expected ol prefix ${expectedNumber}; got ${actualNumber}`);
      }
      if (listStyle === 'ordered') expectedNumber++;
    }
  }
}

function md030(ctx) {
  const { tokens, config } = ctx;
  const ulSingle = Number(config.list_marker_space ?? 1);
  const olSingle = Number(config.list_marker_space ?? 1);
  const ulMulti = Number(config.list_marker_space ?? 1);
  const olMulti = Number(config.list_marker_space ?? 1);
  for (const list of filterByTypes(tokens, ['listOrdered', 'listUnordered'])) {
    const ordered = list.type === 'listOrdered';
    const listItemPrefixes = list.children.filter((token) => token.type === 'listItemPrefix');
    const allSingleLine = (list.endLine - list.startLine + 1) === listItemPrefixes.length;
    let expectedSpaces = ordered ? olSingle : ulSingle;
    if (!allSingleLine) expectedSpaces = ordered ? olMulti : ulMulti;
    for (const listItemPrefix of listItemPrefixes) {
      const whitespaces = listItemPrefix.children.filter((token) => token.type === 'listItemPrefixWhitespace');
      for (const whitespace of whitespaces) {
        const { endColumn, startColumn, startLine } = whitespace;
        const actualSpaces = endColumn - startColumn;
        if (actualSpaces !== expectedSpaces) {
          ctx.err(startLine, startColumn, 'MD030', `Expected ${expectedSpaces} space(s) after list marker; got ${actualSpaces}`);
        }
      }
    }
  }
}

export function checkMdStyle(ctx) {
  md003(ctx);
  md004(ctx);
  md005(ctx);
  md007(ctx);
  md029(ctx);
  md030(ctx);
}
