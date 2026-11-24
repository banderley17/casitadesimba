import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
// condiciones-contratacion.html es un borrador sin publicar: no se enlaza todavía.
const legal = ['aviso-legal.html', 'politica-privacidad.html', 'politica-cookies.html'];

test('third-party resources needing consent are not loaded directly', () => {
  assert.doesNotMatch(html, /fonts\.googleapis\.com|fonts\.gstatic\.com|flagcdn\.com/);
  assert.doesNotMatch(html, /<iframe[^>]*\ssrc="https:\/\/maps\.google/);
  assert.doesNotMatch(html, /<noscript><img[^>]*facebook\.com\/tr/);
  // Meta Pixel / API de Conversiones retirados al dejar de usar Meta Ads.
  assert.doesNotMatch(html, /connect\.facebook\.net|fbq\(|api\/track/);
});

test('the booking form carries an unchecked privacy box and no Meta box', () => {
  assert.match(html, /<input type="checkbox" id="fprivacidad" name="privacidad" required>/);
  assert.doesNotMatch(html, /id="fmeta"|consentMeta/);
  assert.match(html, /href="politica-privacidad\.html"/);
});

test('the footer links every legal page and reopens cookie settings', () => {
  for (const page of legal) {
    assert.match(html, new RegExp(`href="${page}"`));
    const doc = readFileSync(new URL(`../${page}`, import.meta.url), 'utf8');
    assert.match(doc, /<script src="js\/cookie-consent\.js"><\/script>/);
    assert.match(doc, /data-cookie-settings/);
  }
  assert.match(html, /data-cookie-settings/);
});

test('the cookie banner only offers the map as an optional category', () => {
  const js = readFileSync(new URL('../js/cookie-consent.js', import.meta.url), 'utf8');
  assert.match(js, /var OPTIONAL = \['funcionales'\];/);
  assert.doesNotMatch(js, /catRow\('marketing'\)/);
});
