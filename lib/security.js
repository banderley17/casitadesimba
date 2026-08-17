const ADMIN_COOKIE = '__Host-casita_admin';
const SESSION_TTL_SECONDS = 8 * 60 * 60;
const LOGIN_WINDOW_SECONDS = 15 * 60;
const LOGIN_MAX_FAILURES = 8;

const PUBLIC_ORIGINS = new Set([
  'https://lacasitadesimba.es',
  'https://www.lacasitadesimba.es',
  'https://casitadesimba.vercel.app',
]);

const encoder = new TextEncoder();

function bytesToBase64Url(bytes) {
  let binary = '';
  bytes.forEach((byte) => { binary += String.fromCharCode(byte); });
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function base64ToBytes(value) {
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/');
  const padded = normalized + '='.repeat((4 - normalized.length % 4) % 4);
  const binary = atob(padded);
  return Uint8Array.from(binary, (char) => char.charCodeAt(0));
}

function timingSafeEqual(left, right) {
  const a = typeof left === 'string' ? encoder.encode(left) : left;
  const b = typeof right === 'string' ? encoder.encode(right) : right;
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i += 1) diff |= a[i] ^ b[i];
  return diff === 0;
}

async function sha256Hex(value) {
  const digest = await crypto.subtle.digest('SHA-256', encoder.encode(value));
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

function randomToken(bytes = 32) {
  const value = new Uint8Array(bytes);
  crypto.getRandomValues(value);
  return bytesToBase64Url(value);
}

function redisConfig() {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) throw new Error('Storage unavailable');
  return { url, token };
}

async function redisCommand(command) {
  const { url, token } = redisConfig();
  const response = await fetch(`${url}/pipeline`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify([command]),
  });
  if (!response.ok) throw new Error('Storage unavailable');
  const data = await response.json();
  return data?.[0]?.result;
}

async function redisPipeline(commands) {
  const { url, token } = redisConfig();
  const response = await fetch(`${url}/pipeline`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(commands),
  });
  if (!response.ok) throw new Error('Storage unavailable');
  return response.json();
}

function requestOrigin(req) {
  const origin = req.headers.get('origin');
  if (!origin) return '';
  try { return new URL(origin).origin; } catch (_) { return ''; }
}

export function isSameOrigin(req) {
  const origin = requestOrigin(req);
  if (!origin) return false;
  return origin === new URL(req.url).origin;
}

function isAllowedPublicOrigin(origin) {
  if (PUBLIC_ORIGINS.has(origin)) return true;
  try {
    const host = new URL(origin).hostname;
    return host === 'localhost' || host === '127.0.0.1' || (host.endsWith('.vercel.app') && host.startsWith('casitadesimba'));
  } catch (_) {
    return false;
  }
}

export function apiHeaders(req, methods, options = {}) {
  const headers = {
    'Access-Control-Allow-Methods': methods,
    'Access-Control-Allow-Headers': options.csrf ? 'Content-Type, X-CSRF-Token' : 'Content-Type',
    'Vary': 'Origin',
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'no-referrer',
  };
  const origin = requestOrigin(req);
  if (origin && isAllowedPublicOrigin(origin)) headers['Access-Control-Allow-Origin'] = origin;
  if (options.credentials && origin === new URL(req.url).origin) headers['Access-Control-Allow-Credentials'] = 'true';
  return headers;
}

export function jsonResponse(req, data, status = 200, methods = 'GET, OPTIONS', options = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      ...apiHeaders(req, methods, options),
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': options.publicCache || 'no-store',
    },
  });
}

export function optionsResponse(req, methods, options = {}) {
  const origin = requestOrigin(req);
  if (origin && !isAllowedPublicOrigin(origin)) return new Response(null, { status: 403 });
  return new Response(null, { status: 204, headers: apiHeaders(req, methods, options) });
}

export async function readJson(req, maxBytes = 32_768) {
  const length = Number(req.headers.get('content-length') || 0);
  if (length > maxBytes) throw new Error('PAYLOAD_TOO_LARGE');
  const text = await req.text();
  if (encoder.encode(text).length > maxBytes) throw new Error('PAYLOAD_TOO_LARGE');
  let parsed;
  try { parsed = JSON.parse(text || '{}'); } catch (_) { throw new Error('INVALID_JSON'); }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error('INVALID_JSON');
  return parsed;
}

export function cleanText(value, maxLength, { required = false } = {}) {
  if (value == null) {
    if (required) throw new Error('INVALID_INPUT');
    return '';
  }
  if (typeof value !== 'string') throw new Error('INVALID_INPUT');
  const clean = value.replace(/\u0000/g, '').trim();
  if ((required && !clean) || clean.length > maxLength) throw new Error('INVALID_INPUT');
  return clean;
}

export function cleanId(value) {
  if (typeof value !== 'string' || !/^[A-Za-z0-9_./:-]{1,180}$/.test(value)) throw new Error('INVALID_INPUT');
  return value;
}

export function cleanImageUrl(value) {
  if (!value) return '';
  if (typeof value !== 'string' || value.length > 700) throw new Error('INVALID_INPUT');
  let url;
  try { url = new URL(value); } catch (_) { throw new Error('INVALID_INPUT'); }
  if (url.protocol !== 'https:' || url.hostname !== 'res.cloudinary.com' || !url.pathname.startsWith('/dqboccvby/image/')) {
    throw new Error('INVALID_INPUT');
  }
  return url.toString();
}

function cookieValue(req, name) {
  const cookie = req.headers.get('cookie') || '';
  for (const part of cookie.split(';')) {
    const [key, ...rest] = part.trim().split('=');
    if (key === name) return decodeURIComponent(rest.join('='));
  }
  return '';
}

async function sessionFromRequest(req) {
  const token = cookieValue(req, ADMIN_COOKIE);
  if (!token || token.length < 32 || token.length > 100) return null;
  const key = `casita:admin:session:${await sha256Hex(token)}`;
  const raw = await redisCommand(['GET', key]);
  if (!raw) return null;
  let session;
  try { session = JSON.parse(raw); } catch (_) { return null; }
  if (!session?.csrf || !Number.isFinite(session.expiresAt) || session.expiresAt <= Date.now()) {
    await redisCommand(['DEL', key]);
    return null;
  }
  return { ...session, key };
}

export async function authenticateAdmin(req) {
  try { return await sessionFromRequest(req); } catch (_) { return null; }
}

export async function requireAdmin(req, { csrf = false } = {}) {
  const session = await authenticateAdmin(req);
  if (!session) return { ok: false, response: jsonResponse(req, { ok: false, error: 'No autorizado' }, 401, 'GET, POST, PATCH, DELETE, OPTIONS', { csrf: true }) };
  if (csrf) {
    const provided = req.headers.get('x-csrf-token') || '';
    if (!isSameOrigin(req) || !timingSafeEqual(provided, session.csrf)) {
      return { ok: false, response: jsonResponse(req, { ok: false, error: 'Solicitud rechazada' }, 403, 'GET, POST, PATCH, DELETE, OPTIONS', { csrf: true }) };
    }
  }
  return { ok: true, session };
}

export async function verifyAdminPassword(password) {
  const encoded = process.env.ADMIN_PASSWORD_HASH || '';
  const [scheme, iterationsText, saltText, expectedText] = encoded.split('$');
  const iterations = Number(iterationsText);
  if (scheme !== 'pbkdf2_sha256' || !Number.isInteger(iterations) || iterations < 150_000 || !saltText || !expectedText) return false;
  if (typeof password !== 'string' || password.length < 10 || password.length > 256) return false;
  let salt;
  let expected;
  try { salt = base64ToBytes(saltText); expected = base64ToBytes(expectedText); } catch (_) { return false; }
  const key = await crypto.subtle.importKey('raw', encoder.encode(password), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt, iterations }, key, expected.length * 8);
  return timingSafeEqual(new Uint8Array(bits), expected);
}

function clientIp(req) {
  return (req.headers.get('x-real-ip') || req.headers.get('x-forwarded-for')?.split(',')[0] || 'unknown').trim().slice(0, 100);
}

export async function loginAllowed(req) {
  const ipHash = await sha256Hex(clientIp(req));
  const key = `casita:admin:login:${ipHash}`;
  const count = Number(await redisCommand(['GET', key]) || 0);
  return { allowed: count < LOGIN_MAX_FAILURES, key };
}

export async function recordLoginFailure(key) {
  await redisPipeline([['INCR', key], ['EXPIRE', key, LOGIN_WINDOW_SECONDS]]);
}

export async function createAdminSession(failureKey) {
  const token = randomToken(32);
  const csrf = randomToken(24);
  const expiresAt = Date.now() + SESSION_TTL_SECONDS * 1000;
  const key = `casita:admin:session:${await sha256Hex(token)}`;
  await redisPipeline([
    ['SET', key, JSON.stringify({ csrf, expiresAt }), 'EX', SESSION_TTL_SECONDS],
    ['DEL', failureKey],
  ]);
  return {
    csrf,
    cookie: `${ADMIN_COOKIE}=${encodeURIComponent(token)}; Path=/; Max-Age=${SESSION_TTL_SECONDS}; HttpOnly; Secure; SameSite=Strict`,
  };
}

export async function destroyAdminSession(req) {
  const session = await authenticateAdmin(req);
  if (session?.key) await redisCommand(['DEL', session.key]);
  return `${ADMIN_COOKIE}=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=Strict`;
}

export async function publicRateLimit(req, namespace, limit, windowSeconds) {
  const ipHash = await sha256Hex(clientIp(req));
  const key = `casita:rate:${namespace}:${ipHash}`;
  const results = await redisPipeline([['INCR', key], ['EXPIRE', key, windowSeconds]]);
  const count = Number(results?.[0]?.result || 0);
  return count <= limit;
}
