// Token-tree parser — the "markdown AST" for this validation suite. Ported from
// markdownlint's lib/micromark-parse.mjs (MIT, David Anson) with the same
// extension set and undefined-reference shim, minus the markdownlint-only
// freezeTokens/lineDelta plumbing. Turns micromark events into a tree of
// tokens: { type, startLine, startColumn, endLine, endColumn, text, children, parent }.

import { directive } from 'micromark-extension-directive';
import { gfmAutolinkLiteral } from 'micromark-extension-gfm-autolink-literal';
import { gfmFootnote } from 'micromark-extension-gfm-footnote';
import { gfmTable } from 'micromark-extension-gfm-table';
import { math } from 'micromark-extension-math';
import { parse as micromarkParse, postprocess as micromarkPostprocess, preprocess as micromarkPreprocess } from 'micromark';
import { labelEnd } from 'micromark-core-commonmark';

export const flatTokensSymbol = Symbol('flat-tokens');
export const htmlFlowSymbol = Symbol('html-flow');
export const newlineRe = /\r\n?|\n/g;

function directiveNoInline() {
  const extension = { ...directive() };
  delete extension.text;
  return extension;
}

function getText(markdown, token) {
  return markdown.slice(token.start.offset, token.end.offset);
}

export function getEvents(markdown, micromarkParseOptions = {}) {
  const extensions = [
    directiveNoInline(),
    gfmAutolinkLiteral(),
    gfmFootnote(),
    gfmTable(),
    math(),
    ...(micromarkParseOptions.extensions || []),
  ];

  // Shim labelEnd to identify undefined link labels (needed by the reference
  // link/image rules: MD052 / MD053).
  const artificialEventLists = [];
  const tokenizeOriginal = labelEnd.tokenize;

  function tokenizeShim(effects, okOriginal, nokOriginal) {
    const tokenizeContext = this;
    const events = tokenizeContext.events;

    const nokShim = (code) => {
      let indexStart = events.length;
      while (--indexStart >= 0) {
        const event = events[indexStart];
        const [kind, token] = event;
        if (kind === 'enter') {
          if (token.type === 'labelImage' || token.type === 'labelLink') break;
        }
      }

      if (indexStart >= 0) {
        const eventStart = events[indexStart];
        const [, eventStartToken] = eventStart;
        const eventEnd = events[events.length - 1];
        const [, eventEndToken] = eventEnd;
        const undefinedReferenceType = {
          type: 'undefinedReferenceShortcut',
          start: eventStartToken.start,
          end: eventEndToken.end,
        };
        const undefinedReference = {
          type: 'undefinedReference',
          start: eventStartToken.start,
          end: eventEndToken.end,
        };
        const eventsToReplicate = events
          .slice(indexStart)
          .filter((event) => {
            const [, eventToken] = event;
            const { type } = eventToken;
            return type === 'data' || type === 'lineEnding';
          });

        const previousUndefinedEvent = (artificialEventLists.length > 0) && artificialEventLists[artificialEventLists.length - 1][0];
        const previousUndefinedToken = previousUndefinedEvent && previousUndefinedEvent[1];
        if (
          previousUndefinedToken &&
          (previousUndefinedToken.end.line === undefinedReferenceType.start.line) &&
          (previousUndefinedToken.end.column === undefinedReferenceType.start.column)
        ) {
          if (eventsToReplicate.length === 0) {
            previousUndefinedToken.type = 'undefinedReferenceCollapsed';
            previousUndefinedToken.end = eventEndToken.end;
          } else {
            undefinedReferenceType.type = 'undefinedReferenceFull';
            undefinedReferenceType.start = previousUndefinedToken.start;
            artificialEventLists.pop();
          }
        }

        const text = eventsToReplicate
          .filter((event) => event[0] === 'enter')
          .map((event) => getText(markdown, event[1]))
          .join('')
          .trim();
        if ((text.length > 0) && !text.includes(']')) {
          const artificialEvents = [
            ['enter', undefinedReferenceType, tokenizeContext],
            ['enter', undefinedReference, tokenizeContext],
          ];
          for (const event of eventsToReplicate) {
            const [kind, token] = event;
            artificialEvents.push([kind, { ...token }, tokenizeContext]);
          }
          artificialEvents.push(
            ['exit', undefinedReference, tokenizeContext],
            ['exit', undefinedReferenceType, tokenizeContext],
          );
          artificialEventLists.push(artificialEvents);
        }
      }

      return nokOriginal(code);
    };

    return tokenizeOriginal.call(tokenizeContext, effects, okOriginal, nokShim);
  }

  try {
    labelEnd.tokenize = tokenizeShim;
    const encoding = undefined;
    const eol = true;
    const parseContext = micromarkParse({ ...micromarkParseOptions, extensions });
    const chunks = micromarkPreprocess()(markdown, encoding, eol);
    const events = micromarkPostprocess(parseContext.document().write(chunks));
    return events.concat(...artificialEventLists);
  } finally {
    labelEnd.tokenize = tokenizeOriginal;
  }
}

function isHtmlFlowComment(token) {
  const { text, type } = token;
  if (type === 'htmlFlow' && text.startsWith('<!--') && text.endsWith('-->')) {
    const comment = text.slice(4, -3);
    return !comment.startsWith('>') && !comment.startsWith('->') && !comment.endsWith('-');
  }
  return false;
}

export function parse(markdown, micromarkParseOptions = {}) {
  const events = getEvents(markdown, micromarkParseOptions);

  const document = [];
  let flatTokens = [];
  const root = {
    type: 'data',
    startLine: -1,
    startColumn: -1,
    endLine: -1,
    endColumn: -1,
    text: 'ROOT',
    children: document,
    parent: null,
  };
  const history = [root];
  let current = root;
  let reparseOptions = null;
  let lines = null;
  let skipHtmlFlowChildren = false;

  for (const event of events) {
    const [kind, token] = event;
    const { type, start, end } = token;
    const { column: startColumn, line: startLine } = start;
    const { column: endColumn, line: endLine } = end;
    const text = getText(markdown, token);

    if (kind === 'enter' && !skipHtmlFlowChildren) {
      const previous = current;
      history.push(previous);
      current = {
        type,
        startLine,
        startColumn,
        endLine,
        endColumn,
        text,
        children: [],
        parent: previous === root ? null : previous,
      };
      previous.children.push(current);
      flatTokens.push(current);

      if (current.type === 'htmlFlow' && !isHtmlFlowComment(current)) {
        skipHtmlFlowChildren = true;
        if (!reparseOptions || !lines) {
          reparseOptions = {
            ...micromarkParseOptions,
            extensions: [
              {
                disable: { null: ['codeIndented', 'htmlFlow'] },
              },
            ],
          };
          lines = markdown.split(newlineRe);
        }
        const reparseMarkdown = lines
          .slice(current.startLine - 1, current.endLine)
          .join('\n');
        const tokens = parse(reparseMarkdown, reparseOptions);
        current.children = tokens;
        flatTokens = flatTokens.concat(tokens[flatTokensSymbol]);
      }
    } else if (kind === 'exit') {
      if (type === 'htmlFlow') skipHtmlFlowChildren = false;
      if (!skipHtmlFlowChildren) {
        current = history.pop();
      }
    }
  }

  Object.defineProperty(document, flatTokensSymbol, { value: flatTokens });
  return document;
}
