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


async function getCollectionResources(collection) {
  try {
    const response = await fetch('https://res.cloudinary.com/dqboccvby/image/list/' + collection + '.json?max_results=100&_=' + Date.now(), { cache: 'no-store' });
    if (!response.ok) return [];
    const data = await response.json();
    return Array.isArray(data.resources) ? data.resources.slice(0, 100) : [];
  } catch (_) {
    return [];
  }
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
    if (new URL(req.url).searchParams.get('meta') === '1') {
      const allResources = await getCollectionResources(collection === 'hero' ? 'hero' : 'galeria');
      const byId = new Map(allResources.map((item) => [item.public_id, item]));
      // Once an order exists, it is authoritative. This prevents deleted files
      // from returning while a Cloudinary list is still cached.
      const effectiveOrder = order.length
        ? order.filter((id) => byId.has(id))
        : allResources.map((item) => item.public_id);
      const resources = effectiveOrder.map((id) => byId.get(id)).filter(Boolean);
      const positionsKey = collection === 'hero' ? 'casita_hero_positions' : 'casita_galeria_positions';
      const rawPositions = await kvGet(positionsKey, kvUrl, kvTok);
      return ok({ order: effectiveOrder, positions: rawPositions ? JSON.parse(rawPositions) : {}, resources });
    }
    return ok(order);
  }

  const url = new URL(req.url);
  if (url.searchParams.get('t') !== PANEL_TOK) return err('Unauthorized', 401);

  // POST con token — guarda nuevo orden
  if (req.method === 'POST') {
    const { order, collection, positions, add } = await req.json();
    const isHero = collection === 'hero';
    const canSavePositions = positions && typeof positions === 'object' && !Array.isArray(positions);
    const canAdd = typeof add === 'string' && add.startsWith('casita/');
    if (!Array.isArray(order) && !canSavePositions && !canAdd) return err('order debe ser un array');
    const key = isHero ? 'casita_hero_order' : 'casita_galeria_order';
    if (Array.isArray(order)) await kvSet(key, JSON.stringify(order), kvUrl, kvTok);
    if (canAdd) {
      const currentRaw = await kvGet(key, kvUrl, kvTok);
      const current = currentRaw ? JSON.parse(currentRaw) : [];
      if (Array.isArray(current) && !current.includes(add)) {
        current.push(add);
        await kvSet(key, JSON.stringify(current), kvUrl, kvTok);
      }
    }
    if (canSavePositions) {
      const clean = {};
      Object.keys(positions).slice(0, 100).forEach((id) => { const value = Number(positions[id]); if (Number.isFinite(value)) clean[id] = Math.max(0, Math.min(100, value)); });
      await kvSet(isHero ? 'casita_hero_positions' : 'casita_galeria_positions', JSON.stringify(clean), kvUrl, kvTok);
    }
    return ok({ ok: true });
  }

  return err('Método no permitido', 405);
}
