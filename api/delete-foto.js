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
  const apiSecret = process.env.CLOUDINARY_API_SECRET;
  if (!apiKey || !apiSecret) return err('Cloudinary no configurado', 500);

  const timestamp = Math.floor(Date.now() / 1000);
  const signature = await sha1(`public_id=${public_id}&timestamp=${timestamp}${apiSecret}`);

  const body = new URLSearchParams({ public_id, timestamp, api_key: apiKey, signature });
  const res  = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/destroy`, {
    method: 'POST',
    body,
  });
  const data = await res.json();

  if (data.result === 'ok') return ok({ ok: true });
  return err(data.result || 'Error al eliminar', 400);
}
