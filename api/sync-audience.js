export const config = { runtime: 'edge' };

const PIXEL_ID   = '4281036645446757';
const GRAPH      = 'https://graph.facebook.com/v19.0';
const PANEL_TOK  = 'simba2026';
const CORS = {
  'Access-Control-Allow-Origin' : '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

// SHA-256 via Web Crypto (disponible en Edge runtime)
async function sha256(s) {
  if (!s || !s.trim()) return '';
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s.toLowerCase().trim()));
  return [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2,'0')).join('');
}

// Normalizar teléfono a formato Meta: 34612345678 (sin +, con prefijo país)
function normalizePhone(raw) {
  let t = (raw||'').replace(/\s|\(|\)|-/g,'');
  t = t.replace(/^\+/,'');
  t = t.replace(/^0034/,'34');
  if (/^[6-9]\d{8}$/.test(t)) t = '34' + t; // 9 dígitos españoles → añade 34
  return t;
}

async function kvGet(key, url, tok) {
  const r = await fetch(`${url}/get/${encodeURIComponent(key)}`, { headers:{ Authorization:`Bearer ${tok}` } });
  return (await r.json()).result;
}
async function kvSet(key, val, url, tok) {
  await fetch(`${url}/pipeline`, {
    method:'POST',
    headers:{ Authorization:`Bearer ${tok}`, 'Content-Type':'application/json' },
    body: JSON.stringify([['SET', key, val]]),
  });
}

async function fbPost(path, body, fbToken) {
  const r = await fetch(`${GRAPH}${path}`, {
    method:'POST',
    headers:{ 'Content-Type':'application/json' },
    body: JSON.stringify({ ...body, access_token: fbToken }),
  });
  return r.json();
}

export default async function handler(req) {
  if (req.method === 'OPTIONS') return new Response(null, { headers: CORS });

  const url  = new URL(req.url);
  if (url.searchParams.get('t') !== PANEL_TOK)
    return new Response('Unauthorized', { status:401, headers:CORS });

  const fbToken = process.env.FB_CAPI_TOKEN;
  const kvUrl   = process.env.UPSTASH_REDIS_REST_URL;
  const kvTok   = process.env.UPSTASH_REDIS_REST_TOKEN;

  const ok  = (d) => new Response(JSON.stringify(d), { headers:{...CORS,'Content-Type':'application/json'} });
  const err = (m) => new Response(JSON.stringify({ ok:false, msg:m }), { status:400, headers:{...CORS,'Content-Type':'application/json'} });

  const filter = url.searchParams.get('filter') || 'todos'; // todos | consulta | cliente

  try {
    // 1. Obtener lista de clientes de Redis
    const raw = await kvGet('client_list', kvUrl, kvTok);
    let clients = raw ? JSON.parse(raw) : [];
    if (filter !== 'todos') clients = clients.filter(c => c.estado === filter);
    const withPhone = clients.filter(c => c.tel && c.tel.trim());

    if (!withPhone.length)
      return err('Sin contactos con teléfono para sincronizar' + (filter !== 'todos' ? ' (filtro: '+filter+')' : ''));

    // 2. Obtener o crear el público en Meta
    const kvKey = 'meta_audience_' + filter;
    let audienceId = await kvGet(kvKey, kvUrl, kvTok);

    if (!audienceId) {
      // 2a. Encontrar la cuenta publicitaria a través del Pixel
      const pixelData = await (await fetch(`${GRAPH}/${PIXEL_ID}?fields=owner&access_token=${fbToken}`)).json();
      if (pixelData.error) return err('Permiso Pixel: ' + pixelData.error.message);

      const bizId = pixelData.owner?.id;
      if (!bizId) return err('No se encontró el Business Manager del Pixel');

      // 2b. Obtener cuenta publicitaria del negocio
      const accData = await (await fetch(`${GRAPH}/${bizId}/owned_ad_accounts?fields=id,name&limit=1&access_token=${fbToken}`)).json();
      if (accData.error) return err('Permiso cuenta: ' + accData.error.message);

      const adAccountId = accData.data?.[0]?.id;
      if (!adAccountId) return err('No se encontró cuenta publicitaria en este Business Manager');

      // 2c. Crear el público personalizado
      const audienceName = filter === 'cliente'
        ? 'Casita · Clientes CRM'
        : filter === 'consulta'
          ? 'Casita · Consultas CRM'
          : 'Casita · Todos los contactos CRM';

      const newAud = await fbPost(`/${adAccountId}/customaudiences`, {
        name: audienceName,
        subtype: 'CUSTOM',
        description: 'Sincronizado automáticamente desde el panel de La Casita de Simba',
        customer_file_source: 'USER_PROVIDED_ONLY',
      }, fbToken);

      if (newAud.error) return err('Error crear público: ' + newAud.error.message);

      audienceId = newAud.id;
      await kvSet(kvKey, audienceId, kvUrl, kvTok);
    }

    // 3. Hashear datos y subir a Meta
    const rows = [];
    for (const c of withPhone) {
      const phone = normalizePhone(c.tel);
      const parts = (c.nombre || '').trim().split(' ');
      const fn = parts[0] || '';
      const ln = parts.slice(1).join(' ') || '';
      rows.push([
        await sha256(phone),
        await sha256(fn),
        await sha256(ln),
      ]);
    }

    const uploadRes = await fbPost(`/${audienceId}/users`, {
      payload: { schema: ['PHONE', 'FN', 'LN'], data: rows },
    }, fbToken);

    if (uploadRes.error) return err('Error subir usuarios: ' + uploadRes.error.message);

    return ok({
      ok: true,
      synced: rows.length,
      audienceId,
      filter,
      msg: `✅ ${rows.length} contacto${rows.length !== 1 ? 's' : ''} sincronizado${rows.length !== 1 ? 's' : ''} con Meta`,
    });

  } catch (e) {
    return err('Error interno: ' + e.message);
  }
}
