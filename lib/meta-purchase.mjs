const PIXEL_ID = '4281036645446757';
const GRAPH_VERSION = 'v24.0';
const SITE_URL = 'https://lacasitadesimba.es/';
const encoder = new TextEncoder();

export function normalizePhone(value) {
  if (typeof value !== 'string') throw new Error('INVALID_INPUT');
  const digits = value.replace(/\D/g, '').replace(/^00/, '');
  if (digits.length < 7 || digits.length > 15) throw new Error('INVALID_INPUT');
  return digits;
}

async function hashPhone(value) {
  const digest = await crypto.subtle.digest('SHA-256', encoder.encode(normalizePhone(value)));
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

function eventId(value) {
  if (typeof value !== 'string' || !/^[A-Za-z0-9_.:-]{1,150}$/.test(value)) throw new Error('INVALID_INPUT');
  return value;
}

export function shouldTrackPurchase(previous, next) {
  if (next?.estado !== 'cliente' || next?.purchaseTrackedAt || next?.purchaseLegacy) return false;
  if (previous?.estado === 'cliente') return Boolean(next.purchaseEventId && next.purchasePendingAt);
  return !next.purchaseEventId;
}

export async function buildPurchaseEvent({ client, eventId: id, eventTime = Math.floor(Date.now() / 1000) }) {
  if (!client || typeof client !== 'object') throw new Error('INVALID_INPUT');
  const purchaseId = eventId(id);
  if (!Number.isInteger(eventTime) || eventTime < 1) throw new Error('INVALID_INPUT');
  const phone = await hashPhone(client.tel);
  const contentName = typeof client.servicio === 'string' && client.servicio.trim()
    ? client.servicio.trim().slice(0, 100)
    : 'Reserva';
  return {
    data: [{
      event_name: 'Purchase',
      event_time: eventTime,
      action_source: 'website',
      event_source_url: SITE_URL,
      event_id: purchaseId,
      user_data: { ph: [phone] },
      custom_data: { content_name: contentName },
    }],
  };
}

export async function sendPurchaseEvent({ client, eventId: id, eventTime, token, graphVersion = GRAPH_VERSION, fetchImpl = globalThis.fetch }) {
  if (typeof token !== 'string' || !token) throw new Error('META_NOT_CONFIGURED');
  if (typeof fetchImpl !== 'function') throw new Error('META_UNAVAILABLE');
  if (typeof graphVersion !== 'string' || !/^v\d+\.\d+$/.test(graphVersion)) throw new Error('INVALID_INPUT');
  const payload = await buildPurchaseEvent({ client, eventId: id, eventTime });
  const response = await fetchImpl(`https://graph.facebook.com/${graphVersion}/${PIXEL_ID}/events`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  let result = {};
  try { result = await response.json(); } catch (_) { result = {}; }
  if (!response.ok || result?.error) throw new Error('META_ERROR');
  return result;
}
