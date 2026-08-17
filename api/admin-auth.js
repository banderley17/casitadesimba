import {
  authenticateAdmin,
  createAdminSession,
  destroyAdminSession,
  isSameOrigin,
  jsonResponse,
  loginAllowed,
  optionsResponse,
  readJson,
  recordLoginFailure,
  requireAdmin,
  verifyAdminPassword,
} from '../lib/security.js';

export const config = { runtime: 'edge' };

const METHODS = 'GET, POST, OPTIONS';

export default async function handler(req) {
  if (req.method === 'OPTIONS') return optionsResponse(req, METHODS, { credentials: true, csrf: true });

  try {
    if (req.method === 'GET') {
      const session = await authenticateAdmin(req);
      return jsonResponse(req, session ? { ok: true, csrf: session.csrf } : { ok: false }, session ? 200 : 401, METHODS, { credentials: true, csrf: true });
    }

    if (req.method !== 'POST') return jsonResponse(req, { ok: false, error: 'Método no permitido' }, 405, METHODS, { credentials: true, csrf: true });
    if (!isSameOrigin(req)) return jsonResponse(req, { ok: false, error: 'Solicitud rechazada' }, 403, METHODS, { credentials: true, csrf: true });

    const body = await readJson(req, 2_048);
    if (body.action === 'logout') {
      const auth = await requireAdmin(req, { csrf: true });
      if (!auth.ok) return auth.response;
      const cookie = await destroyAdminSession(req);
      const response = jsonResponse(req, { ok: true }, 200, METHODS, { credentials: true, csrf: true });
      response.headers.set('Set-Cookie', cookie);
      return response;
    }

    if (body.action !== 'login') return jsonResponse(req, { ok: false, error: 'Solicitud inválida' }, 400, METHODS, { credentials: true, csrf: true });

    const limiter = await loginAllowed(req);
    if (!limiter.allowed) return jsonResponse(req, { ok: false, error: 'Demasiados intentos. Espera 15 minutos.' }, 429, METHODS, { credentials: true, csrf: true });

    const valid = await verifyAdminPassword(body.password);
    if (!valid) {
      await recordLoginFailure(limiter.key);
      return jsonResponse(req, { ok: false, error: 'Credenciales incorrectas' }, 401, METHODS, { credentials: true, csrf: true });
    }

    const session = await createAdminSession(limiter.key);
    const response = jsonResponse(req, { ok: true, csrf: session.csrf }, 200, METHODS, { credentials: true, csrf: true });
    response.headers.set('Set-Cookie', session.cookie);
    return response;
  } catch (error) {
    const status = error?.message === 'PAYLOAD_TOO_LARGE' ? 413 : error?.message === 'INVALID_JSON' ? 400 : 500;
    return jsonResponse(req, { ok: false, error: status === 500 ? 'Error interno' : 'Solicitud inválida' }, status, METHODS, { credentials: true, csrf: true });
  }
}
