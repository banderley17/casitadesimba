---
name: impeccable-design
description: Criterio propio de diseño visual de alta calidad — tipografía, color, jerarquía, composición, consistencia y accesibilidad. Complementaria a emil-kowalski-design (esa cubre animación/microinteracciones; esta cubre la estructura visual y el contenido). Úsala al diseñar o revisar cualquier interfaz, en cualquier proyecto.
---

# Diseño impecable — estructura visual, jerarquía y oficio

Guía propia (no atada a un autor concreto) para que cualquier interfaz que se construya en
cualquier proyecto tenga un nivel de acabado alto de forma consistente. Se complementa con
`emil-kowalski-design` (esa se centra en movimiento e interacción; esta se centra en
tipografía, color, layout, jerarquía, contenido y accesibilidad estructural).

## 1. Jerarquía — que el ojo sepa siempre a dónde ir primero

Cada pantalla necesita **un** punto focal claro. Si todo grita a la vez, nada se oye.
- La jerarquía se construye con **tamaño, peso y contraste**, no solo con color. Un texto en
  negrita grande sigue funcionando en escala de grises; un texto que solo se distingue por ser
  "un poco más azul" no.
- Máximo 3 niveles de énfasis visibles a la vez (primario, secundario, terciario). Si hace
  falta un cuarto nivel, casi siempre es que sobra contenido en esa pantalla, no que falte un
  estilo nuevo.
- **Una sola acción primaria por vista.** Si hay dos botones "importantes" compitiendo, ninguno
  gana — el usuario no sabe cuál es el que de verdad quieres que pulse.

## 2. Tipografía — hace más de la mitad del trabajo

- **Escala tipográfica definida**, nunca tamaños sueltos. Una progresión modular razonable
  (ej. 12/14/16/20/24/32/48/64px) cubre el 95% de los casos; añadir un tamaño nuevo porque "no
  cabía" casi siempre es síntoma de que el layout necesita ajustarse, no la tipografía.
- **Line-height inversamente proporcional al tamaño**: texto de cuerpo pequeño necesita más
  interlineado relativo (1.5-1.7) que un titular grande (1.05-1.2) — un titular muy grande con
  interlineado de párrafo se ve con huecos raros entre líneas.
- **Ancho de línea de lectura**: 45-75 caracteres por línea para texto de cuerpo largo (un
  artículo, una descripción). Más ancho que eso cansa la vista; hay que limitar el `max-width`
  del bloque de texto, no dejar que ocupe todo el contenedor.
- **Máximo 2 familias tipográficas** por proyecto (una para titulares/voz editorial, otra para
  UI/cuerpo) — cualquier tercera familia necesita una razón muy concreta, casi nunca la tiene.
- El **peso** (weight) comunica jerarquía mejor que el tamaño en textos cercanos en tamaño —
  preferir subir de 400 a 600 antes que subir 2px de tamaño para diferenciar dos textos
  parecidos.

## 3. Color — con intención, no decoración

- **Un color de acento, no cinco.** El acento se reserva para lo que de verdad importa (la
  acción principal, un estado activo) — si el acento aparece en 15 sitios de la misma pantalla,
  deja de significar nada.
- **Significado consistente**: si el rojo significa "error/peligro" en un sitio del proyecto,
  no puede significar "destacado" en otro. Los colores semánticos (éxito, aviso, error, info)
  se definen una vez como tokens y se reutilizan siempre igual.
- **Contraste real, no solo "se lee bien en mi pantalla"**: texto normal ≥ 4.5:1 sobre su
  fondo, texto grande (≥24px o ≥19px en negrita) ≥ 3:1 (mínimos WCAG AA). Comprobarlo en modo
  claro Y oscuro por separado — un gris medio que funciona en fondo blanco casi siempre falla
  en fondo oscuro y viceversa.
- El color nunca es el ÚNICO portador de información (un estado "activo" marcado solo con un
  cambio de color, sin ningún otro indicador, falla para quien no distingue bien ese color).

## 4. Espaciado y composición — los 4 principios de siempre (CRAP)

- **Contraste**: si dos elementos son distintos, que se vean claramente distintos (no "casi
  iguales pero no del todo") — la similitud a medias se lee como error, no como intención.
- **Repetición**: un mismo patrón visual (una tarjeta, un botón, un icono) se repite igual en
  todo el proyecto. La primera vez que se resuelve un problema de UI, esa solución se convierte
  en el patrón — no se reinventa cada vez.
- **Alineación**: todo se alinea con algo. Si un elemento no comparte un borde o un eje con
  ningún otro elemento de la pantalla, probablemente está mal colocado, aunque "se vea bien a
  ojo".
- **Proximidad**: lo que está relacionado se agrupa junto (menos espacio entre sí que respecto
  a lo no relacionado). El espaciado en sí ya comunica qué pertenece a qué, sin necesitar una
  línea divisoria.
- **La escala de espaciado es una sola** en todo el proyecto (ej. 4/8/12/16/24/32/48/64/96) —
  nunca un padding de "13px" porque quedaba bien ahí; si no cuadra con la escala, es la escala
  la que falta un paso, no una excepción puntual.

## 5. Contenido y copy — son material de diseño, no relleno

- Cada palabra en la interfaz tiene que ganarse su sitio. Un botón dice **qué pasa** al
  pulsarlo ("Guardar cambios", no "Enviar" genérico); un título de sección dice lo que hay
  dentro, no una frase bonita vacía.
- **Nombrar las cosas como las nombra quien las usa**, no como las nombra el código por dentro
  — un campo de la base de datos llamado `is_visible` se convierte en "Visible en la web" en la
  interfaz, nunca al revés.
- Los **estados de error explican qué pasó y qué hacer**, nunca solo "Ha ocurrido un error".
- Los **estados vacíos son una oportunidad**, no un hueco — dicen qué se puede hacer para
  dejar de estar vacíos.

## 6. Consistencia — el proyecto entero se ve hecho por una sola mano

- **Design tokens sobre valores sueltos**: radios de borde, sombras, duraciones de transición,
  colores — se definen una vez (variables CSS, config de Tailwind) y se referencian siempre,
  nunca se escriben valores mágicos repetidos por los componentes.
- Componentes que hacen lo mismo se **ven** igual en todo el proyecto (un botón "Guardar" no
  puede tener 3 estilos distintos según en qué pantalla esté).
- Los iconos comparten **el mismo grosor de trazo y el mismo tamaño de caja** entre sí —
  mezclar un set de iconos "outline" fino con otro "filled" grueso en la misma pantalla se nota
  aunque no se sepa nombrar por qué.

## 7. Responsive — no es "que quepa", es que siga teniendo sentido

- El diseño se piensa por **contenido**, no por dispositivo — los breakpoints van donde el
  contenido empieza a verse mal (una línea de texto se corta raro, una tarjeta queda
  desproporcionada), no en 768px/1024px porque son los números de siempre.
- En móvil, la jerarquía puede reordenarse (lo más importante sube), pero **nunca desaparece
  información sin avisar** — si algo se oculta para ahorrar espacio, tiene que quedar claro que
  existe y cómo acceder a ello (un menú, un "ver más"), no simplemente no estar.
- Objetivos táctiles de al menos 44×44px en móvil — un enlace o botón más pequeño que eso es
  frustrante de pulsar aunque visualmente parezca suficiente.

## 8. Autocrítica antes de dar un diseño por terminado

- [ ] ¿Hay un único punto focal claro en esta pantalla, o compiten varios elementos por
      atención?
- [ ] ¿La jerarquía se sostiene en escala de grises (sin depender solo del color)?
- [ ] ¿Todos los tamaños de texto y espaciados vienen de la escala del proyecto, o hay algún
      valor suelto?
- [ ] ¿El contraste de texto se comprobó en claro y en oscuro por separado?
- [ ] ¿Un mismo componente se ve exactamente igual en todos los sitios donde aparece?
- [ ] ¿El copy dice qué va a pasar, o es genérico ("Enviar", "Ha ocurrido un error")?
- [ ] ¿Se comprobó en el ancho de pantalla más estrecho real (no solo redimensionando la
      ventana del navegador de escritorio)?
- [ ] ¿Los objetivos táctiles en móvil tienen al menos 44×44px?

Si la respuesta a alguna es "no lo he mirado", esa es la siguiente tarea antes de cerrar el
diseño — no después.
