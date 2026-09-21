import test from 'node:test';
import assert from 'node:assert/strict';
import { fragment, anchorFragment } from '../../shared/fragments.js';

test('fragment: plain heading slugifies', () => {
  assert.equal(fragment('Hello World'), 'hello-world');
});

test('fragment: keeps variation selector (MD051 keeps marks)', () => {
  assert.equal(fragment('🗂️ Secondary accounts'), '\ufe0f-secondary-accounts');
});

test('fragment: leading emoji becomes leading dash', () => {
  assert.equal(fragment('🎡 Life dream'), '-life-dream');
});

test('fragment: accent letters are kept and lowercased', () => {
  assert.equal(fragment('⚡ Pokémon read'), '-pokémon-read');
});

test('fragment: drops punctuation but keeps hyphens and spaces', () => {
  assert.equal(fragment('Raw ceiling vs sustainable'), 'raw-ceiling-vs-sustainable');
});

test('fragment: link text kept, image dropped (image leaves a space)', () => {
  assert.equal(fragment('See [the docs](https://x.dev)'), 'see-the-docs');
  assert.equal(fragment('![alt](img.png) note'), '-note');
});

test('fragment: inline code keeps its content', () => {
  assert.equal(fragment('Singles (flat in `one_vs_one`)'), 'singles-flat-in-one_vs_one');
});

test('anchorFragment: percent-encoded anchor decodes before matching', () => {
  assert.equal(anchorFragment('%EF%B8%8F-secondary-accounts'), '\ufe0f-secondary-accounts');
  assert.equal(anchorFragment('-secondary-accounts'), '-secondary-accounts');
});

test('anchorFragment: malformed percent-encoding is tolerated', () => {
  assert.equal(anchorFragment('%zz-broken'), 'zz-broken');
});
