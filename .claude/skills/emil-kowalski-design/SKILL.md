---
name: emil-kowalski-design
description: Aplica una sensibilidad de "design engineering" al estilo de Emil Kowalski (creador de sonner y vaul, emilkowal.ski) — animación con propósito, microinteracciones cuidadas, minimalismo con mucho detalle. Úsala al construir o pulir cualquier interfaz de este proyecto (home, admin, artículo, comentarios).
---

# Diseño al estilo Emil Kowalski — animación con propósito, minimalismo con oficio

Esta skill sintetiza, para uso práctico en este proyecto, los principios de diseño que Emil
Kowalski defiende públicamente en su trabajo (sonner, vaul, sus artículos en emilkowal.ski
sobre animación y "design engineering"). No son citas literales suyas — es una guía de
aplicación derivada de su enfoque público, adaptada a este stack (Next.js 16 + Tailwind v4,
sin librería de animación instalada todavía).

## La idea central: "design engineering"

Kowalski es conocido por defender que el diseño de interfaz no termina en Figma — termina en
el código que corre en el navegador. La persona que implementa toma decisiones de diseño reales
(timing de una animación, qué pasa 1 frame después de un clic, cómo se comporta un borde al
hacer scroll) que ningún archivo de diseño estático puede especificar del todo. Aplicado aquí:
al construir un componente, las decisiones de interacción y movimiento son tan parte del
trabajo como el layout o el color.

## 1. La animación comunica, no decora

Antes de animar algo, pregúntate qué le está diciendo al usuario. Una animación válida hace
una de estas cosas:
- **Explica una relación espacial** (de dónde viene o a dónde va algo: un modal que crece desde
  el botón que lo abrió, no que aparece de la nada).
- **Da continuidad** entre dos estados (un contador que cambia con un "tick" en vez de saltar).
- **Confirma una acción** (un botón que se comprime ligeramente al pulsar, antes de que
  responda el servidor).
- **Reduce la sensación de espera** (un skeleton que ya tiene la forma del contenido real, no
  un spinner genérico).

Si una animación no hace ninguna de estas cosas, probablemente sobra.

## 2. Timing y curvas — nunca `ease` ni `linear` por defecto

- **Duración:** 120-180ms para microinteracciones (hover, focus, botones); 200-300ms para
  transiciones de layout (abrir/cerrar un panel, un modal); más de 400ms casi nunca, salvo una
  animación de entrada de página muy deliberada. Si algo tarda más de 300ms y el usuario está
  esperando para poder actuar, ya se siente lento.
- **Curva:** evita el `ease` por defecto de CSS (se siente genérico) y `linear` (se siente
  mecánico, robótico — solo vale para animaciones continuas tipo spinner). Para casi todo lo
  demás, una curva con salida rápida y llegada suave se siente más natural:
  ```css
  :root {
    --ease-out-quart: cubic-bezier(0.25, 1, 0.5, 1);
    --ease-in-out-quart: cubic-bezier(0.76, 0, 0.24, 1);
  }
  ```
- Un elemento que **entra** (aparece, se expande) debería acelerar rápido y llegar suave
  (`ease-out`). Un elemento que **sale** (desaparece, colapsa) debería ser más rápido todavía —
  el usuario ya perdió el interés en algo que se va, no lo hagas esperar a que termine de irse.
- Si en algún momento se añade una librería de animación (framer-motion/motion, o similar),
  usar física de resorte (`spring`, con `stiffness`/`damping`) para elementos que el usuario
  arrastra o suelta (ej. un futuro drawer o bottom sheet) — los muelles se sienten más
  orgánicos que una curva de tiempo fija para ese tipo de gesto.

## 3. Toda superficie interactiva necesita sus 4 estados

Ningún elemento clicable/enfocable está terminado con solo su estado por defecto. Revisar
siempre:
1. **hover** — cambio sutil (no solo color; también puede ser una sombra, un desplazamiento de
   1-2px, un cambio de opacidad).
2. **active/pressed** — debe sentirse "físico". Un `transform: scale(0.97)` o un desplazamiento
   hacia abajo de 1px en el momento de pulsar hace que un botón se sienta real, no plano.
3. **focus-visible** — nunca `outline: none` sin sustituirlo por algo igual de visible (un
   anillo de foco con buen contraste). Esto no es opcional, es accesibilidad real.
4. **disabled** — nunca solo "más apagado"; el cursor debe ser `not-allowed` y no debe reaccionar
   a hover/active.

## 4. Estados de carga y vacío son parte del diseño, no un extra

- **Loading:** preferir skeletons con la silueta real del contenido (mismo alto, mismo ancho de
  columna) sobre un spinner centrado — el spinner hace que el usuario no sepa qué esperar, el
  skeleton ya le enseña la forma de lo que va a llegar.
- **Optimistic UI:** cuando la acción es casi siempre exitosa (dar like, enviar un comentario,
  suscribirse a la newsletter), actualizar la interfaz al instante y revertir solo si el
  servidor falla — no hacer esperar al usuario una respuesta de red para algo que se ve como
  "ya está hecho".
- **Vacío nunca es "nada":** una lista sin resultados (ej. una búsqueda de artículos sin
  coincidencias, un filtro de categoría vacío) es una oportunidad de decir algo útil ("No hay
  artículos con esa etiqueta todavía — prueba con..."), no solo un hueco en blanco.

## 5. Minimalismo con mucho detalle, no minimalismo vago

La estética asociada a este enfoque (y a la que este proyecto ya se acerca: tipografía
editorial, mucho aire, acentos de color contenidos) exige más cuidado en los detalles
pequeños, no menos:
- **Radios de borde consistentes** en toda la interfaz (definir 2-3 tamaños como variables, no
  valores sueltos por componente).
- **Sombras con propósito** — una sombra debería sugerir una altura concreta (un dropdown flota
  más que una tarjeta), no ser "un poco de sombra porque sí". Preferir sombras compuestas
  (varias capas, opacidad baja) sobre una sola sombra dura.
- **El espaciado sigue una escala**, no valores arbitrarios (4/8/12/16/24/32/48/64 — nunca "17px
  porque quedaba bien").
- **Contraste de texto real**, no solo "se lee". Comprobar contraste en modo claro Y oscuro por
  separado — un gris que funciona en un fondo casi blanco puede fallar en un fondo oscuro.

## 6. Accesibilidad al movimiento — no negociable

Todo lo anterior debe respetar `prefers-reduced-motion`:
```css
@media (prefers-reduced-motion: reduce) {
  * {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}
```
Esto no es un añadido opcional al final — se define una vez, a nivel global, y todo lo que se
construya después ya queda cubierto automáticamente.

## 7. Autocrítica antes de dar un componente por terminado

Antes de considerar terminada una interfaz nueva o un rediseño, repasar:
- [ ] ¿Cada elemento clicable tiene hover, active, focus-visible y disabled?
- [ ] ¿Alguna animación dura más de 300ms sin una razón deliberada?
- [ ] ¿Hay algún `ease` o `linear` por defecto que debería ser una curva propia?
- [ ] ¿El estado de carga tiene la forma del contenido real, o es un spinner genérico?
- [ ] ¿El estado vacío dice algo útil, o es un hueco en blanco?
- [ ] ¿Funciona igual de bien con `prefers-reduced-motion` activado?
- [ ] ¿Se ve igual de cuidado en modo oscuro que en modo claro?
- [ ] ¿Hay algún `outline: none` sin un reemplazo real de foco?

Si la respuesta a alguna de estas es "no lo he mirado", esa es la siguiente tarea antes de dar
el componente por cerrado — no después.
