import { cleanText, jsonResponse, optionsResponse, readJson, requireAdmin } from '../lib/security.js';

export const config = { runtime: 'edge' };
const METHODS = 'GET, POST, OPTIONS';
const FOLDERS = new Set(['casita/resenas', 'casita/galeria', 'casita/hero']);

function serializeValue(value) {
  if (typeof value === 'string' || typeof value === 'number') return String(value);
  if (Array.isArray(value)) return value.map((item) => String(item)).join(',');
  if (value && typeof value === 'object') {
    return Object.entries(value)
      .filter(([, item]) => typeof item === 'string' || typeof item === 'number')
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, item]) => `${key}=${item}`)
      .join('|');
  }
  return '';
}

async function sha1(value) {
  const digest = await crypto.subtle.digest('SHA-1', new TextEncoder().encode(value));
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

export default async function handler(req) {
  if (req.method === 'OPTIONS') return optionsResponse(req, METHODS, { csrf: true });
  const auth = await requireAdmin(req, { csrf: req.method === 'POST' });
  if (!auth.ok) return auth.response;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const secret = process.env.CLOUDINARY_API_SECRET;
  if (!apiKey || !secret) return jsonResponse(req, { ok: false, error: 'Servicio de imágenes no configurado' }, 503, METHODS, { csrf: true });
  if (req.method === 'GET') return jsonResponse(req, { ok: true, apiKey }, 200, METHODS, { csrf: true });
  if (req.method !== 'POST') return jsonResponse(req, { ok: false, error: 'Método no permitido' }, 405, METHODS, { csrf: true });
  try {
    const body = await readJson(req, 12_000);
    const params = body.params;
    if (!params || typeof params !== 'object' || Array.isArray(params)) throw new Error('INVALID_INPUT');
    const folder = cleanText(params.folder, 80, { required: true });
    if (!FOLDERS.has(folder)) throw new Error('INVALID_INPUT');
    const timestamp = Number(params.timestamp);
    if (!Number.isInteger(timestamp) || Math.abs(Math.floor(Date.now() / 1000) - timestamp) > 300) throw new Error('INVALID_INPUT');
    const excluded = new Set(['file', 'api_key', 'cloud_name', 'resource_type', 'signature', 'callback']);
    const entries = Object.entries(params)
      .filter(([key, value]) => !excluded.has(key) && value !== '' && value != null)
      .map(([key, value]) => {
        if (!/^[a-z_]{1,40}$/.test(key)) throw new Error('INVALID_INPUT');
        const serialized = serializeValue(value);
        if (!serialized || serialized.length > 2_000 || /[\r\n]/.test(serialized)) throw new Error('INVALID_INPUT');
        return [key, serialized];
      })
      .sort(([left], [right]) => left.localeCompare(right));
    const canonical = entries.map(([key, value]) => `${key}=${value}`).join('&');
    return jsonResponse(req, { ok: true, signature: await sha1(`${canonical}${secret}`) }, 200, METHODS, { csrf: true });
  } catch (error) {
    const status = error?.message === 'PAYLOAD_TOO_LARGE' ? 413 : 400;
    return jsonResponse(req, { ok: false, error: 'Parámetros de subida inválidos' }, status, METHODS, { csrf: true });
  }
}
