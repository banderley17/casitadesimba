---
name: taste
description: El juicio estético en sí — qué evitar, cuándo restar en vez de añadir, cuándo romper una regla a propósito, cómo notar lo genérico antes de construirlo. Tercera skill de diseño, distinta de emil-kowalski-design (movimiento) e impeccable-design (estructura visual): esta es la capa de criterio que decide CUÁNDO y CUÁNTO aplicar las otras dos.
---

# Tener criterio (taste) — la capa que decide, no la que ejecuta

`emil-kowalski-design` da reglas de movimiento. `impeccable-design` da reglas de estructura
visual. Ninguna de las dos dice **cuándo** una pantalla necesita menos, no más — o cuándo la
opción "correcta" según el manual es, en este caso concreto, la opción equivocada. Esta skill
es esa capa de criterio.

## 1. Reconocer lo genérico antes de construirlo

Antes de diseñar algo, preguntarse: *si me pidieran esto mismo en cualquier otro proyecto sin
contexto, ¿saldría igual?* Si la respuesta es sí, la propuesta todavía no está anclada a lo que
hace especial a ESTE proyecto/contenido/persona.

Patrones que hoy son el default de cualquier IA (y por tanto, ya no distinguen nada):
- Fondo crema (~#F4F1EA) + serif de alto contraste + acento terracota.
- Fondo casi negro + un único acento verde ácido o vermellón.
- Layout tipo periódico: líneas finas, radio de borde cero, columnas densas.

Ninguno de los tres es "malo" — lo malo es elegirlo porque es el primero que sale, no porque el
proyecto lo pida. Si el propio contenido/marca ya apunta claramente a uno de estos tres, seguirlo
es lo correcto (la voz del proyecto manda). Si el proyecto deja el estilo libre, gastar esa
libertad en el default es desperdiciarla.

## 2. Restar antes que añadir

Ante la duda de si un elemento (un badge, un icono decorativo, un fondo con textura, una
animación extra) mejora la pantalla, la pregunta correcta no es "¿queda mal si lo quito?" sino
**"¿la pantalla pierde algo real si lo quito?"** — si la respuesta es no, sobra, aunque se vea
bonito de forma aislada.

Regla práctica: antes de dar un diseño por cerrado, buscar UN elemento que se pueda quitar sin
perder información ni intención. Casi siempre existe. Quitarlo.

## 3. Gastar la osadía en un solo sitio

Un diseño con 5 decisiones arriesgadas a la vez no se lee como "atrevido", se lee como
"desordenado" — cada riesgo compite con los demás por atención y ninguno gana. Un diseño con
**una** decisión arriesgada real, y todo lo demás disciplinado alrededor de esa decisión, se
lee como intencional.

Antes de proponer algo: identificar cuál es EL elemento que se recordará de esta pantalla.
Todo lo demás existe para no competir con él, no para acompañarlo en el mismo nivel de
protagonismo.

## 4. Cuándo romper una regla de las otras dos skills a propósito

Las reglas de `impeccable-design` y `emil-kowalski-design` son un piso de calidad, no una
jaula. Hay momentos legítimos para saltárselas:
- Un titular editorial muy grande puede justificar una tercera familia tipográfica puntual, si
  es EL elemento de la regla anterior (punto 3) y se usa una sola vez, no como patrón repetido.
- Una animación de más de 300ms puede estar bien si es una secuencia de entrada de página
  deliberada, una sola vez, no una interacción que el usuario repite constantemente (una
  interacción repetida SÍ necesita ser rápida siempre, sin excepción — la excepción es solo
  para momentos que ocurren una vez).
- Un acento de color "extra" puede colarse si marca algo genuinamente distinto de todo lo demás
  (un estado de error real, un dato en directo) — nunca porque "esa sección necesitaba color".

La diferencia entre "roto" y "una excepción con criterio" es que la excepción se puede explicar
en una frase con una razón de contenido, no de estética ("este titular es la única vez que la
marca habla directamente al lector, por eso rompe la escala" vs. "quedaba bien más grande").

## 5. Copiar una referencia sin que se note que es una copia

Está bien partir de una referencia real (un sitio, una marca, un feed de Pinterest) — lo que no
está bien es que el resultado final se pueda señalar y decir "esto es X pero con otro logo". La
prueba: quitar el logo/nombre del proyecto de la pantalla — si sigue siendo identificable de
quién es por el contenido, el tono, la elección de foto o la estructura de la información (no
solo por el color de acento), la referencia ya se digirió bien. Si no, todavía es una copia.

## 6. Confianza en lo simple

Una decisión simple defendida con seguridad ("este botón es negro sólido, sin gradiente,
porque el resto de la marca no usa gradientes en ningún sitio") lee mejor que una decisión
compleja sin defender ("probé varios estilos de botón y este es el que más o menos convencía").
Si una elección de diseño no se puede defender en una frase con una razón real (no "porque
queda bien"), probablemente todavía no está resuelta — falta iterar, no falta justificarla mejor.

## 7. Autocrítica antes de presentar algo

- [ ] ¿Esto se parece al default más obvio para este tipo de proyecto? Si sí, ¿fue una elección
      o el primer instinto sin revisar?
- [ ] ¿Hay algún elemento que se pueda quitar sin perder información real?
- [ ] ¿Cuál es el UNO elemento que se recordaría de esta pantalla? Si hay más de uno
      compitiendo, hay que elegir.
- [ ] ¿Alguna regla de `impeccable-design`/`emil-kowalski-design` se rompió sin una razón de
      contenido que se pueda decir en una frase?
- [ ] ¿El resultado sigue siendo identificable como de este proyecto si se le quita el
      logo/nombre?
