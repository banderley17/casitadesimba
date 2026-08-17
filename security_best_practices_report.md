# Informe de seguridad — La Casita de Simba

Fecha de revisión: 17 de agosto de 2026.

## Resumen ejecutivo

Antes de esta revisión, el acceso administrativo no era seguro: la contraseña y un token maestro estaban incluidos en JavaScript entregado al navegador, y varias APIs privilegiadas aceptaban ese token por URL. También existían copias antiguas del panel y un panel oculto en la web pública. Esos mecanismos se retiraron y se sustituyeron por autenticación y autorización reales en servidor.

La aplicación queda sustancialmente endurecida, pero no existe la “seguridad total”. El riesgo residual más importante es operativo: por decisión del propietario se conserva la misma contraseña histórica. Aunque ahora solo se almacena su hash PBKDF2 en Vercel, esa contraseña debe considerarse conocida porque apareció en código e historial anteriores. Se recomienda rotarla.

## Hallazgos y estado

1. **Crítico — credenciales administrativas en el navegador: corregido estructuralmente; rotación pendiente.**
   - Se eliminaron la contraseña, el token maestro, su persistencia en `localStorage` y la autenticación mediante `?t=`.
   - El panel usa ahora `/api/admin-auth`, sesión opaca en Redis y CSRF ([admin.html](admin.html#L713), [admin-auth.js](api/admin-auth.js#L24)).
   - La cookie es `HttpOnly`, `Secure`, `SameSite=Strict`, con vencimiento de ocho horas ([security.js](lib/security.js#L237)).
   - La contraseña se valida con PBKDF2-SHA256 y al menos 150.000 iteraciones; producción usa 210.000 ([security.js](lib/security.js#L208)).
   - **Pendiente recomendado:** cambiar la contraseña histórica. Conservarla reduce el beneficio de haber retirado su copia pública.

2. **Crítico — panel oculto y copias administrativas publicables: corregido.**
   - Se retiró el panel oculto de `index.html` y `admin-fotos.html` se limita a redirigir al panel seguro.
   - Las cinco copias antiguas se sacaron del repositorio publicado y se conservaron fuera del proyecto en una copia local.
   - GitHub Pages excluye archivos internos y código de backend de su artefacto ([`_config.yml`](_config.yml#L1)); Vercel hace lo mismo mediante [`.vercelignore`](.vercelignore#L1).

3. **Alto — autorización débil, CORS permisivo y ausencia de CSRF: corregido.**
   - Clientes, reseñas, tarifas, horarios, galería, estadísticas, publicidad y sincronización de audiencias verifican la sesión en servidor ([clients.js](api/clients.js#L44), [reviews.js](api/reviews.js#L51), [pricing.js](api/pricing.js#L40)).
   - Las mutaciones exigen un token CSRF asociado a la sesión y origen coincidente ([security.js](lib/security.js#L196)).
   - CORS dejó de usar `*` y solo refleja orígenes permitidos ([security.js](lib/security.js#L89)).

4. **Alto — subidas y borrados de imágenes manipulables: corregido.**
   - Cloudinary ya no usa presets sin firma desde el panel. La firma se genera en servidor, exige sesión/CSRF y solo permite las tres carpetas de Casita ([cloudinary-sign.js](api/cloudinary-sign.js#L5), [cloudinary-sign.js](api/cloudinary-sign.js#L27)).
   - El borrado exige sesión/CSRF, limita el `public_id` al prefijo `casita/` y utiliza el secreto solo en servidor ([delete-foto.js](api/delete-foto.js#L36)).
   - **Acción operativa recomendada:** después de validar las subidas en producción, desactivar en Cloudinary los presets antiguos configurados como `unsigned` si todavía existen.

5. **Alto — entrada arbitraria y posible XSS almacenado: corregido en las rutas administrativas.**
   - Se aplicaron límites de cuerpo, tipos, longitudes, estados permitidos, fechas, IDs y URLs de imágenes ([security.js](lib/security.js#L130), [security.js](lib/security.js#L157)).
   - Las actualizaciones ya no mezclan el cuerpo completo del cliente sobre datos persistidos.
   - El render administrativo escapa también comillas simples y dobles ([admin.html](admin.html#L998)).

6. **Medio — fuerza bruta y sesiones indefinidas: corregido.**
   - Ocho intentos fallidos por IP bloquean el acceso durante quince minutos.
   - Las sesiones aleatorias se almacenan como hash, caducan en ocho horas y se invalidan al cerrar sesión ([security.js](lib/security.js#L237)).

7. **Medio — abuso del endpoint público de analítica: corregido.**
   - `/api/track` limita eventos, origen, campos y tamaño; aplica 90 solicitudes/minuto por IP y envía el token de Meta en cabecera en vez de URL ([track.js](api/track.js#L6), [track.js](api/track.js#L18), [track.js](api/track.js#L21)).

8. **Medio — protección del navegador insuficiente: mejorado, con una limitación.**
   - Se añadieron `nosniff`, anti-framing, política de referente, permisos restringidos, no-cache para admin/API y una CSP base ([vercel.json](vercel.json#L7)).
   - **Pendiente:** la CSP aún no restringe `script-src`, porque la web mantiene mucho JavaScript inline y hacerlo ahora rompería funciones. La siguiente fase recomendable es mover esos scripts a archivos estáticos y aplicar CSP con `nonce` o hashes.

9. **Medio — exposición del código fuente e historial Git: riesgo residual controlado.**
   - El código del navegador siempre será visible; esto es normal y la seguridad ya no depende de ocultarlo.
   - Si el repositorio de GitHub sigue siendo público, el código servidor también puede leerse allí. No contiene secretos activos, pero el historial antiguo conserva referencias a credenciales ya retiradas. Rotar la contraseña histórica y, posteriormente, sanear el historial ofrecería defensa adicional.

## Comprobaciones realizadas

- Sintaxis de todos los archivos JavaScript de `api/` y `lib/`.
- Sintaxis de todos los scripts inline de `admin.html` e `index.html`.
- Búsqueda de contraseñas, tokens maestros, `?t=`, presets de subida sin firma y secretos asignados en el código actual: sin coincidencias.
- Validación de `vercel.json`.
- Revisión de que las rutas administrativas invocan `requireAdmin()` y las mutaciones usan CSRF.

