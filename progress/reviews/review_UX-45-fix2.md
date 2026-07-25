# Reporte de Revisión Técnica — Feature UX-45-fix2

**Veredicto Final:** APPROVED
**Auditor:** Subagente Reviewer
**Timestamp:** 2026-07-25

## Contexto auditado

Segunda ronda de refinamiento visual de la Landing pública (`views/Landing.tsx` + `components/landing/StatIcons.tsx`), post feedback de usuario probando en navegador real. `reopen_note` de `UX-45` en `feature_list.json` (línea 755) pedía 4 puntos puntuales, todos verificados en disco de forma independiente (no se confió en la bitácora `impl_UX-45-fix2-frontend.md`).

## Mapeo de Checkpoints (Quality Gates)

- [x] C2 (Coherencia de Estados y Enfoque Atómico) — única feature `in_progress` en `feature_list.json` era `UX-45`; bitácora y explore correspondientes existen en disco.
- [x] C3 (Fidelidad Arquitectónica) — 100% frontend, sin tocar backend. `export default` preservado, HTML semántico intacto (`<button type="button">`, `<Link>`), sin `console.log`/`debugger` nuevos (`grep` sin resultados).
- [x] C4 (Compilación Estática + Lint) — re-ejecutados de forma independiente, ver evidencia abajo.
- [ ] C5 (Cierre de Sesión Append-Only) — N/A para este review puntual (lo completa el leader al cerrar sesión: `progress/history.md`/`progress/current.md`).
- [ ] C6 (Capa de Datos) — N/A, sin cambios de modelos Mongoose.
- [ ] C7 (Security Gate) — N/A, sin cambios de backend/auth; sin `dangerouslySetInnerHTML` (SEC-G no aplica, no se agregó ninguno).
- [ ] C8 (Estabilidad de API) — N/A, sin cambios de contrato de API.

## Verificación empírica de los 4 puntos del `reopen_note`

### 1. Íconos ya hechos de librería establecida
- `StatIcons.tsx` reescrito como wrapper único `AnimatedStatIcon` (default export, `icon: IconType` inyectado por prop) — confirmado en `apps/client/src/components/landing/StatIcons.tsx:42-64`.
- `heroStatCards` (Landing.tsx:117-121) y el array de Stats/"Impacto" (Landing.tsx:575-579) usan `PiUsersThreeDuotone`, `PiTrendUpDuotone`, `PiClockDuotone`, `PiStackDuotone`, `PiChartBarDuotone` de `react-icons/pi` (import en Landing.tsx:15-17) — set premade real, sin ningún `<path>` dibujado a mano en estas dos zonas.
- Tamaño aumentado respecto a la ronda de fix anterior: contenedor hero `w-16 h-16` (Landing.tsx:473) con `size={32}` (Landing.tsx:474); contenedor Stats `w-16 h-16` (Landing.tsx:904) con `size={30}` (Landing.tsx:905).
- Animación perpetua con `repeat: Infinity` (StatIcons.tsx:58) y guarda `prefersReducedMotion` que congela el ícono sin transición (`animate=undefined`, `transition=undefined` en StatIcons.tsx:56-59).
- Funcionalidades intacta: `features` (Landing.tsx:123-168) sigue usando `FiUsers`/`FiScissors`/`FiBox`/`FiCalendar`/`FiCheckCircle`/`FiActivity` de `react-icons/fi`, sin ningún cambio de ícono/tamaño/animación en esa sección (Landing.tsx:516-553).

### 2. Blobs del hero
- `HeroBlob` (Landing.tsx:956-979) anima `opacity: opacityRange` y `scale: scaleRange` en el mismo `animate`/`transition` que el drift `x`/`y` (Landing.tsx:970-975) — confirmado variación de opacidad Y escala, no solo posición.
- Parallax de scroll retirado de verdad: `grep -n "parallaxY\|useTransform" apps/client/src/views/Landing.tsx` solo devuelve 2 comentarios explicativos (líneas 730 y 942), cero uso real. El único `useScroll` restante en el archivo (Landing.tsx:208) está acotado a `howItWorksRef` para la línea de "Cómo funciona" (punto 3), un target distinto y legítimo — ningún blob queda con posición atada al scroll.
- Wrapper compartido confirmado en el JSX real (no solo el comentario): `<div className="relative overflow-hidden bg-bg">` (Landing.tsx:333) envuelve los 6 `<HeroBlob>` (Landing.tsx:343-396), el `<section>` del hero completo (Landing.tsx:399-486) y `<TrustMarquee />` (Landing.tsx:489), cerrando en Landing.tsx:490.
- Legibilidad preservada: el `<section>` del hero lleva `relative z-10` (Landing.tsx:399) y `TrustMarquee` lleva `relative z-10` explícito con `bg-surface/90` (Landing.tsx:839), ambos por encima de los blobs `absolute z-0` (Landing.tsx:965) — el contenido no compite visualmente con el fondo decorativo en ninguna de las dos secciones.

### 3. Línea de "Cómo funciona"
- Dos `<svg viewBox="0 0 40 600" preserveAspectRatio="none">` superpuestos (Landing.tsx:639-650) con el mismo `path d="M20 0 Q40 75 20 150 Q0 225 20 300 Q40 375 20 450 Q0 525 20 600"` (constante `howItWorksPathD`, Landing.tsx:76) — curvas `Q` (quadratic Bézier) reales, no una línea recta disfrazada.
- `motion.path` con `style={{ pathLength: prefersReducedMotion ? 1 : howItWorksProgress }}` (Landing.tsx:648) ligado al `MotionValue` `howItWorksProgress` ya existente (`useScroll({ target: howItWorksRef, ... })`, Landing.tsx:207-211).
- `stroke` del trazo animado usa el token `accent` vía clase `text-accent` + `stroke="currentColor"` (Landing.tsx:642-649).
- `z-index`/`aria-hidden` de la ronda anterior preservados: contenedor `aria-hidden="true"` con `z-0` (Landing.tsx:635-637), cada paso con `relative z-10` (Landing.tsx:658) — la línea sigue detrás del texto.
- Con `prefersReducedMotion`, `pathLength` queda fijo en `1` (línea completa sin animar) — confirmado en la misma línea 648.

### 4. CTA final
- El único bloque `bg-wine` sólido de la página (`motion.div` con `className="relative overflow-hidden bg-wine rounded-card p-8 sm:p-12 lg:p-16"`, Landing.tsx:713) está envuelto por `<TiltCard prefersReducedMotion={...}>` (Landing.tsx:711-773) — mismo componente `TiltCard` definido en Landing.tsx:992-1024 y reutilizado sin cambios respecto a su uso en `heroStatCards` (Landing.tsx:468-481), sin reimplementación paralela de `rotateX`/`rotateY`/`useSpring`.
- Confirmado con `grep -n "bg-wine"` que la única aparición de un bloque wine sólido con padding/rounded-card es la línea 713; el resto son `colorClassName` de blobs decorativos (blur+blend, líneas 345/372), el token de fondo `bg-wine-bg` (línea 83, distinto) y `marqueeDotColors` (punto de 8px, línea 62) — ninguno es un "bloque sólido" adicional.
- `TiltCard.handleMouseMove` (Landing.tsx:997-1006) y `Magnetic.handleMouseMove` (Landing.tsx:1042-1049) no llaman `stopPropagation()` en ningún punto — ambos reciben el evento `mousemove` por bubbling sin conflicto de listeners, permitiendo tilt de la card + desplazamiento magnético del botón en simultáneo. `TiltCard` respeta `prefersReducedMotion` (early return en `handleMouseMove`, línea 998) igual que `Magnetic` (línea 1043).

## Verificación de builds y lint (re-ejecutados de forma independiente)

```
pnpm --filter @estetica/client build
> tsc -b && vite build
✓ 709 modules transformed
✓ built in 1.15s
Exit Code 0 (único warning preexistente de chunk-size >500kB, no bloqueante)

pnpm --filter @estetica/client lint
✖ 4 problems (0 errors, 4 warnings)
Exit Code 0 — los 4 warnings son exactamente los preexistentes de react-hook-form/incompatible-library:
  ProfesionalModal.tsx:83, RegistroModal.tsx:126, Negocio.tsx:83, Turnos.tsx:208
Cero warnings nuevos, ninguno en Landing.tsx ni StatIcons.tsx.
```

## Verificación de invariantes de rondas anteriores (no rotos)

- `grep -rniE "three|@react-three|gsap|@gsap" apps/client/src` → solo falsos positivos ya documentados: `PiUsersThreeDuotone` (subcadena "Three"), 2 comentarios históricos en Landing.tsx (líneas 87-88) y `Negocio.tsx:13` (subcadena "gsap" en `notificationSettingsApi`). Cero imports reales de `three`/`@react-three/*`/`gsap`/`@gsap/react`.
- `grep -rln "from 'motion" apps/client/src --include="*.tsx"` → únicamente `views/Landing.tsx` y `components/landing/StatIcons.tsx`. Sin fuga de `motion` a vistas autenticadas.
- Bento grid de Features y sombra de hover (`boxShadow: '0 8px 24px rgba(107, 52, 68, 0.10)'`, Landing.tsx:534) intactos, sin cambios en esta ronda.
- `prefers-reduced-motion` cubre todo el movimiento nuevo: blobs (opacity/scale — `HeroBlob`, línea 970-975), íconos (`AnimatedStatIcon`, StatIcons.tsx:56-59), línea SVG (`pathLength` fijo en 1, Landing.tsx:648) y tilt del CTA (`TiltCard.handleMouseMove` early-return, Landing.tsx:998).

## Verificación de dependencias

- `git diff apps/client/package.json` y `git diff --stat pnpm-lock.yaml` → sin contenido real, solo advertencia de normalización de fin de línea LF→CRLF. `react-icons/pi` es parte del paquete `react-icons` ya instalado, confirmado por el build exitoso de TypeScript (hubiera fallado si el subpath no existiera). Sin dependencias nuevas.

## Verificación de scope

- `git status --porcelain apps/client/src/` → `M apps/client/src/views/Landing.tsx` y `?? apps/client/src/components/landing/` (directorio nuevo, contiene únicamente `StatIcons.tsx`, sin archivos extraños). Scope acotado exactamente a lo declarado por el implementer.

## Cambios Requeridos (Si aplica)

Ninguno. Los 4 puntos del `reopen_note` están implementados y verificados en disco tal como fueron pedidos, sin regresiones de rondas anteriores, sin dependencias nuevas, con builds y lint limpios.
