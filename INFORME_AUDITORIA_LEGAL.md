# Informe de auditoría legal y de cookies — La Casita de Simba

**Fecha:** 24 de noviembre de 2026
**Alcance:** web pública `lacasitadesimba.es` (repositorio local), formulario de reservas, APIs de Vercel relacionadas con datos personales e integraciones con Meta.
**Estado:** implementado y probado en local; **publicado el 24/11/2026 a petición del usuario** (nombre completo y NIF de la titular incorporados el 24/11/2026; condiciones de contratación sin publicar).
**Copia de seguridad previa:** `C:\Users\bande\Desktop\casitadesimba-local-backups\2026-11-24-auditoria-legal\` (incluye `index.html`, `admin.html`, `api/`, `lib/`, `tests/`, configuración, el commit de partida `eaa9cc6` y un diff de los cambios sin confirmar que ya existían).

> Este informe es técnico. No sustituye el asesoramiento de un abogado. Los puntos de la sección 6 deben revisarse con un profesional antes de publicar.

---

## 1. Resumen ejecutivo

La auditoría técnica sobre la web publicada detectó incumplimientos relevantes, ya corregidos en local:

| # | Hallazgo en la web publicada | Gravedad | Estado |
|---|---|---|---|
| 1 | **Meta Pixel cargado sin consentimiento**: instalaba la cookie `_fbp` (90 días) y enviaba `PageView` a Facebook y a la API de Conversiones nada más entrar. | Alta (art. 22.2 LSSI) | Corregido |
| 2 | La política de cookies afirmaba que **solo había cookies técnicas** y que no se usaba publicidad. Era falso. | Alta | Corregido |
| 3 | No existía banner ni mecanismo de consentimiento. | Alta | Corregido |
| 4 | **Google Maps** se cargaba siempre (IP a Google y posibles cookies de google.com). | Media | Corregido (bloqueado hasta autorizar) |
| 5 | La política de privacidad decía que el formulario recogía **email** (no lo hace), omitía los datos reales, usaba el consentimiento como base para gestionar reservas y afirmaba que **no había terceros** (sí hay: Vercel, Upstash, GitHub, Cloudinary, WhatsApp, Google, Meta). | Alta | Corregido |
| 6 | El panel subía a Meta los **teléfonos (hash) de todos los contactos** para públicos personalizados y enviaba eventos `Purchase` con el teléfono, **sin consentimiento**. | Alta | Corregido según tu decisión: solo con consentimiento expreso |
| 7 | El aviso legal no tenía titular, NIF ni datos exigidos por el art. 10 LSSI. | Alta | Corregido (nombre completo y NIF incorporados) |
| 8 | Google Fonts y banderas de `flagcdn.com` enviaban la IP de cada visitante a terceros. | Baja | Corregido (alojado localmente) |
| 9 | No había condiciones de contratación pese a contratarse servicios a distancia con consumidores. | Media | Borrador preparado; **faltan condiciones reales** |

---

## 2. Auditoría técnica previa (resultados)

### 2.1 Estructura
Web estática HTML/CSS/JS sin framework (`index.html`, ~3.400 líneas), servida por **GitHub Pages** (`lacasitadesimba.es`) y **Vercel** (`casitadesimba.vercel.app`). Backend en funciones de Vercel (`api/*.js`) con **Upstash Redis**. Fotos en **Cloudinary**. Panel privado `admin.html` con sesión `HttpOnly`.

### 2.2 Prueba real sobre la web publicada (navegador limpio, sin interactuar)
- Cookie instalada sin consentimiento: `_fbp` · `.lacasitadesimba.es` · 90 días.
- `localStorage` escrito por el script de Meta: `lastExternalReferrer`, `lastExternalReferrerTime`.
- Peticiones a terceros antes de cualquier decisión: `connect.facebook.net`, `www.facebook.com/tr`, `casitadesimba.vercel.app/api/track` (CAPI), `maps.google.com`, `www.google.com/maps`, `maps.googleapis.com`, `maps.gstatic.com`, `fonts.googleapis.com`, `fonts.gstatic.com`, `flagcdn.com`, `res.cloudinary.com`.
- Google Maps no instaló cookies en el navegador limpio de la prueba (puede hacerlo con sesión de Google iniciada).

### 2.3 Integraciones identificadas
| Servicio | Uso | ¿Requiere consentimiento? |
|---|---|---|
| Meta Pixel + API de Conversiones | Medición de anuncios (`PageView`, `Contact`, `Lead`) | Sí |
| Meta públicos personalizados / `Purchase` (desde el panel) | Teléfonos con hash SHA-256 | Sí (consentimiento expreso) |
| Google Maps (iframe) | Mapa de ubicación | Sí (contenido de terceros con cookies/IP) |
| Google Fonts, flagcdn | Tipografías, banderas | Eliminados (ahora locales) |
| Cloudinary | Fotos | No instala cookies; proveedor declarado |
| Vercel + Upstash | APIs y base de datos de solicitudes | Proveedores declarados |
| WhatsApp | Envío de la solicitud (`wa.me`) | Enlace; responsable independiente |
| Instagram, Facebook, TikTok | Solo enlaces, sin incrustaciones | No |
| Reseñas | Sistema propio (`/api/reviews`); **no** conecta con Google | No |

### 2.4 Formulario de reservas (antes)
Recogía nombre, teléfono, nombre del perro, servicio, fechas, hora, duración, invitados, vacunas/desparasitaciones y observaciones. Los datos se **guardaban en Upstash** (`client_list`, como «consulta») vía `api/public-lead.js` y se abría WhatsApp con un mensaje que repetía el teléfono. No había información de privacidad ni casilla. Se enviaba «duración: 1 hora» aunque el campo estuviera oculto.

---

## 3. Cambios implementados

### 3.1 Sistema real de consentimiento de cookies
- **Archivos nuevos:** `js/cookie-consent.js`, `css/cookie-consent.css`.
- Primera capa con **Aceptar todas / Rechazar todas / Configurar cookies**, con el mismo estilo para aceptar y rechazar (criterio AEPD 2023) y contraste AA.
- Categorías reales: **Técnicas** (siempre activas), **Funcionales (mapa)** y **Publicidad**. No se muestra «Analítica» porque no existe.
- Ninguna categoría opcional activada por defecto; seguir navegando no acepta nada.
- Decisión guardada en `localStorage` (`casita-consent`), recordada 12 meses y con versión para volver a preguntar si cambian los proveedores.
- Reapertura desde «Configurar cookies» en el pie de **todas** las páginas y desde la política de cookies.
- **Retirada:** al quitar Publicidad se borran `_fbp`, `_fbc` y los datos de Meta en `localStorage`, se envía `fbq('consent','revoke')` y se recarga la página sin el píxel. Al quitar el mapa, el iframe se descarga y vuelve el marcador.
- Panel accesible: `role="dialog"`, foco atrapado, cierre con Escape, interruptores con `role="switch"`, respeta «reducir movimiento». Textos en español e inglés según el idioma elegido.

### 3.2 Bloqueo de terceros
- **Meta Pixel** eliminado del `<head>` (y su `<noscript>`): solo se descarga dentro de `CasitaConsent.whenGranted('marketing')`. `Contact`, `Lead` y la CAPI comprueban el consentimiento antes de enviar nada.
- **Google Maps**: iframe con `data-consent-src`, sustituido por un marcador visual con la dirección, botón «Mostrar mapa» (que autoriza solo esa categoría) y enlace «Abrir en Google Maps».
- **Fuentes** alojadas en `fonts/` (Nunito, Pacifico, Dancing Script, licencia OFL, ~95 KB). **Banderas** locales (`images/flag-es.svg`, `images/flag-gb.svg`).

### 3.3 Páginas legales (nuevas, con la identidad visual de la web)
- `aviso-legal.html` — art. 10 LSSI, uso, propiedad intelectual, responsabilidad y enlaces (art. 17 LSSI), jurisdicción respetando el fuero del consumidor.
- `politica-privacidad.html` — responsable, datos reales, tabla de finalidades y bases jurídicas (reserva = art. 6.1.b, no consentimiento), WhatsApp, proveedores, transferencias (DPF/CCT), conservación, derechos, AEPD, seguridad.
- `politica-cookies.html` — inventario real (nombre, proveedor, finalidad, tipo, duración, propia/terceros) y cómo retirar el consentimiento.
- `condiciones-contratacion.html` — **borrador** (marcado `noindex`) con proceso de reserva, precios, pago, cancelación, desistimiento con modelo de formulario, prestación, responsabilidades y reclamaciones.
- Estilos compartidos en `css/legal.css`. Se eliminaron las ventanas modales antiguas con información incorrecta. Las tres primeras páginas se añadieron a `sitemap.xml`.

### 3.4 Formulario de reservas
- Información básica de protección de datos junto al botón (art. 11 LOPDGDD) con enlace a la política.
- Casilla **obligatoria y sin marcar**: «He leído la información sobre protección de datos» (acredita la información, no es la base jurídica).
- Casilla **opcional y sin marcar** para compartir el teléfono cifrado con Meta.
- Sin casilla de comunicaciones comerciales (no se envían, según tu respuesta).
- Validación en el navegador **y** en el servidor (`api/public-lead.js` rechaza con 400 si falta la confirmación).
- Minimización: el mensaje de WhatsApp ya no repite el teléfono (WhatsApp ya lo muestra) y a la API solo llegan los campos visibles para el servicio elegido.
- Se registra en cada contacto `consentimientos` (fecha de información, versión del texto, consentimiento Meta y, si procede, fecha de retirada).

### 3.5 Meta desde el panel (según tu decisión «casilla opcional + filtrar»)
- `lib/meta-consent.mjs` (nuevo): `hasMetaConsent()` y `mergeConsent()`.
- `api/sync-audience.js`: solo sincroniza contactos con consentimiento Meta.
- `lib/meta-purchase.mjs` y `api/clients.js`: el evento `Purchase` solo se envía con consentimiento.
- **Efecto:** los contactos existentes y los creados a mano en el panel **ya no se envían a Meta**. El público de exclusión se irá llenando solo con quien marque la casilla.

---

## 4. Pruebas realizadas (local, `http://127.0.0.1:8765`, Playwright/Chromium)

| Prueba | Resultado |
|---|---|
| Primera visita: aparece el banner con las 3 opciones | ✅ |
| Antes de decidir: 0 cookies, 0 `localStorage`; solo conexiones a la propia API (Vercel) y Cloudinary; ninguna a Meta, Google ni fuentes externas (incluido tras recorrer toda la página) | ✅ |
| Configurar: opcionales desmarcadas por defecto; activar solo mapa → carga el mapa, no carga Meta | ✅ |
| Recargar: preferencias conservadas, sin banner | ✅ |
| Reabrir desde el pie: el panel refleja lo guardado | ✅ |
| Aceptar todas: se carga `fbevents.js`, se instala `_fbp`, se envía CAPI (interceptada) y se carga el mapa | ✅ |
| Retirar Publicidad: recarga, `fbq` no existe, `_fbp` y datos de Meta en `localStorage` borrados | ✅ |
| Rechazar todas: mapa descargado, sin Meta | ✅ |
| Formulario: casillas sin marcar; sin la de privacidad no se envía nada; con ella se envía la solicitud (interceptada, **no se escribió en producción**) y se abre WhatsApp con el mensaje correcto | ✅ |
| Tras rechazar cookies, enviar el formulario no genera ningún evento de Meta | ✅ |
| Enlaces legales del pie (4 páginas), anclas internas, botón «Configurar cookies» en cada página | ✅ |
| Móvil 375×812 y escritorio 1366×860: sin desbordamiento horizontal; banner, panel, formulario y páginas legales correctos | ✅ |
| Traducción al inglés de los textos nuevos y banderas locales | ✅ |
| Errores de JavaScript / consola | 0 |
| Pruebas automáticas `node --test tests/*.test.mjs` | **18/18** (6 nuevas: consentimiento Meta, API de solicitudes y comprobaciones estáticas de bloqueo) |
| Sintaxis de APIs y scripts en línea, IDs duplicados | Correcto |

**No probado:** la API real de producción (deliberadamente, para no crear solicitudes falsas ni eventos en Meta) ni el panel `admin.html` con sesión. Tras desplegar conviene hacer una reserva de prueba real y borrarla del panel.

**Rendimiento:** la página ya no espera a Google Fonts ni a `fbevents.js`; sin consentimiento ya no hay ninguna conexión a Meta, Google Maps, Google Fonts ni flagcdn.

---

## 5. Datos que debe facilitar el titular

Marcados en amarillo como `[Pendiente: …]` en las páginas (buscar `class="pendiente"`):

1. ~~**Nombre y apellidos o razón social** del titular.~~ Incorporado.
2. ~~**NIF / CIF.**~~ Incorporado.
3. Si es sociedad: **datos del Registro Mercantil** (si es autónomo, se elimina la fila).
4. **Inscripción como núcleo zoológico** en la Comunidad de Madrid u otra autorización exigible (si procede).
5. Si usa **WhatsApp Business** y si las conversaciones se copian en **Google Drive o iCloud**.
6. **Gestoría o asesoría** que acceda a datos de clientes, si existe.
7. **Plazo de conservación** de solicitudes que no terminan en reserva (se propone 1 año).
8. Condiciones de contratación reales:
   - Si los precios incluyen **IVA** (obligatorio indicarlo).
   - **Suplementos** (segundo perro, horas extra, recogida, festivos…).
   - Validez y uso de **bonos**.
   - **Momento del pago**, señal o depósito.
   - Política de **cancelación y cambios** de fecha.
   - Periodo de **adaptación** o visita previa.
   - **Requisitos de admisión** (vacunas exigidas, documentación, microchip, edad, celo, comportamiento).
   - **Protocolo veterinario** de urgencia y quién asume los gastos.
   - Autorización para **publicar fotos** de los perros en web y redes.
   - **Seguro de responsabilidad civil** (aseguradora y coberturas).
   - Si dispone de **hojas de reclamaciones** y cartel, y si está adherida al **arbitraje de consumo**.

---

## 6. Estado por aspecto

### Implementado
- Consentimiento de cookies real y bloqueo previo de Meta y Google Maps.
- Inventario de cookies basado en la prueba técnica.
- Política de privacidad y aviso legal adaptados al funcionamiento real (a falta de los datos del titular).
- Formulario con información, casilla de privacidad, consentimiento Meta separado y validación cliente/servidor.
- Envíos de teléfonos a Meta limitados a contactos con consentimiento.
- Eliminación de conexiones innecesarias a Google Fonts y flagcdn.

### Pendiente (antes de publicar)
- Completar los datos de la sección 5 y retirar todas las marcas `[Pendiente]`.
- Completar o retirar del pie el enlace a **Condiciones de contratación** hasta que esté terminado.
- ~~Publicar en GitHub Pages y Vercel~~ — hecho el 24/11/2026 (Vercel se despliega solo desde GitHub). Queda hacer una reserva de prueba real en producción.
- Las **estadísticas del panel** (visitas, contactos, leads) se alimentan de `api/track`; desde ahora solo contarán visitantes que acepten Publicidad, por lo que las cifras bajarán.
- La sincronización con Meta solo incluirá contactos que marquen la casilla; si Helena obtiene el consentimiento por WhatsApp, haría falta una opción en el panel para registrarlo (no implementada).
- No existe **borrado automático** de solicitudes antiguas: hay que aplicar a mano el plazo de conservación o añadir esa función al panel.
- **Reseñas:** la web muestra «Reseñas de Google» y una nota fija de 5.0, pero las reseñas se introducen manualmente en el panel. La normativa de consumidores exige informar de si se verifica que proceden de clientes reales y cómo. Hay que confirmar su origen y ajustar el texto (no se ha cambiado para no afirmar nada sin saberlo).
- Valorar avisar en el anuncio y en la web de las promociones con cuenta atrás (fecha real de fin) y de las afirmaciones del anuncio de Meta (seguro de RC, veterinario de guardia 24 h, 6 plazas) si no son exactas.

### Requiere revisión de un profesional jurídico
- **Condiciones de contratación** completas, en especial el **derecho de desistimiento** en servicios contratados por WhatsApp y su aplicación a estancias en fecha concreta (arts. 102–108 TRLGDCU).
- Base jurídica y redacción del **consentimiento para Meta** (públicos personalizados y CAPI), y la **corresponsabilidad** con Meta para el Pixel (STJUE *Fashion ID*).
- Contratos de encargado (**DPA**) y garantías de transferencia de Vercel, Upstash, GitHub y Cloudinary (región real de la base de datos Upstash).
- Plazos de conservación definitivos.
- Obligaciones sectoriales de la actividad (núcleo zoológico, Ley 4/2016 de la Comunidad de Madrid y Ley 7/2023) y su reflejo en el aviso legal.
- Registro de actividades de tratamiento y análisis de riesgos (no forman parte de la web, pero el RGPD los exige al responsable).

---

## 7. Archivos modificados y nuevos

**Modificados:** `index.html`, `api/public-lead.js`, `api/sync-audience.js`, `api/clients.js`, `lib/meta-purchase.mjs`, `tests/meta-purchase.test.mjs`, `sitemap.xml`, `CONTEXTO.md`.

**Nuevos:** `aviso-legal.html`, `politica-privacidad.html`, `politica-cookies.html`, `condiciones-contratacion.html`, `js/cookie-consent.js`, `css/cookie-consent.css`, `css/legal.css`, `fonts/` (3 woff2 + `fonts.css`), `images/flag-es.svg`, `images/flag-gb.svg`, `lib/meta-consent.mjs`, `tests/public-lead-consent.test.mjs`, `tests/cookie-consent-static.test.mjs`, este informe.

Este informe está excluido de la publicación en GitHub Pages y Vercel (`_config.yml` y `.vercelignore`).

---

## 8. Fuentes consultadas
- AEPD, *Guía sobre el uso de las cookies* (actualización de julio de 2023, exigible desde el 11 de enero de 2024): [nota de prensa](https://www.aepd.es/prensa-y-comunicacion/notas-de-prensa/aepd-actualiza-guia-cookies-para-adaptarla-a-nuevas-directrices-cepd).
- Reglamento (UE) 2024/3228, que suprime la plataforma europea de resolución de litigios en línea desde el 20 de julio de 2025 (por eso **no** se incluye el enlace ODR): [EUR-Lex](https://eur-lex.europa.eu/eli/reg/2024/3228/oj/eng), [Centro Europeo del Consumidor](https://portal-cec.consumo.gob.es/es/comunicacion/noticias/2025/la-plataforma-europea-para-la-resolucion-de-litigios-en-linea-dejara-de).
- Meta, parámetros `fbp`/`fbc`: [documentación para desarrolladores](https://developers.facebook.com/docs/marketing-api/conversions-api/parameters/fbp-and-fbc).
- Google, uso de cookies (`NID`, 6 meses desde el último uso): [policies.google.com](https://policies.google.com/technologies/cookies).
- Normas citadas: RGPD (UE 2016/679), LOPDGDD (LO 3/2018), LSSI-CE (Ley 34/2002), TRLGDCU (RDL 1/2007).
