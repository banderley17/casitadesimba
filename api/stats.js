import { jsonResponse, optionsResponse, requireAdmin } from '../lib/security.js';

export const config = { runtime: 'edge' };
const METHODS = 'GET, OPTIONS';

function dateKey(offset) {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() - offset);
  return date.toISOString().slice(0, 10);
}

export default async function handler(req) {
  if (req.method === 'OPTIONS') return optionsResponse(req, METHODS);
  if (req.method !== 'GET') return jsonResponse(req, { ok: false, error: 'Método no permitido' }, 405, METHODS);
  const auth = await requireAdmin(req);
  if (!auth.ok) return auth.response;
  try {
    const url = process.env.UPSTASH_REDIS_REST_URL;
    const token = process.env.UPSTASH_REDIS_REST_TOKEN;
    if (!url || !token) throw new Error('KV_UNAVAILABLE');
    const pipeline = [];
    for (const prefix of ['pv', 'ct', 'ld']) for (let index = 0; index < 30; index += 1) pipeline.push(['GET', `${prefix}:${dateKey(index)}`]);
    const response = await fetch(`${url}/pipeline`, { method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify(pipeline) });
    if (!response.ok) throw new Error('KV_UNAVAILABLE');
    const data = await response.json();
    const value = (index) => Number.parseInt(data[index]?.result || 0, 10) || 0;
    const sum = (start, days) => Array.from({ length: days }, (_, index) => value(start + index)).reduce((total, item) => total + item, 0);
    return jsonResponse(req, { hoy: { pv: value(0), ct: value(30), ld: value(60) }, semana: { pv: sum(0, 7), ct: sum(30, 7), ld: sum(60, 7) }, mes: { pv: sum(0, 30), ct: sum(30, 30), ld: sum(60, 30) }, fecha: dateKey(0) }, 200, METHODS);
  } catch (_) {
    return jsonResponse(req, { ok: false, error: 'Error interno' }, 500, METHODS);
  }
}
