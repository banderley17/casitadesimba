import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';

const adminHtml = await readFile(new URL('../admin.html', import.meta.url), 'utf8');

test('Publicidad remains available when Meta has a temporary read failure', () => {
  assert.match(adminHtml, /function keepAdsTabVisibleOnReadFailure\(\)/);
  assert.match(adminHtml, /No se pudieron actualizar los datos de Meta\. Reintenta en unos segundos\./);
});

test('Publicidad is hidden only after Meta confirms that no campaign is active', () => {
  assert.match(adminHtml, /if \(!Array\.isArray\(d\.campaigns\) \|\| !d\.campaigns\.length\) \{[\s\S]{0,500}adsTab\.style\.display = 'none';/);
});
