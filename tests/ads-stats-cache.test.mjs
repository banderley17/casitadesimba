import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';

const source = await readFile(new URL('../api/ads-stats.js', import.meta.url), 'utf8');

test('shares each ads period through a short-lived server cache', () => {
  assert.match(source, /const ADS_CACHE_SECONDS = 60;/);
  assert.match(source, /const cacheKey = `casita_ads_stats:\$\{period\}`;/);
  assert.match(source, /redisCommand\(\['SETEX', cacheKey, ADS_CACHE_SECONDS, JSON\.stringify\(payload\)\]\)/);
});
