# Reporte de Revisión Técnica — Feature UX-45 (ronda de FIX post-feedback de usuario)

**Veredicto Final:** APPROVED
**Auditor:** Subagente Reviewer
**Timestamp:** 2026-07-25

## Contexto auditado

Ronda de fix sobre `UX-45` (Landing pública), reabierta por `reopen_note` tras feedback del usuario en navegador real. 4 puntos a corregir, verificados uno a uno leyendo `apps/client/src/views/Landing.tsx` completo (767 líneas) y `apps/client/src/components/landing/StatIcons.tsx` completo (152 líneas), no solo la bitácora `progress/implements/impl_UX-45-fix-frontend.md`.

### 1. BUG bloqueante — Features en blanco (`featureCardReveal`)

- `grep -n "clipPath\|clip-path" Landing.tsx` → cero usos activos, solo 2 comentarios históricos que documentan por qué se descartó la técnica (líneas 39, 45, 498).
- `featureCardReveal` (líneas 49-53) ahora devuelve `initial: { opacity: 0, y: 28 }` / `whileInView: { opacity: 1, y: 0 }`, mismo patrón que `heroTitleWord` (línea 92-99), `fadeSlideUpShort` (línea 25-32) y el resto de reveals del archivo (Stats, CTA, footer, "Cómo funciona").
- Guarda de `prefersReducedMotion` presente: `initial: prefersReducedMotion ? false : {...}`, `whileInView: prefersReducedMotion ? undefined : {...}` (línea 50-51) — congela la card en estado final visible sin animación, consistente con el resto del archivo.
- Stagger por posición en fila preservado: `delay: (i % 3) * 0.12` (línea 52).
- Bento grid intacto: `isBento = i === 0` (línea 507) + `sm:col-span-2 lg:col-span-2 lg:row-span-2 lg:justify-between` (línea 511) — 1 card grande + 5 chicas, sin cambios de estructura.
- Sombra de hover intacta y sin scope creep: `grep -n "boxShadow" Landing.tsx` → único resultado (línea 521), dentro del `whileHover` de las cards de Features, con el valor exacto aprobado `0 8px 24px rgba(107, 52, 68, 0.10)`. No aparece en ninguna otra sección.
- **Veredicto punto 1: correcto.**

### 2. BUG — línea de "Cómo funciona" se superpone al texto

- Línea de progreso (línea 616-618): `className="hidden sm:block absolute z-0 left-1/2 -translate-x-1/2 top-10 bottom-10 w-1 rounded-pill bg-dotted overflow-hidden"` — `z-0` explícito confirmado.
- Cada paso (línea 629-631): `motion.div` con `className={`relative z-10 flex flex-col sm:flex-row items-center gap-8 sm:gap-16 ${i % 2 !== 0 ? 'sm:flex-row-reverse' : ''}`}` — `relative z-10` aplicado al MISMO wrapper que ya maneja `flex-row-reverse` para pasos impares, por lo que el fix cubre ambos layouts alternados (par/impar) sin necesidad de una condición adicional: el círculo numerado (línea 643-653) y el bloque de texto (línea 656-662) están ambos anidados dentro de ese wrapper `z-10`, así que ambos quedan por encima de la línea `z-0` independientemente del orden `flex-row`/`flex-row-reverse`.
- No se tocó `scaleY` ligado a `howItWorksProgress` (línea 622) ni el resto de la lógica de scroll.
- **Veredicto punto 2: correcto.**

### 3. Blobs del hero — más rápidos y más numerosos

- Conteo: 6 instancias de `<HeroBlob>` en la sección hero (líneas 327-386), más 1 séptima instancia reutilizada en el CTA final (línea 693, ya existente de rondas previas, no forma parte de "los blobs del hero"). Total en hero: 6 (3 originales + 3 nuevos), duplicando la cantidad original de 3 tal como pidió el usuario.
- Duraciones de los 3 originales reducidas respecto a los valores documentados en `reopen_note` (9-13s): wine `duration={5}` (línea 333, era 11s), sage `duration={6}` (línea 343, era 13s), gold `duration={4}` (línea 353, era 9s). Confirmado.
- 3 blobs nuevos con posiciones/tamaños/delays propios (líneas 357-386): `duration={7}`/`delay={0.8}`, `duration={8}`/`delay={2.2}`, `duration={6.5}`/`delay={1}` — no son clones de los originales.
- Los 6 (y el 7mo del CTA) reciben `prefersReducedMotion={!!prefersReducedMotion}` explícitamente en cada instancia.
- `aria-hidden="true"` y `pointer-events-none` están fijados dentro del propio componente `HeroBlob` (línea 904-905), por lo que los 3 nuevos los heredan automáticamente sin necesidad de repetirlos por instancia — no es una omisión, es el patrón correcto de componente compartido.
- **Veredicto punto 3: correcto.**

### 4. SVGs a medida con animación perpetua

- `heroStatCards` (línea 106-110): `AnimatedPeopleIcon`, `AnimatedTrendIcon`, `AnimatedClockIcon` — cero referencias a `FiUsers`/`FiTrendingUp`/`FiClock` en ese array.
- Stats/"Impacto" (línea 562-566): `AnimatedClockIcon`, `AnimatedLayersIcon`, `AnimatedTrendIcon`, `AnimatedBarsIcon` — cero referencias a `FiClock`/`FiLayers`/`FiTrendingUp`/`FiBarChart2`.
- Import de `react-icons/fi` en el archivo (línea 10-14): `FiUsers, FiScissors, FiBox, FiCalendar, FiActivity, FiCheckCircle, FiArrowRight, FiMenu, FiX, FiTrendingUp, FiShield, FiSmartphone` — `FiClock`, `FiLayers`, `FiBarChart2` ya NO se importan (limpieza confirmada). `FiUsers` y `FiTrendingUp` se mantienen porque siguen usándose fuera del alcance de este fix: `FiUsers` en la card "Gestión de Clientes" de Funcionalidades (línea 114) y `FiTrendingUp` en el badge de stat de las cards `featured` de Funcionalidades (línea 534) — ninguno de los dos vive en `heroStatCards` ni en Stats.
- Funcionalidades sin tocar: `features` (línea 112-157) sigue usando `FiUsers, FiScissors, FiBox, FiCalendar, FiCheckCircle, FiActivity` de `react-icons/fi`, fuera de alcance, confirmado sin cambios.
- Cada uno de los 5 componentes de `StatIcons.tsx` tiene loop perpetuo condicionado a `useReducedMotion()` interno, no solo hover: `AnimatedClockIcon` (`rotate: 360`, `repeat: Infinity`, dos `motion.g` con velocidades distintas para minutero/horario), `AnimatedTrendIcon` (`pathLength: [0,1]` con `repeatDelay` + pulso de opacidad en la flecha), `AnimatedPeopleIcon` (pulso de `scale` desfasado en las 2 cabezas), `AnimatedLayersIcon` (pulso de `opacity` en secuencia sobre 3 capas), `AnimatedBarsIcon` (`scaleY` en 3 barras desfasadas). Todos con `animate={prefersReducedMotion ? undefined : {...}}` (o equivalente estático) — congelan el loop bajo `prefers-reduced-motion`.
- Tamaño y tokens de color preservados: `card.icon size={22} className={card.tint.text}` en hero (línea 462) y `Icon size={22} className={iconText}` en Stats (línea 858) — mismo `size={22}` y mismo esquema `tint.bg`/`tint.text` de contenedor (`w-12 h-12 rounded-card {tint.bg}`) que ya usaba cada card antes del fix; solo cambió el ícono interno.
- **Veredicto punto 4: correcto.**

## Verificación de builds (re-ejecutada de forma independiente, no se confía en la bitácora)

```
pnpm --filter @estetica/client build   → Exit Code 0 (dist/assets/index-C0wOjQKZ.js 1,644.12 kB, gzip 498.25 kB — único warning preexistente de chunk-size, no bloqueante)
pnpm --filter @estetica/client lint    → Exit Code 0, 4 warnings preexistentes react-hooks/incompatible-library (ProfesionalModal.tsx:83, RegistroModal.tsx:126, Negocio.tsx:83, Turnos.tsx:208) — mismos 4 de siempre, cero warnings nuevos, ninguno en Landing.tsx ni StatIcons.tsx.
```

## Invariantes de la ronda anterior (re-verificados, no rotos)

- `grep -rniE "three|@react-three|gsap|@gsap" apps/client/src --include="*.ts" --include="*.tsx"` → 3 matches, los 3 son comentarios históricos en `Landing.tsx:77-78,186` (documentan por qué se descartó GSAP/WebGL) + 1 falso positivo ya documentado (`Negocio.tsx:13`, subcadena `gsap` dentro de `notificationSettingsApi`, sin relación). Cero imports reales de `three`/`@react-three/*`/`gsap`/`@gsap/react`.
- `grep -rln "from 'motion" apps/client/src --include="*.tsx"` → únicamente `views/Landing.tsx` y `components/landing/StatIcons.tsx`, ambos dentro del árbol de Landing. Sin fuga a vistas autenticadas.
- `grep -n "bg-wine" apps/client/src/views/Landing.tsx` → único bloque sólido real: línea 674 (`className="relative overflow-hidden bg-wine rounded-card ..."`, CTA final). Las apariciones de líneas 329/359 son `colorClassName="bg-wine"` de `HeroBlob` (forma decorativa blur+opacidad baja, no un bloque sólido), grandfatherizadas desde UX-39/UX-45 rondas anteriores. Las líneas 60/65/73/893 son strings de configuración (`marqueeDotColors`) o comentarios, no clases aplicadas como bloque sólido.
- `docs/design.md`: no fue tocado en esta ronda. La bitácora del implementer lista explícitamente solo 2 archivos modificados (`Landing.tsx`, `StatIcons.tsx` nuevo), sin mención de `design.md`. Confirmado además por timestamp de filesystem: `docs/design.md` con `mtime` 13:55:21, mientras que `Landing.tsx`/`StatIcons.tsx` tienen `mtime` 14:26-14:27 (posteriores) — el archivo de diseño no fue re-escrito durante esta sesión de fix. Ningún grep de `UX-45-fix` aparece en `design.md` (solo referencias a `UX-45` de rondas A-D previas, ya aprobadas en `review_UX-45.md`).

## Scope creep / dependencias

- Único archivo nuevo: `apps/client/src/components/landing/StatIcons.tsx`. Único archivo modificado: `apps/client/src/views/Landing.tsx`. `git status --porcelain apps/client/src/` confirma que no hay ningún otro archivo tocado en el sandbox del frontend.
- `apps/client/package.json` y `pnpm-lock.yaml` figuran como `M` en `git status`, pero `git diff` sobre ambos no produce ningún contenido (confirmado por `md5sum` idéntico entre working tree y `HEAD`) — el marcador `M` es un artefacto de normalización de fin de línea (`core.autocrlf=true`, LF→CRLF), no un cambio real de contenido. **No se agregó ninguna dependencia nueva.** El mandato de usar SVG a medida (no una librería de íconos) se cumplió sin instalar nada — `StatIcons.tsx` solo importa `motion`/`useReducedMotion` de `motion/react`, ya instalado y aprobado en rondas anteriores de UX-45.
- Sin `console.log`, `debugger` ni `// TODO` sin ticket en ninguno de los 2 archivos.
- Sin `dangerouslySetInnerHTML` en ninguno de los 2 archivos (SEC-G).
- Sin variables de entorno sensibles hardcodeadas en ninguno de los 2 archivos (gate de variables sensibles N/A — no leen `process.env`/`import.meta.env`).

## Mapeo de Checkpoints (Quality Gates)

- [x] C2 (Coherencia de Estados y Enfoque Atómico) — única feature `in_progress` en `feature_list.json` es `UX-45`; sandbox hermético (solo 2 archivos del árbol de Landing tocados); bitácora e implementación en disco con nombres exactos.
- [x] C3 (Fidelidad Arquitectónica y Políticas del Sistema) — Frontend: componentes con `export default function Landing()`; `StatIcons.tsx` exporta funciones nombradas (no vistas/páginas, patrón correcto para sub-componentes de presentación reutilizados solo internamente); sin llamadas HTTP nuevas (Landing es página estática/marketing, no aplica TanStack Query); HTML semántico sin regresiones (no se tocaron los `<button>`/`<Link>` existentes); N/A paginación/multi-tenancy (no hay backend en esta ronda ni listados de negocio). Backend: N/A (100% frontend).
- [x] C4 (Compilación Estática + Lint) — build exit 0, lint exit 0 sin warnings nuevos, re-ejecutados de forma independiente por este auditor.
- N/A C5 (Cierre de Sesión Append-Only) — corresponde al leader tras este veredicto (entrada en `progress/history.md`, `progress/current.md` restaurado); fuera del rol del reviewer.
- N/A C6 (Capa de Datos) — no hay modelos Mongoose en esta ronda.
- [x] C7 (Security Gate) — SEC-G verificado (sin `dangerouslySetInnerHTML`); SEC-H N/A (sin lectura de env vars en los archivos tocados); resto de sub-gates (auth, IDOR, CORS, validación, soft-delete) N/A por ser 100% frontend estático sin backend en esta ronda.
- [x] C8 (Estabilidad de API) — N/A, no hay cambios de contrato de API (Landing no consume backend propio).

## Cambios Requeridos

Ninguno. Los 4 puntos del `reopen_note` fueron verificados en disco, uno a uno, con evidencia textual de línea/archivo. Ambos builds pasan con exit 0 de forma independiente. No se detectó scope creep, dependencias nuevas, ni regresión sobre los invariantes ya aprobados en `review_UX-45.md`.
