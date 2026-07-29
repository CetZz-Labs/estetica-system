# Reporte de Revisión Técnica — Feature UX-50

**Veredicto Final:** APPROVED
**Auditor:** Subagente Reviewer
**Timestamp:** 2026-07-28

## Alcance Auditado

Página nueva `/guia`: `apps/client/src/views/Guia.tsx`,
`apps/client/src/components/landing/guide/guideContent.ts`,
`apps/client/src/components/landing/guide/ModuleMedia.tsx`,
`apps/client/src/components/landing/guide/GuideIndex.tsx`, `apps/client/src/router.tsx` (registro
de ruta), `apps/client/src/views/Landing.tsx` (4 puntos: link "Guía" en nav desktop/mobile, link
"Ver la guía completa" en `#funcionalidades`).

## Mapeo de Checkpoints (Quality Gates)

- [x] **C2 (Coherencia de Estados y Enfoque Atómico):** `UX-50` está `in_progress` en paralelo con
  `UX-49`/`UX-51`/`UX-52`/`UX-53` por decisión deliberada del leader (documentada en la consigna de
  esta auditoría) — no bloqueante. `progress/implements/impl_UX-50.md` existe con bitácora
  completa. El diff de `Landing.tsx` atribuible a esta feature queda acotado a los 4 puntos
  descritos en la bitácora (verificado con `git diff --ignore-all-space`); el resto de hunks de
  ese archivo (glow color, `bg-surface/60`, reveal `once:false`, `GradualBlur`, props de
  `<DotField>`) corresponde a UX-49/51/52/53 y a ediciones manuales del usuario, fuera de alcance
  de UX-50.
- [x] **C3 (Fidelidad Arquitectónica):** no aplica paginación/multi-tenancy de backend (feature
  100% frontend estática, sin llamadas HTTP). Verificado en código:
  - Ruta pública: `router.tsx:56` — `<Route path="/guia" element={<Guia />} />` registrada al
    mismo nivel que `/` y `/login/*`, **fuera** del `<Route element={<AppLayout />}>` (líneas
    62-101) — sin autenticación, confirmado.
  - Nav de `Landing.tsx`: `navLinks` (línea ~253) suma `{ label: 'Guía', href: '/guia' }`; el
    `.map()` de nav desktop y el del menú mobile ramifican por `link.href.startsWith('/')` para
    usar `<Link>` de react-router en vez de `<a>` (evita full reload). Link "Ver la guía completa"
    presente al final de la grilla de `#funcionalidades` (`<Link to="/guia">`).
  - 9 módulos completos en `guideContent.ts`: slugs `login`, `dashboard`, `clientes`,
    `servicios`, `inventario`, `visitas`, `turnos`, `profesionales`, `historial` — cubren los 8 del
    HTML de referencia (Login, Panel principal, Clientes, Servicios, Inventario, Registro de
    visitas, Turnos, Profesionales) + el noveno (Historial) redactado a partir de
    `views/Historial.tsx` (paginado de 7, filtros cliente/servicio/profesional + rango de
    fechas — coincide con la descripción real de esa vista). Copy en "Shear" (no "Maison"),
    confirmado con lectura completa del archivo.
  - Contrato de medios de 3 estados (`ModuleMedia = { kind: 'video' | 'image' | 'none' }`) en
    `guideContent.ts`; `ModuleMedia.tsx` renderiza los 3 sin romper layout (`aspect-video` fijo en
    los 3 casos). Video: `controls preload="none" playsInline`, sin autoplay; poster omitido si
    `undefined` (React no renderiza props `undefined`). Imagen: `loading="lazy" decoding="async"`.
    Placeholder: `role="img" aria-label="Captura de este módulo, próximamente"` + ícono `FiImage`
    — trifecta de accesibilidad cumplida en el estado vacío (color muted + ícono + texto).
  - Los 5 módulos con video real (`dashboard`, `clientes`, `servicios`, `inventario`, `turnos`)
    apuntan a `/media/<slug>/demo.mp4`; confirmado en disco
    (`apps/client/public/media/{dashboard,clientes,servicios,inventario,turnos}/demo.mp4`
    existen y pesan >0 bytes). Los 4 módulos restantes (`login`, `visitas`, `profesionales`,
    `historial`) declaran `{ kind: 'none' }` con carpetas vacías ya creadas en disco, listas para
    recibir asset futuro sin tocar código — cumple el contrato "agregar material real más
    adelante sea solo editar una entrada de datos".
  - Índice sticky: `GuideIndex.tsx` usa `IntersectionObserver` real (`rootMargin: '-96px 0px -60%
    0px'`, `threshold` múltiple) sobre `document.getElementById(module.slug)` para marcar
    `aria-current="true"` en el link activo; desktop `<ul className="hidden lg:flex ... lg:sticky
    lg:top-24">`, mobile `<div className="overflow-x-auto">` con la misma lista horizontal (el
    overflow queda contenido en ese `div`, no en `body`).
  - Fondo: un único `<DotField>` montado en `Guia.tsx` (línea ~63-79), ningún tercer sistema de
    fondo animado agregado.
  - Cero dependencias nuevas: confirmado con `git diff -- apps/client/package.json` (sin salida).
  - Gates de `docs/design.md` §13.1: `grep -n "shadow\|gradient\|bg-wine"` sobre `Guia.tsx` y la
    carpeta `guide/` solo devuelve las 2 líneas de `gradientFrom`/`gradientTo` de `<DotField>`
    (props del patrón ya aprobado, no un gradiente CSS nuevo) — cero `box-shadow`, cero clase
    `bg-gradient-*`, cero `bg-wine` sólido en la página (`text-wine` en el `<h1>` es color de
    texto, no un bloque). Tipografía: solo `font-serif`/`font-sans` (tokens existentes del
    sistema), sin fuentes ad-hoc.
  - Reveal `whileInView` de cada `<motion.section>` respeta `prefersReducedMotion` (rama
    `initial={prefersReducedMotion ? false : 'hidden'}` / `whileInView={... ? undefined :
    'visible'}`).
  - Navegación interna 100% con `<a href="#slug">` (índice) y `<Link>` de react-router (header,
    footer, nav de Landing) — cero `<div onClick>` simulando controles.
- [x] **C4 (Compilación Estática + Lint):** re-ejecutados por este reviewer.
  - `pnpm --filter @estetica/client build` → exit 0.
  - `pnpm --filter @estetica/client lint` → exit 0, 0 errors, 4 warnings preexistentes no
    relacionados (mismos 4 de siempre en `ProfesionalModal.tsx`/`RegistroModal.tsx`/
    `Negocio.tsx`/`Turnos.tsx`).
- [x] **C5 (Cierre de Sesión Append-Only):** pendiente de completar por el leader tras este
  veredicto — no bloqueante para el código.
- [x] **C6 (Capa de Datos):** no aplica — sin modelos Mongoose ni `apps/server/` tocados.
- [x] **C7 (Security Gate):** no aplica — página 100% estática/pública sin llamadas HTTP propias
  ni datos sensibles. Auditoría de variables de entorno no aplicable (sin backend en el diff).
- [x] **C8 (Estabilidad de API):** no aplica.

## Observación no bloqueante

`ModuleMedia.tsx` usa `alt` obligatorio en el contrato `video`/`image` de `guideContent.ts`, buena
práctica de accesibilidad no exigida explícitamente por el criterio de aceptación pero coherente
con la trifecta del proyecto — se destaca como acierto, no como hallazgo.

## Cambios Requeridos

Ninguno. La implementación cumple los 11 criterios de aceptación de `UX-50` en `feature_list.json`.
