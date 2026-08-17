import { cleanText, jsonResponse, optionsResponse, readJson, requireAdmin } from '../lib/security.js';

export const config = { runtime: 'edge' };
const METHODS = 'GET, POST, OPTIONS';
const DEFAULT_PRICING = {
  inaugu: { active: true, tag: '🎉 Oferta especial · Solo julio 2026', title: '🔥 ¡Precios de Inauguración!', sub: 'La Casita de Simba abre sus puertas con precios increíbles — ¡aprovéchalos antes de que acabe el mes!', endDate: '2026-07-01T00:00:00', btnText: '💬 Reservar con precio de junio', items: [{ label: '🐶 Estancia (12h)', price: '€40' }, { label: '⏱️ 8 horas', price: '€35' }, { label: '⏱️ 1 hora', price: '€5' }, { label: '🗓️ Bono de 7 días', price: '€199' }, { label: '🐕🐕 2º perro', price: '−30%' }] },
  dosPerrosDesc: 'El 2º perro tiene un 30% de descuento en todos nuestros servicios.\n1h: €3.50 · 8h: €24.50 · Estancia 12h: €28 · Bono de 7 días: €139',
  cards: [{ icon: '🐶', title: 'Estancia', price: '€40', per: 'día completo · 12 horas', extra: '🐕🐕 2º perro solo €28 (−30%)', badge: '' }, { icon: '🎂', title: 'Eventos y Cumpleaños', price: 'A consultar', per: 'pack personalizado', extra: '', badge: '' }, { icon: '🗓️', title: 'Bono de 7 días', price: '€199', per: '7 días', extra: '= solo €28.43/día 🤯', badge: '🔥 MÁS POPULAR · SOLO JULIO' }, { icon: '🎟️', title: 'Bono Mensual', price: 'A consultar', per: 'diseñado para tu rutina', extra: '🐕🐕 2º perro incluye −30% también', badge: '' }],
};

async function kv(command) {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) throw new Error('KV_UNAVAILABLE');
  const response = await fetch(`${url}/pipeline`, { method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify([command]) });
  if (!response.ok) throw new Error('KV_UNAVAILABLE');
  return (await response.json())?.[0]?.result;
}

function field(value, max = 300) { return cleanText(value, max); }
function sanitize(body) {
  const offer = body.inaugu && typeof body.inaugu === 'object' && !Array.isArray(body.inaugu) ? body.inaugu : {};
  const items = Array.isArray(offer.items) ? offer.items.slice(0, 12).map((item) => ({ label: field(item?.label, 120), price: field(item?.price, 60) })) : [];
  const cards = Array.isArray(body.cards) ? body.cards.slice(0, 16).map((card) => ({ icon: field(card?.icon, 16), title: field(card?.title, 120), price: field(card?.price, 60), per: field(card?.per, 160), extra: field(card?.extra, 240), badge: field(card?.badge, 120) })) : [];
  const endDate = field(offer.endDate, 40);
  if (endDate && Number.isNaN(Date.parse(endDate))) throw new Error('INVALID_INPUT');
  return { inaugu: { active: offer.active === true, tag: field(offer.tag, 160), title: field(offer.title, 180), sub: field(offer.sub, 600), endDate, btnText: field(offer.btnText, 120), items }, dosPerrosDesc: field(body.dosPerrosDesc, 1_200), cards };
}

export default async function handler(req) {
  if (req.method === 'OPTIONS') return optionsResponse(req, METHODS, { csrf: true });
  try {
    if (req.method === 'GET') {
      const raw = await kv(['GET', 'casita_pricing']);
      let value = DEFAULT_PRICING;
      try { if (raw) value = JSON.parse(raw); } catch (_) {}
      return jsonResponse(req, value, 200, METHODS, { publicCache: 'public, max-age=30, s-maxage=120' });
    }
    if (req.method !== 'POST') return jsonResponse(req, { ok: false, error: 'Método no permitido' }, 405, METHODS, { csrf: true });
    const auth = await requireAdmin(req, { csrf: true });
    if (!auth.ok) return auth.response;
    const body = await readJson(req, 48_000);
    await kv(['SET', 'casita_pricing', JSON.stringify(sanitize(body))]);
    return jsonResponse(req, { ok: true }, 200, METHODS, { csrf: true });
  } catch (error) {
    const status = error?.message === 'PAYLOAD_TOO_LARGE' ? 413 : ['INVALID_INPUT', 'INVALID_JSON'].includes(error?.message) ? 400 : 500;
    return jsonResponse(req, { ok: false, error: status === 500 ? 'Error interno' : 'Datos inválidos' }, status, METHODS, { csrf: true });
  }
}
