export const config = { runtime: 'edge' };

const PIXEL_ID = '4281036645446757';

export default async function handler(req) {
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 });

  const token = process.env.FB_CAPI_TOKEN;
  if (!token) return new Response('No token', { status: 500 });

  let body;
  try { body = await req.json(); } catch { return new Response('Bad JSON', { status: 400 }); }

  const ip = (req.headers.get('x-forwarded-for') || '').split(',')[0].trim()
          || req.headers.get('x-real-ip') || '';
  const ua = req.headers.get('user-agent') || '';

  const user_data = {
    client_ip_address: ip,
    client_user_agent: ua,
    ...(body.fbp ? { fbp: body.fbp } : {}),
    ...(body.fbc ? { fbc: body.fbc } : {}),
    ...(body.user_data && body.user_data.em ? { em: [body.user_data.em] } : {}),
    ...(body.user_data && body.user_data.ph ? { ph: [body.user_data.ph] } : {}),
  };

  const event = {
    event_name: body.event_name,
    event_time: Math.floor(Date.now() / 1000),
    action_source: 'website',
    event_source_url: body.event_source_url || 'https://lacasitadesimba.es/',
    user_data,
    ...(body.event_id    ? { event_id:    body.event_id }    : {}),
    ...(body.custom_data ? { custom_data: body.custom_data } : {}),
  };

  try {
    const fb = await fetch(
      `https://graph.facebook.com/v19.0/${PIXEL_ID}/events?access_token=${token}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data: [event] }),
      }
    );
    const result = await fb.json();
    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500 });
  }
}
