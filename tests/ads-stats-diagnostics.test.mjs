import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';

const source = await readFile(new URL('../api/ads-stats.js', import.meta.url), 'utf8');

test('records Meta status metadata for failed ads-stat requests without logging a token', () => {
  assert.match(source, /error\.metaStatus = response\.status/);
  assert.match(source, /console\.error\('ads-stats Meta request failed', \{ status: error\.metaStatus \|\| null, code: error\.metaCode \|\| null, subcode: error\.metaSubcode \|\| null \}\)/);
  assert.doesNotMatch(source, /console\.error\([^)]*token/);
});
