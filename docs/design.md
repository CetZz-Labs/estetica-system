# Shear — Sistema de Diseño e Interfaz (Guía de Implementación UI)

> **Estándar de calidad para revisión de componentes.** Este documento rige de manera
> inmutable el aspecto visual, la accesibilidad y el comportamiento de la interfaz de **Shear**,
> la app de gestión para estéticas (multitenant). Cualquier componente nuevo debe evaluarse
> contra estas especificaciones: si un patrón o token visual no está aquí, se considera inválido
> y debe proponerse como adición a este documento antes de implementarse.
>
> **Reemplaza por completo** cualquier guía de diseño previa (paleta rose/durazno con
> `Fraunces` + `Manrope`, tokens shadcn/Tailwind v4, modo oscuro, animaciones de *lift* en
> botones). Ese sistema queda obsoleto. La referencia canónica de tokens es `desing-system.md`;
> este archivo la desarrolla en patrones de componente, accesibilidad, responsive y reglas de
> implementación.

---

## 1. Filosofía de interfaz

Shear adopta un **minimalismo limpio, cálido y femenino**, pensado para el uso diario de una
recepcionista o dueña de estética: alta legibilidad de datos de clientas, lectura rápida del
estado de turnos y stock, y una sola superficie de color fuerte por vista para no saturar.

1. **Limpio y respirado** — mucho espacio en blanco, tarjetas claras sobre fondo cálido
   (`bg` `#FAF6F4`), un solo nivel de sombra sutil. Nada de gradientes ni bordes de acento gruesos.
2. **Jerarquía por tipografía, no por color** — los títulos usan la serif `Cormorant Garamond`;
   el color fuerte (vino/rosa) se reserva para acentos, estados y datos clave. La interfaz
   evita depender de iconografía decorativa: los puntos de color, los avatares con iniciales y
   el peso tipográfico hacen el trabajo que en otros sistemas haría un ícono.
3. **Máximo 1–2 fondos por vista** — casi todo vive sobre `bg` y `surface` (blanco). El vino
   profundo `#6B3444` aparece **una sola vez por vista**, en un bloque destacado (ver §7.6).
4. **Color con significado** — cada categoría de servicio y cada estado de turno/stock tiene un
   color fijo (§4 y §8). No se introduce color decorativo sin propósito semántico.
5. **Personalizable por tenant** — `accent` y el nombre de marca son variables por estética;
   todo lo demás permanece constante para garantizar consistencia entre tenants.

### Patrón de grilla modular (dashboard)

El panel de Inicio organiza la información en celdas independientes: 4 tarjetas KPI en fila,
dos columnas de contenido (lista de turnos del día + panel lateral de stock y bloque destacado
de ingresos). Cada celda tiene un propósito informativo único y fondo blanco sólido con borde
sutil — nunca sombra pronunciada.

---

## 2. Paleta de color

Fuente canónica: `desing-system.md §2`. Se referencia aquí junto a su aplicación concreta en
las vistas existentes (Inicio, Agenda, Clientes, Servicios, Productos, Configuración).

### 2.1 Neutros / superficies

| Token | Hex | Uso confirmado en la UI |
|---|---|---|
| `bg` | `#FAF6F4` | Fondo del área de contenido, detrás de sidebar y topbar |
| `surface` | `#FFFFFF` | Sidebar, topbar, tarjetas, filas de tabla, cards de servicio |
| `surface-2` | `#FDFAFB` | Cabecera de tabla (Clientes/Productos), fila hover, segmented control inactivo |
| `border` | `#F0E4E4` | Borde de tarjetas y borde derecho de sidebar / inferior de topbar |
| `border-soft` | `#F7EFF1` | Divisor entre filas de "Citas de hoy" y "Poco stock" |
| `dotted` | `#E7D8DC` | Punto de nav inactivo, línea punteada de precios (Servicios), track de toggle off |

### 2.2 Texto

| Token | Hex | Uso confirmado |
|---|---|---|
| `text` | `#3E2A33` | Nombre de clienta en tabla/lista, cifras KPI (excepto alerta) |
| `text-2` | `#5C4650` | Cuerpo general, texto de fila |
| `text-3` | `#7A666E` | Ítem de nav inactivo, subtítulo de fila |
| `muted` | `#A08D95` | Labels en mayúscula ("INGRESOS HOY"), metadatos, "Mínimo sugerido: X u." |
| `placeholder` | `#B9A6AD` | Placeholder del buscador del topbar |

### 2.3 Marca / acentos

| Token | Hex | Uso confirmado |
|---|---|---|
| `accent` | `#B76E84` (personalizable) | Botón "+ Nueva cita", ítem de nav activo (punto), links ("Ver agenda →", "Productos →"), hoy en mini calendario |
| `accent-rose` | `#D98BA4` | Foco de input, categoría Color/Pestañas/Maquillaje, barra de agenda de la Colorista |
| `wine` | `#6B3444` | Bloque "Ingresos de la semana", avatar de dueña (MR), precios en lista de Servicios, texto de tab activo |
| `sage` | `#8C9178` | Categoría Corte/Faciales/Depilación, estado "Completada"/"En stock" |
| `gold` | `#C89A5B` | Categoría Uñas, barra de agenda de la Manicurista |

### 2.4 Tintes de fondo (chips, avatares, bloques suaves)

| Token | Hex | Pareja de texto | Uso confirmado |
|---|---|---|---|
| `rose-bg` | `#F7E7EC` | `#B76E84` | Badge "Confirmada", chip "Color"/"Pestañas", avatar tint, día con turnos en mini calendario |
| `sage-bg` | `#EEF0E6` | `#71774F` | Badge "Completada"/"En stock", chip "Faciales"/"Corte" |
| `gold-bg` | `#F6EFE3` | `#A87C3F` | Badge "Sin confirmar", chip "Uñas" |
| `wine-bg` | `#EFE3E8` | `#6B3444` | Avatar tint alternativo |
| `alert-bg` | `#F9E8E2` | `#B0553F` | Badge "Reponer", stock crítico (cifra + barra de progreso en rojo) |

> **Regla de acento por tenant:** el acento se elige de una paleta curada
> (`#B76E84`, `#6B3444`, `#8C9178`, `#C89A5B`) — nunca de un selector libre — para garantizar
> contraste AA sobre blanco y sobre `rose-bg` sin importar qué tenant lo use.

---

## 3. Tipografía

```html
<link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,500;0,600;0,700&family=Figtree:wght@400;500;600;700&display=swap" rel="stylesheet">
```

- **`Cormorant Garamond`** (serif) — títulos de página, encabezados de tarjeta/sección, cifras
  hero (KPI, montos). Aporta el carácter "estética / belleza" de la marca.
- **`Figtree`** (sans) — todo el texto de interfaz: labels, cuerpo, botones, tablas, inputs,
  badges.

| Uso | Familia | Tamaño | Peso | Notas |
|---|---|---|---|---|
| Cifra hero (KPI, monto destacado) | Cormorant | 30–36 px | 600 | Ej. `$ 186.500`, `$ 1.284.300` |
| Título de página | Cormorant | 26 px | 600 | "Agenda", "Clientes", "Servicios" |
| Encabezado de tarjeta/sección | Cormorant | 20 px | 600 | "Citas de hoy", "Poco stock", título de categoría de servicio |
| Nombre / dato principal de fila | Figtree | 14 px | 600 | Nombre de clienta, nombre de producto |
| Cuerpo | Figtree | 13.5 px | 400–500 | Texto de tabla, contacto |
| Metadato / subtítulo | Figtree | 12.5 px | 400 | "Semipermanente · Micaela", "Mínimo sugerido: 6 u." |
| Label (mayúsculas) | Figtree | 11.5–12.5 px, `letter-spacing:.04–.05em`, uppercase | 600–700 | "INGRESOS HOY", "CLIENTE", "CONTACTO" |
| Chip / badge | Figtree | 11.5 px | 600 | "Confirmada", "En stock", "Uñas" |

`text-wrap: pretty` en párrafos largos (notas de clienta, descripciones).

---

## 4. Color por categoría de servicio

Color fijo por categoría — se repite consistentemente como punto de color en Servicios, chip de
preferencia en Clientes, borde de bloque en Agenda:

| Categoría | Color | Tinte de fondo |
|---|---|---|
| Color / tinte · Pestañas y cejas · Maquillaje | `accent-rose` `#D98BA4` | `rose-bg` |
| Corte y peinado · Faciales/skincare · Depilación | `sage` `#8C9178` | `sage-bg` |
| Uñas (mani/pedi) | `gold` `#C89A5B` | `gold-bg` |

**Regla:** este mapeo es único y no se reinterpreta por vista. Un bloque de agenda de
"Color completo" siempre es rosa, sin importar qué profesional lo realice.

---

## 5. Espaciado, radios y sombras

- **Grilla base:** múltiplos de 4. Padding de tarjeta `20px`; gap de layout `16px`; padding de
  fila de tabla `13px 20px`; padding de contenido principal `28px`.
- **Radios:** tarjeta `14px` · input/botón/chip cuadrado `10px` · ítem de nav `10px` ·
  pill/badge `99px` · avatar `50%` (o `10px` para el logo-mark).
- **Bordes:** `1px solid var(--border)` en tarjetas y sidebar; divisores internos
  `1px solid var(--border-soft)`.
- **Sombras — casi ninguna, y nunca decorativas:**
  - Knob del toggle: `0 1px 3px rgba(0,0,0,0.2)`.
  - Botón activo del segmented control (Día/Semana): `0 1px 3px rgba(107,52,68,0.12)`.
  - **Prohibido** `box-shadow` en tarjetas de reposo o en hover de botones. La separación entre
    superficies es siempre por borde + cambio de fondo, no por elevación.

---

## 6. Layout general

```
┌─────────┬──────────────────────────────────────────────┐
│ Sidebar │  Topbar: título · buscador · +Nueva · avatar  │
│  236px  ├──────────────────────────────────────────────┤
│         │  Contenido (scroll propio, padding 28px)      │
│  logo   │                                                │
│  nav    │  grid auto-fit / lista / tabla según vista     │
│  ...    │                                                │
│ tenant  │                                                │
└─────────┴──────────────────────────────────────────────┘
```

### 6.1 Sidebar (236 px)

| Elemento | Especificación |
|---|---|
| Contenedor | `surface` (blanco), borde derecho `1px solid border` |
| Logo | Wordmark "Shear" en script/serif decorativa + acento gráfico (hoja/flor), arriba, sin subtítulo |
| Navegación | Columna de ítems (ver §7.1), orden fijo: **Inicio · Agenda · Clientes · Servicios · Productos · Configuración** |
| Selector de tenant | Fijado abajo (`margin-top:auto`): avatar circular con inicial de la estética + nombre de estética/ubicación (truncado) + link secundario "Cambiar estética ↓" |

### 6.2 Topbar (66 px)

| Elemento | Especificación |
|---|---|
| Contenedor | `surface`, borde inferior `1px solid border`, altura 66 px, `display:flex; align-items:center; justify-content:space-between` |
| Título | Izquierda, serif 26 px. En Inicio es un saludo dinámico ("Buen día, {nombre}"); en el resto, el nombre de la sección |
| Buscador | Input centro-derecha, placeholder "Buscar clientes, turnos, productos...", ancho fijo (~320–360 px), fondo `bg`, radio `10px` |
| Botón primario | "+ Nueva cita" (o acción principal de la vista), estilo primario §7.3 |
| Avatar de usuaria | Círculo con iniciales a la derecha, fondo `wine`, texto blanco (rol dueña/admin) |

### 6.3 Contenido

- Scroll propio, padding `28px`, fondo `bg`.
- Grillas de tarjetas: `repeat(auto-fit, minmax(200–320px, 1fr))`, gap `16px`.
- **Responsive:** en móvil, sidebar → barra inferior o drawer; grillas colapsan a 1 columna;
  tablas → tarjetas apiladas (cada fila se convierte en una card con los mismos pares
  label/valor, en el mismo orden que las columnas de escritorio).

---

## 7. Componentes

### 7.1 Ítem de navegación (sidebar)

| Estado | Especificación |
|---|---|
| Base | Padding `10px 14px`, radio `10px`, `display:flex; align-items:center; gap:10px`, punto de color de 6 px a la izquierda del texto |
| **Activo** | Fondo `rose-bg`, texto `wine`, peso 700, punto = `accent` |
| **Inactivo** | Fondo transparente, texto `text-3`, peso 500, punto = `dotted`. Hover: fondo `#FAF3F5` |
| Transición | `transition: background-color .15s, color .15s` (sin animación de elevación) |

No se usan íconos de librería junto al texto de navegación; el punto de color + el peso
tipográfico son suficientes para distinguir el estado activo, en línea con el principio §1.2.

### 7.2 Botón

| Tipo | Especificación | Uso confirmado |
|---|---|---|
| **Primario** | Fondo `accent`, texto blanco, peso 600, padding `10px 18px`, radio `10px`. Hover: `opacity:.9`. Sin sombra ni desplazamiento en hover | "+ Nueva cita", "Guardar" |
| **Secundario** | Fondo blanco, borde `#E7D8DC`, texto `wine`, mismo padding/radio. Hover: fondo `#FAF3F5` | "+ Invitar" (Configuración → Personal) |
| **Link de acción** | Texto `accent`, sin fondo ni borde, peso 600, tamaño 13 px | "Ver agenda →", "Productos →" |

**Regla de animación:** ningún botón usa `translateY`, `hover:shadow` ni lift. El único feedback
de hover es cambio de opacidad o de fondo, coherente con §1.1 (nada de gradientes ni sombras
agresivas).

### 7.3 Tarjeta genérica

| Propiedad | Valor |
|---|---|
| Fondo | `surface` |
| Borde | `1px solid border` |
| Radio | `14px` |
| Padding | `18–24px` |
| Encabezado | Serif 20 px a la izquierda + link/acción a la derecha (mismo renglón) |
| Sombra | Ninguna |

### 7.4 KPI card (fila de 4 en Inicio)

| Elemento | Especificación |
|---|---|
| Contenedor | Card genérica, altura uniforme, contenido apilado verticalmente |
| Label | Mayúsculas, `muted`, 11.5 px, letter-spacing `.04em` — ej. "INGRESOS HOY", "PRODUCTOS CON POCO STOCK" |
| Cifra | Cormorant 34 px, peso 600, color `text` en KPIs neutros/positivos |
| Sublínea de tendencia | Figtree 12.5 px, color según semántica: `sage` para variación positiva ("+12% vs. jueves pasado", "+3 vs. junio"), `muted` para dato neutro ("3 completadas · 8 restantes"), **`alert` (`#B0553F`)** cuando el KPI es en sí una alerta accionable (ej. "Productos con poco stock" → la cifra y/o la sublínea "Reponer esta semana" usan `alert`, no `text`, para reforzar urgencia sin depender solo del color) |

### 7.5 Bloque destacado — "Ingresos de la semana" (1 por vista)

| Elemento | Especificación |
|---|---|
| Contenedor | Fondo `wine` `#6B3444`, radio `14px`, texto blanco/`#E3B9C6`, padding `24px` |
| Label | Mayúsculas, `#E3B9C6` atenuado, 11.5 px |
| Cifra | Cormorant ~34 px, blanco, peso 600 |
| Sublínea | `#E3B9C6`, 12.5 px — ej. "+18% vs. semana anterior · 64 servicios" |
| Mini gráfico de barras | 7 columnas (L a D), barras en `rgba(227,185,198,.45)`; la barra del día con mayor actividad (o el día actual) resaltada en `#E3B9C6` sólido; labels de día debajo en mayúsculas pequeñas atenuadas |

Este es el **único** bloque de fondo sólido fuerte por vista (regla §1.3).

### 7.6 Ítem de lista — "Citas de hoy"

| Elemento | Especificación |
|---|---|
| Fila | `display:flex; align-items:center; justify-content:space-between`, padding vertical ~14px, borde inferior `border-soft` |
| Hora | Figtree 13.5 px, peso 600, `text`, columna fija a la izquierda |
| Punto de categoría | 6–8 px, color según §4 (categoría del servicio agendado) |
| Nombre de clienta | Figtree 14 px, peso 600, `text` |
| Servicio + profesional | Figtree 12.5 px, `text-3` o `muted` — formato `"{Servicio} · {Profesional}"` |
| Badge de estado | Pill a la derecha, ver §8 |

### 7.7 Ítem de lista — "Poco stock"

| Elemento | Especificación |
|---|---|
| Fila | Nombre de producto (peso 600) + cantidad alineada a la derecha (`"4 u."`, color `alert` cuando está bajo mínimo) |
| Subtítulo | `"Mínimo sugerido: {n} u."`, `muted`, 12 px |
| Barra de progreso | Track fino (`~4px` alto) fondo `dotted`, relleno proporcional a `stock/mínimo` en color `alert`; radio `99px` |

### 7.8 Tabla (Clientes, Productos)

| Elemento | Especificación |
|---|---|
| Contenedor | `surface`, borde `border`, radio `14px`, `overflow:hidden` |
| Cabecera | Fondo `surface-2`, labels mayúsculas `muted` 11.5–12.5 px, borde inferior `border` |
| Filas | Padding `13px 20px`, borde inferior `border-soft`, hover → fondo `surface-2` |
| Primera columna (entidad) | Avatar circular con iniciales (tint rotativo, ver §7.10) + nombre en Figtree 14 px peso 600 |
| Columna de contacto | Teléfono (texto `text-2`) sobre email (`accent`, subrayado en hover — hereda el estilo global de link) |
| Columnas numéricas/fecha | Figtree 13.5 px, `text-2`, alineadas según el contenido de la columna |
| Columna de categoría (Productos) | `muted`, sin badge — texto plano |
| Columna de stock (Productos) | Cifra en `text` si está en stock; en color `alert` cuando está por debajo del mínimo |
| Columna de estado/preferencia | Badge/chip (§8 o §4) |
| Fila clickeable | `cursor:pointer` cuando lleva a un detalle (ej. fila de clienta) |

### 7.9 Chip / badge

| Tipo | Especificación |
|---|---|
| Base | Pill `99px`, padding `4px 10px`, 11.5 px, peso 600, fondo tinte + texto pareja (§2.4) |
| De estado de turno/stock | Ver tabla completa en §8 |
| De categoría/preferencia | Tinte según §4 (ej. "Color" → `rose-bg`/`accent-rose`, "Uñas" → `gold-bg`/`gold`) |
| De rol (Configuración → Personal) | "Dueña" → `rose-bg`/`accent`; "Profesional" → `sage-bg`/`sage` (texto `#71774F`); "Recepción" → `gold-bg`/`gold` (texto `#A87C3F`) |

### 7.10 Avatar

| Propiedad | Valor |
|---|---|
| Forma | Círculo, iniciales centradas, Figtree peso 600 |
| Rotación de tinte | Rota entre 4 parejas: `rose` / `sage` / `gold` / `wine`, asignada de forma determinística por entidad (ej. hash del id o nombre) para que la misma clienta siempre tenga el mismo color |
| Dueña / admin | Fondo `wine`, texto `rose-bg` (excepción fija, no rota) |

### 7.11 Toggle (switch)

| Estado | Especificación |
|---|---|
| Track | `38×22px`, radio `99px` |
| Off | Fondo `dotted` `#E7D8DC`, knob a la izquierda (`left:3px`) |
| On | Fondo `accent`, knob a la derecha (`left:19px`) |
| Knob | `16px`, blanco, sombra `0 1px 3px rgba(0,0,0,0.2)` |
| Transición | `.15s` |

### 7.12 Tabs (Configuración)

| Elemento | Especificación |
|---|---|
| Fila | Borde inferior `border`, tabs en línea: **Horarios · Personal · Servicios y precios · Facturación · Notificaciones** |
| Tab activo | Peso 700, texto `wine`, borde inferior `2px solid accent` |
| Tab inactivo | Peso 500, texto `text-3`, sin borde |

### 7.13 Segmented control (Agenda: Día / Semana)

| Elemento | Especificación |
|---|---|
| Contenedor | Fondo `#FAF3F5`, radio `10px`, padding `3px` |
| Opción activa | Fondo blanco, texto `wine`, sombra `0 1px 3px rgba(107,52,68,0.12)` |
| Opción inactiva | Sin fondo, texto `text-3` |

### 7.14 Input

| Propiedad | Valor |
|---|---|
| Borde | `1px solid border` |
| Radio | `10px` |
| Padding | `9px 14px` |
| Fondo | `bg` |
| Placeholder | `placeholder` `#B9A6AD` |
| Foco | Borde `accent-rose`, sin outline nativo |

### 7.15 Leader dots (lista de precios — Servicios)

| Elemento | Especificación |
|---|---|
| Fila | `display:flex; align-items:baseline; gap:8px` |
| Nombre + duración | `"{Servicio}  {duración} min"`, nombre en `text`/peso 500, duración en `muted` más pequeña |
| Línea guía | `flex:1; border-bottom:1px dotted #E7D8DC; margin-bottom:4px` |
| Precio | `wine`, peso 600, alineado a la derecha |

### 7.16 Card de categoría de servicio

| Elemento | Especificación |
|---|---|
| Contenedor | Card genérica (§7.3) |
| Encabezado | Punto de color de categoría (§4) + título serif 20 px (ej. "Corte y peinado", "Uñas") |
| Cuerpo | Lista de servicios en formato leader dots (§7.15) |

### 7.17 Configuración → Personal y permisos

| Elemento | Especificación |
|---|---|
| Header de card | Título serif "Personal y permisos" + botón secundario "+ Invitar" a la derecha |
| Fila de persona | Avatar (§7.10) + nombre (peso 600) sobre email (`muted`, 12.5 px) a la izquierda; badge de rol (§7.9) + texto de permisos (`accent`, ítems separados por " · ", ej. "Agenda propia · Clientes") a la derecha |
| Divisor | `border-soft` entre filas |

---

## 8. Estados (badges de turno y stock)

| Estado | Fondo | Texto |
|---|---|---|
| Confirmada | `rose-bg` `#F7E7EC` | `#B76E84` |
| Completada | `sage-bg` `#EEF0E6` | `#71774F` |
| Sin confirmar | `gold-bg` `#F6EFE3` | `#A87C3F` |
| En stock | `sage-bg` `#EEF0E6` | `#71774F` |
| Reponer / stock bajo / sin stock | `alert-bg` `#F9E8E2` | `#B0553F` |

**Regla de accesibilidad:** ningún estado se comunica solo por color. Cada badge lleva siempre
el texto descriptivo del estado ("Confirmada", "Reponer", etc.) junto al tinte de fondo —
nunca un punto de color aislado sin etiqueta. Verificar que el par fondo/texto de cada fila de
esta tabla mantenga contraste AA (≥4.5:1 para texto de 11.5 px/peso 600, que cuenta como texto
pequeño en negrita).

---

## 9. Agenda (calendario)

| Elemento | Especificación |
|---|---|
| Mini calendario | Grid 7 columnas (L M X J V S D), mes y año en serif arriba ("Julio 2026"). Días con turnos → fondo `rose-bg`. Día actual → fondo `accent`, texto blanco |
| Legend "Equipo" | Lista de profesionales: punto de color fijo + nombre (peso 600) + rol (`muted`, debajo) |
| Vista Día | Columnas por profesional, cada una con borde superior `2px` del color fijo del profesional. Grilla horaria de fondo: `linear-gradient(border-soft 1px, transparent 1px)` cada 56 px (= 1 hora). Bloques de turno posicionados en absoluto según hora/duración: fondo = tinte de la **categoría del servicio** (§4), borde izquierdo `3px` del mismo color |
| Vista Semana | 7 columnas; el día actual con fondo `rose-bg` y número en `wine` |
| Segmented Día/Semana | Ver §7.13 |
| Color fijo por profesional | Colorista → `accent-rose` · Estilista → `sage` · Manicurista → `gold` · Cosmetóloga → `wine` |

> **Distinción importante:** el color del **borde superior de columna** identifica al
> profesional; el color del **relleno del bloque de turno** identifica la categoría del
> servicio. Ambos sistemas de color coexisten en la misma vista y no deben confundirse.

---

## 10. Formato regional (Argentina)

- **Moneda:** `"$ " + Number.toLocaleString('es-AR')` → `$ 186.500` (punto como separador de
  miles, sin decimales para montos enteros).
- **Fechas:** formato largo `16 jul 2026` en tablas; título de agenda `"Jueves 16 de julio"`;
  días abreviados en calendario: `L M X J V S D` (Lun/Mar/Mié/Jue/Vie/Sáb/Dom).
- **Datos fiscales** (Configuración → Facturación): CUIT, condición frente al IVA
  (Resp. Inscripto), alias/CBU, Mercado Pago.
- **Copy:** español rioplatense — "turno" (no "cita" salvo en el botón "+ Nueva cita", que es
  la excepción de copy ya establecida en la UI), "seña", "clienta", "profesional", "estética"
  (no "salón" ni "spa").

---

## 11. Accesibilidad

- **Contraste:** `text` (`#3E2A33`) sobre `bg` (`#FAF6F4`) y sobre `surface` (blanco) supera
  AA cómodamente. Verificar especialmente los pares de badge (§8, §2.4): son texto pequeño en
  negrita sobre tinte pastel y son los de menor margen de contraste del sistema.
- **Nunca color solo:** todo estado (turno, stock, rol) se expresa con texto + tinte de fondo
  simultáneamente (ver regla en §8). El punto de color en Agenda/nav es un refuerzo visual
  adicional, no el único portador de significado — el nombre del profesional/sección siempre
  acompaña al punto.
- **Foco de teclado:** todo elemento interactivo (input, tab, ítem de nav, fila clickeable,
  botón) debe mostrar un estado de foco visible. Para inputs, el borde `accent-rose` de §7.14
  cumple esta función; para botones/tabs/nav, agregar `outline: 2px solid var(--accent-rose); outline-offset: 2px` cuando el foco es por teclado.
  Evitar `outline:none` sin reemplazo visible.
  
  

- **Toggle y segmented control:** deben ser operables por teclado (`Tab` + `Space`/`Enter`) y
  anunciar su estado (`aria-checked` en toggle, `aria-selected` en segmented control).
- **Tablas responsive:** al colapsar a tarjetas en móvil (§6.3), cada valor debe conservar su
  label visible (no depender solo del orden espacial que sí existe en la tabla de escritorio).

---

## 12. Responsive

| Breakpoint | Comportamiento |
|---|---|
| Móvil (`<640px`) | Sidebar colapsa a barra inferior o drawer; topbar simplificado (buscador puede ocultarse tras un ícono); grids de KPI y tarjetas → 1 columna |
| Tablet (`≥640px`) | Grids de 2 columnas; sidebar puede mostrarse como drawer |
| Desktop (`≥1024px`) | Layout completo: sidebar fija 236 px + topbar + contenido con grids `auto-fit` |

- **Tablas → tarjetas apiladas:** en pantallas angostas, cada fila de tabla (Clientes,
  Productos) se convierte en una card individual con los mismos pares label/valor.
- **Agenda en móvil:** la vista Día es la más viable (columnas por profesional se apilan o se
  vuelven scrolleables horizontalmente); el mini calendario puede colapsar a un selector de
  fecha simple.

---

## 13. Animaciones y transiciones

Coherente con el principio "limpio y respirado" (§1.1), las animaciones son mínimas y nunca
decorativas:

| Elemento | Transición |
|---|---|
| Botón primario/secundario (hover) | `opacity .9` o cambio de fondo — **sin** `translateY` ni `box-shadow` |
| Ítem de nav (hover/activo) | `background-color .15s, color .15s` |
| Toggle | `.15s` (posición del knob + color de track) |
| Tabs / segmented control | Cambio instantáneo de fondo/borde al activarse; sin animación de deslizamiento |
| Filas de tabla (hover) | `background-color .15s` |

**Prohibido:** sombras animadas, gradientes, efectos de elevación (`lift`) en hover, librerías
externas de animación. Cualquier transición no listada aquí debe proponerse antes de
implementarse.

### 13.1 Excepción — Landing pública (marketing, UX-38)

Decisión de producto (2026-07-21): la Landing pública (`views/Landing.tsx`) es la única vista
del sistema donde se permite una capa de movimiento más notoria que el resto de la app, para
transmitir dinamismo comercial. Esta excepción **no** se extiende a ninguna vista autenticada
(Dashboard, Clientes, Turnos, etc.) ni reabre `components/react-bits/` (eliminado en UX-37).

* **Librería permitida (única excepción a "prohibido librerías externas"):** `motion` (sucesora
  de Framer Motion), instalada solo como dependencia de `apps/client` y consumida solo desde
  `views/Landing.tsx` y componentes que Landing define para sí misma.
* **Efectos permitidos:** movimiento continuo/en loop en el hero (float sutil, parallax liviano,
  formas decorativas en movimiento lento), reveal progresivo al hacer scroll (`whileInView` con
  fade + slide corto, stagger entre cards de features), micro-interacciones de hover con
  `scale`/`translate` leve **limitadas a la Landing**.
* **Sigue prohibido incluso en Landing:** gradientes decorativos, `box-shadow` de card, más de
  un bloque `wine` sólido por vista, modo oscuro, colores/fuentes fuera de §2/§14 — la Landing
  debe seguir leyéndose como Shear, solo "más viva".
* **Aclaración (UX-39, 2026-07-21):** no cuenta como "gradiente decorativo" el uso de formas
  sólidas (círculos/blobs) con `blur`/opacidad + `mix-blend-mode`, ni filtros SVG animados
  (`feTurbulence`/`feDisplacementMap`) para simular luz o movimiento tipo "caustics" —  no
  codifican un degradé de color vía `gradient`, y quedan permitidos en el hero de Landing como
  parte de esta misma excepción. Siguen sin admitirse `linear-gradient`/`radial-gradient`/
  `conic-gradient` ni clases `bg-gradient-*`. No se agregan librerías de render 3D/WebGL
  (three.js, pixi, ogl) para lograr el efecto — se resuelve con SVG/CSS + `motion`.
* **Accesibilidad obligatoria:** toda animación agregada respeta
  `prefers-reduced-motion: reduce` (desactivar o reducir drásticamente loops/parallax cuando el
  usuario lo tiene activado).

---

## 14. CSS base (reset + variables)

Fuente canónica — copiar tal cual desde `desing-system.md §11`:

```css
:root{
  --bg:#FAF6F4; --surface:#FFFFFF; --surface-2:#FDFAFB;
  --border:#F0E4E4; --border-soft:#F7EFF1; --dotted:#E7D8DC;
  --text:#3E2A33; --text-2:#5C4650; --text-3:#7A666E; --muted:#A08D95;
  --accent:#B76E84; --accent-rose:#D98BA4; --wine:#6B3444;
  --sage:#8C9178; --gold:#C89A5B;
  --rose-bg:#F7E7EC; --sage-bg:#EEF0E6; --gold-bg:#F6EFE3; --alert-bg:#F9E8E2;
  --r-card:14px; --r-ctrl:10px; --r-pill:99px;
  --serif:'Cormorant Garamond',serif; --sans:'Figtree',sans-serif;
}
html,body{margin:0;padding:0;background:var(--bg);font-family:var(--sans);color:var(--text);}
*{box-sizing:border-box;}
a{color:var(--accent);text-decoration:none;} a:hover{color:var(--wine);}
::-webkit-scrollbar{width:8px;height:8px;}
::-webkit-scrollbar-thumb{background:var(--dotted);border-radius:8px;}
input::placeholder{color:#B9A6AD;}
input:focus{outline:none;border-color:var(--accent-rose);}
```

> **Nota de implementación:** el estilo va **inline** en cada elemento, usando estas variables
> vía `var(--token)` — no hay hoja de estilos con clases utilitarias (tipo Tailwind) en el
> proyecto actual. Si el proyecto migra a una app con hojas de estilo propias, este `:root` es
> el punto de partida y las tablas de §7–§9 deben traducirse a clases equivalentes sin cambiar
> ningún valor.

---

## ❌ Qué NO hacer en la capa visual

- ❌ No introducir colores fuera de los tokens de §2. El acento por tenant se elige únicamente
  de la paleta curada de §2.4 (regla de acento personalizable) — nunca de un selector de color
  libre.
- ❌ No usar más de **un** bloque de fondo `wine` sólido por vista (§1.3, §7.5).
- ❌ No usar fuentes distintas a `Cormorant Garamond` (serif) y `Figtree` (sans).
- ❌ No usar sombras de tarjeta, `box-shadow` decorativo, ni efectos de `lift`/elevación en
  hover de botones o filas (§5, §13).
- ❌ No comunicar un estado (turno, stock, rol) únicamente con color — siempre color + texto
  (§8, §11).
- ❌ No agregar iconografía decorativa junto a la navegación o los estados; el sistema se apoya
  en puntos de color, avatares con iniciales y jerarquía tipográfica (§1.2, §7.1).
- ❌ No introducir modo oscuro: no está definido en este sistema y ninguna vista de referencia
  lo contempla.
- ❌ No mezclar el color de "profesional" (borde de columna en Agenda) con el color de
  "categoría de servicio" (relleno de bloque) — son dos sistemas de color independientes (§9).
- ❌ No usar gradientes en ningún elemento (§1.1).
