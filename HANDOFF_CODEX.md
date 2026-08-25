# HANDOFF — La Casita de Simba (punto de guardado para continuar con Codex)

Generado: 2026-08-25, por Claude Code, por si el usuario se queda sin créditos y necesita
continuar este proyecto con Codex (o cualquier otra sesión) sin perder contexto.

**Lee primero `CONTEXTO.md`** — ahí está el historial completo y cronológico. Este archivo es
solo un resumen del estado actual, no lo sustituye.

## Qué es este proyecto

Guardería canina diurna/nocturna sin jaulas en Madrid (negocio de Helena). HTML/CSS/JS puro,
sin framework. `index.html` (web pública) + `admin.html` (panel) + `api/` (Vercel Edge
Functions + Upstash Redis). Fotos en Cloudinary.

**Nunca mencionar "jaulas" en ningún copy** (ni "sin jaulas") — Helena no quiere esa palabra.

## ⚠️ Hosting dual — la regla más importante de este proyecto

`index.html` y `admin.html` viven en DOS sitios que hay que sincronizar A MANO cada vez:
- **GitHub Pages** (`lacasitadesimba.es`) — se actualiza con `git push` (delay 5-10 min).
- **Vercel** (`casitadesimba.vercel.app`) — se actualiza con `vercel deploy --prod --yes`
  (casi instantáneo).

**Cada edición de `admin.html`/`index.html` necesita AMBOS pasos**, no uno solo — confirmado en
vivo que desplegar solo a Vercel deja GitHub Pages con la versión vieja (no es caché).

## Identidad de despliegue — verificar SIEMPRE antes de tocar nada

- **GitHub:** `banderley17/casitadesimba`. `git config user.email` debe ser
  `banderleyxz@gmail.com` — NO reutilizar la identidad de Encamisada.
- **Vercel:** `vercel deploy --prod --scope banderley-s-projects` (o `--yes` según el flujo
  documentado en `CONTEXTO.md`).

## Estado actual (ver `CONTEXTO.md` para el detalle completo)

- **Seguridad reforzada (17/08):** ya NO hay contraseña ni token en el JavaScript público —
  autenticación en servidor, sesión opaca en Redis, cookie `HttpOnly`/`Secure`/`SameSite=Strict`
  de 8h, protección CSRF, rate limiting. Verificado en producción: APIs públicas 200, escrituras
  sin sesión 401, origen ajeno 403.
- Reseñas, galería y hero con control de encuadre (posición vertical) editable desde el admin.
- Pestaña "Publicidad" del admin se oculta sola si no hay campaña ACTIVA en Meta (o si el token
  caducó) — comportamiento intencional, no un bug.
- Meta Pixel `4281036645446757` + CAPI (`api/track.js`) — eventos `PageView`/`Contact`/`Lead`.
- Campaña Meta Ads activa: "Video-Imagen" — **el anuncio "Madrid km Imagen" nunca se borra**
  (objetivo "Conversaciones" grandfathered, Meta ya no permite crearlo para WhatsApp en la UE).
- Sincronización de audiencias con Meta vía `api/sync-audience.js` (teléfonos hasheados
  SHA-256) — token `FB_ADS_TOKEN` expiraba ~14 agosto 2026, comprobar si sigue vigente.

## Ideas pendientes para el admin (por prioridad)

1. 📅 Agenda semanal (siguiente a implementar) — control de plazas, evitar overbooking.
2. 💰 Caja/Ingresos por cliente.
3. 📋 Ficha por perro (raza, alergias, veterinario, contacto de emergencia).
4. 📣 Plantillas WhatsApp rápidas por cliente.

## Reglas de seguridad

- No guardar contraseñas, tokens ni claves en `CONTEXTO.md`, este archivo, ni ningún `.md` —
  la clave administrativa antigua quedó expuesta una vez en versiones viejas y tuvo que darse
  por invalidada; la actual vive solo como hash PBKDF2 en Vercel.
- Antes de dar un cambio por cerrado, probarlo en vivo en AMBOS hosting (no asumir que uno
  refleja al otro).

## Codex como segunda opinión

Mismo modelo que el resto de proyectos del usuario: Claude Code es el agente principal
(analiza, implementa, prueba, integra); Codex es revisor read-only para cambios grandes,
seguridad o bugs difíciles — nunca sustituye a Claude ni actúa por defecto.
