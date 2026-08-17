import { cleanId, jsonResponse, optionsResponse, readJson, requireAdmin } from '../lib/security.js';

export const config = { runtime: 'edge' };
const METHODS = 'POST, OPTIONS';
const CLOUD_NAME = 'dqboccvby';

async function sha1(value) {
  const hash = await crypto.subtle.digest('SHA-1', new TextEncoder().encode(value));
  return [...new Uint8Array(hash)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

async function removeFromSavedData(publicId) {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return;
  const commands = [];
  for (const [orderKey, positionsKey] of [['casita_galeria_order', 'casita_galeria_positions'], ['casita_hero_order', 'casita_hero_positions']]) {
    const response = await fetch(`${url}/pipeline`, { method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify([['GET', orderKey], ['GET', positionsKey]]) });
    if (!response.ok) continue;
    const data = await response.json();
    let order = [];
    let positions = {};
    try { order = JSON.parse(data?.[0]?.result || '[]'); } catch (_) {}
    try { positions = JSON.parse(data?.[1]?.result || '{}'); } catch (_) {}
    if (!Array.isArray(order)) order = [];
    if (!positions || typeof positions !== 'object' || Array.isArray(positions)) positions = {};
    delete positions[publicId];
    commands.push(['SET', orderKey, JSON.stringify(order.filter((id) => id !== publicId))], ['SET', positionsKey, JSON.stringify(positions)]);
  }
  if (commands.length) await fetch(`${url}/pipeline`, { method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify(commands) });
}

export default async function handler(req) {
  if (req.method === 'OPTIONS') return optionsResponse(req, METHODS, { csrf: true });
  if (req.method !== 'POST') return jsonResponse(req, { ok: false, error: 'Método no permitido' }, 405, METHODS, { csrf: true });
  const auth = await requireAdmin(req, { csrf: true });
  if (!auth.ok) return auth.response;
  try {
    const body = await readJson(req, 2_048);
    const publicId = cleanId(body.public_id);
    if (!publicId.startsWith('casita/')) throw new Error('INVALID_INPUT');
    const apiKey = process.env.CLOUDINARY_API_KEY;
    const apiSecret = process.env.CLOUDINARY_API_SECRET;
    if (!apiKey || !apiSecret) return jsonResponse(req, { ok: false, error: 'Servicio de imágenes no configurado' }, 503, METHODS, { csrf: true });
    const timestamp = Math.floor(Date.now() / 1000);
    const signature = await sha1(`invalidate=true&public_id=${publicId}&timestamp=${timestamp}${apiSecret}`);
    const payload = new URLSearchParams({ public_id: publicId, timestamp: String(timestamp), invalidate: 'true', api_key: apiKey, signature });
    const response = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/destroy`, { method: 'POST', body: payload });
    const result = await response.json().catch(() => ({}));
    if (!response.ok || !['ok', 'not found'].includes(result.result)) return jsonResponse(req, { ok: false, error: 'No se pudo eliminar la foto' }, 502, METHODS, { csrf: true });
    await removeFromSavedData(publicId);
    return jsonResponse(req, { ok: true, alreadyMissing: result.result === 'not found' }, 200, METHODS, { csrf: true });
  } catch (error) {
    const status = error?.message === 'PAYLOAD_TOO_LARGE' ? 413 : ['INVALID_INPUT', 'INVALID_JSON'].includes(error?.message) ? 400 : 500;
    return jsonResponse(req, { ok: false, error: status === 500 ? 'Error interno' : 'Datos inválidos' }, status, METHODS, { csrf: true });
  }
}
