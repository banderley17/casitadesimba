# La Casita de Simba — Contexto del proyecto

Última actualización: 2026-07-21.

## Qué es

Guardería canina diurna/nocturna sin jaulas en Madrid. Negocio de Helena, la web y sistemas los desarrolla Banderley (el usuario).

**Datos del negocio:**
- Tel: +34613753680
- Email: lacasitadesimba04@gmail.com
- Dirección: Calle Puentelarra 5, Local 10, Madrid (Santa Eugenia – Villa de Vallecas)
- Precios: Estancia diurna €18/día · Nocturno €25/noche
- Pagos: Cash, Bizum, Transferencia
- **Nunca mencionar "jaulas" en ningún copy de anuncios ni web** (ni "sin jaulas") — Helena no quiere esa palabra.

## Stack y carpeta

- HTML/CSS/JS puro, sin framework. Carpeta local: `C:\Users\bande\Desktop\casitadesimba\`
- Archivo principal: `index.html`. Admin: `admin.html`. Backend: `api/` (Vercel Edge Functions + Upstash Redis). Fotos: Cloudinary.

## ⚠️ Hosting dual — regla crítica

`index.html` y `admin.html` viven en DOS sitios independientes que hay que sincronizar a mano:

- **GitHub Pages** (`lacasitadesimba.es`) — sirve el archivo tal cual está en el repo `banderley17/casitadesimba`. Se actualiza solo con `git push`. Delay de 5-10 min en reflejarse.
- **Vercel** (`casitadesimba.vercel.app`) — se actualiza con `vercel deploy --prod --yes`, sin necesidad de git. Casi instantáneo.

**Cada vez que se edite `admin.html` o `index.html`, hacer AMBAS cosas:**
```
vercel deploy --prod --yes
git add . && git commit -m "mensaje" && git push origin main
```
Confirmado el 2026-07-13: desplegar solo a Vercel deja `lacasitadesimba.es/admin.html` con la versión vieja — no es caché, es un archivo genuinamente distinto sin sincronizar.

**GitHub:** remote local configurado; las credenciales se gestionan fuera de este archivo.

## Admin panel

URL: `https://casitadesimba.vercel.app/admin.html` (siempre actualizado, usar este en vez de GitHub Pages para editar).

**Pestañas:** 📊 Stats · 👥 Clientes · ⭐ Reseñas · 💰 Precios · 📸 Fotos · 📣 Publicidad (se oculta sola si no hay campaña ACTIVA en Meta)

- **Clientes:** campo teléfono obligatorio, nombre+mascota opcionales, fecha "en que escribió" editable (defecto hoy, se muestra "🟢 Hoy" o "6 jul 2026")
- **Reseñas:** sistema propio (reemplazó Elfsight por límite de 200 vistas/mes) — ver detalle abajo
- **Precios (añadida 2026-07-13):** edita banner "Precios de Inauguración" (tag/título/subtítulo/fecha límite del contador/5 precios) y las 4 tarjetas de "Tarifas claras". Backend `api/pricing.js`, Redis clave `casita_pricing`
- **Publicidad:** lee `api/ads-stats.js` de la cuenta de Meta Ads, ver sección de campañas abajo
- **Backup:** botón 💾 verde en cabecera → descarga `casita_backup_YYYY-MM-DD.json` (clientes + reseñas). Datos en Upstash Redis (`client_list`, `casita_reviews`). Copias en `backups/admin_backup_FECHA.html`. Fotos en Cloudinary (no en Redis).

**Deploy:** `vercel deploy --prod --yes` desde la carpeta (el auto-deploy de GitHub no es fiable).

## Sistema de reseñas

- API: `https://casitadesimba.vercel.app/api/reviews` (`api/reviews.js`, edge function)
- Storage: Upstash Redis, clave `casita_reviews` (array JSON)
- Token admin: `simba2026`
- `GET` sin token → solo visibles (index.html) · `GET ?t=simba2026` → todas (admin) · `POST ?t=simba2026` → crear/actualizar (con `id` en body para actualizar) · `DELETE ?t=simba2026` → eliminar
- **⚠️ Nunca usar PATCH** — Vercel Edge Runtime lo bloquea silenciosamente
- Campos: `id, nombre, foto, imagen, estrellas, texto, respuesta, fecha (YYYY-MM), visible`
- Cloudinary preset: `casita_resenas`, carpeta `casita/resenas`, tag `resena`
- Admin tiene botones ↑/↓ para reordenar reseñas y fotos de galería (galeria.js)

## Galería

**No convertir en carousel/slideshow automático** — el usuario lo probó y lo rechazó ("está horrible"). El grid de 8 fotos con hover zoom + lightbox es el preferido; mejoras futuras deben ser sutiles sobre ese grid, no un carousel.

## Meta Pixel + CAPI

- **Pixel ID:** `4281036645446757` ("La Casita de Simba")
- Business Manager: cuenta de Helena (lacasitadesimba04@gmail.com)
- Cuenta publicitaria ads: EUR €, zona horaria España/Madrid
- Eventos browser: `PageView` (con event_id para deduplicación), `Contact` (clic en wa.me/tel:), `Lead` (envío formulario `.btn-form`)
- CAPI server-side: `https://casitadesimba.vercel.app/api/track` (`api/track.js`), token en Vercel `FB_CAPI_TOKEN`, Pixel ID hardcodeado
- Deploy: `vercel deploy --prod --scope banderley-s-projects`

## Campaña Meta Ads

- Campaña: "Video-Imagen" · Objetivo: Mensajes WhatsApp · Conjunto: "Madrid km — perros"
- Cuenta publicitaria: `act_1513350607502989` (EUR, Madrid)
- Presupuesto: 3€/día (compartido entre anuncios activos)
- Targeting: **Advantage+ Audience**, edad mín. 25 sin máxima, pin en Calle Puentelarra 5 · 17km, sin intereses manuales, ubicaciones Feed FB + Feed IG + Reels IG + Stories IG (sin Audience Network/Messenger/WhatsApp Status/Threads)

**Anuncios activos:**
- **"Madrid km Imagen"** — imagen original, objetivo Conversaciones *grandfathered* (irreemplazable, Meta ya no permite crear este objetivo para WhatsApp en Europa). **Nunca borrar.** Dejar que Meta lo pause solo si deja de recibir presupuesto — no pausarlo manualmente.
- **"Imagenv2 (Bono Súper Chollo)"** — mejor CTR/CPC, aquí se añaden las imágenes nuevas (no crear anuncios nuevos)

**Copy de Imagenv2:**
> 🐾 ¿Tu perro se queda solo en casa mientras trabajas? En La Casita de Simba lo cuidamos como uno más de la familia. ✅ Espacio libre para jugar y socializar ✅ Fotos y vídeos cada día ✅ Atención personalizada. Desde €5/hora · 🔥 Pregunta por nuestro Bono Súper Chollo — 10 días de cuidado para usar en todo el mes. 📍 Santa Eugenia – Villa de Vallecas, Madrid. Escríbenos y reserva su plaza 👇

- Título: `Pregunta por el Bono Súper Chollo 🐾`
- Descripción: `Servicio premium con seguro de RC, veterinario de guardia 24h y solo 6 plazas al día. Tu perro merece más que un simple cuidador.`
- CTA: Enviar mensaje → WhatsApp

**Error conocido de Meta (#3858471):** "Optimización Conversaciones no disponible para clic-a-WhatsApp en Europa" — afecta a toda cuenta que apunte a la UE, no solo esta. Los anuncios nuevos deben usar "Maximizar clics en el enlace"; el original ya activo con Conversaciones quedó grandfathered y sigue funcionando, pero no se puede replicar ese objetivo en anuncios nuevos.

**Última revisión de rendimiento (2026-07-07, 7 días):** Imagenv2 CTR 1.45% / CPC 0.15€ · Madrid km CTR 1.42% / CPC 0.16€. Baseline anterior (2026-07-05): CTR 1.79%, 334 clics, €0.17/clic, €57 gastado total.

## Sincronización de audiencias Meta

- App: "Casita de Simba Sync" (ID `898871789900207`, bajo negocio Latinotv GO)
- Token `FB_ADS_TOKEN` en Vercel casitadesimba — **expira ~14 agosto 2026**, renovar vía Graph API Explorer (app "Casita de Simba Sync" → `ads_management`+`ads_read` → extender → actualizar en Vercel → redeploy)
- Endpoint: `/api/sync-audience.js`
- Audiencia activa: `Casita · Todos los contactos CRM` → ID `120248536990050363` — usar como EXCLUSIÓN en el conjunto de anuncios (necesita ~100 contactos para activarse, iba en 27 a la última revisión)
- Flujo: registrar contacto en admin (tel obligatorio) → botón "Sincronizar con Meta" → sube teléfonos hasheados SHA-256

## SEO

- Dominio `lacasitadesimba.es` activo en GitHub Pages
- Title, meta description, keywords, Schema.org LocalBusiness (JSON-LD), FAQ Schema (8 preguntas), Open Graph + Twitter Card, sitemap.xml, robots.txt — todo implementado
- Google Business Profile activo, Search Console verificado
- og:image → `images/link.jpeg`; se añadió `data-nosnippet` a fotos del anfitrión para que Google deje de mostrar esas en vez del link.jpeg
- Pendiente: directorios locales (Páginas Amarillas, Yelp, Milanuncios)

## Seguridad

GitHub 2FA/Passkey activado, `rel="noopener noreferrer"` en links externos, avatares locales (sin dependencia externa), sin backend propio expuesto más allá de las Edge Functions de Vercel.

## Sección eliminada — "Lo que nos hace diferentes 🐾"

Quitada el 2026-06-06 a petición del usuario (HTML/CSS/traducciones completas guardadas en memoria — ver `casita-seccion-porq` — para restaurar cuando lo pida). Iba entre Servicios y Galería.

## Ideas pendientes para el admin (por prioridad de impacto)

1. **📅 Agenda semanal** — ver qué perros vienen cada día, control de plazas ocupadas, marcar asistencia. Ahora Helena lo lleva mentalmente/en papel → riesgo de overbooking. *(Siguiente a implementar.)*
2. **💰 Caja / Ingresos** — marcar pagos por cliente (día suelto/bono), total del mes en tiempo real
3. **📋 Ficha por perro** — raza, edad, carácter, alergias, veterinario, contacto de emergencia
4. **📣 Plantillas WhatsApp rápidas** — botón por cliente con mensaje predefinido (foto del día, recordatorios)


## Actualizaci?n 2026-08-07

- El favicon se sustituy? por un recorte cuadrado de 512?512 centrado en Simba, la casita y los perros, para que se identifique correctamente en las pesta?as del navegador.

- Hero: se eliminaron las diapositivas antiguas de ejemplo al cargar portadas del admin y se retir? el l?mite de 10 fotos; las portadas activas son ahora la ?nica fuente del carrusel.

- Galeria y portadas: el orden guardado en el admin es la fuente de verdad; las fotos nuevas se registran al subirlas y las eliminadas no se vuelven a publicar por cache. Verificado en produccion: galeria 31/31 y hero 13/13.

- Servicios Premium: las cinco tarjetas se alinearon en cinco columnas en escritorio, con dise?o adaptable en pantallas menores; se redujo el espacio inferior de la seccion.

- Servicios Premium: se anadio un brillo suave, halo de color y elevacion en hover, con respeto a la preferencia de reducir movimiento.

## Actualizacion 2026-08-13

- Rese?as: se corrigio el formato de las fechas publicadas. La web acepta fechas antiguas y nuevas sin mostrar valores rotos como `undefined`; si falta una fecha valida, se oculta.

## Revision funcional 2026-08-13

- Se revisaron la web publica, el panel y las APIs sin cambiar el dise?o aprobado por la due?a.
- Clientes: el backend guarda ahora el nombre de la mascota y permite correctamente el cambio de estado desde el dominio principal.
- Rese?as: el panel conserva y edita fechas completas; las nuevas rese?as guardan dia, mes y a?o; el render evita datos o URLs invalidas.
- Galeria y portadas: web y panel usan la misma fuente ordenada; si la API falla temporalmente, la galeria conserva las fotos de respaldo en vez de quedar vacia. El visor se cierra al pulsar el fondo.
- Analitica: un Lead se registra solo al enviar un formulario valido.
- Panel: se sustituyo un texto interno inapropiado por una etiqueta profesional.
- Verificacion: sintaxis de todos los scripts HTML y APIs, IDs duplicados, referencias locales, datos de rese?as y coherencia de orden de 13 portadas y 31 fotos.


## Actualizaci?n 2026-08-13

- Rese?as: se corrigi? el render de las fotos de autores. Una URL de foto vac?a se interpretaba como la portada de la web, generando im?genes rotas; ahora se muestra el avatar con inicial cuando no hay foto y se conservan las fotos reales de Cloudinary.


## Actualizaci?n 2026-08-13

- Galer?a: cada imagen cuenta ahora con el control de encuadre del hero en el panel. El desplazamiento vertical se guarda y se aplica en la web p?blica sin alterar el orden ni la imagen ampliada.


## Actualizacion 2026-08-17 - Orden de galeria

- Se corrigio dmin.html: moverFotoGal ahora envia collection: 'gallery' al API. Antes el API interpretaba la peticion como portada y guardaba el orden en casita_hero_order, por eso el admin parecia mover la foto pero la galeria publica no cambiaba.
- Commit: 2f9248a (Fix gallery order persistence) y push completado a GitHub.
- Verificacion de lectura API: la galeria publica responde 31 recursos y 31 elementos de orden.
- Pendiente: publicar dmin.html en el proyecto Vercel de Casita. La sesion CLI actual solo ve el equipo Encam y no ve el proyecto casitadesimba; hay que autorizar la cuenta Vercel propietaria de Casita antes de desplegar.

- Se corrigio tambien el icono de eliminar fotos: ahora usa la entidad HTML &#10005; para mostrar X, sin depender de la codificacion del archivo.
- Despliegue Vercel completado y aliasado en https://casitadesimba.vercel.app (dpl_A15h4ruxfuP31Dzb6e8tQr3rxmrU, estado READY). Se verifico en produccion el payload de galeria, el icono X y la API con 31 recursos/31 posiciones.


## Actualizacion 2026-08-17 - Encuadre de galeria publico

- La galeria publica ahora solicita explicitamente la coleccion gallery con una consulta sin cache y aplica object-fit/object-position inline a cada foto.
- La API de galeria responde las lecturas con Cache-Control no-store para que los cambios de encuadre del panel no queden retenidos por el navegador/CDN.
- Verificado en produccion: deployment Vercel READY, respuesta API con posiciones y HTML publicado con el fetch actualizado.
