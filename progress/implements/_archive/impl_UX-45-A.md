# impl_UX-45-A — Landing pública, sub-lote A (limpieza de deps + Hero)

**Feature:** UX-45 — "Landing pública — rediseño integral desde cero, llamativo y con animaciones en toda la página" (ronda A de 4: A → B → C → D). Sigue `"in_progress"` en `feature_list.json`; esta ronda NO cierra la feature.

**Sandbox:** `apps/client/` exclusivamente. Único archivo de código fuente modificado: `apps/client/src/views/Landing.tsx`. Un archivo eliminado: `apps/client/src/components/landing/Hero3DScene.tsx`.

---

## 1. Contexto leído antes de codear

- `progress/explores/explore_UX-45.md` (dirección "Scroll Story", 100% `motion`, sin WebGL/GSAP).
- `docs/design.md` (tokens, §13.1 excepciones de Landing — sin relajar nada en esta ronda).
- `.claude/rules/frontend.md`, `docs/patterns-frontend.md`.
- `apps/client/src/views/Landing.tsx` completo (674 líneas) y `apps/client/src/components/landing/Hero3DScene.tsx` completo, antes de tocar nada.

---

## 2. Limpieza de dependencias

Ejecutado desde la raíz del repo:

```
pnpm --filter @estetica/client remove three @react-three/fiber @react-three/drei gsap @gsap/react @types/three
```

Resultado: `apps/client/package.json` quedó sin las 6 entradas (`three`, `@react-three/fiber`, `@react-three/drei` en `dependencies`; `gsap`, `@gsap/react` en `dependencies`; `@types/three` en `devDependencies`). Confirmado leyendo el archivo post-remove — cero rastros en `dependencies`/`devDependencies`. `pnpm-lock.yaml` se actualizó automáticamente (diff visible en `git status`).

`apps/client/src/components/landing/Hero3DScene.tsx` eliminado (no estaba trackeado en git todavía — todo `components/landing/` era untracked de una sesión previa — se borró con `rm` directo, no `git rm`). El directorio `apps/client/src/components/landing/` queda vacío en disco (git no trackea directorios vacíos; se deja disponible para los componentes que agreguen las rondas B/C/D si corresponde).

### Grep de confirmación (cero fugas de dependencia)

```
grep -rniE "three|@react-three|gsap|@gsap" apps/client/src --include="*.ts" --include="*.tsx"
```

Resultado: 3 matches, todos comentarios históricos en `Landing.tsx` que documentan *por qué* se removió la pila WebGL/GSAP (líneas 48-49, 154 — texto explicativo, no imports ni código funcional) + 1 falso positivo esperado (`notificationSettingsApi` en `Negocio.tsx` contiene la subcadena literal `gsap` dentro de "SettingsApi", sin relación alguna con la librería — exactamente el tipo de falso positivo que advertía el digest del explorer). Cero referencias reales de import/uso.

`grep -n "\"three\"\|@react-three\|\"gsap\"\|@gsap" apps/client/package.json pnpm-lock.yaml` → sin resultados.

---

## 3. Reconstrucción del Hero (`Landing.tsx`)

### 3.1 Imports y hooks de nivel de componente

- Removidos: `lazy`, `Suspense` (de `react`), `gsap` default import, `useGSAP`, `gsap.registerPlugin(...)`, la función `isWebGLAvailable()`, el lazy-import de `Hero3DScene`, el estado `webglSupported`, el `useRef<HTMLElement>` `heroRef` atado al scope de GSAP, y todo el bloque `useGSAP(() => {...}, { scope: heroRef, ... })`.
- Agregados: `useScroll`, `useTransform`, `useSpring` de `motion/react`; tipos `Variants`, `MotionValue`; tipo `ReactNode` de `react`.

### 3.2 Decisión técnica: `useScroll()` SIN `target` (parallax global, no acotado al hero)

El digest del explorer recomendaba `useScroll({ target: heroRef, offset: [...] })` acotado a la sección. Al implementar, detecté un riesgo real de la MISMA familia de bug que ya costó 2 rondas de fix a la timeline GSAP en UX-44: el componente tiene un `return` temprano mientras `!isLoaded` (spinner de Clerk), que renderiza un árbol *sin* la sección del hero — es decir, el ref pasado como `target` no está hidratado en el primer render real. Inspeccioné el código fuente de `useScroll` en `framer-motion@12.42.2` (`node_modules/.../use-scroll.mjs`): su mecanismo de reintento (`needsStart` + efecto de retry) depende de que la referencia memoizada `start` (un `useCallback` con deps `[container, target, JSON.stringify(offset)]`) cambie de identidad entre renders para que React vuelva a ejecutar el efecto — pero como `target` es el mismo objeto `ref` estable entre el render con `!isLoaded` y el render posterior donde el hero ya está montado, `start` conserva la MISMA identidad y React **saltea** la re-ejecución del efecto, dejando el progreso de scroll congelado en 0 para siempre.

**Decisión:** usar `useScroll()` sin `target` (trackea el scroll global de `window`, sin ref que hidratar, sin el problema de raíz) y mapear `scrollY` (píxeles) con `useTransform(scrollY, [0, 700], [0, N], { clamp: true })` — el hero ocupa los primeros ~700px de la página, suficiente para el efecto de profundidad buscado sin depender de un ref condicionalmente montado. `heroRef` se eliminó por completo (ya no hace falta ni para GSAP ni para scroll). Documentado in-line en el código con el razonamiento completo para que las rondas B/C/D no reintroduzcan el mismo patrón de riesgo si necesitan `useScroll` acotado a otra sección más abajo en la página (donde si aplica, porque esas secciones no están detrás de un `return` condicional).

### 3.3 Título con reveal por palabra

`heroTitleWords`: array de tokens `{ text, accent? }` (no `.split(' ')` directo sobre un string porque el H1 original incluye una palabra ("simplifica") con JSX especial — subrayado SVG —, así que se modeló como token especial en vez de perder esa unidad visual). Contenedor `motion.h1` con `variants` (`heroTitleContainer`, `staggerChildren: 0.06`) + cada palabra en `motion.span` `inline-block` con `variants` (`heroTitleWord`, fade + `y: 20 → 0`, `duration: 0.5`, easing `[0.16,1,0.3,1]`). Espaciado entre palabras vía un carácter de espacio explícito dentro del mismo `motion.span` (no depende de whitespace de JSX). Con `prefersReducedMotion`, ambos sets de variants colapsan a estado final sin animar (`opacity: 1` fijo, sin `staggerChildren`).

### 3.4 Fondo del hero — 3 blobs decorativos

Componente `HeroBlob` (nuevo, en el mismo archivo): wrapper `motion.div` externo que aplica el offset de parallax vía `style={{ y: parallaxY }}` (un `MotionValue` derivado de `scrollY`), y un `motion.div` interno que aplica el drift infinito vía `animate={{ x: driftX, y: driftY }}` con `repeat: Infinity, repeatType: 'mirror'`. Separar el parallax del drift en dos nodos distintos evita el conflicto de que `animate.y` y `style.y` compitan por la misma transform en el mismo elemento.

- 3 instancias: `bg-wine` (11s, delay 0), `bg-sage` (13s, delay 1.5s), `bg-gold` (9s, delay 3s) — colores sólidos de marca (no los tintes `-bg`, que a `opacity-30` + `blur-3xl` casi no se distinguirían del fondo `bg`). `blur-3xl`, `opacity-30`, `mixBlendMode: 'multiply'`. `aria-hidden="true"` + `pointer-events-none` en el wrapper externo (decorativos puros).
- `overflow-hidden` ya presente en `<section>` del hero — evita scroll horizontal por los blobs que sobresalen del viewport en offsets negativos.
- Con `prefersReducedMotion`: el `animate` del drift se pasa como `undefined` (sin loop) y los rangos de `useTransform` del parallax colapsan a `[0, 0]` (offset estático).

### 3.5 Reemplazo del `HeroMockup` por tarjetas de estadística con tilt 3D

`HeroMockup` (con sus 2 badges flotantes) eliminado por completo. En su lugar, `heroStatCards` (3 tarjetas: "128 · Clientes activos", "+40% · Más eficiencia", "5 min · Setup inicial" — mismo copy que ya existía en Stats/badges previos, sin inventar datos nuevos) renderizadas con el nuevo componente `TiltCard`: `useSpring` para `rotateX`/`rotateY`, calculados en `onMouseMove` a partir de la posición del cursor relativa al `getBoundingClientRect()` de la propia tarjeta (máx. ±14°), reseteados a 0 en `onMouseLeave`. Sin listener de mouse en touch (no requiere media query, el evento simplemente no dispara). Con `prefersReducedMotion`, el handler devuelve early sin llamar `.set()` — el tilt queda inerte.

### 3.6 CTAs con hover magnético

Componente `Magnetic` (nuevo): wrapper `motion.div` que aplica `useSpring` sobre `x`/`y`, actualizados en `onMouseMove` según la posición del cursor relativa al centro del propio bounding box (factor `0.35`), reseteado a 0 en `onMouseLeave`. Envuelve los 2 CTAs del hero (`Link` "Prueba gratis" y `a` "Ver funcionalidades") sin alterar sus clases de Tailwind existentes (`bg-accent`, sin sombra en reposo — no se relaja nada de `design.md §7.2`). Clase del wrapper `block sm:inline-block w-full sm:w-auto` para preservar el layout responsive original (columna → fila, full-width en mobile) que antes dependía de que el `Link`/`a` fuera directamente el hijo del contenedor flex.

### 3.7 Limpieza de clases muertas

Se removieron las clases `hero-eyebrow`, `hero-title`, `hero-subtitle`, `hero-cta`, `hero-trust`, `hero-visual` de los elementos del hero — eran selectores usados exclusivamente por la timeline de GSAP ya eliminada, sin ningún efecto Tailwind propio. No se tocó ninguna otra sección (Features, Stats, Cómo funciona, CTA final, footer, nav) ni `docs/design.md`.

---

## 4. Verificación

```
pnpm --filter @estetica/client build
```
→ Exit 0. `tsc -b` sin errores. Vite build:

```
dist/index.html                     0.79 kB │ gzip:   0.45 kB
dist/assets/index-CWmNQPf0.css     51.98 kB │ gzip:   9.88 kB
dist/assets/index-BVTx09lB.js   1,630.56 kB │ gzip: 494.15 kB
```

Un solo chunk (ya no hay chunk lazy separado de `Hero3DScene`). Comparado contra la evidencia registrada en `review_UX-44-fix.md` (chunk principal `index.js` ~1695 kB + chunk lazy `Hero3DScene` 884.68 kB/235.54 kB gzip, aislado): el bundle total post-limpieza (1630.56 kB en un solo chunk) es sensiblemente menor a la suma previa (~2579 kB en dos chunks), confirmando la reducción esperada por remover `three`/`@react-three/fiber`/`@react-three/drei`/`gsap`/`@gsap/react`.

```
pnpm --filter @estetica/client lint
```
→ Exit 0, 0 errores. 4 warnings preexistentes de `react-hooks/incompatible-library` en `ProfesionalModal.tsx`, `RegistroModal.tsx`, `Negocio.tsx`, `Turnos.tsx` (uso de `watch()` de react-hook-form) — no relacionados con esta ronda, no tocados.

---

## 5. Archivos modificados/eliminados

- `apps/client/package.json` — remoción de 6 dependencias (three, @react-three/fiber, @react-three/drei, gsap, @gsap/react, @types/three).
- `pnpm-lock.yaml` — actualizado automáticamente por `pnpm remove`.
- `apps/client/src/views/Landing.tsx` — reconstrucción completa de la sección Hero (título con reveal por palabra, 3 blobs decorativos con drift + parallax, tarjetas de estadística con tilt 3D vía CSS, CTAs con hover magnético); resto de secciones sin tocar.
- `apps/client/src/components/landing/Hero3DScene.tsx` — eliminado.

---

## Estado: implementación completa, pendiente de sub-lote B

Ronda A cerrada funcionalmente (build + lint verdes). El siguiente implementer (ronda B) retoma `Landing.tsx` para la sección Features (grid bento + reveal de clip-path) y la franja de confianza tipo cinta, según el resto de la composición sección-por-sección del digest del explorer. No se marcó `feature_list.json` — sigue `"in_progress"`, a cargo del leader continuar orquestando las rondas B/C/D y el reviewer final.
