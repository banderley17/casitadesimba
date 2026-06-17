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
    const { id, nombre, foto, imagen, estrellas, texto, fecha, respuesta } = body;

    const raw = await kvGet('casita_reviews', kvUrl, kvTok);
    let reviews = raw ? JSON.parse(raw) : [];

    if (id) {
      // Actualizar reseña existente — solo se sobrescriben los campos presentes
      reviews = reviews.map(r => {
        if (r.id !== id) return r;
        return {
          ...r,
          ...(nombre    != null ? { nombre:    nombre.trim()       } : {}),
          ...(foto      != null ? { foto                           } : {}),
          ...(imagen    != null ? { imagen                         } : {}),
          ...(estrellas != null ? { estrellas: parseInt(estrellas) } : {}),
          ...(texto     != null ? { texto:     texto.trim()        } : {}),
          ...(respuesta != null ? { respuesta: respuesta.trim()    } : {}),
          ...(fecha     != null ? { fecha                          } : {}),
        };
      });
    } else {
      // Crear nueva reseña
      if (!nombre || !texto || !estrellas) return err('Faltan campos obligatorios');
      const nueva = {
        id: 'rev_' + Date.now(),
        nombre: nombre.trim(),
        foto: foto || '',
        imagen: imagen || '',
        estrellas: parseInt(estrellas),
        texto: texto.trim(),
        respuesta: respuesta ? respuesta.trim() : '',
        fecha: fecha || new Date().toISOString().slice(0, 7),
        visible: true,
      };
      reviews.unshift(nueva);
    }

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
