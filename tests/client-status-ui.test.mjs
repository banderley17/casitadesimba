import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const adminHtml = await readFile(new URL('../admin.html', import.meta.url), 'utf8');

test('the quick status control cannot move a sale to excluded', () => {
  assert.doesNotMatch(adminHtml, /c\.estado==='consulta'\?'cliente':c\.estado==='cliente'\?'excluido':'consulta'/);
  assert.match(adminHtml, /var nv = c\.estado==='excluido'\?'consulta':'cliente';/);
});

test('the sale status button is disabled instead of cycling to CV', () => {
  assert.match(adminHtml, /c\.estado==='cliente'\?'disabled':'data-toggle="'\+c\.id\+'"'/);
  assert.doesNotMatch(adminHtml, /Marcado como CV/);
});
