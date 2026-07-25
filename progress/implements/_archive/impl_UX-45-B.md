# impl_UX-45-B — Landing pública, sub-lote B (franja de confianza + Features bento)

**Feature:** UX-45 — "Landing pública — rediseño integral desde cero, llamativo y con animaciones en toda la página" (ronda B de 4: A → B → C → D). Sigue `"in_progress"` en `feature_list.json`; esta ronda NO cierra la feature ni la toca.

**Sandbox:** `apps/client/` exclusivamente. Único archivo de código fuente modificado: `apps/client/src/views/Landing.tsx`. No se tocó ningún otro archivo (confirmado con `git status --short` acotado al archivo).

---

## 1. Contexto leído antes de codear

- `progress/implements/impl_UX-45-A.md` (qué hizo la ronda A: limpieza de deps WebGL/GSAP, Hero reconstruido con `motion` puro, `HeroBlob`/`TiltCard`/`Magnetic`, decisión de `useScroll()` sin `target`).
- `progress/explores/explore_UX-45.md` (secciones 2 "Franja de confianza" y 3 "Features" de la composición propuesta).
- `docs/design.md` completo (tokens §2, §13.1 excepciones vigentes de Landing — no se relajó nada del límite de 1 bloque wine ni de gradientes).
- `.claude/rules/frontend.md` y `docs/conventions.md`.
- `apps/client/src/views/Landing.tsx` completo (post ronda A) antes de tocar la sección Features.
- `apps/client/src/index.css` para confirmar el hex real de `--wine` (`#6B3444` → `rgb(107, 52, 68)`), usado en la sombra de hover.

---

## 2. Franja de confianza tipo cinta/marquee (nueva sección)

Nuevo componente `TrustMarquee` (definido al final del archivo, junto al resto de componentes auxiliares del hero). Ubicado en el JSX entre el cierre de la sección Hero y la apertura de `<section id="funcionalidades">`.

- Contenido: las 6 palabras clave reales de la app (`marqueeWords`), tomadas de los títulos ya existentes en el array `features` de la propia Landing (Clientes, Servicios, Inventario, Turnos, Visitas, Dashboard) — no se inventó copy nuevo.
- Punto de color: `marqueeDotColors` (`bg-accent`, `bg-sage`, `bg-gold`, `bg-wine`, ciclado por índice) — reutiliza el patrón de punto de color sólido que ya usa la app en nav (§7.1)/agenda/servicios (§4 de `design.md`), a diferencia de los tintes `-bg` que usan los íconos de las cards de Features/Stats.
- Loop infinito lineal: `animate={{ x: ['0%', '-50%'] }}`, `transition={{ duration: 26, repeat: Infinity, ease: 'linear' }}` — duración constante, sin aceleración.
- Contenido duplicado: `renderCopy(0)` y `renderCopy(1)` consecutivos dentro de un `flex w-max`, de forma que el desplazamiento de `-50%` (exactamente el ancho de una copia) hace el empalme imperceptible.
- `aria-hidden="true"` en el contenedor raíz completo — el contenido real ya vive en Features, no debe entrar al tab order (no hay elementos interactivos dentro de todos modos, solo `div`/`span`).
- `overflow-hidden` explícito en el contenedor raíz — evita scroll horizontal.
- Con `prefersReducedMotion`: `animate`/`transition` pasan a `undefined` — la cinta queda estática, recortada por el propio `overflow-hidden` (solo se ve la porción que cabe en el ancho de la sección, sin loop).

## 3. Features — bento grid + reveal por clip-path

### 3.1 Bento grid

Reestructuré el grid uniforme (3×2, `grid-cols-1 sm:grid-cols-2 lg:grid-cols-3`) a un bento real vía `col-span`/`row-span` de Tailwind aplicados **solo** a la primera card (`i === 0`, ya marcada `featured: true` en el copy original — "Gestión de Clientes"):

- `sm:col-span-2` — en tablet (grid de 2 columnas) ocupa la fila completa.
- `lg:col-span-2 lg:row-span-2 lg:justify-between` — en desktop (grid de 3 columnas) ocupa 2 columnas × 2 filas. Por el algoritmo de auto-placement de CSS Grid (sin `dense`), el resultado real en `lg:` es:
  ```
  [ BIG (2x2)      ] [ item1 ]
  [ BIG (continúa) ] [ item2 ]
  [ item3 ] [ item4 ] [ item5 ]
  ```
  Verificado manualmente el orden de auto-placement (cursor de grid avanza fila por fila, respetando el hueco ya ocupado por la card grande) — no requirió `grid-template-areas` explícito.
- Padding `p-6 sm:p-8` sin cambios en TODAS las cards (grande y chicas) — no se redujo para acomodar el bento.
- Diferenciación visual de la card grande (sin inventar contenido, solo layout/tipografía): ícono `w-16 h-16`/`size={30}` (vs `w-14 h-14`/`size={26}` en las chicas), título `text-2xl lg:text-3xl` (vs `text-xl`), descripción `lg:text-base lg:max-w-md`. El copy/orden exacto de las 6 features se preservó intacto.

### 3.2 Reveal por clip-path

Función `featureCardReveal(i, prefersReducedMotion)` reemplaza por completo a `featureCardMotion` (reveal "mazo de cartas" de UX-39, con `rotateX`/`scale`/`rotate` — explícitamente vetado por la consigna de UX-45, no se reciclió nada de esa lógica):

```ts
const featureCardReveal = (i: number, prefersReducedMotion: boolean) => ({
    initial: prefersReducedMotion ? false : { clipPath: 'inset(100% 0% 0% 0%)', opacity: 0 },
    whileInView: prefersReducedMotion ? undefined : { clipPath: 'inset(0% 0% 0% 0%)', opacity: 1 },
    transition: { duration: 0.65, ease: [0.16, 1, 0.3, 1] as const, delay: (i % 3) * 0.12 },
});
```

- Barrido de abajo hacia arriba (`inset(100% 0 0 0)` → `inset(0 0 0 0)`) al entrar en viewport (`whileInView`, `viewport={{ once: true, amount: 0.3 }}`), sin `rotateX` ni `perspective` — se removió el `style={{ perspective: 1400 }}` del contenedor del grid y el `style={{ transformPerspective: 1400 }}` de cada card (ya no hacen falta).
- Con `prefersReducedMotion`: `initial={false}` y `whileInView={undefined}` — la card no recibe ninguna prop de animación de motion y queda en su estado final visible sin clip ni transición (no se anima un `clipPath` que nunca cambia).

### 3.3 Hover con sombra (relajación única, documentada para la ronda D)

```ts
whileHover={{
    scale: 1.015,
    boxShadow: '0 8px 24px rgba(107, 52, 68, 0.10)',
    transition: { duration: 0.15, ease: 'easeOut' },
}}
```

- **Valor exacto de la sombra de hover:** `0 8px 24px rgba(107, 52, 68, 0.10)` — `rgb(107, 52, 68)` es la conversión directa del hex `--wine: #6B3444` (confirmado en `apps/client/src/index.css` línea 29), al 10% de opacidad, tal cual especificaba la consigna.
- Aplicada **únicamente** en `whileHover` de las cards de Features (grande y chicas por igual) — nunca en reposo, nunca en ninguna otra vista/componente. Comentario in-line en el código: *"Relajación UX-45, documentada formalmente en design.md por la ronda D"*.
- Escala sutil `1.015` acompañando la sombra, también solo en hover.

---

## 4. Verificación

```
pnpm --filter @estetica/client build
```
→ Exit 0. `tsc -b` sin errores. Vite build:
```
dist/index.html                     0.79 kB │ gzip:   0.45 kB
dist/assets/index-D0DDlCUb.css     52.60 kB │ gzip:   9.95 kB
dist/assets/index-9BPMV6Cz.js   1,631.56 kB │ gzip: 494.44 kB
```
(Tamaño estable respecto al reportado por la ronda A — solo se agregaron ~40 líneas de JSX/JS, sin dependencias nuevas.)

```
pnpm --filter @estetica/client lint
```
→ Exit 0, 0 errores. Los mismos 4 warnings preexistentes de `react-hooks/incompatible-library` (`ProfesionalModal.tsx`, `RegistroModal.tsx`, `Negocio.tsx`, `Turnos.tsx`, uso de `watch()` de react-hook-form) ya reportados por la ronda A — no relacionados con esta ronda, no tocados.

---

## 5. Archivos modificados

- `apps/client/src/views/Landing.tsx` — únicamente: (a) nueva sección `TrustMarquee` entre Hero y Features; (b) reestructuración de la grilla de Features a bento (`col-span`/`row-span` en la card destacada); (c) reemplazo completo del reveal "mazo de cartas" por reveal de clip-path (`featureCardReveal`); (d) hover con `scale` + `boxShadow` (relajación puntual documentada in-line). Ninguna otra sección (Hero, Stats, Cómo funciona, CTA final, footer, nav) fue tocada. `docs/design.md` no fue tocado en esta ronda (la actualización formal de la relajación de sombra queda a cargo de la ronda D, según la consigna).

---

## Estado: implementación completa, pendiente de sub-lotes C y D

Ronda B cerrada funcionalmente (build + lint verdes). El siguiente implementer (ronda C) retoma `Landing.tsx` según el resto de la composición del digest del explorer (Stats con conteo animado + barra de progreso, "Cómo funciona" con línea vertical ligada a scroll, CTA final con textura de puntos). La ronda D deberá actualizar formalmente `docs/design.md §13.1` documentando la relajación de `box-shadow` en hover de cards de Features citando el valor exacto usado aquí: `0 8px 24px rgba(107, 52, 68, 0.10)`. No se marcó `feature_list.json` — sigue `"in_progress"`.
