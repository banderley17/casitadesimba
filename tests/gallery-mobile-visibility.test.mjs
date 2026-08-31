import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const indexHtml = await readFile(new URL('../index.html', import.meta.url), 'utf8');

test('the reveal observer allows a long single-column mobile gallery to become visible', () => {
  const observerOptions = indexHtml.match(
    /const observer = new IntersectionObserver\([\s\S]*?\},\s*\{ threshold:\s*([0-9.]+)\s*\}\);/
  );

  assert.ok(observerOptions, 'gallery reveal observer options should be present');
  assert.equal(Number(observerOptions[1]), 0, 'reveal must trigger as soon as the gallery enters the viewport');
});
