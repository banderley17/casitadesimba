import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const adminHtml = await readFile(new URL('../admin.html', import.meta.url), 'utf8');

test('the quick status control cannot move a sale to excluded', () => {
  assert.doesNotMatch(adminHtml, /c\.estado==='consulta'\?'cliente':c\.estado==='cliente'\?'excluido':'consulta'/);
  assert.doesNotMatch(adminHtml, /c\.estado==='excluido'\?'consulta'/);
  assert.match(adminHtml, /if \(c\.estado !== 'consulta'\) return;/);
  assert.match(adminHtml, /var nv = 'cliente';/);
});

test('only consultations expose an explicit button to pass to sale', () => {
  assert.match(adminHtml, /c\.estado==='consulta'\?'data-toggle="'\+c\.id\+'"':'disabled'/);
  assert.match(adminHtml, /c\.estado==='cliente'\?'✅ Venta':c\.estado==='excluido'\?'🚫 Excluido':'💬 Pasar a venta'/);
  assert.doesNotMatch(adminHtml, /Marcado como CV/);
});
