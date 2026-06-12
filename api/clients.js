export const config = { runtime: 'edge' };

const TOKEN = 'simba2026';
const KV_URL = process.env.UPSTASH_REDIS_REST_URL;
const KV_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

const json = (data, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  });

async function kvGet(key) {
  const res = await fetch(`${KV_URL}/get/${encodeURIComponent(key)}`, {
    headers: { Authorization: `Bearer ${KV_TOKEN}` },
  });
  const data = await res.json();
  return data.result;
}

async function kvSet(key, value) {
  await fetch(`${KV_URL}/pipeline`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${KV_TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify([['SET', key, value]]),
  });
}

export default async function handler(req) {
  if (req.method === 'OPTIONS') return new Response(null, { headers: CORS });

  const url = new URL(req.url);
  if (url.searchParams.get('t') !== TOKEN) {
    return new Response('Unauthorized', { status: 401, headers: CORS });
  }

  if (req.method === 'GET') {
    const raw = await kvGet('client_list');
    return json(raw ? JSON.parse(raw) : []);
  }

  if (req.method === 'POST') {
    const body = await req.json();
    const raw = await kvGet('client_list');
    const clients = raw ? JSON.parse(raw) : [];
    const client = {
      id: Date.now().toString(),
      nombre: (body.nombre || '').trim(),
      tel: (body.tel || '').trim(),
      servicio: body.servicio || '',
      estado: body.estado || 'consulta',
      fecha: new Date().toISOString().slice(0, 10),
      notas: (body.notas || '').trim(),
    };
    clients.unshift(client);
    await kvSet('client_list', JSON.stringify(clients));
    return json(client, 201);
  }

  if (req.method === 'DELETE') {
    const id = url.searchParams.get('id');
    const raw = await kvGet('client_list');
    const clients = raw ? JSON.parse(raw) : [];
    await kvSet('client_list', JSON.stringify(clients.filter(c => c.id !== id)));
    return json({ ok: true });
  }

  if (req.method === 'PATCH') {
    const id = url.searchParams.get('id');
    const body = await req.json();
    const raw = await kvGet('client_list');
    const clients = raw ? JSON.parse(raw) : [];
    const idx = clients.findIndex(c => c.id === id);
    if (idx !== -1) { clients[idx] = { ...clients[idx], ...body }; }
    await kvSet('client_list', JSON.stringify(clients));
    return json(clients[idx] || {});
  }

  return json({ error: 'Method not allowed' }, 405);
}
