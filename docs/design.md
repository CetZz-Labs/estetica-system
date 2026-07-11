# Sistema de Diseño y Directrices de Interfaz (Maison CRM UI/UX)

> **Estándar de Calidad para el Subagente Revisor:** Este documento rige de manera inmutable el aspecto visual, accesibilidad y comportamiento de la interfaz de usuario en `apps/client`. El subagente `reviewer` evaluará los componentes creados por el `implementer` contra estas especificaciones. Si un patrón o token visual no se encuentra en este archivo, se considerará inválido.

---

## 1. Filosofía de Interfaz: Clean Minimalism

Maison CRM adopta un enfoque de **minimalismo limpio y cálido** diseñado para la operación diaria de un centro de estética. La interfaz prioriza la legibilidad de datos del cliente, la velocidad de registro de visitas y el escaneo rápido del estado de retoques e inventario. Las superficies son claras, los acentos tipográficos son serif para elegancia, y los estados críticos usan colores vibrantes sobre fondos neutros.

### El Patrón Bento Grid Estructural

La distribución de información en Dashboards y listados se organiza mediante celdas modulares:

- Cada tarjeta dentro de la grilla tiene fondo blanco sólido, bordes beige sutiles y un propósito informativo único.
- El espacio en blanco separa conceptos, reduciendo la fatiga cognitiva del operador sin sacrificar densidad de datos.

---

## 2. Paleta de Colores Inmutable (Tokens Tailwind v4)

Los tokens se definen en `apps/client/src/index.css` mediante la estructura `:root` + `@theme inline` de Tailwind v4 (patrón shadcn). Adaptada desde un theme shadcn con oklch, convertido a hex para consistencia.

### 2.1 Colores de Marca (Maison)

| Token | Valor Hex | Uso y Aplicación en la Interfaz |
|-------|-----------|---------------------------------|
| `--color-background` | `#faf6f1` | Fondo general de la aplicación. Rose muy claro, cálido. |
| `--color-foreground` | `#7a6a5e` | Color por defecto para texto principal y títulos. Rose oscuro. |
| `--color-card` | `#ffffff` | Fondo de tarjetas, bloques Bento Grid, tablas, modales. Blanco puro. |
| `--color-primary` | `#c97580` | Rose medio. Botones primarios, fondos de acción, texto de alto impacto. |
| `--color-primary-foreground` | `#ffffff` | Texto sobre fondos primary. |
| `--color-secondary` | `#f2ece5` | Fondo secundario, badges sutiles, hover states. |
| `--color-secondary-foreground` | `#7a6a5e` | Texto sobre fondos secondary. |
| `--color-muted` | `#f7f2ed` | Fondos sutiles, secciones de nota, estados inactivos. |
| `--color-muted-foreground` | `#a89888` | Metadatos, subtítulos, etiquetas secundarias. |
| `--color-accent` | `#f5d5cc` | Acentos rose claros, hover de sidebar items. |
| `--color-accent-foreground` | `#c4656a` | Texto sobre fondos accent. |
| `--color-border` | `#ead9cf` | Borde por defecto en tarjetas, inputs, tablas y divisores. |
| `--color-input` | `#ead9cf` | Borde de inputs (igual que border). |
| `--color-ring` | `#80a890` | Verde semántico: retoques futuros, stock saludable, operaciones exitosas. |
| `--color-destructive-subtle` | `#f5e0e0` | Fondo pastel rojo para hover de botones de acción (cancelar). |
| `--color-ring-subtle` | `#dde8e2` | Fondo pastel verde para hover de botones de acción (completar). |
| `--color-destructive` | `#d04040` | Rojo semántico: retoques atrasados, stock agotado, errores. |
| `--color-destructive-foreground` | `#fdfcfd` | Texto sobre fondos destructive. |
| `--color-warning` | `#E5A059` | Naranja semántico: retoques próximos (1-7 días), stock bajo (≤ 5), notas médicas. |
| `--color-warning-foreground` | `#5c4b43` | Texto sobre fondos warning. |

### 2.2 Colores del Sidebar

Tokens dedicados para la sidebar de navegación, permitiendo un estilo independiente del contenido principal.

| Token | Valor Hex | Uso |
|-------|-----------|-----|
| `--color-sidebar` | `#f9f4ef` | Fondo de la sidebar. |
| `--color-sidebar-foreground` | `#7a6a5e` | Texto general de la sidebar. |
| `--color-sidebar-primary` | `#d46670` | Elemento primario activo en sidebar. |
| `--color-sidebar-primary-foreground` | `#ffffff` | Texto sobre fondos sidebar-primary. |
| `--color-sidebar-accent` | `#f5d5cc` | Fondo de item activo / hover en sidebar. |
| `--color-sidebar-accent-foreground` | `#c4656a` | Texto de item activo en sidebar. |
| `--color-sidebar-border` | `#edddd4` | Bordes y divisores dentro de la sidebar. |

> **Contraste AA mínimo verificado:** `text-foreground` (#7a6a5e) sobre `bg-background` (#faf6f1) = ~7:1. `text-sidebar-foreground/60` sobre `bg-sidebar` = suficiente para texto secundario.

### 2.3 Modo Oscuro (Dark Mode)

El sistema soporta modo oscuro mediante la clase `.dark` en `<html>`. Los tokens se redefinen en `index.css` bajo el bloque `.dark {}`. La paleta oscura es un tema shadcn adaptado con tonos cálidos rose/marrón.

| Token | Valor Hex (Dark) | Equivalente Light |
|-------|------------------|-------------------|
| `--background` | `#332c28` | `#faf6f1` |
| `--foreground` | `#e8ddd4` | `#7a6a5e` |
| `--card` | `#3d3530` | `#ffffff` |
| `--card-foreground` | `#e8ddd4` | `#7a6a5e` |
| `--primary` | `#d46670` | `#c97580` |
| `--primary-foreground` | `#332c28` | `#ffffff` |
| `--secondary` | `#443b35` | `#f2ece5` |
| `--muted` | `#443b35` | `#f7f2ed` |
| `--accent` | `#4a3a35` | `#f5d5cc` |
| `--accent-foreground` | `#e8a0a0` | `#c4656a` |
| `--border` | `#4a403a` | `#ead9cf` |
| `--destructive-subtle` | `#5a3535` | `#f5e0e0` |
| `--ring-subtle` | `#3a5045` | `#dde8e2` |
| `--sidebar` | `#2a2420` | `#f9f4ef` |
| `--sidebar-accent` | `#4a3a35` | `#f5d5cc` |
| `--sidebar-border` | `#443b35` | `#edddd4` |

**Componente:** `apps/client/src/components/ui/ThemeToggle.tsx` — botón que alterna entre `FiSun` / `FiMoon`, persiste preferencia en `localStorage` bajo la key `theme`.

**Transición:** `body` tiene `transition: background-color 0.2s ease, color 0.2s ease` para un cambio suave entre modos.

**Uso de tokens en dark mode:** Todas las clases de Tailwind que usan tokens CSS (`bg-background`, `text-foreground`, `bg-card`, etc.) cambian automáticamente al alternar modos. No se requieren clases `dark:` explícitas cuando se usan tokens del theme.

### 2.4 Colores del Sistema (Tailwind nativos)

Usar directamente clases Tailwind para escalas de grises, manteniendo consistencia:

| Clase | Hex | Uso |
|-------|-----|-----|
| `text-gray-400` | `#9CA3AF` | Metadatos, subtítulos, etiquetas secundarias |
| `text-gray-500` | `#6B7280` | Texto de cuerpo secundario, placeholders |
| `text-gray-600` | `#4B5563` | Texto de interfaz, contenido de tablas |
| `bg-gray-50` | `#F9FAF8` | Fondos de filas hover, badges, secciones de nota |
| `bg-gray-200` | `#E5E7EB` | Esqueletos (skeleton loading) `animate-pulse` |

---

## 3. Sistema Tipográfico y Jerarquía

Maison CRM utiliza una combinación de dos familias tipográficas.

- **Títulos y Display:** `"Fraunces"` (Serif variable weight 100-900, elegante y legible; confiere calidez a títulos de página y encabezados de módulo).
- **Cuerpo e Interfaz (UI):** `"Manrope"` (Sans-serif geométrico moderno; lectura limpia en todos los tamaños).

Ambas declaradas en `@theme inline` como `--font-serif` y `--font-sans`, y cargadas via Google Fonts en `index.html`.

### Escala de Utilidades Tipográficas

| Uso | Clase | Fuente | Tamaño | Tracking |
|-----|-------|--------|--------|----------|
| Saludo / Título de página | `font-serif text-3xl sm:text-4xl` | Fraunces | `1.875rem` / `2.25rem` | normal |
| Título de modal | `font-serif text-2xl` | Fraunces | `1.5rem` | normal |
| Título de tarjeta/módulo | `font-serif text-xl` | Fraunces | `1.25rem` | normal |
| Número estadístico (KPI) | `font-serif text-3xl` | Fraunces | `1.875rem` | normal |
| Nombre de servicio en card | `font-serif text-xl` | Fraunces | `1.25rem` | normal |
| Iniciales de avatar | `font-serif text-lg` | Fraunces | `1.125rem` | normal |
| Cuerpo estándar | `font-sans text-sm` | Manrope | `0.875rem` | normal |
| Label de sección | `font-sans text-xs font-semibold tracking-widest uppercase` | Manrope | `0.75rem` | `0.1em` |
| Tabla / dato tabular | `font-sans text-sm` | Manrope | `0.875rem` | normal |
| Badge / pill | `font-sans text-xs font-semibold` | Manrope | `0.75rem` | normal |

### Principios de Jerarquía Visual

#### Emphasize by De-emphasizing
- Las **etiquetas secundarias** de tarjetas, secciones y cabeceras usan: `text-xs` · `uppercase` · `tracking-widest` · `font-semibold` · color atenuado (`text-gray-400`).
- El **dato principal** (número de KPI, nombre de cliente) ejerce peso visual mediante la fuente serif (`font-serif`), tamaños grandes (`text-3xl`/`text-4xl`) y color `text-foreground`.
- Prohibido que la etiqueta secundaria compita en peso visual con el dato principal.

#### Labels are a Last Resort
- Los datos deben autocontextualizarse mediante formato o posición en el layout.
- Micro-iconos semánticos (`react-icons/fi`) acompañan datos cuando aportan contexto.
- Los placeholders en inputs siguen formato: `"Ej: Coloración completa"`.

---

## 4. Componentes y Patrones de UI

### 4.1 Sidebar (Navegación)

| Propiedad | Valor |
|-----------|-------|
| Fondo | `bg-sidebar` (sin border-right para integración limpia con el contenedor flotante) |
| Ancho | `w-64` (fijo) |
| Brand | Solo logo (`/shear-logo.png`), sin texto adicional |
| Ítems | Layout flex con ícono + texto: `flex items-center gap-3 px-3 py-2 rounded-lg text-sm` |
| Ítems inactivos | `text-sidebar-foreground/60` con `hover:text-sidebar-foreground hover:bg-sidebar-accent/50` |
| Ítem activo | `bg-sidebar-accent text-sidebar-accent-foreground` |
| Íconos | `react-icons/fi`, tamaño `size={18}`, alineados a la izquierda del texto |
| Secciones | Divisores `border-t border-sidebar-border` con labels `text-[10px] font-semibold tracking-widest uppercase text-sidebar-foreground/40` |
| Transición | `transition-colors` |
| Móvil | Slide-in desde izquierda con overlay `bg-black/40 backdrop-blur-sm`, header sticky con hamburguesa `FiMenu`/`FiX` |
| Cierre | Botón `FiX` en header + clic en overlay + clic en enlace (`closeMenu`) |
| Footer | `ThemeToggle` + `UserButton` (Clerk) + label "Mi Cuenta", separado por `border-t border-sidebar-border` |

### 4.1.1 Elevación del Contenido Principal

El área de contenido principal se rendering como un contenedor con elevación visual sobre la sidebar:

| Propiedad | Valor |
|-----------|-------|
| Contenedor externo | `flex-1 p-3 md:p-4 overflow-x-hidden overflow-y-auto` |
| Contenedor interno | `bg-card border border-border rounded-xl shadow-lg min-h-full` |
| Padding interno | `p-4 md:p-8` |

**Efecto visual:** El `shadow-lg` + `rounded-xl` del contenedor interno crea la ilusión de que el contenido "sobresale" sobre la sidebar, similar al patrón de shadcn/ui dashboard. En modo oscuro, las sombras se intensifican automáticamente via los tokens `--shadow-*` redefinidos en el bloque `.dark`.

### 4.1.1 Íconos de Navegación (Sidebar)

Cada ítem de navegación incluye un ícono de `react-icons/fi` (Feather Icons) tamaño 18px:

| Ruta | Label | Ícono |
|------|-------|-------|
| `/dashboard` | Inicio | `FiHome` |
| `/clientes` | Clientes | `FiUsers` |
| `/servicios` | Servicios | `FiScissors` |
| `/inventario` | Inventario | `FiPackage` |
| `/turnos` | Turnos | `FiCalendar` |
| `/profesionales` | Profesionales | `FiUser` |
| `/configuracion/negocio` | Mi Negocio | `FiBriefcase` |
| `/configuracion/disponibilidad` | Disponibilidad | `FiClock` |
| `/configuracion/notificaciones` | Notificaciones | `FiBell` |

**Regla:** Los íconos son obligatorios en la sidebar. No se permiten ítems de navegación sin ícono.

### 4.2 Botones

| Tipo | Clases | Uso |
|------|--------|-----|
| **Primario** | `bg-primary hover:bg-accent hover:text-accent-foreground text-white px-5 py-2.5 rounded-full text-sm font-medium flex items-center gap-2 transition-all duration-200 shadow-sm hover:shadow-md hover:-translate-y-0.5 active:translate-y-0 active:shadow-sm cursor-pointer` | Acciones principales (Nueva Visita, Agregar Cliente, Guardar) |
| **Secundario** | `bg-card border border-border hover:border-primary/40 text-muted-foreground px-4 py-2.5 rounded-full text-sm font-medium transition-all duration-200 shadow-sm hover:shadow-md hover:-translate-y-0.5 active:translate-y-0 active:shadow-sm cursor-pointer` | Acciones secundarias (Directorio, Carga Masiva) |
| **En línea** (icon button) | `p-2 text-muted-foreground hover:text-primary transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md active:translate-y-0 active:shadow-sm cursor-pointer` | Editar, Eliminar (dentro de cards) |
| **En línea con hover reveal** | `sm:opacity-0 sm:group-hover:opacity-100 transition-opacity` | Acciones que aparecen al hover de la card/fila |
| **Modal footer** | `px-5 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md active:translate-y-0 active:shadow-sm` | Cancelar (texto gris, hover bg-accent), Guardar (primario con hover bg-accent) |
| **Disabled** | `disabled:bg-gray-400 disabled:cursor-not-allowed` | Botón primario deshabilitado |

#### Animación de Hover (Botones)

Todos los botones interactivos usan la misma micro-animación para consistencia:

| Propiedad | Clase | Efecto |
|-----------|-------|--------|
| Transición | `transition-all duration-200` | Transición suave de 200ms en todas las propiedades |
| Elevación | `hover:shadow-md` | Sombra más pronunciada en hover |
| Lift | `hover:-translate-y-0.5` | Desplazamiento vertical de 2px hacia arriba |
| Snap back | `active:translate-y-0 active:shadow-sm` | Vuelve a la posición original al hacer click |

**Regla:** Esta animación aplica SOLO a elementos `<button>` y `<a>`/`<Link>`. NO se aplica a `<li>`, `<tr>`, `<div>` interactivos, `<label>`, ni toggles — esos usan `transition-colors` sin animación de lift.

### 4.3 Tarjetas (Cards)

| Propiedad | Valor |
|-----------|-------|
| Fondo | `bg-card` |
| Borde | `border border-border` |
| Border radius | `rounded-lg` (8px) |
| Padding | `p-5` o `p-6` |
| Sombra | `shadow-sm` (sutil en reposo) |
| Hover | `hover:shadow-md` (cards interactivas) |
| Transición | `transition-all` o `transition-colors` |

### 4.4 Formularios (Inputs)

| Propiedad | Valor |
|-----------|-------|
| Fondo | `bg-background` |
| Borde default | `border border-border` |
| Borde error | `border-destructive` |
| Border radius | `rounded-lg` (8px) |
| Padding | `px-4 py-2.5` |
| Focus | `focus:outline-none focus:ring-2 focus:ring-ring focus:border-ring` |
| Label | `text-xs font-bold tracking-widest text-gray-500 uppercase` |
| Placeholder | `placeholder:text-gray-400` o texto inline |

**Nota:** El focus ring usa el token `--color-ring` (#80a890, verde seco) para dar feedback visual consistente con la semántica del sistema (operaciones exitosas, estado saludable).

### 4.4.1 React-Select (Selects Inteligentes)

Los componentes `react-select` usan inline styles para mantener consistencia con el theme:

| Propiedad | Valor |
|-----------|-------|
| Fondo control | `#fff9f6` (bg-background) |
| Borde default | `#E5E7EB` |
| Borde focus | `#80a890` (ring, verde seco) |
| Focus ring | `0 0 0 2px #80a890` |
| Hover borde | `#D1D5DB` |
| Border radius | `0.5rem` (rounded-lg) |
| Opción selected | `#111827` fondo, `white` texto |
| Opción focus | `#F3F4F6` fondo |

**Nota:** Los valores hex en `selectStyles` deben mantenerse sincronizados con los tokens CSS del theme.

### 4.5 Modal

Basado en el componente `Modal` (`apps/client/src/components/ui/Modal.tsx`).

| Elemento | Clases / Valor |
|----------|----------------|
| Overlay | `fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4 backdrop-blur-sm` |
| Contenedor | `bg-card border border-border rounded-lg w-full {maxWidth} shadow-xl overflow-hidden` |
| Max width default | `max-w-md` (puede variar: `max-w-lg`, `max-w-3xl`) |
| Header | `p-5 sm:p-6 border-b border-border bg-background shrink-0` |
| Título | `font-serif text-2xl text-foreground` |
| Subtítulo | `text-gray-500 text-sm mt-0.5` |
| Body | `p-5 sm:p-6 overflow-y-auto custom-scrollbar` |
| Footer | `p-5 sm:p-6 border-t border-border bg-gray-50/50 flex flex-col-reverse sm:flex-row justify-end gap-3 shrink-0` |
| Footer botón Cancelar | `px-5 py-2.5 rounded-lg text-sm font-medium text-gray-600 hover:bg-accent hover:text-accent-foreground transition-colors cursor-pointer` |
| Footer botón Primario | `bg-primary hover:bg-accent hover:text-accent-foreground disabled:bg-gray-400 text-white px-6 py-2.5 rounded-lg text-sm font-medium transition-colors cursor-pointer` |

### 4.6 Tablas

| Elemento | Clases / Valor |
|----------|----------------|
| Contenedor | `bg-card border border-border rounded-lg shadow-sm overflow-hidden` |
| Scroll horizontal | `overflow-x-auto` wrap, `min-w-[520px]` en `<table>` |
| Table | `w-full text-left border-collapse` |
| Head | `border-b border-border bg-background/50` |
| TH | `px-4 sm:px-6 py-4 text-xs font-bold tracking-widest text-gray-500 uppercase` |
| Body rows | `divide-y divide-border` |
| Hover | `hover:bg-gray-50 transition-colors` |

### 4.7 Badges / Pills

| Propiedad | Valor |
|-----------|-------|
| Clase base | `inline-block px-2.5 py-0.5 text-xs font-semibold rounded-full border` |
| Verde (stock ok) | `bg-green-50 text-green-600 border-green-200` |
| Naranja (stock bajo) | `bg-orange-50 text-orange-600 border-orange-200` |
| Rojo (sin stock) | `bg-red-50 text-red-600 border-red-200` |
| Rojo (atrasado) | `bg-red-50 text-destructive border border-red-100` |
| Naranja (próximo) | `bg-orange-50 text-warning border border-orange-100` |
| Verde (futuro) | `bg-green-50 text-ring border border-green-100` |
| Gris (lejano) | `bg-gray-50 text-gray-500 border border-gray-200` |

### 4.8 Skeleton Loading

| Elemento | Clases |
|----------|--------|
| Contenedor | `animate-pulse` |
| Bloque | `h-{n} bg-gray-200 rounded-{w}` |
| Avatar | `w-{n} h-{n} bg-gray-200 rounded-full shrink-0` |
| Texto línea | `h-{n} bg-gray-200 rounded w-{frac}` |

Los skeletons replican exactamente la estructura visual del contenido real (mismas clases de layout, gap, flex) para evitar saltos de layout (CLS).

### 4.9 Search Input

| Propiedad | Valor |
|-----------|-------|
| Contenedor | `relative w-full sm:w-96` |
| Icono | `absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-gray-400` |
| Input | `w-full pl-11 pr-4 py-2.5 bg-card border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-ring focus:border-ring transition-all shadow-sm` |

### 4.10 Empty States

| Propiedad | Valor |
|-----------|-------|
| Contenedor | `bg-card border border-border rounded-2xl p-12 text-center shadow-sm` |
| Icono wrapper | `w-16 h-16 bg-background border border-border rounded-full flex items-center justify-center mx-auto mb-4` |
| Título | `text-lg font-serif text-foreground mb-2` |
| Texto | `text-sm text-gray-500` |

### 4.11 Error States

| Propiedad | Valor |
|-----------|-------|
| Contenedor | `p-12 text-center text-destructive` |
| Mensaje | Texto amigable: "No pudimos cargar los {recurso} en este momento. Por favor, intenta de nuevo." |

### 4.12 Dashboard — Stat Card

Tarjetas KPI del dashboard principal. Diseño compacto con borde accent en la parte superior.

| Propiedad | Valor |
|-----------|-------|
| Contenedor | `bg-card border border-border border-t-2 border-t-primary/30 rounded-lg p-4 flex items-center gap-3 hover:shadow-md hover:border-t-primary/60 transition-all duration-200 cursor-default group` |
| Icono wrapper | `bg-primary/10 p-2.5 rounded-lg shrink-0 group-hover:bg-primary/20 transition-colors` |
| Icono | `text-lg text-primary` |
| Label | `text-[10px] font-semibold tracking-widest text-muted-foreground uppercase` |
| Número KPI | `text-2xl font-serif text-foreground leading-tight` |

**Regla:** El borde superior `border-t-2 border-t-primary/30` crea un accent visual sutil que intensifica en hover (`hover:border-t-primary/60`). El icono usa `bg-primary/10` con transición a `group-hover:bg-primary/20`. El layout es compacto (`p-4`, `gap-3`, `items-center`) para mantener las cards visiblemente más pequeñas que las secciones principales.

### 4.13 Dashboard — Section Card

Contenedores de sección del dashboard (retoques, turnos, movimientos). Mismo patrón de borde accent que las stat cards.

| Propiedad | Valor |
|-----------|-------|
| Contenedor | `bg-card border border-border border-t-2 border-t-primary/30 rounded-lg p-6 shadow-sm hover:border-t-primary/60 transition-all duration-200` |
| Título sección | `text-xl font-serif text-foreground` |
| Subtítulo | `text-sm text-muted-foreground mt-1` |
| Skeleton blocks | `bg-muted` (no `bg-gray-200`) |

**Regla:** Los skeleton loading usan `bg-muted` en lugar de `bg-gray-200` para mantener consistencia con los tokens del theme y soporte correcto de dark mode. El borde superior `border-t-primary/30` intensifica a `/60` en hover para feedback visual consistente con las stat cards.

### 4.14 Dashboard — Timeline Item (Retoques)

Items individuales dentro del timeline de retoques próximos.

| Propiedad | Valor |
|-----------|-------|
| Contenedor | `relative flex justify-between items-center bg-card border border-border rounded-lg p-4 shadow-sm ml-6 hover:shadow-md hover:border-primary/30 transition-all duration-200` |
| Dot indicador | `absolute -left-11.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 rounded-full {dotColor} ring-4 ring-card` |
| Avatar iniciales | `w-10 h-10 shrink-0 rounded-full bg-primary/10 flex items-center justify-center font-serif text-lg text-primary` |
| Nombre cliente | `font-medium text-foreground truncate` |
| Nombre servicio | `text-sm text-muted-foreground mt-0.5 truncate` |
| Badge status | `inline-block px-2.5 py-0.5 text-xs font-semibold rounded-full mb-1.5 {pillClass}` |
| Fecha | `text-xs text-muted-foreground font-medium` |
| Botón cancelar | `w-8 h-8 bg-card border border-border rounded-full flex items-center justify-center text-muted-foreground hover:bg-destructive-subtle hover:text-destructive hover:border-destructive transition-all cursor-pointer shadow-sm` |
| Botón completar | `w-8 h-8 bg-card border border-border rounded-full flex items-center justify-center text-muted-foreground hover:bg-ring-subtle hover:text-ring hover:border-ring transition-all cursor-pointer shadow-sm` |

**Regla crítica:** El `ring` del dot indicador DEBE usar `ring-card` (no `ring-white`) para que funcione correctamente en dark mode. El token `--color-card` se adapta automáticamente entre modos.

### 4.15 Dashboard — Turno Item

Items de la lista de próximos turnos. Incluye barra de color del profesional.

| Propiedad | Valor |
|-----------|-------|
| Contenedor | `flex items-center gap-3 p-3 bg-card border border-border rounded-lg hover:shadow-md hover:border-primary/30 transition-all duration-200` |
| Barra profesional | `shrink-0 w-1 h-8 rounded-full` con `style={{ backgroundColor: appt.professional?.color }}` |
| Nombre cliente | `font-medium text-foreground text-sm truncate` |
| Nombre servicio | `text-xs text-muted-foreground truncate` |
| Fecha/hora | `text-xs text-muted-foreground/70 mt-0.5` |
| Botones acción | Mismo patrón que Timeline Item (ver 4.14) |

**Regla:** La barra de color del profesional usa un `div` vertical de 1px de ancho (`w-1`) con la color del professional como inline style. El fallback es `#9CA3AF` (gray-400) cuando no hay color definido.

### 4.16 Dashboard — Pending Alert

Alerta de turnos pendientes de registrar. Usa tokens `warning` del theme (no amber hardcodeado).

| Propiedad | Valor |
|-----------|-------|
| Contenedor | `bg-warning/10 border border-warning/30 rounded-lg p-5 flex items-start gap-4 shadow-sm` |
| Icono wrapper | `p-2.5 bg-warning/20 rounded-lg shrink-0` |
| Icono | `text-xl text-warning` |
| Título | `text-sm font-semibold text-warning-foreground` |
| Descripción | `text-xs text-muted-foreground mt-1 mb-3` |
| Link | `text-xs font-semibold text-warning-foreground underline hover:text-warning transition-colors` |

**Regla de tokens:** Esta alerta DEBE usar tokens `warning` del theme (`bg-warning/10`, `text-warning`, `text-warning-foreground`) en lugar de colores amber hardcodeados (`bg-amber-50`, `text-amber-800`). Los tokens se adaptan automáticamente entre light y dark mode.

### 4.17 Dashboard — Movement Item

Items de la grilla de "Últimos movimientos". Cada item es un chip con fondo sutil para máxima claridad visual.

| Propiedad | Valor |
|-----------|-------|
| Grid container | `grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3` |
| Item | `flex items-center gap-3 bg-muted/30 hover:bg-muted/50 rounded-lg px-3 py-2.5 transition-colors group cursor-default` |
| Dot indicator | `w-2 h-2 rounded-full bg-primary/40 group-hover:bg-primary shrink-0 transition-colors` |
| Nombre cliente | `font-medium text-foreground text-sm truncate` |
| Nombre servicio | `text-xs text-muted-foreground truncate` |
| Fecha | `text-[11px] text-muted-foreground font-medium tracking-wide shrink-0` |

**Regla:** Cada movimiento se renderiza como un chip con `bg-muted/30` para diferenciarlo visualmente del fondo de la section card. El dot usa `bg-primary/40` que intensifica a `bg-primary` en hover del grupo (`group-hover`). El layout horizontal (`items-center`) mantiene dot + contenido + fecha en una sola línea para escaneo rápido.

---

## 5. Bordes, Sombras y Radios

| Elemento | Border Radius |
|----------|---------------|
| Tarjetas, modales, contenedores | `rounded-lg` (8px) |
| Inputs, botones de modal | `rounded-lg` (8px) |
| Badges, pills | `rounded-full` (9999px) |
| Botones de acción (header) | `rounded-full` (9999px) |
| Avatares, indicadores de timeline | `rounded-full` (9999px) |
| Tabla, contenedor de tabla | `rounded-lg` (el overflow-hidden lo aplica) |

- **Bordes:** El divisor por defecto es `1px` sólido usando `--color-border` (`#ebe0da`).
- **Sombras:** Se usa `shadow-sm` para separar planos elevados en reposo. `shadow-md` en hover de cards interactivas. Prohibido `shadow-xl` o sombras difusas excepto en modales.
- **Hover en cards:** `hover:shadow-md transition-all` (en cards de servicios, profesionales, etc.).

---

## 6. Accesibilidad (WCAG 2.1 Nivel AA)

### La Regla de Oro de la Trifecta Visual (Checkpoint C6)

Queda terminantemente prohibido delegar la comunicación de un estado crítico **únicamente a un código de color**. Todo componente visual que exprese estados sensibles debe incluir de forma simultánea:

1. **Color Semántico:** Texto e icono en el color del estado (rojo/naranja/verde).
2. **Icono Descriptivo:** Provisto por `react-icons/fi` (Feather Icons).
3. **Texto Descriptivo Claro:** Explicación textual del estado.

#### Implementaciones existentes en la codebase:

| Estado | Color | Icono | Texto |
|--------|-------|-------|-------|
| Notas médicas (cliente) | `--color-warning` | `(ninguno aún)` | Badge "Notas Médicas" con fondo `bg-orange-50` |
| Stock bajo | `--color-warning` | `FiAlertTriangle` | Card "Stock Bajo (≤ 5)" con conteo |
| Sin stock | `--color-destructive` | `FiBox` | Card "Sin Stock" con conteo |
| Retoque atrasado | `--color-destructive` | (dot color) | Label "Atrasado Xd" |
| Retoque próximo | `--color-warning` | (dot color) | Label "En X días" / "Mañana" |
| Error en formulario | `--color-destructive` | `FiAlertCircle` | Mensaje de error debajo del input |
| Operación exitosa | `--color-ring` | (toast nativo) | Toast "Cliente registrado exitosamente" |

### Gestión de Foco

- Todos los elementos interactivos usan `focus:outline-none` con `focus:ring-2 focus:ring-ring` (inputs) o patrón equivalente.
- Botones icon-only deben tener `aria-label` descriptivo.
- Checkboxes deben tener `<label>` asociado.

---

## 7. Notificaciones (Toast)

- **Librería:** `sonner` (`toast.success()`, `toast.error()`, `toast.info()`).
- **Posición:** Top-right (default de sonner).
- **Estilo personalizado para éxito:**
  ```tsx
  toast.success('Mensaje', {
    style: { background: '#fff9f6', color: '#6b8e7b', borderColor: '#6b8e7b' }
  })
  ```
- **Duración:** Default de sonner (aproximadamente 4s).

---

## 8. Responsive Breakpoints

| Breakpoint | Clase | Comportamiento |
|------------|-------|----------------|
| Móvil (`<640px`) | Default | Layout vertical, sidebar oculto, botones full-width relativos |
| Tablet (`≥640px`) | `sm:` | Header con flex row, sidebar visible, grid de 2 columnas |
| Desktop (`≥768px`) | `md:` | Sidebar fijo a la izquierda, grid de 2-3 columnas, hover reveals |
| Desktop grande (`≥1024px`) | `lg:` | Grid de 3 columnas, sidebar + contenido en fila |

Sidebar: en móvil ocupa toda la pantalla con slide-in; en `md:` es fija (`fixed md:relative`).

---

## 9. Animaciones y Transiciones

- **Hover en botones:** `transition-all duration-200` con lift (`hover:-translate-y-0.5`), elevación (`hover:shadow-md`) y snap back (`active:translate-y-0 active:shadow-sm`). Ver §4.2 para patrón completo.
- **Hover en cards/filas:** `transition-colors` (150ms). Solo bots de acción usan lift.
- **Hover reveals:** `sm:opacity-0 sm:group-hover:opacity-100 transition-opacity`.
- **Sidebar móvil:** `transform transition-transform duration-300 ease-in-out`.
- **Skeleton loading:** `animate-pulse` (Tailwind nativo, 2s infinite).
- **Modal overlay:** sin animación de entrada (inmediatez). `backdrop-blur-sm` estático.
- **Prohibido:** sombras animadas, gradientes, Framer Motion o librerías de animación externas.
- **Prohibido en no-botones:** La animación de lift (`hover:-translate-y-0.5`) NO se aplica a `<li>`, `<tr>`, `<div>`, `<label>`, ni toggles.

### 9.1 Page Transitions (Transiciones entre Vistas)

Toda vista que se renderice dentro de `AppLayout` lleva una transición de entrada CSS al navegar entre secciones. Aplica a vistas actuales y futuras sin excepción.

| Parámetro | Valor | Justificación |
|-----------|-------|---------------|
| Animación | `fadeIn` + `slideUp` | Entrada limpia y sutil, coherente con minimalismo |
| Duración | `200ms` | Rápido pero perceptible (>300ms se siente lento) |
| Easing | `ease-out` | Desaceleración natural al final |
| Desplazamiento Y | `8px` (`translateY(8px)`) | Micro-movimiento vertical, nada dramático |
| Opacidad | `0 → 1` | Fade in suave |

**Keyframes:**

```css
@keyframes pageIn {
  from {
    opacity: 0;
    transform: translateY(8px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
```

**Clase utilitaria:** `.animate-page-in { animation: pageIn 200ms ease-out; }`

**Implementación en AppLayout:** Un `<div key={location.pathname} className="animate-page-in">` envuelve al `<Outlet />`. El `key` con la ruta fuerza el re-montado del componente al navegar, disparando la animación en cada cambio de ruta.

**Regla:** Esta transición es global y automática. Las vistas NO deben declarar su propia animación de entrada. La única clase necesaria es `.animate-page-in` aplicada por el layout.

---

## 10. Iconografía

- **Set:** `react-icons/fi` (Feather Icons — iconos delgados y minimalistas).
- **Tamaños:** `text-lg` (1.125rem), `text-xl` (1.25rem), `text-2xl` (1.5rem), `text-5xl` (3rem para estados vacíos).
- **Íconos usados en la codebase existente:**

| Icono | Uso |
|-------|-----|
| `FiUsers` | KPI Total de Clientes |
| `FiScissors` | KPI Servicios Realizados, estado vacío servicios |
| `FiCalendar` | KPI Próximos Retoques |
| `FiPlus` | Botón Nueva Visita, Agregar Servicio/Cliente/Producto |
| `FiCheck` | Botón completar retoque |
| `FiEdit2` | Botón editar (servicios, productos) |
| `FiTrash2` | Botón eliminar (servicios) |
| `FiClock` | Badge de retoque en días |
| `FiBox` | Estado vacío / Sin Stock |
| `FiAlertTriangle` | Alerta stock bajo |
| `FiLayers` | KPI Total Productos |
| `FiActivity` | Botón Ajustar Stock |
| `FiUploadCloud` | Carga Masiva |
| `FiSearch` | Input de búsqueda |
| `FiFileText` | Icono archivo cargado |
| `FiCheckCircle` | Confirmar Carga (masiva) |
| `FiUser` | Botón Ver Perfil (cliente) |
| `FiPhone` | Teléfono del cliente |
| `FiMenu` | Hamburguesa (sidebar móvil) |
| `FiX` | Cerrar (modal, sidebar móvil) |
| `FiAlertCircle` | Error de formulario |
| `FiInfo` | Info banner (producto en edición) |
| `FiArrowUpRight` / `FiArrowDownRight` | Ajuste de stock (ingreso/egreso) |

---

## 11. Scrollbar Personalizado

Clase utilitaria `custom-scrollbar` para listas internas con overflow:

```css
.custom-scrollbar::-webkit-scrollbar { width: 4px; }
.custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
.custom-scrollbar::-webkit-scrollbar-thumb {
  background-color: var(--color-border);
  border-radius: 20px;
}
.custom-scrollbar:hover::-webkit-scrollbar-thumb {
  background-color: #ebe0da;
}
```

---

## ❌ Qué NO Hacer en la Capa Visual

- ❌ No usar sombras pesadas (`shadow-lg`, `shadow-xl`) ni efectos de desenfoque de fondo (`backdrop-blur-sm` solo autorizado en overlay de modal y sidebar móvil).
- ❌ No introducir colores fuera de los tokens definidos en `index.css` o Tailwind nativos `gray-*`. Prohibido gradientes.
- ❌ No omitir el atributo `aria-label` en botones interactivos que contengan exclusivamente un icono gráfico.
- ❌ No usar fuentes distintas a las dos autorizadas: `Fraunces` (serif) y `Manrope` (sans).
- ❌ No usar Framer Motion ni librerías de animación externas. Solo utilidades nativas de Tailwind (`transition-*`, `animate-pulse`, `transform transition-transform`).
- ❌ No introducir animaciones de entrada en modales, alertas o notificaciones. Deben aparecer instantáneamente.
