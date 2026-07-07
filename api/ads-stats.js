export const config = { runtime: 'edge' };

const GRAPH = 'https://graph.facebook.com/v19.0';
const AD_ACCOUNT = 'act_1513350607502989';
const PANEL_TOK = 'simba2026';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
};

const ok  = (d) => new Response(JSON.stringify(d, null, 2), { headers: { ...CORS, 'Content-Type': 'application/json' } });
const err = (m, s=400) => new Response(JSON.stringify({ ok: false, error: m }), { status: s, headers: { ...CORS, 'Content-Type': 'application/json' } });

async function graph(path, token) {
  const r = await fetch(`${GRAPH}${path}&access_token=${token}`);
  return r.json();
}

function todayRange() {
  const d = new Date().toISOString().slice(0, 10);
  return `time_range={"since":"${d}","until":"${d}"}`;
}

export default async function handler(req) {
  if (req.method === 'OPTIONS') return new Response(null, { headers: CORS });

  const url = new URL(req.url);
  if (url.searchParams.get('t') !== PANEL_TOK)
    return err('Unauthorized', 401);

  const token = process.env.FB_ADS_TOKEN;
  if (!token) return err('FB_ADS_TOKEN no configurado');

  const preset = url.searchParams.get('period') || 'last_7d';

  try {
    const camps = await graph(
      `/${AD_ACCOUNT}/campaigns?fields=id,name,status,objective,daily_budget`,
      token
    );
    if (camps.error) return err(camps.error.message);

    const active = camps.data.filter(c => c.status === 'ACTIVE');

    if (!active.length) {
      return ok({ ok: true, period: preset, campaigns: [] });
    }

    const insights = await Promise.all(
      active.map(async (c) => {
        const timeParam = preset === 'today'
          ? todayRange()
          : `date_preset=${preset}`;
        const ins = await graph(
          `/${c.id}/insights?fields=impressions,reach,frequency,clicks,ctr,cpc,spend,actions&${timeParam}`,
          token
        );
        const d = ins.data?.[0] || {};
        const actions = d.actions || [];
        const linkClicks = parseInt(actions.find(a => a.action_type === 'link_click')?.value || 0);
        const msgs = actions.find(a => a.action_type === 'onsite_conversion.messaging_conversation_started_7d')?.value
          || actions.find(a => a.action_type === 'onsite_conversion.total_messaging_connection')?.value
          || null;
        const linkCtr = d.impressions && linkClicks
          ? ((linkClicks / parseInt(d.impressions)) * 100).toFixed(2) + '%'
          : null;
        const linkCpc = d.spend && linkClicks
          ? (parseFloat(d.spend) / linkClicks).toFixed(2) + ' €'
          : null;
        return {
          id: c.id,
          name: c.name,
          status: c.status,
          budget_day: c.daily_budget ? (parseInt(c.daily_budget) / 100).toFixed(2) + ' €/día' : null,
          impressions: d.impressions || 0,
          reach: d.reach || 0,
          frequency: d.frequency ? parseFloat(d.frequency).toFixed(2) : null,
          clicks: linkClicks,
          ctr: linkCtr,
          cpc: linkCpc,
          spend: d.spend ? parseFloat(d.spend).toFixed(2) + ' €' : null,
          whatsapp_msgs: msgs,
        };
      })
    );

    // Anuncios por campaña
    const adsData = await Promise.all(
      active.map(async (c) => {
        const timeParam = preset === 'today' ? todayRange() : `date_preset=${preset}`;
        const adsList = await graph(`/${c.id}/ads?fields=id,name,status`, token);
        const ads = adsList.data || [];
        const adInsights = await Promise.all(
          ads.filter(a => a.status !== 'DELETED').map(async (a) => {
            const ins = await graph(`/${a.id}/insights?fields=impressions,spend,actions&${timeParam}`, token);
            const d = ins.data?.[0] || {};
            const actions = d.actions || [];
            const lc = parseInt(actions.find(x => x.action_type === 'link_click')?.value || 0);
            return {
              name: a.name,
              status: a.status,
              impressions: parseInt(d.impressions || 0),
              clicks: lc,
              ctr: d.impressions && lc ? ((lc / parseInt(d.impressions)) * 100).toFixed(2) + '%' : null,
              cpc: d.spend && lc ? (parseFloat(d.spend) / lc).toFixed(2) + ' €' : null,
              spend: d.spend ? parseFloat(d.spend).toFixed(2) + ' €' : null,
            };
          })
        );
        return { campaign: c.name, ads: adInsights };
      })
    );

    return ok({ ok: true, period: preset, campaigns: insights, ads: adsData });

  } catch (e) {
    return err('Error interno: ' + e.message);
  }
}
