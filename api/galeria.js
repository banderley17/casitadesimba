export const config = { runtime: 'edge' };

const PANEL_TOK = 'simba2026';
const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

async function kvGet(key, url, tok) {
  const r = await fetch(`${url}/get/${encodeURIComponent(key)}`, { headers: { Authorization: `Bearer ${tok}` } });
  return (await r.json()).result;
}
async function kvSet(key, val, url, tok) {
  await fetch(`${url}/pipeline`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${tok}`, 'Content-Type': 'application/json' },
    body: JSON.stringify([['SET', key, val]]),
  });
}

export default async function handler(req) {
  if (req.method === 'OPTIONS') return new Response(null, { headers: CORS });

  const kvUrl = process.env.UPSTASH_REDIS_REST_URL;
  const kvTok = process.env.UPSTASH_REDIS_REST_TOKEN;
  const ok  = (d) => new Response(JSON.stringify(d), { headers: { ...CORS, 'Content-Type': 'application/json' } });
  const err = (m, s = 400) => new Response(JSON.stringify({ ok: false, msg: m }), { status: s, headers: { ...CORS, 'Content-Type': 'application/json' } });

  // GET público — devuelve el array de public_ids en el orden guardado
  if (req.method === 'GET') {
    const raw = await kvGet('casita_galeria_order', kvUrl, kvTok);
    return ok(raw ? JSON.parse(raw) : []);
  }

  const url = new URL(req.url);
  if (url.searchParams.get('t') !== PANEL_TOK) return err('Unauthorized', 401);

  // POST con token — guarda nuevo orden
  if (req.method === 'POST') {
    const { order } = await req.json();
    if (!Array.isArray(order)) return err('order debe ser un array');
    await kvSet('casita_galeria_order', JSON.stringify(order), kvUrl, kvTok);
    return ok({ ok: true });
  }

  return err('Método no permitido', 405);
}
