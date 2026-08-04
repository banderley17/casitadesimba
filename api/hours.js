export const config = { runtime: 'edge' };

const PANEL_TOK = 'simba2026';
const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};
const DEFAULT_HOURS = { month: 'Agosto 2026', display: 'Lun-Vie: 08:00 a 20:00. Fines de semana: consultar' };

async function kvGet(key, url, tok) {
  const r = await fetch(`${url}/get/${encodeURIComponent(key)}`, { headers: { Authorization: `Bearer ${tok}` } });
  return (await r.json()).result;
}
async function kvSet(key, val, url, tok) {
  await fetch(`${url}/pipeline`, { method: 'POST', headers: { Authorization: `Bearer ${tok}`, 'Content-Type': 'application/json' }, body: JSON.stringify([['SET', key, val]]) });
}
export default async function handler(req) {
  if (req.method === 'OPTIONS') return new Response(null, { headers: CORS });
  const kvUrl = process.env.UPSTASH_REDIS_REST_URL;
  const kvTok = process.env.UPSTASH_REDIS_REST_TOKEN;
  const json = (data, status = 200) => new Response(JSON.stringify(data), { status, headers: { ...CORS, 'Content-Type': 'application/json' } });
  if (req.method === 'GET') {
    const raw = await kvGet('casita_hours', kvUrl, kvTok);
    return json(raw ? JSON.parse(raw) : DEFAULT_HOURS);
  }
  if (req.method === 'POST') {
    const url = new URL(req.url);
    if (url.searchParams.get('t') !== PANEL_TOK) return json({ ok: false, msg: 'Unauthorized' }, 401);
    const body = await req.json();
    const display = typeof body?.display === 'string' ? body.display.trim() : '';
    const month = typeof body?.month === 'string' ? body.month.trim() : '';
    if (!display) return json({ ok: false, msg: 'El horario es obligatorio' }, 400);
    await kvSet('casita_hours', JSON.stringify({ month, display }), kvUrl, kvTok);
    return json({ ok: true });
  }
  return json({ ok: false, msg: 'Metodo no permitido' }, 405);
}
