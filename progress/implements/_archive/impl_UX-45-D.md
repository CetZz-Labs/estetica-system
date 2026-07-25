# impl_UX-45-D — Landing pública, sub-lote D (CTA final + footer + cierre formal de la feature)

**Feature:** UX-45 — "Landing pública — rediseño integral desde cero, llamativo y con animaciones en toda la página" (ronda D de 4: A → B → C → D). Esta ronda **cierra la implementación completa** de la feature. Sigue `"in_progress"` en `feature_list.json` — no se tocó ese archivo, queda a cargo del `reviewer`.

**Sandbox:** `apps/client/` + `docs/design.md` (excepción puntual habilitada por el leader solo para esta ronda, para la actualización formal de §13.1). Archivos de código modificados: `apps/client/src/views/Landing.tsx` únicamente.

---

## 1. Contexto leído antes de codear

- `progress/implements/impl_UX-45-A.md`, `impl_UX-45-B.md`, `impl_UX-45-C.md` completos.
- `progress/explores/explore_UX-45.md`, secciones 6 (CTA final) y 7 (Footer).
- `docs/design.md` líneas 459-519 (§13 y §13.1 completas), leídas tal cual antes de editar.
- `apps/client/src/views/Landing.tsx` completo (post ronda C).
- `feature_list.json`, entrada `UX-45` completa (acceptance criteria).
- `apps/client/src/index.css` — confirmado el token `--dotted: #E7D8DC` (no se usó como color de la textura del CTA porque la consigna pedía puntos sobre fondo `wine`, donde `dotted` casi no contrastaría; se usó blanco a baja opacidad, más legible sobre wine).

---

## 2. CTA final — textura de puntos + blob con blur + hover magnético

### 2.1 Textura de puntos (no gradiente)

Constante nueva `ctaDotPatternUrl`: SVG inline (`data:image/svg+xml,...`) de un único círculo blanco (`r=1.4`, `fill-opacity=0.6`) repetido vía `background-image` + `backgroundSize: '24px 24px'`, aplicado en un `<div aria-hidden="true" className="absolute inset-0 pointer-events-none opacity-[0.08]">` dentro del bloque `bg-wine`. No es un `linear-gradient`/`radial-gradient`/`conic-gradient`/`bg-gradient-*` — es una imagen SVG repetida, no codifica una transición de color, tal cual exigía la consigna para evitar cualquier ambigüedad con la palabra "gradiente".

### 2.2 Forma con blur "más clara" detrás del texto — reutilización de `HeroBlob`

En vez de duplicar la lógica de blob del hero, extendí `HeroBlob` con dos props opcionales (`blendMode` con default `'multiply'`, `opacityClassName` con default `'opacity-30'`) que preservan el comportamiento exacto de los 3 blobs del hero (ronda A) sin tocarlos. Para el CTA se instancia `HeroBlob` con `colorClassName="bg-white"` + `blendMode="soft-light"` + `opacityClassName="opacity-40"`: el blend `soft-light` aclara localmente el `bg-wine` subyacente (en vez de superponer un color plano distinto), logrando el efecto "mismo tono wine pero más claro" pedido sin introducir un token nuevo.

**Decisión técnica — centrado sin `translate`:** el wrapper externo de `HeroBlob` ya aplica `style={{ y: parallaxY }}` (un `MotionValue`). Motion escribe la propiedad `transform` inline y pisaría cualquier clase Tailwind de `transform` (ej. `-translate-x-1/2`) aplicada sobre el mismo nodo. Para centrar el blob horizontalmente sin ese conflicto, usé margen negativo en vez de `translate`: `left-1/2 -ml-36 sm:-ml-48` (la mitad exacta de `w-72`/`w-96` en la escala de espaciado de Tailwind — 36 = 9rem = mitad de 18rem, 48 = 12rem = mitad de 24rem). El blob del CTA no necesita parallax ligado a scroll (no está dentro del hero), así que su `parallaxY` es un `useMotionValue(0)` estático (`ctaBlobY`, declarado en el cuerpo del componente) — solo el drift infinito (`driftX`/`driftY`) queda activo, igual que en el hero.

### 2.3 Hover magnético — reutilización de `Magnetic`

Los 2 CTAs del bloque final ("Crear cuenta gratis" y "Iniciar sesión") quedaron envueltos en el componente `Magnetic` ya existente de la ronda A, sin reimplementar nada — mismo patrón exacto que los 2 CTAs del hero (`className="block sm:inline-block w-full sm:w-auto"` para preservar el layout responsive columna→fila).

### 2.4 Estructura resultante

El bloque `bg-wine` pasó a `relative overflow-hidden` (para clipear la textura de puntos y el blob a las esquinas redondeadas `rounded-card`); el contenido de texto/CTAs quedó envuelto en un `<div className="relative z-10">` para quedar por encima de ambas capas decorativas (`z-0` implícito del blob, `z-index` natural del div de puntos). Sigue siendo el **único** bloque `wine` sólido de la página — no se agregó ningún segundo bloque wine en ninguna otra sección.

---

## 3. Footer — fade-in simple

`<footer>` → `<motion.footer>` con `initial={prefersReducedMotion ? false : { opacity: 0 }}`, `whileInView={prefersReducedMotion ? undefined : { opacity: 1 }}`, `viewport={{ once: true, amount: 0.3 }}`, `transition={{ duration: 0.5, ease: 'easeOut' }}`. Sin efectos adicionales (sin slide, sin stagger de los links) — tal cual pedía la consigna para no saturar el cierre de la página.

---

## 4. Actualización formal de `docs/design.md §13.1`

- **Retirado por completo** el bullet `**Excepción render 3D/WebGL + GSAP (UX-44, 2026-07-22):**` — reemplazado por un bullet nuevo `**Retiro de la excepción 3D/WebGL + GSAP y nueva relajación de sombra en hover (UX-45, 2026-07-25):**` que documenta: (a) las 6 dependencias (`three`/`@react-three/fiber`/`@react-three/drei`/`gsap`/`@gsap/react`) fueron desinstaladas y ya no están permitidas en ningún punto del código; (b) `motion` es ahora la única librería de animación, usada en las 6 secciones de la Landing (no solo hero/features/stats/cómo-funciona/CTA como antes — también la franja de confianza/marquee de la ronda B); (c) la nueva relajación puntual de `box-shadow` en hover (valor exacto `0 8px 24px rgba(107, 52, 68, 0.10)`, exclusiva de `:hover` en `views/Landing.tsx`/`components/landing/`, nunca en reposo ni fuera de Landing); (d) se reafirma que no se relaja el límite de 1 bloque wine sólido ni la prohibición de gradientes CSS reales; (e) se aclara que la técnica de formas con blur+mix-blend-mode de UX-39 se sigue usando sin cambios, ahora también en el CTA final.
- **Ajustadas** (no solo dejadas intactas) dos aclaraciones que quedaban en contradicción directa con el retiro de WebGL/GSAP, ambas dentro de §13.1 (no se tocó nada fuera de §13/§13.1): el bullet de "Accesibilidad obligatoria" mencionaba explícitamente "el loop de rotación 3D y la timeline GSAP del hero" — reemplazado por la lista real de efectos `motion` de las 4 rondas (blobs, tilt, magnético, reveal por palabra, marquee, clip-path, conteo de stats, línea de "cómo funciona", fades de CTA/footer). El bullet `**Fallback sin WebGL:**` fue eliminado por completo — ya no aplica, no queda ninguna escena WebGL en la Landing.
- **Línea 472** ("Prohibido: sombras animadas...", dentro de §13 general) — **no se tocó**. Ya funciona correctamente como regla general con §13.1 actuando como excepción acotada y explícita a Landing; no había contradicción directa que forzara editarla.

---

## 5. Auditoría de `prefers-reduced-motion` sobre las 4 rondas — hallazgos y correcciones

Repasé el archivo completo (todas las secciones, las 4 rondas) buscando efectos de `motion` sin guarda. Encontré **3 gaps reales** que corregí en esta ronda (código de rondas anteriores, tocado únicamente para cerrar este gap puntual de accesibilidad, sin alterar el resto de su lógica):

1. **`fadeSlideUpShort`** (usado por `AnimatedStat`, ronda C): era un objeto `Variants` fijo sin rama de `prefersReducedMotion`, a diferencia de `heroTitleWord`/`featureCardReveal` que sí la tienen. Lo convertí en función `fadeSlideUpShort(prefersReducedMotion: boolean): Variants` — con reduced motion colapsa a `{opacity:1, y:0}` en ambos estados, sin transición. Actualizado el único call-site (`AnimatedStat`).
2. **Slide lateral alternado de "Cómo funciona"** (ronda C, el `motion.div` contenedor de cada `step`): `initial`/`whileInView` no tenían rama de reduced motion (a diferencia del círculo numerado anidado, que sí la tenía). Agregada la guarda `prefersReducedMotion ? false : {...}` / `prefersReducedMotion ? undefined : {...}`.
3. **Fade-in del bloque `bg-wine` del CTA final** (preexistente desde antes de UX-45): mismo patrón de gap, corregido con la misma guarda.

**No corregido, documentado como decisión:** el `whileHover={{ scale: 1.015, boxShadow: ... }}` de las cards de Features (ronda B) no tiene guarda de `prefersReducedMotion`. Evalué esto como aceptable sin fix: es una micro-interacción disparada por el usuario (hover), no un loop ni un parallax automático — la categoría que `prefers-reduced-motion` apunta a mitigar (WCAG 2.3.3, animaciones que arrancan solas, duran &gt;5s o hacen loop). El resto de micro-interacciones de hover ya existentes en la Landing (`Magnetic`, `TiltCard`) sí se congelan con la preferencia porque involucran seguimiento continuo del mouse (loop implícito mientras el mouse se mueve); un `scale`+`boxShadow` de 0.15s en :hover no cae en esa misma categoría. Señalado aquí para que el `reviewer` tenga criterio explícito si prefiere un estándar más estricto.

Con estas 3 correcciones, confirmé que **todo** el movimiento de las 4 rondas (drift/parallax de blobs, tilt de `TiltCard`, hover magnético, reveal por palabra del título, marquee, clip-path de Features, conteo+barra de Stats, línea de "Cómo funciona" + iluminación de círculos, fade del CTA final, fade del footer) queda cubierto por `prefersReducedMotion`.

---

## 6. Verificación

```
pnpm --filter @estetica/client build
```
→ Exit 0. `tsc -b` sin errores. Vite build:
```
dist/index.html                     0.79 kB │ gzip:   0.45 kB
dist/assets/index-D5uicMd1.css     53.13 kB │ gzip:  10.04 kB
dist/assets/index-DKtxURJt.js   1,640.50 kB │ gzip: 497.53 kB
```
(Tamaño estable respecto a la ronda C — solo se agregaron ~50 líneas de JSX/JS, sin dependencias nuevas.)

```
pnpm --filter @estetica/client lint
```
→ Exit 0, 0 errores. Los mismos 4 warnings preexistentes de `react-hooks/incompatible-library` (`ProfesionalModal.tsx`, `RegistroModal.tsx`, `Negocio.tsx`, `Turnos.tsx`) ya reportados por las 3 rondas anteriores — no relacionados con esta feature, no tocados.

### Verificación final de toda la feature (las 4 rondas)

```
grep -rniE "three|@react-three|gsap|@gsap" apps/client/src --include="*.ts" --include="*.tsx"
```
→ 3 matches, todos comentarios históricos en `Landing.tsx` (líneas 70-71, 176 — texto explicativo sobre por qué se removió la pila WebGL/GSAP) + 1 falso positivo esperado y ya documentado en la ronda A (`notificationSettingsApi` en `Negocio.tsx` contiene la subcadena `gsap` dentro de "SettingsApi"). Cero imports/uso real.

```
grep -n "\"three\"\|@react-three\|\"gsap\"\|@gsap" apps/client/package.json pnpm-lock.yaml
```
→ Sin resultados. Cero dependencias residuales.

```
grep -rln "from 'motion" apps/client/src --include="*.tsx"
```
→ Único resultado: `apps/client/src/views/Landing.tsx`. `motion` no se filtró a ninguna vista autenticada. `apps/client/src/components/landing/` sigue vacío en disco (confirmado con `ls`), sin componentes que pudieran filtrarse.

---

## 7. Archivos modificados

- `apps/client/src/views/Landing.tsx` — únicamente: (a) CTA final: textura de puntos SVG (`ctaDotPatternUrl`), blob con blur reutilizando `HeroBlob` (extendido con `blendMode`/`opacityClassName` opcionales, retrocompatible con los 3 blobs del hero), hover magnético en ambos CTAs vía `Magnetic`; (b) footer: fade-in simple vía `motion.footer`; (c) 3 correcciones de accesibilidad (`fadeSlideUpShort` convertida a función reduced-motion-aware, guarda agregada al slide de "Cómo funciona" y al fade del CTA final). Ninguna otra sección (Hero, Features, Stats) fue tocada más allá de estas 3 correcciones puntuales de accesibilidad.
- `docs/design.md` — §13.1 únicamente: bullet de UX-44 retirado y reemplazado por el bullet de UX-45 (retiro de excepción 3D/WebGL/GSAP + nueva relajación de sombra en hover); bullet de "Accesibilidad obligatoria" actualizado (ya no menciona 3D/GSAP); bullet de "Fallback sin WebGL" eliminado (ya no aplica). Ninguna otra sección de `design.md` fue tocada.

---

## Resumen de las 4 rondas (referencia para el reviewer)

- **A:** eliminó `three`/`@react-three/fiber`/`@react-three/drei`/`gsap`/`@gsap/react` + `Hero3DScene.tsx`. Reconstruyó el Hero 100% con `motion` (título con reveal por palabra, 3 blobs decorativos con drift+parallax vía `HeroBlob`, tarjetas de estadística con tilt 3D vía `TiltCard`, CTAs con hover magnético vía `Magnetic`). Decisión técnica clave: `useScroll()` sin `target` en el hero por el `return` temprano de `!isLoaded`.
- **B:** franja de confianza tipo marquee (nueva sección `TrustMarquee`) + Features reestructurado a bento grid con reveal por `clip-path` (`featureCardReveal`, reemplaza el "mazo de cartas" vetado) + sombra sutil solo en hover de las cards (`0 8px 24px rgba(107, 52, 68, 0.10)`, relajación puntual documentada in-line, formalizada en design.md por esta ronda D).
- **C:** Stats con conteo animado + barra de progreso sincronizados en un solo `MotionValue` (`AnimatedStat`); "Cómo funciona" con línea vertical `scaleY` ligada a `useScroll({ target })` (seguro acá porque la sección no está detrás de ningún `return` condicional) + círculos numerados que se iluminan al cruzar el centro del viewport.
- **D (esta ronda):** CTA final con textura de puntos + blob con blur reutilizando `HeroBlob` + hover magnético reutilizando `Magnetic`; footer con fade-in simple; actualización formal de `docs/design.md §13.1`; auditoría completa de `prefers-reduced-motion` sobre las 4 rondas (3 gaps corregidos); verificación final de cero fugas de dependencia y de aislamiento de `motion` a la Landing.

**Estado:** implementación completa de UX-45 (rondas A→D). Build + lint verdes. No se tocó `feature_list.json` — queda `"in_progress"`, a cargo del `reviewer` para el veredicto final y el cambio a `"done"`.
