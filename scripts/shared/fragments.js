// Fragment computation — the single source of truth for heading→anchor slugs.
// Implements markdownlint MD051's exact algorithm (GitHub's heading fragment
// rule): strip markdown link/image/code syntax, keep letters/marks/numbers/
// connector punctuation/hyphen/space, lowercase, spaces→dashes, then
// percent-encode. Shared by links.js (same-file + cross-file anchors) and
// structure.js (duplicate-slug detection) so every validator agrees with
// markdownlint's MD051.

const KEEP_RE = /[^\p{Letter}\p{Mark}\p{Number}\p{Connector_Punctuation}\- ]/gu;
// image first (dropped entirely, like MD051's childrenExclude), then links
// (text kept) and reference links (text kept)
const IMG_RE = /!\[[^\]]*\]\([^)]*\)|!\[[^\]]*\]\[[^\]]*\]/g;
const LINK_RE = /\[([^\]]*)\]\([^)]*\)|\[([^\]]*)\]\[[^\]]*\]/g;
const CODE_RE = /`([^`]*)`/g;

// Renders a heading's inline text the way MD051 does: link text is kept,
// images and reference links are dropped, inline code keeps its content.
function inlineText(text) {
  return text
    .replace(IMG_RE, '')
    .replace(LINK_RE, (_m, a, b) => a || b || '')
    .replace(CODE_RE, '$1');
}

// Heading text → GitHub/MD051 fragment, without the leading `#`.
export function fragment(text) {
  return inlineText(text)
    .toLowerCase()
    .replace(KEEP_RE, '')
    .replace(/ /gu, '-');
}

// Anchor comparison key: percent-decode the anchor, then run the same
// normalization as a heading fragment.
export function anchorFragment(anchor) {
  let decoded = anchor;
  try {
    decoded = decodeURIComponent(anchor);
  } catch {
    // malformed percent-encoding — treat literally; MD051's own decode path
    // is lenient too, so fall back to the raw text
  }
  return fragment(decoded);
}
