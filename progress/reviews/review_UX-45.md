# Reporte de Revisión Técnica — Feature UX-45

**Feature:** Landing pública — rediseño integral desde cero, llamativo y con animaciones en toda la página (4 rondas: A→B→C→D, único dueño de `apps/client/src/views/Landing.tsx` por ronda).

**Veredicto Final:** APPROVED
**Auditor:** Subagente Reviewer
**Timestamp:** 2026-07-25

---

## Mapeo de Checkpoints (Quality Gates)

- [x] C2 (Coherencia de Estados y Enfoque Atómico) — Única feature `in_progress` en `feature_list.json` (confirmado con `grep '"status": "in_progress"' feature_list.json` → un solo match, la propia UX-45). Las 4 rondas escribieron bitácora propia (`impl_UX-45-A/B/C/D.md`) sin condiciones de carrera (secuenciales, un solo dueño de `Landing.tsx` por ronda). Sandbox hermético respetado: solo `apps/client/package.json`, `pnpm-lock.yaml`, `apps/client/src/views/Landing.tsx`, `apps/client/src/components/landing/Hero3DScene.tsx` (borrado) y `docs/design.md` fueron tocados (confirmado con `git status --short` + `git diff --stat`). **Nota no bloqueante:** `progress/current.md` sigue describiendo `UX-45` como "en fase de exploración/diseño (pending)" y no refleja que las 4 rondas de implementación ya cerraron — corresponde actualizarlo en el Protocolo de Cierre de Sesión (paso 4), a cargo del leader, no bloquea este veredicto.
- [x] C3 (Fidelidad Arquitectónica Frontend) — Ver detalle en §"Auditoría de capas" abajo. Sin llamadas HTTP directas (Landing no consume API), `export default` presente, props tipadas con `interface ...Props` locales (`TrustMarqueeProps`, `AnimatedStatProps`, `HeroBlobProps`, `TiltCardProps`, `MagneticProps`), HTML semántico respetado en todo el código nuevo/modificado por esta feature (ver hallazgo no bloqueante sobre el backdrop del menú móvil, preexistente y fuera de diff). Gates Refactoring-UI cumplidos: padding `p-6`/`p-6 sm:p-8` en todas las cards nuevas (Features grande/chica, hero stat cards, Stats), jerarquía valor>etiqueta respetada en `AnimatedStat` y `heroStatCards`.
- [x] C4 (Compilación Estática + Lint) — Re-ejecutados de forma independiente en este entorno (no se confió en las bitácoras):
  - `pnpm --filter @estetica/client build` → **Exit 0**. Bundle final: `dist/assets/index-DKtxURJt.js` 1,640.50 kB (gzip 497.53 kB) — coincide exactamente con lo reportado por la ronda D, sin drift.
  - `pnpm --filter @estetica/client lint` → **Exit 0**, 0 errores. Únicamente los 4 warnings preexistentes `react-hooks/incompatible-library` (`ProfesionalModal.tsx:83`, `RegistroModal.tsx:126`, `Negocio.tsx:83`, `Turnos.tsx:208`) por uso de `watch()` de react-hook-form — ninguno nuevo, ninguno en `Landing.tsx`.
- [x] C5 (Cierre de Sesión Append-Only) — N/A para este veredicto de reviewer (los pasos de cierre — entrada en `history.md`, limpieza de `current.md`, archivado de `impl_*`/`explore_*` — son responsabilidad del leader **después** de este veredicto, según el Protocolo Obligatorio de Cierre de Sesión). Evidencias en disco de esta feature ya existen: `impl_UX-45-A.md`, `-B.md`, `-C.md`, `-D.md` + este `review_UX-45.md`.
- [x] C6 (Capa de Datos) — N/A. Feature 100% frontend, cero modelos Mongoose ni queries tocados.
- [x] C7 (Security Gate) — `grep -n "dangerouslySetInnerHTML" apps/client/src/views/Landing.tsx` → sin resultados (SEC-G limpio). Resto de sub-gates (SEC-A a SEC-F, SEC-H) N/A — no se tocó backend, autenticación ni variables de entorno.
- [x] C8 (Estabilidad de API) — N/A. No hay cambio de contrato de API; Landing no consume endpoints.

---

## Verificación de Acceptance Criteria (`feature_list.json`, entrada `UX-45`) — uno por uno contra el código real

1. **"`views/Landing.tsx` reconstruida con composición visual nueva... manteniendo contenido/copy funcional y navegación sin regresiones"** → Cumplido. Leído el archivo completo (952 líneas): Hero 100% reconstruido con `motion` puro (título por palabra, blobs con drift+parallax, `TiltCard`, `Magnetic`), Features migrado de "mazo de cartas" (`rotateX`/`scale`) a bento grid + `clip-path` reveal (`featureCardReveal`, línea 42-46). Copy de features/steps/stats intacto (mismos textos, mismos 6 items, mismo orden). Nav (`navLinks`, menú móvil, CTAs registro/login) preservado sin cambios funcionales — confirmado por `git diff` (líneas 219-304 del archivo actual no fueron tocadas por ninguna ronda, hunks del diff no las incluyen).
2. **"Toda la página tiene animaciones llamativas y coherentes entre secciones (hero, features, stats, cómo funciona, CTA final, footer)"** → Cumplido. Las 6 secciones tienen movimiento propio: Hero (blobs+tilt+magnético+reveal palabra), franja de confianza nueva (marquee, ronda B), Features (clip-path + hover shadow), Stats (conteo animado + barra), Cómo funciona (línea `scaleY` + círculos que se iluminan), CTA final (textura de puntos + blob reutilizado + magnético), footer (fade-in).
3. **"`docs/design.md §1.1/§13.1` se actualiza documentando qué reglas se relajan... dejando claro que la app autenticada NO hereda esas excepciones"** → Cumplido. Leído `docs/design.md` líneas 476-520 tal cual quedó: bullet de UX-44 (excepción 3D/WebGL+GSAP) retirado por completo y reemplazado por el bullet UX-45 que documenta (a) el retiro de las 6 dependencias, (b) la nueva relajación puntual de `box-shadow` en hover con valor exacto, (c) reafirma que NO se relaja el límite de 1 bloque wine ni la prohibición de gradientes. El párrafo introductorio de §13.1 (línea 478-481, sin tocar) ya declara que la excepción no se extiende a vistas autenticadas — sigue siendo válido y no contradice el bullet nuevo. Bullet "Fallback sin WebGL" eliminado correctamente (ya no aplica, confirmado con `grep -n "Fallback\|WebGL" docs/design.md` → sin resultados). Sin texto huérfano ni contradicciones.
4. **"Toda dependencia de animación... permanece exclusiva de `views/Landing.tsx` y/o `components/landing/` — grep confirma cero imports en vistas autenticadas"** → Cumplido. `grep -rln "from 'motion" apps/client/src --include="*.tsx"` → único resultado: `Landing.tsx`. `apps/client/src/components/landing/` queda vacío en disco (sin componentes, `ls` confirma 0 archivos).
5. **"Dependencia nueva requiere aprobación explícita"** → N/A, no se agregó ninguna dependencia nueva (solo remoción). `apps/client/package.json` confirmado sin `three`/`@react-three/*`/`gsap`/`@gsap/react`/`@types/three`.
6. **"`prefers-reduced-motion: reduce` desactiva o reduce drásticamente todo el movimiento nuevo, no solo en el hero"** → Cumplido con una excepción documentada y razonable (ver detalle abajo).
7. **"Responsive mobile-first y accesible (trifecta en cualquier estado crítico)"** → Cumplido. `p-6`/`p-6 sm:p-8` respetado en todas las cards nuevas; sin estados críticos de error/loading nuevos en esta feature (el único estado condicional, spinner de Clerk en `!isLoaded`, es preexistente y no fue tocado); trifecta N/A por ausencia de estados críticos nuevos.
8. **"`pnpm --filter @estetica/client build` y `lint` pasan con exit code 0"** → Cumplido, re-verificado independientemente (ver C4).

---

## Auditoría de dependencias, imports y scope (verificación en disco, no confianza en bitácoras)

- `grep -rniE "three|@react-three|gsap|@gsap" apps/client/src --include="*.ts" --include="*.tsx"` → 3 matches, los 3 son comentarios históricos en `Landing.tsx` (líneas 70-71, 176, texto explicativo sobre la decisión técnica de por qué se removió la pila WebGL/GSAP) + 1 falso positivo esperado en `Negocio.tsx:13` (`notificationSettingsApi`, subcadena literal `gsap` sin relación con la librería). Cero imports/uso real. Coincide con lo reportado por las rondas A y D.
- `grep -n "\"three\"\|@react-three\|\"gsap\"\|@gsap" apps/client/package.json pnpm-lock.yaml` → sin resultados. `apps/client/package.json` leído completo: las 6 dependencias (`three`, `@react-three/fiber`, `@react-three/drei`, `gsap`, `@gsap/react` en `dependencies`; `@types/three` en `devDependencies`) están efectivamente ausentes.
- `grep -rln "from 'motion" apps/client/src --include="*.tsx"` → único resultado `Landing.tsx`. Cero vistas autenticadas con `motion`.
- Scope de archivos tocados (`git status --short` + `git diff --stat`): `apps/client/package.json`, `pnpm-lock.yaml` (efecto automático de `pnpm remove`), `apps/client/src/views/Landing.tsx`, `docs/design.md`. `apps/client/src/components/landing/Hero3DScene.tsx` fue borrado (directorio queda vacío, sin rastro en `git status` porque nunca estuvo trackeado — consistente con lo documentado en la ronda A). Sin scope creep: ningún otro archivo de `apps/client/src/` o del resto del monorepo fue tocado por esta feature.

## Auditoría de `docs/design.md §13/§13.1`

Texto leído tal cual (líneas 459-520). Coherente y sin contradicciones: el bullet de UX-44 fue retirado por completo (no queda ningún rastro de "three.js"/"WebGL"/"GSAP" salvo dentro del propio bullet nuevo que narra el retiro — confirmado con `grep -n "Fallback\|WebGL\|three\.js\|GSAP\|gsap" docs/design.md`, único hit es el bullet UX-45 mismo). El bullet de accesibilidad fue actualizado para listar los efectos reales de `motion` de las 6 secciones en vez de mencionar el loop 3D/GSAP ya inexistente. El límite general de "máximo 1 bloque wine sólido" (§1, línea 29-30) permanece intacto y sin relajar, consistente con el código.

## Auditoría de `box-shadow` / bloque `bg-wine`

- `grep -n "box-shadow\|boxShadow" apps/client/src/views/Landing.tsx` → único resultado, línea 473, dentro de `whileHover` de las cards de Features (grande y chicas). No se filtró a ningún otro botón/card de la Landing (Hero stat cards, CTA final, footer no tienen `boxShadow`).
- `grep -n "bg-wine" apps/client/src/views/Landing.tsx` → 5 matches: 2 en comentarios/constantes de texto, 1 uso puntual como `colorClassName` de un `HeroBlob` decorativo (línea 313, blur+opacity-30+mix-blend-multiply — técnica ya grandfatherizada por la excepción UX-39, no es "bloque sólido"), y **1 solo bloque sólido real** (línea 621, `bg-wine rounded-card` a opacidad completa, contenido del CTA final). Confirmado: sigue habiendo un único bloque `bg-wine` sólido en toda la página.

## Auditoría de `prefers-reduced-motion` (recorrido completo del archivo)

Cubierto correctamente en: blobs del hero (`HeroBlob`, `animate` → `undefined` + parallax colapsa a `[0,0]`, líneas 856-859/184-186), tilt de stat cards (`TiltCard`, `handleMouseMove` corta con early-return, línea 882-884), hover magnético (`Magnetic`, mismo patrón, línea 927-929), reveal por palabra del título (`heroTitleContainer`/`heroTitleWord`, líneas 79-92), marquee (`animate`/`transition` → `undefined`, líneas 743-744), reveal clip-path de Features (`initial`/`whileInView` → `false`/`undefined`, líneas 43-44), conteo de Stats (`progress` nace en 1, `animate()` no se llama, líneas 779/787-793), línea + iluminación de "Cómo funciona" (`scaleY` fijo en 1 línea 569, círculo `initial`/`whileInView` guardado líneas 593-594, slide lateral del step guardado líneas 579-580), fade del CTA final (línea 622-623) y fade del footer (línea 689-690).

**Único efecto sin guarda:** `whileHover={{ scale: 1.015, boxShadow: ... }}` de las cards de Features (línea 468-475). Evaluado como aceptable: es una micro-interacción disparada por hover del usuario (no un loop automático ni un parallax continuo — la categoría que WCAG 2.3.3/`prefers-reduced-motion` apunta a mitigar), de 0.15s de duración, sin desplazamiento (`translate`) que pueda inducir mareo. Criterio del reviewer: no constituye un gap bloqueante. Coincide con el análisis ya hecho por la ronda D en su propia bitácora — se valida su razonamiento en vez de darlo por sentado.

## Hallazgos no bloqueantes (no afectan el veredicto)

1. `progress/current.md` no refleja el cierre de las 4 rondas de implementación de `UX-45` (sigue describiéndola como "en fase de exploración/diseño, pending") — corresponde al leader actualizarlo en el paso 4 del Protocolo de Cierre de Sesión.
2. El overlay `<div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={...} />` del menú móvil (línea 274) es un patrón de backdrop con `onClick` sobre un `<div>` — preexistente de rondas anteriores a UX-45 (UX-31..37), confirmado fuera de todos los hunks de diff de esta feature (`git diff apps/client/src/views/Landing.tsx`, hunk de esa zona no la incluye). No es una regresión introducida por esta feature; queda fuera del alcance de este veredicto.
3. Deuda ya señalada en `progress/current.md` sobre `p-3`/`p-4` de `HeroMockup()` quedó resuelta de facto: `HeroMockup` fue eliminado por completo en la ronda A y reemplazado por `TiltCard` con `p-6 sm:p-8` — la entrada de deuda en `current.md` puede limpiarse en el cierre de sesión.

---

## Cambios Requeridos

Ninguno. Los 8 acceptance criteria de `UX-45` se verificaron contra el código real (no contra las bitácoras) y se cumplen. Build y lint re-ejecutados de forma independiente, ambos Exit 0. Sin fugas de dependencias WebGL/GSAP, sin fugas de `motion` a vistas autenticadas, sin scope creep, `docs/design.md §13.1` coherente y sin contradicciones, único bloque `bg-wine` sólido preservado, relajación de sombra acotada exclusivamente a hover de cards de Features, cobertura de `prefers-reduced-motion` completa salvo una excepción razonada y aceptada.
