export const config = { runtime: 'edge' };

const PANEL_TOK  = 'simba2026';
const CLOUD_NAME = 'dqboccvby';
const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

async function sha1(str) {
  const buf  = new TextEncoder().encode(str);
  const hash = await crypto.subtle.digest('SHA-1', buf);
  return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2,'0')).join('');
}

async function removeFromSavedOrders(publicId, url, tok) {
  if (!url || !tok) return;
  for (const key of ['casita_galeria_order', 'casita_hero_order']) {
    const get = await fetch(`${url}/get/${key}`, { headers: { Authorization: `Bearer ${tok}` } });
    const raw = (await get.json()).result;
    if (!raw) continue;
    const order = JSON.parse(raw);
    if (!Array.isArray(order)) continue;
    const next = order.filter(id => id !== publicId);
    if (next.length === order.length) continue;
    await fetch(`${url}/pipeline`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${tok}`, 'Content-Type': 'application/json' },
      body: JSON.stringify([['SET', key, JSON.stringify(next)]]),
    });
  }
}

export default async function handler(req) {
  if (req.method === 'OPTIONS') return new Response(null, { headers: CORS });

  const url = new URL(req.url);
  const ok  = (d)    => new Response(JSON.stringify(d),               { headers: { ...CORS, 'Content-Type': 'application/json' } });
  const err = (m, s=400) => new Response(JSON.stringify({ ok:false, msg:m }), { status:s, headers: { ...CORS, 'Content-Type': 'application/json' } });

  if (url.searchParams.get('t') !== PANEL_TOK) return err('Unauthorized', 401);
  if (req.method !== 'POST') return err('Método no permitido', 405);

  const { public_id } = await req.json();
  if (!public_id) return err('Falta public_id');

  const apiKey    = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET || process.env.LOUDINARY_API_SECRET;
  if (!apiKey || !apiSecret) return err('Cloudinary no configurado', 500);

  const timestamp = Math.floor(Date.now() / 1000);
  // invalidate evita que la imagen siga visible por cache despues de borrarla.
  const signature = await sha1(`invalidate=true&public_id=${public_id}&timestamp=${timestamp}${apiSecret}`);
  const body = new URLSearchParams({ public_id, timestamp, invalidate: 'true', api_key: apiKey, signature });
  const res  = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/destroy`, {
    method: 'POST',
    body,
  });
  let data = {};
  try { data = await res.json(); } catch (_) { return err('Cloudinary no devolvio una respuesta valida', 502); }

  // 'not found' tambien se considera resuelto: la foto ya no existe en Cloudinary.
  if (data.result === 'ok' || data.result === 'not found') {
    try {
      await removeFromSavedOrders(public_id, process.env.UPSTASH_REDIS_REST_URL, process.env.UPSTASH_REDIS_REST_TOKEN);
    } catch (_) {
      // No impedimos el borrado si no se puede limpiar el orden guardado.
    }
    return ok({ ok: true, alreadyMissing: data.result === 'not found' });
  }
  return err(data.result || data.error?.message || 'Error al eliminar', 400);
}
