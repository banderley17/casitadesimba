import { authenticateAdmin, cleanId, cleanImageUrl, cleanText, jsonResponse, optionsResponse, readJson, requireAdmin } from '../lib/security.js';

export const config = { runtime: 'edge' };
const METHODS = 'GET, POST, DELETE, OPTIONS';

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

function parseReviews(raw) {
  if (!raw) return [];
  try { const value = JSON.parse(raw); return Array.isArray(value) ? value.slice(0, 500) : []; } catch (_) { return []; }
}

function position(value) {
  const number = Number(value);
  return Number.isFinite(number) ? Math.max(0, Math.min(100, number)) : 50;
}

function stars(value) {
  const number = Number(value);
  if (!Number.isInteger(number) || number < 1 || number > 5) throw new Error('INVALID_INPUT');
  return number;
}

function date(value) {
  if (!value) return new Date().toISOString().slice(0, 10);
  if (typeof value !== 'string' || !/^(?:\d{4}-\d{2}(?:-\d{2})?|\d{1,2}\/\d{1,2}\/\d{4})$/.test(value)) throw new Error('INVALID_INPUT');
  return value;
}

export default async function handler(req) {
  if (req.method === 'OPTIONS') return optionsResponse(req, METHODS, { csrf: true });
  try {
    if (req.method === 'GET') {
      const reviews = parseReviews(await kv(['GET', 'casita_reviews']));
      const session = await authenticateAdmin(req);
      return jsonResponse(req, session ? reviews : reviews.filter((review) => review.visible !== false), 200, METHODS, session ? { csrf: true } : { publicCache: 'public, max-age=30, s-maxage=120' });
    }

    const auth = await requireAdmin(req, { csrf: true });
    if (!auth.ok) return auth.response;
    const body = await readJson(req, 24_000);
    let reviews = parseReviews(await kv(['GET', 'casita_reviews']));

    if (req.method === 'DELETE') {
      const id = cleanId(body.id);
      const before = reviews.length;
      reviews = reviews.filter((review) => review.id !== id);
      if (reviews.length === before) return jsonResponse(req, { ok: false, error: 'Reseña no encontrada' }, 404, METHODS, { csrf: true });
      await kv(['SET', 'casita_reviews', JSON.stringify(reviews)]);
      return jsonResponse(req, { ok: true }, 200, METHODS, { csrf: true });
    }

    if (req.method !== 'POST') return jsonResponse(req, { ok: false, error: 'Método no permitido' }, 405, METHODS, { csrf: true });

    if (body.action === 'reorder') {
      const id = cleanId(body.id);
      if (!['up', 'down'].includes(body.dir)) throw new Error('INVALID_INPUT');
      const index = reviews.findIndex((review) => review.id === id);
      if (index < 0) return jsonResponse(req, { ok: false, error: 'Reseña no encontrada' }, 404, METHODS, { csrf: true });
      const target = body.dir === 'up' ? index - 1 : index + 1;
      if (target >= 0 && target < reviews.length) [reviews[index], reviews[target]] = [reviews[target], reviews[index]];
      await kv(['SET', 'casita_reviews', JSON.stringify(reviews)]);
      return jsonResponse(req, { ok: true }, 200, METHODS, { csrf: true });
    }

    if (body.id) {
      const id = cleanId(body.id);
      const index = reviews.findIndex((review) => review.id === id);
      if (index < 0) return jsonResponse(req, { ok: false, error: 'Reseña no encontrada' }, 404, METHODS, { csrf: true });
      const next = { ...reviews[index] };
      if (Object.hasOwn(body, 'nombre')) next.nombre = cleanText(body.nombre, 100, { required: true });
      if (Object.hasOwn(body, 'foto')) next.foto = cleanImageUrl(body.foto);
      if (Object.hasOwn(body, 'imagen')) next.imagen = cleanImageUrl(body.imagen);
      if (Object.hasOwn(body, 'fotoPosition')) next.fotoPosition = position(body.fotoPosition);
      if (Object.hasOwn(body, 'imagenPosition')) next.imagenPosition = position(body.imagenPosition);
      if (Object.hasOwn(body, 'estrellas')) next.estrellas = stars(body.estrellas);
      if (Object.hasOwn(body, 'texto')) next.texto = cleanText(body.texto, 3_000, { required: true });
      if (Object.hasOwn(body, 'respuesta')) next.respuesta = cleanText(body.respuesta, 3_000);
      if (Object.hasOwn(body, 'fecha')) next.fecha = date(body.fecha);
      if (Object.hasOwn(body, 'visible')) next.visible = body.visible === true;
      reviews[index] = next;
    } else {
      reviews.unshift({
        id: `rev_${crypto.randomUUID()}`,
        nombre: cleanText(body.nombre, 100, { required: true }),
        foto: cleanImageUrl(body.foto),
        imagen: cleanImageUrl(body.imagen),
        fotoPosition: position(body.fotoPosition),
        imagenPosition: position(body.imagenPosition),
        estrellas: stars(body.estrellas),
        texto: cleanText(body.texto, 3_000, { required: true }),
        respuesta: cleanText(body.respuesta, 3_000),
        fecha: date(body.fecha),
        visible: true,
      });
    }

    await kv(['SET', 'casita_reviews', JSON.stringify(reviews.slice(0, 500))]);
    return jsonResponse(req, { ok: true }, 200, METHODS, { csrf: true });
  } catch (error) {
    const status = error?.message === 'PAYLOAD_TOO_LARGE' ? 413 : ['INVALID_INPUT', 'INVALID_JSON'].includes(error?.message) ? 400 : 500;
    return jsonResponse(req, { ok: false, error: status === 500 ? 'Error interno' : 'Datos inválidos' }, status, METHODS, { csrf: true });
  }
}
