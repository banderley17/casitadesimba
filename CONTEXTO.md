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
- La autenticación administrativa se realiza en servidor mediante una sesión segura `HttpOnly`; no se guardan contraseñas ni tokens de administración en este archivo ni en el navegador.
- `GET` público devuelve solo reseñas visibles. Las lecturas completas y todas las mutaciones requieren una sesión de administrador y protección CSRF.
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


## Actualizacion 2026-08-17 - Altura de filas de galeria

- Se fijo grid-auto-rows:220px para todas las filas de la galeria. Las filas automaticas antes quedaban con altura natural y el object-position no podia recortar verticalmente esas fotos.
- Verificado: sintaxis correcta y despliegue Vercel READY aliasado en casitadesimba.vercel.app. Pendiente la propagacion normal de GitHub Pages.


## Actualizacion 2026-08-17 - Previsualizacion de encuadre en admin

- Las miniaturas de galeria del admin ya no usan la transformacion Cloudinary c_fill, que recortaba la imagen antes de aplicar object-position.
- Ahora cargan la imagen sin recorte previo y la miniatura cuadrada aplica el encuadre mediante CSS, igual que la portada.
- Despliegue Vercel READY y aliasado en casitadesimba.vercel.app; se sincroniza tambien con GitHub Pages.


## Actualizacion 2026-08-17 - Visibilidad de Publicidad

- La pestana Publicidad del admin queda oculta por defecto y solo se muestra cuando Meta confirma ok:true y al menos una campana con estado ACTIVE.
- Si Meta devuelve error de token, respuesta vacia o fallo de conexion, no se muestra la pestana ni un mensaje de error al usuario.
- Verificado con la respuesta actual de Meta: sesion invalidada, por lo que Publicidad queda correctamente oculta. Despliegue Vercel READY y sincronizacion con GitHub completada.

## Actualizacion 2026-08-17 - Encuadre de reseñas

- Las fotos de perfil y las imágenes adjuntas a las reseñas ahora tienen un control de encuadre vertical en el admin.
- El valor se guarda junto a cada reseña mediante `fotoPosition` e `imagenPosition`, con valores seguros entre 0 y 100.
- La web pública y la vista del admin aplican el mismo encuadre; las reseñas antiguas usan 50% como valor predeterminado.
- Verificación: sintaxis de `api/reviews.js` y de los scripts inline de `admin.html` e `index.html` correcta.

## Actualización 2026-08-17 - Endurecimiento de seguridad

- Se eliminó la contraseña y el token administrativo del JavaScript público. El panel usa ahora autenticación en servidor, sesión opaca en Redis, cookie `HttpOnly`/`Secure`/`SameSite=Strict`, caducidad de 8 horas y protección CSRF.
- Se añadió limitación de intentos de acceso, validación y límites de tamaño en APIs, CORS restringido, errores genéricos y cabeceras de seguridad.
- Las operaciones administrativas de clientes, reseñas, tarifas, horarios, galería, estadísticas, audiencias y Cloudinary requieren sesión; las subidas y eliminaciones de imágenes se firman en servidor.
- Se eliminó el panel oculto de la web pública y se retiraron del despliegue las copias antiguas del panel. Se conservaron localmente fuera del repositorio en `C:\Users\bande\Desktop\casitadesimba-local-backups\2026-08-17-security-cleanup`.
- La clave administrativa expuesta anteriormente debe considerarse invalidada. La nueva clave se gestiona únicamente como hash PBKDF2 en Vercel y no se escribe en archivos de contexto.
- No existe seguridad absoluta; queda como mejora futura migrar el JavaScript inline para poder aplicar una CSP estricta con `script-src` sin romper la web actual.

## Verificación de producción 2026-08-17

- Despliegue de seguridad publicado en GitHub Pages y en `https://casitadesimba.vercel.app`.
- Pruebas reales: APIs públicas 200; clientes y escrituras sin sesión 401; origen ajeno 403; acceso con sesión 200; cierre de sesión e invalidación posterior correctos.
- La cookie administrativa se confirmó con `HttpOnly`, `Secure` y `SameSite=Strict`; la firma protegida de Cloudinary respondió 200.
- En el dominio público, `admin.html` ya redirige al panel seguro y no contiene credenciales; `CONTEXTO.md` y las copias antiguas responden 404.
- A petición del usuario se conservó la contraseña histórica, pero solo como hash PBKDF2 en Vercel. Sigue recomendándose cambiarla porque estuvo expuesta en versiones anteriores.

## Actualizacion 2026-08-17 - Sincronizacion de contactos con Meta

- Se corrigio el flujo `POST /api/sync-audience`: ahora devuelve los campos `message`, `msg` y `audienceId` que utiliza el panel, por lo que el resultado ya no aparece como `undefined`.
- La version de Graph API ya no esta fijada en una version antigua: usa `META_GRAPH_API_VERSION` y `v24.0` por defecto. Si Meta publica otra version, basta actualizar esa variable en Vercel.
- Se muestran mensajes utiles cuando el token caduca, carece de permisos o Meta limita temporalmente la peticion, sin exponer tokens ni detalles sensibles.
- Si el publico guardado en Redis fue eliminado o quedo obsoleto, se borra solo ese identificador y se crea un publico nuevo una vez antes de informar del fallo.
- `api/ads-stats.js` y `api/track.js` usan la misma version configurable de Graph para mantener coherentes estadisticas y eventos.
- Verificado localmente: `node --check` correcto en las tres APIs y `git diff --check` sin errores.
- Pendiente para produccion: comprobar que `FB_ADS_TOKEN` vigente y `META_GRAPH_API_VERSION` (si se quiere fijar otra) estan definidos en las variables de Vercel y volver a desplegar.
## Actualizacion 2026-08-26 - Reservas web a Clientes

- El formulario publico de reserva guarda ahora cada solicitud valida como `consulta` en Clientes antes de abrir WhatsApp. Se conservan nombre, telefono, perro, servicio y los detalles de la solicitud.
- Se evita crear duplicados por telefono y se mantiene el estado que Helena ya haya asignado a un contacto existente.
- El endpoint publico `api/public-lead.js` restringe origenes permitidos, valida el contenido, limita solicitudes y utiliza un campo trampa contra bots. No expone credenciales.
- Verificacion local: sintaxis correcta de la API y `git diff --check` limpio. Pendiente: desplegar en Vercel/GitHub Pages y realizar una reserva de prueba para confirmar que aparece en el panel y en los eventos de Meta.

## Actualización 2026-08-26 - Medición Meta de reservas

- Se verificó el recorrido real del píxel 4281036645446757: navegador y CAPI envían PageView, Contact y Lead con el mismo event_id para que Meta deduplique correctamente.
- La API CAPI se comprobó en producción con una prueba técnica y respondió 200 { ok: true }; el token y el endpoint están operativos.
- El envío CAPI usa ahora keepalive para no perder conversiones al abrir WhatsApp. El evento Lead solo se dispara si el formulario de reserva es válido e identifica el servicio elegido.
- Para campañas nuevas de esta guardería, usar objetivo Ventas, ubicación Sitio web, conjunto de datos La Casita de Simba y evento de conversión Lead. No usar Compra hasta disponer de una confirmación/pago real dentro de la web.
- Pendiente de comprobación visual en Meta: en Probar eventos, abrir la web y enviar una reserva real; deben aparecer PageView, Lead y Contact.

## Actualización 2026-08-26 - Botón flotante WhatsApp

- Se eliminó el bloqueo del primer clic del icono flotante de WhatsApp. Ahora abre directamente la conversación con el número del negocio y el mensaje preparado; la burbuja informativa sigue pudiendo cerrarse de forma independiente.
- Verificación local: enlace publicado wa.me/34613753680, diff sin errores y sintaxis de APIs correcta. Pendiente: comprobar el clic una vez propagada la publicación.

## Actualización 2026-08-26 — Auditoría integral

- Auditoría realizada sin modificar la aplicación. Resultado: no se identificó una vía crítica conocida para acceder al panel ni modificar datos sin sesión válida; autenticación, CSRF, validación, CORS y límites de peticiones están activos.
- Pendientes priorizados documentados en `security_best_practices_report.md`: consentimiento y textos de privacidad por Meta Pixel/CAPI; cabeceras del dominio público; concurrencia de la lista de clientes; CSP parcial; correcciones SEO y accesibilidad.
- No se registraron secretos, contraseñas ni tokens en este contexto.

## Actualización 2026-08-27 — Compras confirmadas en Meta

- El panel mantiene el flujo existente de Clientes: `estado: cliente` representa una venta cerrada/pago confirmado. La vista revisada mostró 43 consultas, 5 ventas y 7 excluidos.
- Al crear un contacto directamente como venta o cambiar una consulta a venta, `api/clients.js` envía un único evento `Purchase` a Meta CAPI usando `FB_CAPI_TOKEN`, teléfono hasheado y el servicio como `content_name`.
- El evento queda identificado por cliente y se guardan marcas internas de enviado o pendiente para evitar duplicados y permitir reintentos al editar un pago pendiente. Las cinco ventas existentes no se reenvían como compras actuales.
- Se añadió `lib/meta-purchase.mjs` con pruebas en `tests/meta-purchase.test.mjs`. Verificado con `node --test --test-isolation=none`, `node --check` de las APIs y `git diff --check`.
- Despliegue Vercel producción READY: `dpl_5UJUzAmW1etRkBE2KVfUYgiHnDgb`, alias `https://casitadesimba.vercel.app`; commit `fa41df9` sincronizado con GitHub Pages. La comprobación HTTP confirmó el panel actualizado en Vercel, GitHub y el dominio público; APIs protegidas: `clients` 401 y rutas de evento 405 sin sesión. Pendiente probar un pago nuevo en Meta Events Manager.

## Actualización 2026-08-27 — Estado de ventas del panel

- Se eliminó del listado el cambio rápido `Venta → CV/Excluido`, que provocaba que una venta desapareciera del filtro Ventas al pulsar su etiqueta.
- Las ventas muestran ahora su estado sin acción de cambio; `Excluir` sigue disponible únicamente como opción explícita del formulario. Las consultas pueden pasar a venta y los excluidos a consulta desde sus etiquetas.
- Despliegue Vercel READY: `dpl_2FpaTkESfQNSZ94VWAfwXkF8pGgQ`, alias `https://casitadesimba.vercel.app`; GitHub Pages y `lacasitadesimba.es` ya sirven el ajuste tras la propagación. Verificación HTTP: las tres copias contienen el botón de Venta desactivado y no contienen el aviso antiguo de CV.

## Actualización 2026-08-27 — Estado de cliente bloqueado

- El listado muestra `Consulta` como botón explícito `💬 Pasar a venta`. Solo esa acción permite promocionar una consulta después del pago.
- Las fichas `Venta` y `Excluido` muestran su estado sin acción de cambio, evitando que una venta desaparezca del filtro por un clic accidental. La selección de estado sigue disponible al crear un contacto nuevo.
- Verificación: 5 pruebas pasan, sintaxis de APIs correcta y las copias Vercel/GitHub/dominio público sirven el texto nuevo. Despliegue Vercel READY: `dpl_5gcuF8n7xpVqLEzyyhG9JGsFXTud`. Pendiente sincronizar este último ajuste con GitHub Pages.
