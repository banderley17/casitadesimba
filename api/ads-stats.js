import { jsonResponse, optionsResponse, redisCommand, requireAdmin } from '../lib/security.js';

export const config = { runtime: 'edge' };
const METHODS = 'GET, OPTIONS';
const GRAPH_VERSION = process.env.META_GRAPH_API_VERSION || 'v24.0';
const GRAPH = `https://graph.facebook.com/${GRAPH_VERSION}`;
const AD_ACCOUNT = 'act_1513350607502989';
const ADS_CACHE_SECONDS = 60;
const PERIODS = new Set(['today', 'yesterday', 'last_7d', 'last_14d', 'last_30d', 'this_month', 'last_month']);

async function graph(path, token) {
  const response = await fetch(`${GRAPH}${path}`, { headers: { Authorization: `Bearer ${token}` } });
  const data = await response.json();
  if (!response.ok || data.error) {
    const error = new Error('META_ERROR');
    error.metaStatus = response.status;
    error.metaCode = data?.error?.code;
    error.metaSubcode = data?.error?.error_subcode;
    throw error;
  }
  return data;
}
function todayRange() { const date = new Date().toISOString().slice(0, 10); return `time_range=${encodeURIComponent(JSON.stringify({ since: date, until: date }))}`; }
function euros(value, suffix = '') { return value == null || value === '' ? null : `${Number(value).toFixed(2)} €${suffix}`; }

export default async function handler(req) {
  if (req.method === 'OPTIONS') return optionsResponse(req, METHODS);
  if (req.method !== 'GET') return jsonResponse(req, { ok: false, error: 'Método no permitido' }, 405, METHODS);
  const auth = await requireAdmin(req);
  if (!auth.ok) return auth.response;
  const token = process.env.FB_ADS_TOKEN;
  if (!token) return jsonResponse(req, { ok: false, error: 'Meta no configurado' }, 503, METHODS);
  const requested = new URL(req.url).searchParams.get('period') || 'last_7d';
  const period = PERIODS.has(requested) ? requested : 'last_7d';
  const cacheKey = `casita_ads_stats:${period}`;
  try {
    const cached = await redisCommand(['GET', cacheKey]);
    if (cached) {
      try { return jsonResponse(req, JSON.parse(cached), 200, METHODS); } catch (_) { /* Fetch fresh data if a stale cache entry is malformed. */ }
    }
    const campaignsData = await graph(`/${AD_ACCOUNT}/campaigns?fields=id,name,status,daily_budget&limit=100`, token);
    const active = (campaignsData.data || []).filter((campaign) => campaign.status === 'ACTIVE').slice(0, 50);
    if (!active.length) {
      const payload = { ok: true, period, campaigns: [], ads: [] };
      await redisCommand(['SETEX', cacheKey, ADS_CACHE_SECONDS, JSON.stringify(payload)]);
      return jsonResponse(req, payload, 200, METHODS);
    }
    const time = period === 'today' ? todayRange() : `date_preset=${period}`;
    const campaigns = await Promise.all(active.map(async (campaign) => {
      const insight = await graph(`/${campaign.id}/insights?fields=impressions,reach,frequency,spend,actions&${time}`, token);
      const data = insight.data?.[0] || {};
      const actions = data.actions || [];
      const clicks = Number.parseInt(actions.find((item) => item.action_type === 'link_click')?.value || 0, 10);
      const messages = actions.find((item) => item.action_type === 'onsite_conversion.messaging_conversation_started_7d')?.value || actions.find((item) => item.action_type === 'onsite_conversion.total_messaging_connection')?.value || null;
      return { id: campaign.id, name: String(campaign.name || '').slice(0, 200), status: campaign.status, budget_day: campaign.daily_budget ? euros(Number(campaign.daily_budget) / 100, '/día') : null, impressions: Number.parseInt(data.impressions || 0, 10), reach: Number.parseInt(data.reach || 0, 10), frequency: data.frequency ? Number(data.frequency).toFixed(2) : null, clicks, ctr: data.impressions && clicks ? `${((clicks / Number(data.impressions)) * 100).toFixed(2)}%` : null, cpc: data.spend && clicks ? euros(Number(data.spend) / clicks) : null, spend: data.spend ? euros(data.spend) : null, whatsapp_msgs: messages };
    }));
    const ads = await Promise.all(active.map(async (campaign) => {
      const list = await graph(`/${campaign.id}/ads?fields=id,name,status&limit=100`, token);
      const items = await Promise.all((list.data || []).filter((ad) => ad.status !== 'DELETED').slice(0, 100).map(async (ad) => {
        const insight = await graph(`/${ad.id}/insights?fields=impressions,spend,actions&${time}`, token);
        const data = insight.data?.[0] || {};
        const clicks = Number.parseInt((data.actions || []).find((item) => item.action_type === 'link_click')?.value || 0, 10);
        return { name: String(ad.name || '').slice(0, 200), status: ad.status, impressions: Number.parseInt(data.impressions || 0, 10), clicks, ctr: data.impressions && clicks ? `${((clicks / Number(data.impressions)) * 100).toFixed(2)}%` : null, cpc: data.spend && clicks ? euros(Number(data.spend) / clicks) : null, spend: data.spend ? euros(data.spend) : null };
      }));
      return { campaign: String(campaign.name || '').slice(0, 200), ads: items };
    }));
    const payload = { ok: true, period, campaigns, ads };
    await redisCommand(['SETEX', cacheKey, ADS_CACHE_SECONDS, JSON.stringify(payload)]);
    return jsonResponse(req, payload, 200, METHODS);
  } catch (error) {
    console.error('ads-stats Meta request failed', { status: error.metaStatus || null, code: error.metaCode || null, subcode: error.metaSubcode || null });
    return jsonResponse(req, { ok: false, error: 'No se pudieron consultar las campañas' }, 502, METHODS);
  }
}
