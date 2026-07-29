# impl_UX-50 — Landing pública: página de guía del producto (`/guia`)

## Archivos creados

- `apps/client/src/components/landing/guide/guideContent.ts` — datos puros (sin JSX) de los 9
  módulos: tipos `ModuleMedia` (contrato `video`/`image`/`none`), `GuideStep`, `GuideCallout`,
  `GuideModule`, y el array `guideModules`. Copy adaptado de `docs/guia_pagina_landing.html`
  (Maison → Shear en todas las menciones, tono acercado al de `views/Landing.tsx`). El módulo 9
  (`historial`) no está en el HTML de referencia — redactado a partir de leer
  `views/Historial.tsx` (listado paginado 7/página con filtros de cliente/servicio/profesional y
  rango de fechas). Convención de nombres de assets documentada en el comentario de cabecera del
  archivo: `apps/client/public/media/<slug>/demo.mp4`.
- `apps/client/src/components/landing/guide/ModuleMedia.tsx` — render de los 3 estados de medio.
  `video`: `controls preload="none" playsInline`, sin autoplay, `poster` se omite del elemento si
  `media.poster` es `undefined` (React no renderiza props `undefined`, no hizo falta lógica extra).
  `image`: `loading="lazy"` + `decoding="async"`. Los 3 estados comparten `aspect-video` para que
  ninguno produzca salto de layout.
- `apps/client/src/components/landing/guide/GuideIndex.tsx` — índice de módulos con
  `IntersectionObserver` sobre las `<section id={slug}>` (`rootMargin: '-96px 0px -60% 0px'`,
  `threshold: [0, 0.25, 0.5, 0.75, 1]`; el margen inferior grande colapsa la detección hacia el
  tercio superior del viewport). Desktop: `<ul>` sticky vertical (`lg:sticky lg:top-24`). Mobile:
  `<div className="overflow-x-auto">` con la misma lista en horizontal (mismo contenido, sin
  duplicar datos) — el overflow queda contenido en ese `div`, no en `body` (sin scroll horizontal
  de página completa). Navegación 100% con `<a href="#slug">` reales.
- `apps/client/src/views/Guia.tsx` — página completa: header simplificado propio (logo + "Iniciar
  sesión" + CTA "Comenzar gratis", sin el overlay de mobile menu de Landing — ver Decisiones),
  fondo `DotField` montado una única vez, hero, layout de 2 columnas (`GuideIndex` + contenido),
  render de los 9 `guideModules` con reveal `whileInView` por módulo, y footer simple (logo +
  3 links).

## Archivos modificados (acotado a lo pedido)

- `apps/client/src/router.tsx`: import de `Guia` + `<Route path="/guia" element={<Guia />} />`,
  registrada fuera de `<AppLayout>`, al mismo nivel que `/` y `/login/*` (pública, sin auth).
- `apps/client/src/views/Landing.tsx`: **solo** 4 cambios atribuibles a esta feature:
  1. `navLinks`: agregado `{ label: 'Guía', href: '/guia' }` + comentario explicando el criterio
     de ruta vs ancla.
  2. Nav desktop (`.map`): rama condicional `link.href.startsWith('/')` → `<Link>` de
     react-router; si no, mismo `<a>` que ya existía (hash anchors sin cambios).
  3. Menú mobile (`.map`): misma rama condicional que el punto 2, aplicada al `<nav>` del overlay.
  4. Al final de la grilla de `#funcionalidades`: bloque `<div className="mt-12 sm:mt-16 text-
     center">` con `<Link to="/guia">Ver la guía completa →</Link>`.

  **Nota de auditoría (gate del harness):** `git diff` sobre `Landing.tsx` muestra más hunks que
  estos 4 (ej. import de `GradualBlur`, cambio de `DOTFIELD_GLOW_COLOR` de wine a accent-rose,
  `bg-surface` → `bg-surface/60` en varias cards, `viewport={{ once: false }}` en "Cómo funciona",
  bloque `GradualBlur` en el CTA final). Confirmado que **ninguno de esos hunks es mío**: ya
  estaban presentes en el archivo tal como lo leí al empezar (session state de 2 rondas de
  implementers previas de esta misma sesión — UX-46-fix2/UX-49/UX-53, aún no commiteadas a git,
  de ahí que aparezcan en el diff contra el último commit). Usé la herramienta `Edit` con
  `old_string` literal extraído de la lectura inicial del archivo en los 4 puntos de arriba —
  ninguna reescritura ni reindentación de bloques que no toqué.

## Decisiones no 100% especificadas en la tarea

- **Header de `/guia`:** propio y simplificado, no una réplica del header de Landing. Landing
  necesita el mobile-menu a pantalla completa porque sus únicos links son anclas de una sola
  página; `/guia` ya tiene su propia navegación interna (el índice de módulos, sticky/scrolleable),
  así que el header de la guía se redujo a logo + 2 CTAs (login/registro), sin duplicar la lógica
  de `mobileMenuOpen`/overlay — evita over-engineering para un caso que no lo necesita.
- **Un medio por módulo** (no por paso): siguiendo el criterio sugerido en la tarea y el hecho de
  que los assets reales son 1 video por carpeta de módulo. El medio se muestra una sola vez,
  inmediatamente después de la intro del módulo y antes de la lista de pasos.
- **Reveal y colores de `DotField` duplicados, no importados desde `Landing.tsx`:** `Landing.tsx`
  define `fadeSlideUpShort`, `featureCardReveal`, `DOTFIELD_DOT_COLOR`/`DOTFIELD_GLOW_COLOR` como
  constantes locales no exportadas. Exportarlas habría requerido tocar más líneas de un archivo
  que la tarea pide modificar lo mínimo posible; se optó por duplicar 2 literales de color + 1
  función de reveal (~10 líneas) directamente en `Guia.tsx`, documentado con comentario inline.
- **`IntersectionObserver` — threshold/rootMargin:** `rootMargin: '-96px 0px -60% 0px'` +
  `threshold: [0, 0.25, 0.5, 0.75, 1]`. El margen inferior grande simula una "línea de detección"
  cerca del tercio superior del viewport (evita esperar a que un módulo ocupe la mitad de la
  pantalla para activarse, igual de sensible que el patrón ya usado en "Cómo funciona" de
  `Landing.tsx` con `margin: '-50% 0px -50% 0px'`, adaptado acá a una franja en vez de una línea
  porque hay 9 secciones consecutivas, no 3 espaciadas).
- **Callout del módulo `dashboard` y `profesionales`:** se omitió el campo `callout` (queda
  `undefined`) en esos 2 módulos — el HTML de referencia no tiene callout para "Panel principal"
  y "Profesionales" no tenía uno claramente reutilizable sin inventar contenido no solicitado.

## Verificación

```
pnpm --filter @estetica/client build   → exit 0 (tsc -b && vite build, sin errores)
pnpm --filter @estetica/client lint    → exit 0 (4 warnings preexistentes de react-hooks/incompatible-library
                                          en ProfesionalModal.tsx/RegistroModal.tsx/Negocio.tsx/Turnos.tsx,
                                          no relacionadas con esta feature)
```

`git --no-pager diff --ignore-all-space --stat -- apps/client/src/views/Landing.tsx apps/client/src/router.tsx`
→ confirmado que el diff de `router.tsx` es exactamente las 2 líneas esperadas (import + Route);
el diff de `Landing.tsx` incluye trabajo previo no commiteado de esta sesión, con mis 4 cambios
identificados y acotados como se detalla arriba.

No se marcó la feature como `"done"` en `feature_list.json` — queda para el `reviewer`.
