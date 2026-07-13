export const config = { runtime: 'edge' };

const PANEL_TOK = 'simba2026';
const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

// Lo que ya había fijo en index.html — se usa mientras no se guarde nada nuevo,
// para que la web no cambie de aspecto hasta que Álvaro/Helena editen algo.
const DEFAULT_PRICING = {
  inaugu: {
    active: true,
    tag: '🎉 Oferta especial · Solo junio 2026',
    title: '🔥 ¡Precios de Inauguración!',
    sub: 'La Casita de Simba abre sus puertas con precios increíbles — ¡aprovéchalos antes de que acabe el mes!',
    endDate: '2026-07-01T00:00:00',
    btnText: '💬 Reservar con precio de junio',
    items: [
      { label: '🐶 Estancia (12h)', price: '€40' },
      { label: '⏱️ 8 horas', price: '€35' },
      { label: '⏱️ 1 hora', price: '€5' },
      { label: '🗓️ Bono de 7 días', price: '€199' },
      { label: '🐕🐕 2º perro', price: '−30%' },
    ],
  },
  dosPerrosDesc: 'El 2º perro tiene un 30% de descuento en todos nuestros servicios.\n1h: €3.50 · 8h: €24.50 · Estancia 12h: €28 · Bono de 7 días: €139',
  cards: [
    { icon: '🐶', title: 'Estancia', price: '€40', per: 'día completo · 12 horas', extra: '🐕🐕 2º perro solo €28 (−30%)', badge: '' },
    { icon: '🎂', title: 'Eventos y Cumpleaños', price: 'A consultar', per: 'pack personalizado', extra: '', badge: '' },
    { icon: '🗓️', title: 'Bono de 7 días', price: '€199', per: '7 días', extra: '= solo €28.43/día 🤯', badge: '🔥 MÁS POPULAR · SOLO JUNIO' },
    { icon: '🎟️', title: 'Bono Mensual', price: 'A consultar', per: 'diseñado para tu rutina', extra: '🐕🐕 2º perro incluye −30% también', badge: '' },
  ],
};

async function kvGet(key, url, tok) {
  const r = await fetch(`${url}/get/${encodeURIComponent(key)}`, { headers: { Authorization: `Bearer ${tok}` } });
  return (await r.json()).result;
}
async function kvSet(key, val, url, tok) {
  await fetch(`${url}/pipeline`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${tok}`, 'Content-Type': 'application/json' },
    body: JSON.stringify([['SET', key, val]]),
  });
}

export default async function handler(req) {
  if (req.method === 'OPTIONS') return new Response(null, { headers: CORS });

  const kvUrl = process.env.UPSTASH_REDIS_REST_URL;
  const kvTok = process.env.UPSTASH_REDIS_REST_TOKEN;
  const ok  = (d) => new Response(JSON.stringify(d), { headers: { ...CORS, 'Content-Type': 'application/json' } });
  const err = (m, s = 400) => new Response(JSON.stringify({ ok: false, msg: m }), { status: s, headers: { ...CORS, 'Content-Type': 'application/json' } });

  if (req.method === 'GET') {
    const raw = await kvGet('casita_pricing', kvUrl, kvTok);
    return ok(raw ? JSON.parse(raw) : DEFAULT_PRICING);
  }

  if (req.method === 'POST') {
    const url = new URL(req.url);
    if (url.searchParams.get('t') !== PANEL_TOK) return err('Unauthorized', 401);
    const body = await req.json();
    if (!body || typeof body !== 'object') return err('Datos inválidos');
    await kvSet('casita_pricing', JSON.stringify(body), kvUrl, kvTok);
    return ok({ ok: true });
  }

  return err('Método no permitido', 405);
}
