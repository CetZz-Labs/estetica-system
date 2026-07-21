# Plan completo — Rediseño de interfaz al Sistema de Diseño «Shear»

> **Estado:** Planificado y aprobado por el usuario. Ningún código fue tocado todavía (esta sesión
> se mantuvo en modo planificación). El siguiente arranque debe ejecutar el Protocolo de Arranque
> de `CLAUDE.md` y luego retomar este plan desde la **Etapa 1**.
> Copia idéntica también guardada fuera del repo en
> `C:\Users\facun\.claude\plans\cambie-por-completo-el-quiet-starlight.md`.

---

## Contexto

`docs/design.md` fue reemplazado por completo. Define un nuevo sistema visual para **Shear**
(CRM de estéticas, multitenant): minimalismo cálido y femenino, tipografía serif
`Cormorant Garamond` + sans `Figtree`, paleta de tokens hex (`bg`, `surface`, `wine`, `sage`,
`gold`, `accent`, `accent-rose`, tintes de estado), **sin modo oscuro**, **sin sombras de
tarjeta**, **sin gradientes ni animaciones de lift**, y un layout de **sidebar 236px + topbar
66px** con navegación por puntos de color (sin íconos de librería en el nav).

La app en producción está en el sistema **opuesto y obsoleto**: tokens estilo shadcn (`--primary`,
`--card`, `--muted`…), fuentes `Fraunces`/`Manrope`, bloque `.dark` completo, sombras (`shadow-lg`
en el wrapper de contenido, ~132 usos), animación `pageIn` con `translateY`, y navegación con
íconos `react-icons/fi`. El propio `design.md` declara ese sistema "obsoleto".

**Objetivo:** migrar toda la **app autenticada** al sistema Shear, empezando por `index.css` como
fundación. La **Landing pública** (`Landing.tsx` + `components/react-bits/`) queda **fuera de este
ciclo** (fase 2 planificada, no ejecutada). El **modo oscuro se elimina por completo**. El topbar
se cablea con un **contexto de layout** por el que cada vista declara su título y acción principal.

### Decisiones ya resueltas con el usuario (no volver a preguntar)

1. **Alcance Landing:** la Landing pública (`Landing.tsx` + `components/react-bits/` +
   `motion`/`gsap`/`ogl`) **queda intacta** en este ciclo. Se planifica como feature aparte para
   una fase 2 posterior (ver Etapa 0). No desinstalar esas dependencias todavía.
2. **Modo oscuro:** se **elimina por completo** (`ThemeToggle.tsx`, `useIsDark.ts`, bloque `.dark`
   de `index.css`, `@custom-variant dark`, los 3 puntos de montaje). La app queda solo en el tema
   claro cálido de Shear.
3. **Topbar:** se resuelve con un **contexto de layout** (`TopbarProvider` + hook `useTopbar()`)
   por el que cada vista declara su título y su acción principal («+ Nueva cita», «+ Nuevo
   cliente», etc.), y `AppLayout` renderiza el topbar de 66px leyendo ese contexto.

### Hallazgos clave de la exploración

- **Tailwind v4 CSS-first**: no hay `tailwind.config`. `src/index.css` con `@import "tailwindcss"`
  + bloque `@theme inline` es la única fuente de tokens. Renombrar tokens ahí reprograma todas las
  clases utilitarias (`bg-card`, `text-foreground`, `border-border`, etc.).
- **`desing-system.md` (fuente "canónica" citada por design.md) NO existe** en el repo — referencia
  colgante (confirmado con `git ls-files` y `git log --all`, y grep de la cadena `desing-system`
  que solo aparece dentro del propio `docs/design.md`). El bloque `:root` de `design.md §14` es el
  **único** origen de verdad de los tokens.
- **Blast radius** (conteos aproximados vía grep, ~28 archivos epicentro `src/views/`):
  - `bg-background` ~209 usos / 26 archivos (Dashboard 27, Landing 19, CargaMasivaClientesModal 18,
    CargaMasivaModal 15, AppointmentDetail 12)
  - `text-muted-foreground` ~136 usos / 9 archivos (Dashboard 41, Historial 25, Turnos 18,
    Inventario 17, AppointmentDetail 14)
  - `text-foreground` ~99 usos / 22 archivos (Landing 29, Dashboard 16, Inventario 6, ProfileClient 5)
  - `border-border` ~86 usos / 28 archivos (muy disperso: Negocio 6, Disponibilidad 6,
    ClienteModal 5, Profesionales 5)
  - `bg-card` ~71 usos / 17 archivos (Dashboard 18, Inventario 9, Landing 7)
  - `bg-muted` ~60 usos / 9 archivos (Dashboard 20, Historial 8, Inventario 8)
  - `bg-primary` ~52 usos / 22 archivos (Landing 12, Dashboard 6, Inventario 4)
  - `text-primary` ~35 usos / 14 archivos (Landing 8, Inventario 5, Dashboard 4)
  - `bg-accent` (token viejo) ~19 usos / 11 archivos
  - `bg-secondary`: 0 usos (no se usa en ningún lado)
  - Sombras (`shadow-`, `hover:shadow`, `boxShadow`): ~132 usos / 25 archivos (Landing 15,
    index.css 12, Turnos 11, Inventario 11, Profesionales 10, Dashboard 16, ProfileClient 7,
    Disponibilidad 7; también `GlassIcons.css` 2, `GradientText.css` 1)
  - Lift/scale (`translateY`, `hover:-translate`, `hover:scale`): ~45 usos / 16 archivos
    (Profesionales 6, Inventario 5, Turnos 5, Dashboard 4, más la keyframe `pageIn` de index.css)
  - `font-serif`/`font-sans`: ~64 usos / 18 archivos (remapean solos al cambiar `--font-serif`/
    `--font-sans` en `@theme`, no requieren tocar cada uso)
- **Modo oscuro** aislado en 5 archivos/puntos:
  - `src/index.css` líneas 46-82 (bloque `.dark`) + línea 5 (`@custom-variant dark`)
  - `src/components/ui/ThemeToggle.tsx` (botón flotante, lee/escribe `localStorage['theme']`,
    fallback `prefers-color-scheme`, toggla clase `dark` en `document.documentElement`)
  - `src/hooks/useIsDark.ts` (MutationObserver sobre la clase de `<html>`)
  - Montajes: `src/layouts/AppLayout.tsx` (líneas 8-9 imports, 23 hook, 68/91 logo condicional,
    186 `<ThemeToggle/>`), `src/views/Landing.tsx` (línea 557 `<ThemeToggle/>`, 2 usos de `dark:`),
    `src/views/AceptarInvitacion.tsx` (línea 105 `<ThemeToggle/>`)
  - Solo **2 usos** del variant `dark:` en todo `src/` (ambos en `Landing.tsx`, que queda fuera de
    este ciclo)
- **Sin primitivos de UI** salvo `components/ui/` (`Modal.tsx`, `ConfirmModal.tsx`,
  `Pagination.tsx`, `ThemeToggle.tsx`). Botones/cards/tablas/badges son Tailwind inline en cada
  vista — no hay componente Button/Card/Table/Badge reutilizable.
- Extra tokens en el `@theme` actual que no están en design.md: `warning`/`warning-foreground`,
  `destructive-subtle`, `ring-subtle`, set completo `sidebar-*`. Se remapean o eliminan (ver
  Etapa 1).
- **Dependencias de animación** (todas en `package.json`, usadas solo por Landing/react-bits):
  `motion@^12.40.0` (Framer Motion), `gsap@^3.15.0` + `@gsap/react@^2.1.2`, `ogl@^1.0.11`. No
  tocar en este ciclo.
- **react-bits** (`src/components/react-bits/`, 11 componentes: Aurora, ClickSpark, CountUp,
  GlareHover, GlassIcons, GradientText, ShinyText, SplitText, SpotlightCard, StarBorder, TextType)
  — solo consumidos por `Landing.tsx` (Aurora, TextType, CountUp, ShinyText, GradientText,
  ClickSpark, StarBorder, SpotlightCard). `GlareHover` y `GlassIcons` están definidos pero sin
  consumidores. Todo esto queda intacto (fase 2).

### Mapa completo de vistas y componentes (para las Etapas 2-4)

**`views/` (rutas):**

| Vista | Ruta | Guard | Rol en el rediseño |
|---|---|---|---|
| `Landing.tsx` | `/` | pública | **Fuera de ciclo** (fase 2) |
| `Login.tsx` | `/login/*` | pública | Etapa 4 (menor prioridad) |
| `Register.tsx` | `/registro/*` | pública | Etapa 4 |
| `CompletarRegistro.tsx` | `/registro/completar` | pública | Etapa 4 |
| `AceptarInvitacion.tsx` | `/unirse` | pública | Etapa 2 (quitar ThemeToggle) + Etapa 4 (estilos) |
| `Dashboard.tsx` | `/dashboard` | auth | Etapa 3 (Inicio, KPIs, bloque wine) |
| `Clients.tsx` | `/clientes` | auth | Etapa 3 (tabla) |
| `ProfileClient.tsx` | `/clientes/:id` | auth | Etapa 4 |
| `Servicios.tsx` | `/servicios` | auth | Etapa 4 (cards de categoría) |
| `Profesionales.tsx` | `/profesionales` | ADMIN | Etapa 4 |
| `Turnos.tsx` | `/turnos` | auth | Etapa 4 (Agenda — la más compleja) |
| `Historial.tsx` | `/historial` | auth | Etapa 3 (listado paginado) |
| `Inventario.tsx` | `/inventario` | ADMIN, PROFESSIONAL | Etapa 3 (tabla productos) |
| `Negocio.tsx` | `/configuracion/negocio` | ADMIN | Etapa 4 |
| `Disponibilidad.tsx` | `/configuracion/disponibilidad` | ADMIN | Etapa 4 |
| `NotFound.tsx` | `*` | — | Etapa 4 |

**`components/` (modales/feature-level):** `ClienteModal.tsx`, `ProductoModal.tsx`,
`ProfesionalModal.tsx`, `ServicioModal.tsx`, `RegistroModal.tsx`, `AjusteStockModal.tsx`,
`CargaMasivaModal.tsx`, `CargaMasivaClientesModal.tsx`, `AppointmentDetail.tsx` — repartidos entre
Etapas 3 y 4 según la vista que los usa.

**`components/ui/` (primitivos compartidos):** `Modal.tsx` (overlay + backdrop-blur, header con
título/subtítulo/ícono/close, body scrolleable, footer opcional, `maxWidth` configurable),
`ConfirmModal.tsx` (construido sobre `Modal`, ícono de warning, botones Cancelar/Confirmar),
`Pagination.tsx` ("Mostrando X–Y de N" + Anterior/Siguiente), `ThemeToggle.tsx` (**se borra**,
Etapa 2).

**Layout/routing:** `src/layouts/AppLayout.tsx` (shell único, sin Topbar propio hoy — ver Etapa 2),
`src/router.tsx` (react-router v7, `BrowserRouter`, rutas públicas sin layout + rutas protegidas
hijas de `<AppLayout/>`, `ProtectedRoute roles={[...]}` para gating), `src/hooks/useIsDark.ts`
(**se borra**), `src/utils/appointmentStatus.tsx` (mapeo estado→label/badge/color, reutilizar para
badges §8), `src/utils/dates.ts` (`formatCalendarDate`/`formatDateTime` — usar siempre, prohibido
reimplementar `toLocaleDateString` ad-hoc), `src/utils/contrastColor.ts` (color de texto legible
sobre un bg — útil para avatares/tints §7.10).

---

## Rol y estrategia de entrega

Actúo como **orquestador**: no edito `apps/client/src/` directamente. Todo el código lo producen
subagentes `implementer` (sandbox `apps/client`), auditados por `reviewer` contra `design.md` y
`CHECKPOINTS.md`. Por ser un cambio **transversal** (toca la fundación de estilos + todas las
vistas), aplico **PRs apiladas / fragmentos < 400 líneas** por etapa (matriz de escalado de
CLAUDE.md). Cada etapa: marcar feature `in_progress` en `feature_list.json` → `implementer` →
`build` verde → `reviewer` → `history.md` → archivar evidencias.

> **Decisión de naming de tokens**: se adoptan los nombres **literales de design.md** como clases
> Tailwind (`bg-bg`, `bg-surface`, `text-text`, `text-text-2`, `bg-wine`/`text-wine`, `bg-sage`,
> `bg-gold`, `text-accent`, `bg-accent-rose`, `bg-rose-bg`, `bg-sage-bg`, `bg-gold-bg`,
> `bg-alert-bg`, etc.). Se aceptan las formas `bg-bg`/`text-text` por trazabilidad 1:1 con el doc
> — el `reviewer` audita clase-contra-tabla sin traducción mental. Los tokens viejos
> (`primary`, `card`, `muted`, `foreground`, `background`, `border`, `accent`, `secondary`) se
> **retiran** del `@theme`; sus usos se migran vista por vista en las etapas 3–4.

---

## Etapa 0 — Fase 2 planificada (fuera de este ciclo)

Rediseño de `Landing.tsx` bajo el sistema Shear (eliminar `react-bits/`, `motion`, `gsap`, `ogl`,
auroras/gradientes/shine). **No se ejecuta ahora.** Se registra como feature aparte en
`feature_list.json` para un ciclo posterior. Las dependencias `motion`/`gsap`/`@gsap/react`/`ogl`
**no se desinstalan** todavía (siguen en uso por la Landing intacta).

---

## Etapa 1 — Fundación: `index.css` + `index.html` (base del sistema)

**Archivos:** `apps/client/src/index.css`, `apps/client/index.html`

### `index.css` — reescritura completa

1. **Fuentes**: reemplazar el `@import url(...Fraunces...Manrope...)` (línea 1 actual) por
   `Cormorant Garamond` (ital 500/600/700) + `Figtree` (400/500/600/700), tal cual el `<link>` de
   `design.md §3`:
   ```html
   <link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,500;0,600;0,700&family=Figtree:wght@400;500;600;700&display=swap" rel="stylesheet">
   ```
2. **`:root`**: reemplazar todo el bloque de tokens actual (líneas 7-44 de `index.css`) por el de
   `design.md §14` — traducidos a la forma `@theme` de Tailwind v4. Definir como custom properties
   **todos** los tokens: `--bg` (`#FAF6F4`), `--surface` (`#FFFFFF`), `--surface-2` (`#FDFAFB`),
   `--border` (`#F0E4E4`), `--border-soft` (`#F7EFF1`), `--dotted` (`#E7D8DC`), `--text`
   (`#3E2A33`), `--text-2` (`#5C4650`), `--text-3` (`#7A666E`), `--muted` (`#A08D95`),
   `--placeholder` (`#B9A6AD`), `--accent` (`#B76E84`, personalizable por tenant), `--accent-rose`
   (`#D98BA4`), `--wine` (`#6B3444`), `--sage` (`#8C9178`), `--gold` (`#C89A5B`), `--rose-bg`
   (`#F7E7EC`), `--sage-bg` (`#EEF0E6`), `--gold-bg` (`#F6EFE3`), `--wine-bg` (`#EFE3E8`),
   `--alert-bg` (`#F9E8E2`), y los pares de texto de badges/tintes que solo viven en tablas §2/§8:
   `--sage-text` (`#71774F`), `--gold-text` (`#A87C3F`), `--alert-text` (`#B0553F`), `--rose-text`
   (`#B76E84`), `--accent-tint` (`#E3B9C6`), `--hover-soft` (`#FAF3F5`). Radios: `--r-card:14px`,
   `--r-ctrl:10px`, `--r-pill:99px`.
3. **`@theme inline`**: mapear `--color-*` a los tokens nuevos con nombres literales de design.md
   (genera `bg-bg`, `bg-surface`, `bg-surface-2`, `text-text`, `text-text-2`, `text-text-3`,
   `text-muted`, `bg-accent`, `text-accent`, `bg-accent-rose`, `bg-wine`, `text-wine`, `bg-sage`,
   `text-sage`, `bg-gold`, `text-gold`, `border-border`, `border-border-soft`, `border-dotted`,
   `bg-rose-bg`, `bg-sage-bg`, `bg-gold-bg`, `bg-wine-bg`, `bg-alert-bg`, etc.).
   `--font-serif: 'Cormorant Garamond', serif`, `--font-sans: 'Figtree', sans-serif` (las 64
   clases `font-serif`/`font-sans` existentes remapean solas sin tocarlas). Definir radios como
   `--radius-*` (`--radius-card: 14px`, `--radius-ctrl: 10px`, `--radius-pill: 99px`) para que
   `rounded-*` funcione.
4. **Eliminar**: el bloque `.dark { … }` completo (líneas 46-82 actuales), `@custom-variant dark`
   (línea 5), toda la escala `--shadow-sm..xl` (definida en `:root`, `.dark` y `@theme` — design.md
   prohíbe sombras de tarjeta; las 2 micro-sombras permitidas —knob de toggle
   `0 1px 3px rgba(0,0,0,0.2)` y segmented activo `0 1px 3px rgba(107,52,68,0.12)`— se aplican
   inline donde correspondan en los componentes, no como variable global), y la keyframe `pageIn` +
   `.animate-page-in` (líneas 152-165, usa `translateY` — animación de lift prohibida). Si se desea
   una transición de página, reemplazar por un fade puro sin desplazamiento (opcional, no
   obligatorio).
5. **Base styles** de design.md §14: `a{color:var(--accent);text-decoration:none} a:hover{color:var(--wine)}`,
   scrollbar (`::-webkit-scrollbar{width:8px;height:8px}`, thumb `var(--dotted)`, radio 8px),
   `input::placeholder{color:#B9A6AD}`, `input:focus{outline:none;border-color:var(--accent-rose)}`.
   Conservar `.custom-scrollbar` (líneas 138-150 actuales) remapeado a los tokens nuevos (thumb
   `var(--border)` / hover `var(--dotted)` en vez de `#ead9cf`).

### `index.html`

- Reemplazar el `<link>` de fuentes (línea 10 actual) por Cormorant Garamond + Figtree (mismo que
  en `index.css §3` arriba). Mantener los `<link rel="preconnect">` de Google Fonts (líneas 8-9).
- `<html lang="es">`/`<body>` no tienen clase de tema (confirmado — no hay `class="dark"` ni
  `data-theme`): no hay que tocar nada de dark ahí.

**Verificación etapa 1**: `pnpm --filter @estetica/client build` exit 0. La app compila aunque las
vistas aún referencien clases viejas retiradas → por eso la etapa 1 se **coordina** con la 2 para
no romper el build (ver nota de secuenciación abajo).

> **Secuenciación crítica**: retirar los tokens viejos del `@theme` rompe ~500 clases. Para que el
> build no quede rojo entre etapas, la **Etapa 1 mantiene temporalmente alias de los tokens viejos**
> (`--color-primary`, `--color-card`, `--color-foreground`, `--color-background`, `--color-muted`,
> `--color-muted-foreground`, `--color-border`, `--color-accent` viejo, `--color-secondary`)
> apuntando al valor Shear más cercano (ej. `--color-primary: var(--accent)`,
> `--color-card: var(--surface)`, `--color-foreground: var(--text)`,
> `--color-background: var(--bg)`, `--color-muted: var(--surface-2)`,
> `--color-muted-foreground: var(--muted)`, `--color-border: var(--border)`,
> `--color-secondary: var(--rose-bg)`). Esos alias se **eliminan en la Etapa 5** (limpieza) una vez
> migradas todas las vistas. Así cada etapa deja el build verde.

---

## Etapa 2 — Shell: `AppLayout.tsx` + eliminación de modo oscuro

**Archivos:** `apps/client/src/layouts/AppLayout.tsx`, nuevo
`apps/client/src/layouts/TopbarContext.tsx` (o `context/TopbarContext.tsx`), **borrar**
`apps/client/src/components/ui/ThemeToggle.tsx` y `apps/client/src/hooks/useIsDark.ts`.
Tocar también `apps/client/src/views/AceptarInvitacion.tsx` (quita `<ThemeToggle/>` de línea 105)
y `apps/client/src/views/Landing.tsx` **solo** en lo estrictamente necesario para no romper el
build al borrar `ThemeToggle`/`useIsDark` (quitar el import y el montaje de línea 557 y los 2
usos de `dark:`; el resto de Landing no se toca — es fase 2).

1. **Eliminar dark mode**: borrar `ThemeToggle.tsx` y `useIsDark.ts`; quitar imports/montajes en
   `AppLayout.tsx` (líneas 8-9 imports, 23 hook `useIsDark`, 186 `<ThemeToggle/>`) y en
   `AceptarInvitacion.tsx`/`Landing.tsx`; resolver los `img src` condicionales de logo
   (`AppLayout.tsx` líneas 68 y 91: `src={isDark ? "/shear-logo-dark.png" : "/shear-logo.png"}`) a
   un único logo claro (`/shear-logo.png`).
2. **Sidebar 236px** (§6.1): cambiar de `w-64` (256px) a `w-[236px]`, `bg-surface`, borde derecho
   `border-r border-border`. Wordmark "Shear" arriba (mantener el bloque de logo actual,
   simplificado sin lógica de dark). **Navegación por puntos de color, sin íconos
   `react-icons/fi`** (§7.1): quitar los imports `FiHome, FiUsers, FiScissors, FiPackage,
   FiCalendar, FiUser, FiBriefcase, FiClock` (línea 4 actual, mantener solo `FiMenu`/`FiX` para el
   drawer móvil) y reemplazar cada `<NavLink>` por punto de 6px (`bg-accent` cuando activo /
   `bg-dotted` cuando inactivo) + texto. Estado activo = `bg-rose-bg text-wine font-bold`; inactivo
   = `text-text-3 font-medium` con hover `bg-hover-soft` (o clase equivalente mapeada a
   `#FAF3F5`). Mantener el orden y el role-gating actuales exactamente igual: Inicio · Clientes ·
   Servicios · Inventario (oculto para RECEPTIONIST) · Turnos · Historial de Visitas + sección
   "Equipo" (ADMIN: Profesionales) + sección "Configuración" (ADMIN: Mi Negocio, Disponibilidad).
   Selector de tenant fijo abajo (`margin-top:auto`, reemplaza el footer actual de
   `UserButton`+nombre+rol): avatar con inicial de la estética + nombre de estética/ubicación
   (truncado) + link secundario "Cambiar estética ↓". **Nota:** el `UserButton` de Clerk actual
   (autenticación de la usuaria, no selector de tenant) se conserva pero se reubica según el
   patrón de topbar (ver punto 3) o se mantiene en el footer del sidebar junto al selector de
   tenant si el negocio aún no diferencia "usuaria" de "tenant" — decisión de implementación menor,
   documentar en `impl_*.md`.
3. **Topbar 66px nuevo** (§6.2) + **contexto de layout**:
   - Crear `TopbarProvider` + hook `useTopbar()` que expone `{ title, primaryAction, searchSlot }`
     y un setter (`setTopbar` o similar). Cada vista, al montar, hace
     `useTopbar({ title: 'Clientes', primaryAction: { label: '+ Nuevo cliente', onClick: ... } })`
     vía `useEffect` (con cleanup opcional al desmontar).
   - `AppLayout` envuelve el `<Outlet/>` en `TopbarProvider` y renderiza el topbar leyendo del
     contexto: contenedor `surface`, borde inferior `border`, altura 66px,
     `flex items-center justify-between`. Título a la izquierda (serif 26px; en Inicio puede ser
     saludo dinámico "Buen día, {nombre}" gestionado por la propia vista Dashboard). Buscador
     centro-derecha (`bg-bg`, radio `10px`, ancho ~320-360px, placeholder "Buscar clientes,
     turnos, productos..."). Botón primario de la vista (leído del contexto, estilo §7.2).
     Avatar de usuaria a la derecha (círculo `bg-wine text-white` con iniciales) — puede
     reemplazar o convivir con el `UserButton` de Clerk existente.
4. **Contenedor de contenido** (§6.3): quitar el wrapper actual
   `bg-card border border-border rounded-xl shadow-lg` (línea 178) que envuelve todo el
   `<Outlet/>`. El contenido va directo sobre `bg-bg` con `padding: 28px`; las cards individuales
   dentro de cada vista son blancas (`bg-surface`) con borde `border-border` (sin sombra) — cada
   vista aplica esto en su propio JSX (Etapas 3-4). Quitar `key={location.pathname}
   className="animate-page-in"` (línea 180) o reemplazar por un fade puro sin `translateY`.
5. **Header móvil / drawer**: conservar el patrón responsive (sidebar → drawer en `<md`, overlay
   con backdrop), pero sin `shadow-2xl` (línea 87, usar borde en su lugar). Mantener `FiMenu`/`FiX`
   solo como controles de drawer móvil (no son íconos de navegación semántica dentro del `<nav>`,
   están permitidos como controles de UI).

**Verificación**: `pnpm --filter @estetica/client build` + `lint` verdes; navegación clickeable con
foco visible (`outline: 2px solid var(--accent-rose); outline-offset: 2px` en foco por teclado,
§11); `grep -r "useIsDark\|ThemeToggle" apps/client/src` devuelve 0 resultados.

---

## Etapa 3 — Vistas de datos: Dashboard, tablas y listados

Migración vista por vista al lenguaje Shear. Cada vista: (a) declara título/acción vía `useTopbar`,
(b) reemplaza clases de token viejas por las nuevas, (c) elimina sombras/lift, (d) aplica los
patrones de componente de `design.md §7`. Fragmentar en sub-PRs < 400 líneas.

**Representativas (epicentro):**
- `views/Dashboard.tsx` (Inicio) — el más pesado (41 usos de `text-muted-foreground`, 27 de
  `bg-background`, 20 de `bg-muted`, 18 de `bg-card`, 16 de `text-foreground`, 16 de `shadow-`,
  6 de `bg-primary`, 4 de `text-primary`, 4 de lift): 4 KPI cards en fila (§7.4 — label mayúscula
  `muted` 11.5px + cifra Cormorant 34px, sublínea de tendencia `sage`/`muted`/`alert` según
  semántica), lista "Citas de hoy" (§7.6 — hora + punto de categoría + nombre + servicio/profesional
  + badge de estado), panel lateral "Poco stock" (§7.7 — nombre + cantidad + barra de progreso
  `alert` cuando bajo mínimo), y el **único** bloque destacado `wine` "Ingresos de la semana" con
  mini-gráfico de barras de 7 columnas (§7.5). Aquí se define la jerarquía de KPI (label chico
  `muted` uppercase + cifra serif) que audita el reviewer contra el criterio Refactoring-UI de
  `frontend.md`.
- `views/Clients.tsx` + `components/ClienteModal.tsx` + `CargaMasivaClientesModal.tsx` — tabla
  §7.8 (cabecera `surface-2`, avatar con inicial tint rotativo §7.10 determinístico por id/nombre,
  columna contacto teléfono/email, badge de preferencia §4 por categoría de servicio favorita).
- `views/Historial.tsx` — listado paginado (patrón `{data,meta}` ya usado + `Pagination.tsx`
  remapeado a tokens nuevos).
- `views/Inventario.tsx` (Productos) + `ProductoModal.tsx` + `AjusteStockModal.tsx` +
  `CargaMasivaModal.tsx` — tabla con columna categoría (`muted`, texto plano sin badge) y columna
  stock en `alert` cuando está bajo mínimo (§7.8), badges de estado "En stock"/"Reponer" (§8).
- `components/ui/Modal.tsx`, `ConfirmModal.tsx`, `Pagination.tsx` — remapear a tokens nuevos, quitar
  `backdrop-blur`/sombras que no cumplan con §5 (evaluar si el overlay de fondo puede conservar
  opacidad sin blur decorativo); botones internos siguen el patrón §7.2.

**Patrón de botón (§7.2)** aplicado en todas: primario `bg-accent text-white font-semibold`
padding `10px 18px` radio `10px`, hover `opacity-90` (sin lift/sombra); secundario
`bg-white border border-dotted text-wine` mismo padding/radio, hover `bg-hover-soft`; link
`text-accent font-semibold text-[13px]` sin fondo/borde. Badges/estado siempre **color + texto**
(§8, trifecta de accesibilidad de `frontend.md §3.5` y `governance-rules.md`).

---

## Etapa 4 — Vistas restantes: Agenda, Servicios, Config, perfiles

- `views/Turnos.tsx` (Agenda) — la más específica (§9, 18 usos de `text-muted-foreground`, 11 de
  `shadow-`, 5 de lift): mini calendario 7 columnas L-D (día actual `bg-accent text-white`, días
  con turnos `bg-rose-bg`), legend "Equipo" con punto de color fijo por profesional + nombre + rol
  (`muted` debajo), vista Día con columnas por profesional (borde superior 2px del color fijo del
  profesional: Colorista `accent-rose`, Estilista `sage`, Manicurista `gold`, Cosmetóloga `wine`) y
  bloques de turno posicionados en absoluto (relleno = tinte de la **categoría del servicio** §4,
  borde izquierdo 3px del mismo color — **no confundir con el color de profesional**), grilla
  horaria de fondo con líneas `border-soft` cada 56px (1 hora), segmented control Día/Semana
  (§7.13: contenedor `bg-hover-soft` radio 10px, opción activa fondo blanco + sombra
  `0 1px 3px rgba(107,52,68,0.12)` — una de las 2 sombras permitidas).
- `views/Servicios.tsx` + `ServicioModal.tsx` — cards de categoría (§7.16: punto de color de
  categoría + título serif 20px) con lista interna en formato leader dots (§7.15: nombre+duración
  a la izquierda, línea punteada `dotted` de relleno, precio `wine` peso 600 a la derecha).
- `views/Profesionales.tsx` + `ProfesionalModal.tsx` — filas de persona (§7.17: avatar §7.10 +
  nombre/email a la izquierda, badge de rol §7.9 + texto de permisos `accent` separados por " · "
  a la derecha), botón secundario "+ Invitar" (§7.2).
- `views/Negocio.tsx`, `views/Disponibilidad.tsx` — tabs (§7.12: fila con borde inferior, tab
  activo peso 700 texto `wine` borde inferior 2px `accent`, inactivo peso 500 `text-3`), inputs
  (§7.14: borde `border`, radio 10px, padding `9px 14px`, fondo `bg`, foco `accent-rose`), toggles
  (§7.11: track 38×22px radio 99px, off `dotted`, on `accent`, knob blanco con sombra permitida
  `0 1px 3px rgba(0,0,0,0.2)`), datos fiscales AR (§10: CUIT, condición IVA, alias/CBU, Mercado
  Pago).
- `views/ProfileClient.tsx`, `views/CompletarRegistro.tsx`, `views/NotFound.tsx`,
  `components/RegistroModal.tsx`, `components/AppointmentDetail.tsx` (14 usos de
  `text-muted-foreground`, 12 de `bg-background`, 7 de `shadow-`) — remapeo de tokens, tipografía
  serif en títulos, usar siempre `formatCalendarDate` (fechas date-only, fuerza `timeZone: 'UTC'`)
  y `formatDateTime` (timestamps reales) de `src/utils/dates.ts` — prohibido reimplementar
  `toLocaleDateString` ad-hoc (regla ya vigente en `frontend.md §4`).
- `views/Login.tsx`, `views/Register.tsx` — remapeo de tokens, menor prioridad (flujo Clerk, poco
  contenido visual propio).

---

## Etapa 5 — Limpieza y cierre

1. **Eliminar los alias de tokens viejos** del `@theme` de `index.css` (los que la Etapa 1 dejó como
   puente: `--color-primary`, `--color-card`, `--color-foreground`, `--color-background`,
   `--color-muted`, `--color-muted-foreground`, `--color-border`, `--color-secondary`). Confirmar
   con grep que no queda ningún uso de `bg-primary`, `bg-card`, `text-foreground`,
   `text-muted-foreground`, `bg-muted`, `bg-background`, `bg-accent` (valor viejo), `border-border`
   (verificar que apunte al valor Shear, no al viejo), `bg-secondary`, `dark:`, `shadow-*` (salvo
   las 2 micro-sombras permitidas del toggle y segmented control), `translateY` en `src/`
   (excluyendo `Landing.tsx` y `components/react-bits/`, que son fase 2).
2. **Coherencia de docs del arnés**: `CLAUDE.md`/`.claude/rules/frontend.md §4` aún citan clases
   `bg-maison-*` y fuentes Fraunces/Manrope (branding "Maison" previo, ya no aplica — el proyecto se
   llama "Shear"). Actualizar esas referencias para alinearlas con Shear/design.md (tarea de
   documentación, la hace el orquestador directamente, sin subagente, per la excepción de
   `CLAUDE.md` "Excepciones al Rol Orquestador").
3. Actualizar `progress/history.md` con la minuta de las 5 etapas, cerrar features en
   `feature_list.json` (solo el `reviewer` cambia `"status": "done"`), archivar `impl_*.md`/
   `explore_*.md` de cada etapa a `progress/{implements,explores}/_archive/` con `git mv`.
4. Restaurar `progress/current.md` a su plantilla habitual una vez cerrado el ciclo completo, y
   eliminar/archivar este archivo (`progress/plan_shear-redesign.md`) si ya no se necesita como
   referencia viva.

---

## Archivos críticos (resumen)

| Archivo | Cambio |
|---|---|
| `apps/client/src/index.css` | Reescritura: fuentes, tokens Shear, quitar `.dark`/sombras/`pageIn`, alias-puente temporales |
| `apps/client/index.html` | `<link>` de fuentes → Cormorant Garamond + Figtree |
| `apps/client/src/layouts/AppLayout.tsx` | Sidebar 236px nav por puntos, topbar 66px, quitar dark, contenedor sin sombra |
| `apps/client/src/layouts/TopbarContext.tsx` *(nuevo)* | `TopbarProvider` + `useTopbar()` para título/acción por vista |
| `components/ui/ThemeToggle.tsx`, `hooks/useIsDark.ts` | **Borrar** (fin del modo oscuro) |
| `src/views/*` (16, salvo Landing) + `src/components/*Modal.tsx` (9) + `components/ui/*` | Remapeo a tokens Shear + patrones §7 |

## Verificación end-to-end

1. **Build/lint por etapa**: `pnpm --filter @estetica/client build` y
   `pnpm --filter @estetica/client lint` → exit 0 al cerrar **cada** etapa (nunca dejar build rojo,
   gracias a los alias-puente).
2. **Correr la app** (skill `run` / `pnpm --filter @estetica/client dev`) y recorrer visualmente:
   sidebar con puntos de color y estado activo `rose-bg`/`wine`; topbar con título serif + acción;
   Dashboard con KPIs (jerarquía label/cifra), bloque `wine` único, "Poco stock" con barra `alert`;
   tablas Clientes/Productos con avatares tint rotativo y badges color+texto; Agenda con doble
   sistema de color (profesional vs categoría); modales con foco `accent-rose`.
3. **Auditoría del `reviewer`** contra `design.md` §§4–9 y la lista "❌ Qué NO hacer": sin sombras de
   card, sin gradientes, sin lift, sin modo oscuro, sin íconos en nav, todo estado con color+texto,
   contraste AA en badges.
4. **Grep de regresión** (Etapa 5): cero usos de tokens/clases viejas y de `dark:` en `src/`
   (excepto `Landing.tsx` + `components/react-bits/`, reservados a fase 2).

---

## Próximo paso al retomar esta sesión

1. Ejecutar el Protocolo de Arranque completo de `CLAUDE.md` (leer `AGENTS.md`,
   `progress/history.md`, `feature_list.json`).
2. Leer este archivo (`progress/plan_shear-redesign.md`) completo para recuperar el plan.
3. Dar de alta en `feature_list.json` las features correspondientes a las Etapas 1-5 (si no
   existen todavía) — sugerido: una feature por etapa, ej. `UX-31` (fundación CSS), `UX-32` (shell
   + topbar), `UX-33` (dashboard/tablas), `UX-34` (agenda/servicios/config), `UX-35` (limpieza).
4. Marcar la primera (`UX-31` o equivalente) como `"in_progress"` en `feature_list.json` y en
   `progress/current.md`.
5. Lanzar el `explorer` si hace falta refrescar contexto de `patterns-frontend.md`, luego el
   `implementer` con el digest de la Etapa 1 de este documento (fuentes + tokens + alias-puente).
6. Seguir el ciclo build → reviewer → history → archivar para cada etapa, en orden secuencial
   (1 → 2 → 3 → 4 → 5).
