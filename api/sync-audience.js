import { jsonResponse, optionsResponse, requireAdmin } from '../lib/security.js';

export const config = { runtime: 'edge' };
const METHODS = 'POST, OPTIONS';
// Keep the Graph API version configurable so an API retirement does not silently
// break contact synchronisation. Update the env var when Meta releases a new
// version; v24.0 is the current default for this project.
const GRAPH_VERSION = process.env.META_GRAPH_API_VERSION || 'v24.0';
const GRAPH = `https://graph.facebook.com/${GRAPH_VERSION}`;
const AD_ACCOUNT = 'act_1513350607502989';
const FILTERS = new Set(['todos', 'consulta', 'cliente', 'excluido']);

async function sha256(value) {
  if (!value?.trim()) return '';
  const hash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value.toLowerCase().trim()));
  return [...new Uint8Array(hash)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}
function phone(value) {
  let clean = String(value || '').replace(/[\s()+-]/g, '').replace(/^0034/, '34');
  if (/^[6-9]\d{8}$/.test(clean)) clean = `34${clean}`;
  return /^\d{10,15}$/.test(clean) ? clean : '';
}
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
async function graph(path, payload, token) {
  const response = await fetch(`${GRAPH}${path}`, { method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
  let data = {};
  try { data = await response.json(); } catch (_) {}
  if (!response.ok || data.error) {
    const error = new Error(data?.error?.message || 'META_ERROR');
    error.metaCode = data?.error?.code;
    error.metaSubcode = data?.error?.error_subcode;
    error.httpStatus = response.status;
    throw error;
  }
  return data;
}

const AUDIENCE_NAMES = {
  cliente: 'Casita - Clientes CRM',
  consulta: 'Casita - Consultas CRM',
  excluido: 'Casita - Excluidos',
  todos: 'Casita - Todos los contactos CRM',
};

function isStaleAudienceError(error) {
  const message = String(error?.message || '').toLowerCase();
  return error?.httpStatus === 404 || error?.metaCode === 100 || error?.metaCode === 803
    || /audience|unsupported get request|invalid id|does not exist/.test(message);
}

function metaErrorMessage(error) {
  const code = Number(error?.metaCode);
  if (code === 190) return 'El token de Meta ha caducado o no es válido. Renueva FB_ADS_TOKEN en Vercel.';
  if (code === 10 || code === 200) return 'El token de Meta no tiene permisos para administrar públicos personalizados.';
  if (code === 17 || error?.httpStatus === 429) return 'Meta ha limitado temporalmente la sincronización. Espera unos minutos y vuelve a intentarlo.';
  return 'Meta rechazó la sincronización. Comprueba el token y los permisos de la aplicación.';
}

export default async function handler(req) {
  if (req.method === 'OPTIONS') return optionsResponse(req, METHODS, { csrf: true });
  if (req.method !== 'POST') return jsonResponse(req, { ok: false, error: 'Método no permitido' }, 405, METHODS, { csrf: true });
  const auth = await requireAdmin(req, { csrf: true });
  if (!auth.ok) return auth.response;
  const token = process.env.FB_ADS_TOKEN;
  if (!token) return jsonResponse(req, { ok: false, error: 'Meta no configurado' }, 503, METHODS, { csrf: true });
  const requested = new URL(req.url).searchParams.get('filter') || 'todos';
  const filter = FILTERS.has(requested) ? requested : 'todos';
  try {
    let clients = [];
    try { clients = JSON.parse(await kv(['GET', 'client_list']) || '[]'); } catch (_) {}
    if (!Array.isArray(clients)) clients = [];
    if (filter !== 'todos') clients = clients.filter((client) => client.estado === filter);
    const valid = clients.map((client) => ({ ...client, normalizedPhone: phone(client.tel) })).filter((client) => client.normalizedPhone).slice(0, 10_000);
    if (!valid.length) return jsonResponse(req, { ok: false, error: 'No hay contactos válidos para sincronizar' }, 400, METHODS, { csrf: true });
    const key = `meta_audience_${filter}`;
    let audienceId = await kv(['GET', key]);
    const rows = [];
    for (const client of valid) {
      const parts = String(client.nombre || '').trim().split(/\s+/);
      rows.push([await sha256(client.normalizedPhone), await sha256(parts[0] || ''), await sha256(parts.slice(1).join(' '))]);
    }
    const upload = async () => {
      if (!audienceId) {
        const audience = await graph(`/${AD_ACCOUNT}/customaudiences`, { name: AUDIENCE_NAMES[filter], subtype: 'CUSTOM', description: 'Sincronizado desde el panel de La Casita de Simba', customer_file_source: 'USER_PROVIDED_ONLY' }, token);
        audienceId = audience.id;
        if (!audienceId) throw new Error('META_ERROR');
        await kv(['SET', key, audienceId]);
      }
      return graph(`/${audienceId}/users`, { payload: { schema: ['PHONE', 'FN', 'LN'], data: rows } }, token);
    };
    try {
      await upload();
    } catch (error) {
      // Audience IDs can become invalid when a Meta audience is deleted or expires.
      if (!isStaleAudienceError(error) || !audienceId) throw error;
      await kv(['DEL', key]);
      audienceId = '';
      await upload();
    }
    const message = `${rows.length} contacto${rows.length === 1 ? '' : 's'} sincronizado${rows.length === 1 ? '' : 's'} con Meta`;
    return jsonResponse(req, { ok: true, synced: rows.length, filter, audienceId, message, msg: message }, 200, METHODS, { csrf: true });
  } catch (error) {
    const message = metaErrorMessage(error);
    return jsonResponse(req, { ok: false, error: message, msg: message }, 502, METHODS, { csrf: true });
  }
}
