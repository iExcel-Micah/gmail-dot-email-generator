// test-variations.js
// Standalone Node test for the bug-fix work covering:
//   GDV-001: +alias plus-addressing variations
//   GDV-002: Google Workspace custom-domain support
//
// Run: `node test-variations.js`

import test from 'node:test';
import assert from 'node:assert/strict';
import {
  parseGmailAddress,
  generateGmailDotVariants,
  generatePlusTagVariants,
  normalizePlusTags,
  DEFAULT_PLUS_TAGS
} from './gmailDots.js';

// ---------------------------------------------------------------------------
// 1. Dot variations still work for a known input (regression / GDV-001 floor)
// ---------------------------------------------------------------------------
test('dot variations still work for a known input', () => {
  const variants = generateGmailDotVariants('abc@gmail.com', { mode: 'all' });
  assert.deepEqual(
    new Set(variants),
    new Set(['abc@gmail.com', 'a.bc@gmail.com', 'ab.c@gmail.com', 'a.b.c@gmail.com'])
  );
});

test('wordSplit mode still produces clean first.last for known names', () => {
  const variants = generateGmailDotVariants('MicahBerkley@gmail.com');
  assert.deepEqual(variants, ['micah.berkley@gmail.com']);
});

// ---------------------------------------------------------------------------
// 2. GDV-001: +alias plus-addressing variations
// ---------------------------------------------------------------------------
test('GDV-001: generatePlusTagVariants produces a+x@gmail.com style output', () => {
  const parsed = parseGmailAddress('alice@gmail.com');
  const variants = generatePlusTagVariants(parsed, { tags: ['x', 'y'] });
  assert.deepEqual(variants, ['alice+x@gmail.com', 'alice+y@gmail.com']);
});

test('GDV-001: default plus tags are applied when none supplied', () => {
  const parsed = parseGmailAddress('alice@gmail.com');
  const variants = generatePlusTagVariants(parsed);
  assert.equal(variants.length, DEFAULT_PLUS_TAGS.length);
  for (const tag of DEFAULT_PLUS_TAGS) {
    assert.ok(variants.includes(`alice+${tag}@gmail.com`), `missing default tag "${tag}"`);
  }
});

test('GDV-001: normalizePlusTags accepts comma/space/newline-separated freeform input', () => {
  assert.deepEqual(
    normalizePlusTags('newsletter, signup;promo  social\nshop'),
    ['newsletter', 'signup', 'promo', 'social', 'shop']
  );
});

test('GDV-001: normalizePlusTags strips a leading + and dedupes', () => {
  assert.deepEqual(
    normalizePlusTags(['+news', 'news', 'PROMO', '   ', 'bad tag!']),
    ['news', 'promo']
  );
});

test('GDV-001: plus variants combine with dot-split local part via localOverride', () => {
  const parsed = parseGmailAddress('johnsmith@gmail.com');
  const variants = generatePlusTagVariants(parsed, {
    tags: ['signup'],
    localOverride: 'john.smith'
  });
  assert.deepEqual(variants, ['john.smith+signup@gmail.com']);
});

// ---------------------------------------------------------------------------
// 3. GDV-002: Google Workspace custom-domain support
// ---------------------------------------------------------------------------
test('GDV-002: parseGmailAddress rejects custom domain by default (Gmail-only)', () => {
  assert.equal(parseGmailAddress('a@example.com'), null);
});

test('GDV-002: parseGmailAddress accepts a workspace domain when explicitly opted in', () => {
  const parsed = parseGmailAddress('a@example.com', { workspaceDomain: 'example.com' });
  assert.ok(parsed, 'expected parsed object for opted-in workspace domain');
  assert.equal(parsed.domain, 'example.com');
  assert.equal(parsed.baseLocal, 'a');
  assert.equal(parsed.isWorkspace, true);
});

test('GDV-002: workspace mode produces dot variations for custom domain', () => {
  const variants = generateGmailDotVariants('abc@example.com', {
    mode: 'all',
    workspaceDomain: 'example.com'
  });
  assert.deepEqual(
    new Set(variants),
    new Set(['abc@example.com', 'a.bc@example.com', 'ab.c@example.com', 'a.b.c@example.com'])
  );
});

test('GDV-002: workspace mode produces +alias variations for custom domain', () => {
  const parsed = parseGmailAddress('a@example.com', { workspaceDomain: 'example.com' });
  const variants = generatePlusTagVariants(parsed, { tags: ['x'] });
  assert.deepEqual(variants, ['a+x@example.com']);
  // The README example from the task brief: a+x@example.com
  assert.ok(variants.includes('a+x@example.com'));
});

test('GDV-002: workspace allowedDomain mismatch is still rejected', () => {
  // Passing workspaceDomain="foo.com" should NOT also allow "bar.com".
  assert.equal(
    parseGmailAddress('a@bar.com', { workspaceDomain: 'foo.com' }),
    null
  );
});

test('GDV-002: invalid workspace domain (no dot) is rejected', () => {
  assert.equal(
    parseGmailAddress('a@localhost', { workspaceDomain: 'localhost' }),
    null
  );
});
