export const config = { runtime: 'edge' };

const TOKEN = 'simba2026';
const KV_URL = process.env.UPSTASH_REDIS_REST_URL;
const KV_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
};

function dateKey(offset) {
  const d = new Date();
  d.setDate(d.getDate() - offset);
  return d.toISOString().slice(0, 10);
}

export default async function handler(req) {
  if (req.method === 'OPTIONS') return new Response(null, { headers: CORS });

  const url = new URL(req.url);
  if (url.searchParams.get('t') !== TOKEN) {
    return new Response('Unauthorized', { status: 401, headers: CORS });
  }

  if (!KV_URL || !KV_TOKEN) {
    return new Response(JSON.stringify({ error: 'KV no configurado' }), {
      status: 500,
      headers: { ...CORS, 'Content-Type': 'application/json' },
    });
  }

  // Pipeline: 30 días × 3 métricas = 90 comandos GET
  const pipeline = [];
  for (const prefix of ['pv', 'ct', 'ld']) {
    for (let i = 0; i < 30; i++) {
      pipeline.push(['GET', `${prefix}:${dateKey(i)}`]);
    }
  }

  const res = await fetch(`${KV_URL}/pipeline`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${KV_TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(pipeline),
  });

  const data = await res.json();

  const v = (i) => parseInt(data[i]?.result || 0) || 0;
  const sum = (start, days) => { let t = 0; for (let i = 0; i < days; i++) t += v(start + i); return t; };

  // pv: 0–29 · ct: 30–59 · ld: 60–89
  const stats = {
    hoy:    { pv: v(0),          ct: v(30),          ld: v(60) },
    semana: { pv: sum(0, 7),     ct: sum(30, 7),     ld: sum(60, 7) },
    mes:    { pv: sum(0, 30),    ct: sum(30, 30),    ld: sum(60, 30) },
    fecha:  dateKey(0),
  };

  return new Response(JSON.stringify(stats), {
    headers: { ...CORS, 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  });
}
