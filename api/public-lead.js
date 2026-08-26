import { cleanText, jsonResponse, optionsResponse, publicRateLimit, readJson } from '../lib/security.js';

export const config = { runtime: 'edge' };
const METHODS = 'POST, OPTIONS';
const ALLOWED_ORIGINS = new Set(['https://lacasitadesimba.es', 'https://www.lacasitadesimba.es', 'https://casitadesimba.vercel.app']);

function redisConfig() {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) throw new Error('KV_UNAVAILABLE');
  return { url, token };
}

async function getClients() {
  const { url, token } = redisConfig();
  const response = await fetch(`${url}/get/client_list`, { headers: { Authorization: `Bearer ${token}` } });
  if (!response.ok) throw new Error('KV_UNAVAILABLE');
  try {
    const value = (await response.json()).result;
    const clients = value ? JSON.parse(value) : [];
    return Array.isArray(clients) ? clients.slice(0, 2000) : [];
  } catch (_) { return []; }
}

async function saveClients(clients) {
  const { url, token } = redisConfig();
  const response = await fetch(`${url}/pipeline`, {
    method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify([['SET', 'client_list', JSON.stringify(clients.slice(0, 2000))]]),
  });
  if (!response.ok) throw new Error('KV_UNAVAILABLE');
}

function phone(value) {
  const text = cleanText(value, 30, { required: true });
  const digits = text.replace(/\D/g, '').replace(/^00/, '');
  if (digits.length < 7 || digits.length > 15) throw new Error('INVALID_INPUT');
  return { text, digits };
}

function notes(data) {
  return [
    'Solicitud enviada desde la web.',
    data.entrada && `Entrada solicitada: ${data.entrada}`,
    data.salida && `Salida solicitada: ${data.salida}`,
    data.hora && `Hora: ${data.hora}`,
    data.duracion && `Duracion: ${data.duracion}`,
    data.invitados && `Invitados peludos: ${data.invitados}`,
    data.vacunas && `Vacunas al dia: ${data.vacunas === 'si' ? 'Si' : 'No'}`,
    data.descripcion && `Sobre el perro: ${data.descripcion}`,
  ].filter(Boolean).join('\n').slice(0, 1500);
}

export default async function handler(req) {
  if (req.method === 'OPTIONS') return optionsResponse(req, METHODS);
  if (req.method !== 'POST') return jsonResponse(req, { ok: false, error: 'Metodo no permitido' }, 405, METHODS);
  if (!ALLOWED_ORIGINS.has(req.headers.get('origin') || '')) return jsonResponse(req, { ok: false, error: 'Origen no permitido' }, 403, METHODS);
  try {
    if (!(await publicRateLimit(req, 'public-lead', 8, 600))) return jsonResponse(req, { ok: false, error: 'Demasiadas solicitudes. Intentalo de nuevo mas tarde.' }, 429, METHODS);
    const body = await readJson(req, 12000);
    if (cleanText(body.website, 200)) return jsonResponse(req, { ok: true }, 200, METHODS);
    const nombre = cleanText(body.nombre, 100, { required: true });
    const { text: tel, digits } = phone(body.tel);
    const mascota = cleanText(body.mascota, 100, { required: true });
    const servicio = cleanText(body.servicio, 100, { required: true });
    const data = {
      entrada: cleanText(body.entrada, 20), salida: cleanText(body.salida, 20), hora: cleanText(body.hora, 20),
      duracion: cleanText(body.duracion, 40), invitados: cleanText(body.invitados, 20),
      vacunas: body.vacunas === 'si' || body.vacunas === 'no' ? body.vacunas : '', descripcion: cleanText(body.descripcion, 900),
    };
    const clients = await getClients();
    const index = clients.findIndex((client) => { try { return phone(String(client?.tel || '')).digits === digits; } catch (_) { return false; } });
    const next = { nombre, tel, mascota, servicio, fecha: new Date().toISOString().slice(0, 10), notas: notes(data), origen: 'web' };
    if (index >= 0) clients[index] = { ...clients[index], ...next };
    else clients.unshift({ id: crypto.randomUUID(), estado: 'consulta', ...next });
    await saveClients(clients);
    return jsonResponse(req, { ok: true }, 201, METHODS);
  } catch (error) {
    const status = error?.message === 'PAYLOAD_TOO_LARGE' ? 413 : ['INVALID_INPUT', 'INVALID_JSON'].includes(error?.message) ? 400 : 500;
    return jsonResponse(req, { ok: false, error: status === 500 ? 'No se pudo guardar la solicitud' : 'Datos invalidos' }, status, METHODS);
  }
}
