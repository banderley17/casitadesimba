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
    const collection = new URL(req.url).searchParams.get('collection') === 'hero' ? 'hero' : 'gallery';
    const key = collection === 'hero' ? 'casita_hero_order' : 'casita_galeria_order';
    const raw = await kvGet(key, kvUrl, kvTok);
    const order = raw ? JSON.parse(raw) : [];
    if (collection === 'hero' && new URL(req.url).searchParams.get('meta') === '1') {
      const rawPositions = await kvGet('casita_hero_positions', kvUrl, kvTok);
      return ok({ order, positions: rawPositions ? JSON.parse(rawPositions) : {} });
    }
    return ok(order);
  }

  const url = new URL(req.url);
  if (url.searchParams.get('t') !== PANEL_TOK) return err('Unauthorized', 401);

  // POST con token — guarda nuevo orden
  if (req.method === 'POST') {
    const { order, collection, positions } = await req.json();
    const isHero = collection === 'hero';
    if (!Array.isArray(order) && !(isHero && positions && typeof positions === 'object' && !Array.isArray(positions))) return err('order debe ser un array');
    const key = isHero ? 'casita_hero_order' : 'casita_galeria_order';
    if (Array.isArray(order)) await kvSet(key, JSON.stringify(order), kvUrl, kvTok);
    if (isHero && positions && typeof positions === 'object' && !Array.isArray(positions)) {
      const clean = {};
      Object.keys(positions).slice(0, 100).forEach((id) => { const value = Number(positions[id]); if (Number.isFinite(value)) clean[id] = Math.max(0, Math.min(100, value)); });
      await kvSet('casita_hero_positions', JSON.stringify(clean), kvUrl, kvTok);
    }
    return ok({ ok: true });
  }

  return err('Método no permitido', 405);
}
