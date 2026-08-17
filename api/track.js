import { cleanText, jsonResponse, optionsResponse, publicRateLimit, readJson } from '../lib/security.js';

export const config = { runtime: 'edge' };
const METHODS = 'POST, OPTIONS';
const PIXEL_ID = '4281036645446757';
const EVENTS = new Set(['PageView', 'Contact', 'Lead']);
const SITE_URL = 'https://lacasitadesimba.es/';

function cleanMetaId(value, max) {
  if (!value) return '';
  if (typeof value !== 'string' || value.length > max || !/^[A-Za-z0-9_.:-]+$/.test(value)) throw new Error('INVALID_INPUT');
  return value;
}

export default async function handler(req) {
  if (req.method === 'OPTIONS') return optionsResponse(req, METHODS);
  if (req.method !== 'POST') return jsonResponse(req, { ok: false, error: 'Método no permitido' }, 405, METHODS);
  const origin = req.headers.get('origin') || '';
  if (!['https://lacasitadesimba.es', 'https://www.lacasitadesimba.es', 'https://casitadesimba.vercel.app'].includes(origin)) return jsonResponse(req, { ok: false, error: 'Origen no permitido' }, 403, METHODS);
  try {
    if (!(await publicRateLimit(req, 'track', 90, 60))) return jsonResponse(req, { ok: false, error: 'Demasiadas solicitudes' }, 429, METHODS);
    const token = process.env.FB_CAPI_TOKEN;
    if (!token) return jsonResponse(req, { ok: false, error: 'Servicio no configurado' }, 503, METHODS);
    const body = await readJson(req, 12_000);
    if (!EVENTS.has(body.event_name)) throw new Error('INVALID_INPUT');
    const ip = (req.headers.get('x-real-ip') || req.headers.get('x-forwarded-for')?.split(',')[0] || '').trim().slice(0, 100);
    const userAgent = (req.headers.get('user-agent') || '').slice(0, 500);
    const customData = body.custom_data && typeof body.custom_data === 'object' && !Array.isArray(body.custom_data)
      ? { content_name: cleanText(body.custom_data.content_name, 100) }
      : undefined;
    const event = {
      event_name: body.event_name,
      event_time: Math.floor(Date.now() / 1000),
      action_source: 'website',
      event_source_url: SITE_URL,
      user_data: { client_ip_address: ip, client_user_agent: userAgent, ...(body.fbp ? { fbp: cleanMetaId(body.fbp, 150) } : {}), ...(body.fbc ? { fbc: cleanMetaId(body.fbc, 150) } : {}) },
      ...(body.event_id ? { event_id: cleanMetaId(body.event_id, 150) } : {}),
      ...(customData?.content_name ? { custom_data: customData } : {}),
    };
    const response = await fetch(`https://graph.facebook.com/v19.0/${PIXEL_ID}/events`, { method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ data: [event] }) });
    if (!response.ok) throw new Error('META_ERROR');
    const kvUrl = process.env.UPSTASH_REDIS_REST_URL;
    const kvToken = process.env.UPSTASH_REDIS_REST_TOKEN;
    const prefix = body.event_name === 'PageView' ? 'pv' : body.event_name === 'Contact' ? 'ct' : body.event_name === 'Lead' ? 'ld' : '';
    if (kvUrl && kvToken && prefix) {
      const date = new Date().toISOString().slice(0, 10);
      await fetch(`${kvUrl}/incr/${prefix}:${date}`, { headers: { Authorization: `Bearer ${kvToken}` } });
    }
    return jsonResponse(req, { ok: true }, 200, METHODS);
  } catch (error) {
    const status = error?.message === 'PAYLOAD_TOO_LARGE' ? 413 : ['INVALID_INPUT', 'INVALID_JSON'].includes(error?.message) ? 400 : 502;
    return jsonResponse(req, { ok: false, error: status === 502 ? 'No se pudo registrar el evento' : 'Datos inválidos' }, status, METHODS);
  }
}
