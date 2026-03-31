import { test } from 'node:test';
import assert from 'node:assert/strict';
import { generateGmailDotVariants } from '../gmailDots.js';

test('integration: all mode generates expected count for 4-char local part', () => {
  const email = 'abcd@gmail.com';
  // 4 chars -> 2^(4-1) = 8 total variations
  const all = generateGmailDotVariants(email, { mode: 'all' });
  assert.equal(all.length, 8, 'Should generate 8 variations for "abcd"');
  
  // Simulation of frontend logic:
  // noDot = abcd@gmail.com
  // wordSplit = ab.cd@gmail.com (likely split for 4 chars if no names match)
  const noDot = 'abcd@gmail.com';
  const wordSplit = generateGmailDotVariants(email, { mode: 'wordSplit' })[0];
  
  const extras = all.filter(v => 
    v.toLowerCase() !== noDot.toLowerCase() && 
    v.toLowerCase() !== wordSplit.toLowerCase()
  );
  
  // Total (8) - (noDot === wordSplit ? 1 : 2) = 7 or 6
  const expectedExtras = (noDot.toLowerCase() === wordSplit.toLowerCase()) ? 7 : 6;
  assert.equal(extras.length, expectedExtras, `Should have ${expectedExtras} extra variations after filtering`);
});

test('integration: all mode generates expected count for 5-char local part', () => {
  const email = 'abcde@gmail.com';
  // 5 chars -> 2^(5-1) = 16 total variations
  const all = generateGmailDotVariants(email, { mode: 'all' });
  assert.equal(all.length, 16, 'Should generate 16 variations for "abcde"');
});
