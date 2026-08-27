import { cleanId, cleanText, jsonResponse, optionsResponse, readJson, requireAdmin } from '../lib/security.js';
import { sendPurchaseEvent, shouldTrackPurchase } from '../lib/meta-purchase.mjs';

export const config = { runtime: 'edge' };
const METHODS = 'GET, POST, PATCH, DELETE, OPTIONS';
const STATES = new Set(['consulta', 'cliente', 'excluido']);

function kvConfig() {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) throw new Error('KV_UNAVAILABLE');
  return { url, token };
}

async function kvGet(key) {
  const { url, token } = kvConfig();
  const response = await fetch(`${url}/get/${encodeURIComponent(key)}`, { headers: { Authorization: `Bearer ${token}` } });
  if (!response.ok) throw new Error('KV_UNAVAILABLE');
  return (await response.json()).result;
}

async function kvSet(key, value) {
  const { url, token } = kvConfig();
  const response = await fetch(`${url}/pipeline`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify([['SET', key, value]]),
  });
  if (!response.ok) throw new Error('KV_UNAVAILABLE');
}

function parseClients(raw) {
  if (!raw) return [];
  try { const parsed = JSON.parse(raw); return Array.isArray(parsed) ? parsed.slice(0, 2_000) : []; } catch (_) { return []; }
}

function cleanDate(value) {
  if (!value) return new Date().toISOString().slice(0, 10);
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new Error('INVALID_INPUT');
  return value;
}

export default async function handler(req) {
  if (req.method === 'OPTIONS') return optionsResponse(req, METHODS, { csrf: true });
  const auth = await requireAdmin(req, { csrf: req.method !== 'GET' });
  if (!auth.ok) return auth.response;

  try {
    const url = new URL(req.url);
    if (req.method === 'GET') return jsonResponse(req, parseClients(await kvGet('client_list')), 200, METHODS, { csrf: true });

    const clients = parseClients(await kvGet('client_list'));
    if (req.method === 'POST') {
      const body = await readJson(req, 12_000);
      const estado = body.estado || 'consulta';
      if (!STATES.has(estado)) throw new Error('INVALID_INPUT');
      const client = {
        id: crypto.randomUUID(),
        nombre: cleanText(body.nombre, 100, { required: true }),
        tel: cleanText(body.tel, 30, { required: true }),
        mascota: cleanText(body.mascota, 100),
        servicio: cleanText(body.servicio, 100),
        estado,
        fecha: cleanDate(body.fecha),
        notas: cleanText(body.notas, 1_500),
      };
      let metaPurchase = 'not-needed';
      if (client.estado === 'cliente') {
        client.purchaseEventId = `purchase:${client.id}`;
        client.purchasePendingAt = new Date().toISOString();
      }
      clients.unshift(client);
      await kvSet('client_list', JSON.stringify(clients.slice(0, 2_000)));
      if (client.purchaseEventId && client.purchasePendingAt) {
        try {
          await sendPurchaseEvent({
            client,
            eventId: client.purchaseEventId,
            token: process.env.FB_CAPI_TOKEN,
            graphVersion: process.env.META_GRAPH_API_VERSION || 'v24.0',
          });
          client.purchaseTrackedAt = new Date().toISOString();
          delete client.purchasePendingAt;
          await kvSet('client_list', JSON.stringify(clients.slice(0, 2_000)));
          metaPurchase = 'sent';
        } catch (_) {
          metaPurchase = 'pending';
        }
      }
      return jsonResponse(req, { ...client, metaPurchase }, 201, METHODS, { csrf: true });
    }

    const id = cleanId(url.searchParams.get('id') || '');
    const index = clients.findIndex((client) => client.id === id);
    if (index < 0) return jsonResponse(req, { ok: false, error: 'Contacto no encontrado' }, 404, METHODS, { csrf: true });

    if (req.method === 'DELETE') {
      clients.splice(index, 1);
      await kvSet('client_list', JSON.stringify(clients));
      return jsonResponse(req, { ok: true }, 200, METHODS, { csrf: true });
    }

    if (req.method === 'PATCH') {
      const body = await readJson(req, 8_000);
      const previous = clients[index];
      const next = { ...previous };
      if (Object.hasOwn(body, 'estado')) {
        if (!STATES.has(body.estado)) throw new Error('INVALID_INPUT');
        next.estado = body.estado;
      }
      if (Object.hasOwn(body, 'nombre')) next.nombre = cleanText(body.nombre, 100, { required: true });
      if (Object.hasOwn(body, 'tel')) next.tel = cleanText(body.tel, 30, { required: true });
      if (Object.hasOwn(body, 'mascota')) next.mascota = cleanText(body.mascota, 100);
      if (Object.hasOwn(body, 'servicio')) next.servicio = cleanText(body.servicio, 100);
      if (Object.hasOwn(body, 'notas')) next.notas = cleanText(body.notas, 1_500);
      if (Object.hasOwn(body, 'fecha')) next.fecha = cleanDate(body.fecha);
      if (previous.estado === 'cliente' && next.estado !== 'cliente' && !previous.purchaseTrackedAt && !previous.purchaseEventId) {
        next.purchaseLegacy = true;
      }
      const trackPurchase = shouldTrackPurchase(previous, next);
      if (trackPurchase && !next.purchaseEventId) {
        next.purchaseEventId = `purchase:${next.id}`;
        next.purchasePendingAt = new Date().toISOString();
      }
      clients[index] = next;
      await kvSet('client_list', JSON.stringify(clients));
      let metaPurchase = 'not-needed';
      if (trackPurchase && next.purchaseEventId && next.purchasePendingAt) {
        try {
          await sendPurchaseEvent({
            client: next,
            eventId: next.purchaseEventId,
            token: process.env.FB_CAPI_TOKEN,
            graphVersion: process.env.META_GRAPH_API_VERSION || 'v24.0',
          });
          next.purchaseTrackedAt = new Date().toISOString();
          delete next.purchasePendingAt;
          await kvSet('client_list', JSON.stringify(clients));
          metaPurchase = 'sent';
        } catch (_) {
          metaPurchase = 'pending';
        }
      }
      return jsonResponse(req, { ...next, metaPurchase }, 200, METHODS, { csrf: true });
    }

    return jsonResponse(req, { ok: false, error: 'Método no permitido' }, 405, METHODS, { csrf: true });
  } catch (error) {
    const status = error?.message === 'PAYLOAD_TOO_LARGE' ? 413 : error?.message === 'INVALID_INPUT' || error?.message === 'INVALID_JSON' ? 400 : 500;
    return jsonResponse(req, { ok: false, error: status === 500 ? 'Error interno' : 'Datos inválidos' }, status, METHODS, { csrf: true });
  }
}
