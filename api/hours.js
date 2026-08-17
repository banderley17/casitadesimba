import { cleanText, jsonResponse, optionsResponse, readJson, requireAdmin } from '../lib/security.js';

export const config = { runtime: 'edge' };
const METHODS = 'GET, POST, OPTIONS';
const DEFAULT_HOURS = { month: 'Agosto 2026', display: 'Lun-Vie: 08:00 a 20:00. Fines de semana: consultar' };

async function kv(command) {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) throw new Error('KV_UNAVAILABLE');
  const response = await fetch(`${url}/pipeline`, { method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify([command]) });
  if (!response.ok) throw new Error('KV_UNAVAILABLE');
  return (await response.json())?.[0]?.result;
}

export default async function handler(req) {
  if (req.method === 'OPTIONS') return optionsResponse(req, METHODS, { csrf: true });
  try {
    if (req.method === 'GET') {
      const raw = await kv(['GET', 'casita_hours']);
      let value = DEFAULT_HOURS;
      try { if (raw) value = JSON.parse(raw); } catch (_) {}
      return jsonResponse(req, value, 200, METHODS, { publicCache: 'public, max-age=60, s-maxage=300' });
    }
    if (req.method !== 'POST') return jsonResponse(req, { ok: false, error: 'Método no permitido' }, 405, METHODS, { csrf: true });
    const auth = await requireAdmin(req, { csrf: true });
    if (!auth.ok) return auth.response;
    const body = await readJson(req, 4_096);
    const data = { month: cleanText(body.month, 60), display: cleanText(body.display, 300, { required: true }) };
    await kv(['SET', 'casita_hours', JSON.stringify(data)]);
    return jsonResponse(req, { ok: true }, 200, METHODS, { csrf: true });
  } catch (error) {
    const status = ['INVALID_INPUT', 'INVALID_JSON'].includes(error?.message) ? 400 : error?.message === 'PAYLOAD_TOO_LARGE' ? 413 : 500;
    return jsonResponse(req, { ok: false, error: status === 500 ? 'Error interno' : 'Datos inválidos' }, status, METHODS, { csrf: true });
  }
}
