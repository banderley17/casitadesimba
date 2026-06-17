export const config = { runtime: 'edge' };

const PANEL_TOK = 'simba2026';
const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PATCH, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
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
  const err = (m, s=400) => new Response(JSON.stringify({ ok: false, msg: m }), { status: s, headers: { ...CORS, 'Content-Type': 'application/json' } });

  // GET — público: solo visibles; con token: todas
  if (req.method === 'GET') {
    const raw = await kvGet('casita_reviews', kvUrl, kvTok);
    const reviews = raw ? JSON.parse(raw) : [];
    const url = new URL(req.url);
    if (url.searchParams.get('t') === PANEL_TOK) return ok(reviews);
    return ok(reviews.filter(r => r.visible !== false));
  }

  // POST y DELETE requieren token
  const url = new URL(req.url);
  if (url.searchParams.get('t') !== PANEL_TOK) return err('Unauthorized', 401);

  if (req.method === 'POST') {
    const body = await req.json();
    const { nombre, foto, estrellas, texto, fecha } = body;
    if (!nombre || !texto || !estrellas) return err('Faltan campos obligatorios');

    const raw = await kvGet('casita_reviews', kvUrl, kvTok);
    const reviews = raw ? JSON.parse(raw) : [];

    const { imagen } = body;
    const nueva = {
      id: 'rev_' + Date.now(),
      nombre: nombre.trim(),
      foto: foto || '',
      imagen: imagen || '',
      estrellas: parseInt(estrellas),
      texto: texto.trim(),
      fecha: fecha || new Date().toISOString().slice(0, 7),
      visible: true,
    };

    reviews.unshift(nueva);
    await kvSet('casita_reviews', JSON.stringify(reviews), kvUrl, kvTok);
    return ok({ ok: true, review: nueva });
  }

  if (req.method === 'PATCH') {
    const body = await req.json();
    const { id, nombre, foto, imagen, estrellas, texto, fecha } = body;
    if (!id) return err('Falta id');
    const raw = await kvGet('casita_reviews', kvUrl, kvTok);
    let reviews = raw ? JSON.parse(raw) : [];
    reviews = reviews.map(r => {
      if (r.id !== id) return r;
      return {
        ...r,
        nombre:   (nombre   != null) ? nombre.trim()        : r.nombre,
        foto:     (foto     != null) ? foto                  : r.foto,
        imagen:   (imagen   != null) ? imagen                : (r.imagen || ''),
        estrellas:(estrellas!= null) ? parseInt(estrellas)   : r.estrellas,
        texto:    (texto    != null) ? texto.trim()          : r.texto,
        fecha:    (fecha    != null) ? fecha                  : r.fecha,
      };
    });
    await kvSet('casita_reviews', JSON.stringify(reviews), kvUrl, kvTok);
    return ok({ ok: true });
  }

  if (req.method === 'DELETE') {
    const { id } = await req.json();
    if (!id) return err('Falta id');
    const raw = await kvGet('casita_reviews', kvUrl, kvTok);
    let reviews = raw ? JSON.parse(raw) : [];
    reviews = reviews.filter(r => r.id !== id);
    await kvSet('casita_reviews', JSON.stringify(reviews), kvUrl, kvTok);
    return ok({ ok: true });
  }

  return err('Método no permitido', 405);
}
