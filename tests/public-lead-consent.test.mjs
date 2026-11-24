import test from 'node:test';
import assert from 'node:assert/strict';

process.env.UPSTASH_REDIS_REST_URL = 'https://redis.test';
process.env.UPSTASH_REDIS_REST_TOKEN = 'test-token';

const { default: handler } = await import('../api/public-lead.js');

function mockRedis(initialClients = []) {
  const store = { client_list: JSON.stringify(initialClients) };
  globalThis.fetch = async (url, init = {}) => {
    const u = String(url);
    if (u.endsWith('/get/client_list')) return new Response(JSON.stringify({ result: store.client_list }));
    if (u.endsWith('/pipeline')) {
      const commands = JSON.parse(init.body);
      const results = commands.map(([cmd, key, value]) => {
        if (cmd === 'SET') { store[key] = value; return { result: 'OK' }; }
        if (cmd === 'INCR') return { result: 1 };
        return { result: 1 };
      });
      return new Response(JSON.stringify(results));
    }
    throw new Error(`unexpected fetch ${u}`);
  };
  return store;
}

function request(body) {
  return new Request('https://casitadesimba.vercel.app/api/public-lead', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Origin: 'https://lacasitadesimba.es', 'x-real-ip': '203.0.113.7' },
    body: JSON.stringify(body),
  });
}

const base = { nombre: 'Ana', tel: '+34 600 111 222', mascota: 'Toby', servicio: 'Estancia (12h)', entrada: '2026-12-10' };

test('rejects a booking request without the privacy acknowledgement', async () => {
  const store = mockRedis();
  const response = await handler(request({ ...base }));
  assert.equal(response.status, 400);
  assert.deepEqual(JSON.parse(store.client_list), []);
});

test('stores the privacy acknowledgement and an optional Meta consent', async () => {
  const store = mockRedis();
  const response = await handler(request({ ...base, privacidad: true, consentMeta: true }));
  assert.equal(response.status, 201);
  const [client] = JSON.parse(store.client_list);
  assert.equal(client.consentimientos.meta, true);
  assert.ok(client.consentimientos.privacidadInformadaAt);
  assert.ok(client.consentimientos.metaAt);
});

test('a later request without the Meta box withdraws the previous consent', async () => {
  const store = mockRedis([{ id: 'c1', estado: 'cliente', tel: '+34 600 111 222', consentimientos: { meta: true, metaAt: 'T0' } }]);
  const response = await handler(request({ ...base, privacidad: true }));
  assert.equal(response.status, 201);
  const [client] = JSON.parse(store.client_list);
  assert.equal(client.estado, 'cliente');
  assert.equal(client.consentimientos.meta, false);
  assert.ok(client.consentimientos.metaRetiradoAt);
});
