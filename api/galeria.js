import { cleanId, jsonResponse, optionsResponse, readJson, requireAdmin } from '../lib/security.js';

export const config = { runtime: 'edge' };
const METHODS = 'GET, POST, OPTIONS';
const CLOUD_NAME = 'dqboccvby';

function kvConfig() {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) throw new Error('KV_UNAVAILABLE');
  return { url, token };
}
async function kv(command) {
  const { url, token } = kvConfig();
  const response = await fetch(`${url}/pipeline`, { method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify([command]) });
  if (!response.ok) throw new Error('KV_UNAVAILABLE');
  return (await response.json())?.[0]?.result;
}
function parseArray(raw) { try { const value = JSON.parse(raw || '[]'); return Array.isArray(value) ? value : []; } catch (_) { return []; } }
function parseObject(raw) { try { const value = JSON.parse(raw || '{}'); return value && typeof value === 'object' && !Array.isArray(value) ? value : {}; } catch (_) { return {}; } }
function publicId(value) {
  const clean = cleanId(value);
  if (!clean.startsWith('casita/')) throw new Error('INVALID_INPUT');
  return clean;
}
async function resources(tag) {
  const response = await fetch(`https://res.cloudinary.com/${CLOUD_NAME}/image/list/${tag}.json?max_results=100`, { headers: { Accept: 'application/json' } });
  if (!response.ok) return [];
  const data = await response.json();
  if (!Array.isArray(data.resources)) return [];
  return data.resources.slice(0, 100).flatMap((item) => {
    try {
      return [{ public_id: publicId(item.public_id), version: Number(item.version) || 0, format: String(item.format || '').slice(0, 10), width: Number(item.width) || 0, height: Number(item.height) || 0, context: item.context && typeof item.context === 'object' ? item.context : {} }];
    } catch (_) {
      return [];
    }
  });
}

export default async function handler(req) {
  if (req.method === 'OPTIONS') return optionsResponse(req, METHODS, { csrf: true });
  try {
    const url = new URL(req.url);
    const isHero = url.searchParams.get('collection') === 'hero';
    const orderKey = isHero ? 'casita_hero_order' : 'casita_galeria_order';
    const positionsKey = isHero ? 'casita_hero_positions' : 'casita_galeria_positions';

    if (req.method === 'GET') {
      const order = parseArray(await kv(['GET', orderKey])).filter((id) => { try { publicId(id); return true; } catch (_) { return false; } }).slice(0, 100);
      if (url.searchParams.get('meta') !== '1') return jsonResponse(req, order, 200, METHODS, { publicCache: 'public, max-age=15, s-maxage=60' });
      const all = await resources(isHero ? 'hero' : 'galeria');
      const byId = new Map(all.map((item) => [item.public_id, item]));
      const effectiveOrder = order.length ? order.filter((id) => byId.has(id)) : all.map((item) => item.public_id);
      const positions = parseObject(await kv(['GET', positionsKey]));
      return jsonResponse(req, { order: effectiveOrder, positions, resources: effectiveOrder.map((id) => byId.get(id)).filter(Boolean) }, 200, METHODS, { publicCache: 'public, max-age=15, s-maxage=60' });
    }

    if (req.method !== 'POST') return jsonResponse(req, { ok: false, error: 'Método no permitido' }, 405, METHODS, { csrf: true });
    const auth = await requireAdmin(req, { csrf: true });
    if (!auth.ok) return auth.response;
    const body = await readJson(req, 32_000);
    const collectionHero = body.collection === 'hero';
    const targetOrderKey = collectionHero ? 'casita_hero_order' : 'casita_galeria_order';
    const targetPositionsKey = collectionHero ? 'casita_hero_positions' : 'casita_galeria_positions';
    let changed = false;

    if (Array.isArray(body.order)) {
      const cleanOrder = [...new Set(body.order.slice(0, 100).map(publicId))];
      await kv(['SET', targetOrderKey, JSON.stringify(cleanOrder)]);
      changed = true;
    }
    if (typeof body.add === 'string') {
      const id = publicId(body.add);
      const current = parseArray(await kv(['GET', targetOrderKey]));
      if (!current.includes(id)) await kv(['SET', targetOrderKey, JSON.stringify([...current, id].slice(0, 100))]);
      changed = true;
    }
    if (body.positions && typeof body.positions === 'object' && !Array.isArray(body.positions)) {
      const clean = {};
      Object.entries(body.positions).slice(0, 100).forEach(([id, value]) => {
        const safeId = publicId(id);
        const number = Number(value);
        if (Number.isFinite(number)) clean[safeId] = Math.max(0, Math.min(100, number));
      });
      await kv(['SET', targetPositionsKey, JSON.stringify(clean)]);
      changed = true;
    }
    if (!changed) throw new Error('INVALID_INPUT');
    return jsonResponse(req, { ok: true }, 200, METHODS, { csrf: true });
  } catch (error) {
    const status = error?.message === 'PAYLOAD_TOO_LARGE' ? 413 : ['INVALID_INPUT', 'INVALID_JSON'].includes(error?.message) ? 400 : 500;
    return jsonResponse(req, { ok: false, error: status === 500 ? 'Error interno' : 'Datos inválidos' }, status, METHODS, { csrf: true });
  }
}
