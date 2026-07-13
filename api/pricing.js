export const config = { runtime: 'edge' };

const PANEL_TOK = 'simba2026';
const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

// Lo que ya había fijo en index.html — se usa mientras no se guarde nada nuevo,
// para que la web no cambie de aspecto hasta que Álvaro/Helena editen algo.
// Los campos de texto llevan {es,en} para que se traduzcan de verdad al cambiar de idioma.
const DEFAULT_PRICING = {
  inaugu: {
    active: true,
    tag: { es: '🎉 Oferta especial · Solo julio 2026', en: '🎉 Special offer · July 2026 only' },
    title: { es: '🔥 ¡Precios de Inauguración!', en: '🔥 Opening Prices!' },
    sub: {
      es: 'La Casita de Simba abre sus puertas con precios increíbles — ¡aprovéchalos antes de que acabe el mes!',
      en: 'La Casita de Simba is opening its doors with amazing prices — grab them before the month ends!',
    },
    endDate: '2026-07-01T00:00:00',
    btnText: { es: '💬 Reservar con precio de junio', en: '💬 Book with the launch price' },
    items: [
      { label: { es: '🐶 Estancia (12h)', en: '🐶 Full day (12h)' }, price: '€40' },
      { label: { es: '⏱️ 8 horas', en: '⏱️ 8 hours' }, price: '€35' },
      { label: { es: '⏱️ 1 hora', en: '⏱️ 1 hour' }, price: '€5' },
      { label: { es: '🗓️ Bono de 7 días', en: '🗓️ 7-day pack' }, price: '€199' },
      { label: { es: '🐕🐕 2º perro', en: '🐕🐕 2nd dog' }, price: '−30%' },
    ],
  },
  dosPerrosDesc: {
    es: 'El 2º perro tiene un 30% de descuento en todos nuestros servicios.\n1h: €3.50 · 8h: €24.50 · Estancia 12h: €28 · Bono de 7 días: €139',
    en: 'The 2nd dog gets a 30% discount on all our services.\n1h: €3.50 · 8h: €24.50 · Full day 12h: €28 · 7-day pack: €139',
  },
  cards: [
    {
      icon: '🐶',
      title: { es: 'Estancia', en: 'Full Day' },
      price: { es: '€40', en: '€40' },
      per: { es: 'día completo · 12 horas', en: 'full day · 12 hours' },
      extra: { es: '🐕🐕 2º perro solo €28 (−30%)', en: '🐕🐕 2nd dog only €28 (−30%)' },
      badge: { es: '', en: '' },
    },
    {
      icon: '🎂',
      title: { es: 'Eventos y Cumpleaños', en: 'Events & Birthdays' },
      price: { es: 'A consultar', en: 'Ask for price' },
      per: { es: 'pack personalizado', en: 'personalised pack' },
      extra: { es: '', en: '' },
      badge: { es: '', en: '' },
    },
    {
      icon: '🗓️',
      title: { es: 'Bono de 7 días', en: '7-Day Pack' },
      price: { es: '€199', en: '€199' },
      per: { es: '7 días', en: '7 days' },
      extra: { es: '= solo €28.43/día 🤯', en: '= only €28.43/day 🤯' },
      badge: { es: '🔥 MÁS POPULAR · SOLO JULIO', en: '🔥 MOST POPULAR · JULY ONLY' },
    },
    {
      icon: '🎟️',
      title: { es: 'Bono Mensual', en: 'Monthly Pack' },
      price: { es: 'A consultar', en: 'Ask for price' },
      per: { es: 'diseñado para tu rutina', en: 'designed for your routine' },
      extra: { es: '🐕🐕 2º perro incluye −30% también', en: '🐕🐕 2nd dog also gets −30%' },
      badge: { es: '', en: '' },
    },
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
