# impl_UX-43-frontend.md

## Feature
UX-43 — Landing pública — hero: quitar por completo el fondo decorativo (caustics + god rays) para reiniciar de cero.

## Alcance ejecutado
Limpieza pura (sin nuevo efecto). Se eliminó por completo, en `apps/client/src/views/Landing.tsx`, dentro de la sección `{/* ── HERO ── */}`:

- El comentario JSX largo que documentaba el historial UX-39→UX-42 sobre la capa de fondo (~aprox. líneas 220-244 del archivo previo a la edición).
- El `<div className="absolute inset-0 z-0 pointer-events-none" aria-hidden="true">` completo (~aprox. líneas 245-307 previas), que contenía:
  - El `<svg>` con `<defs><filter id="hero-caustic-mask">...</filter></defs>` (feTurbulence + feColorMatrix + feComponentTransfer + feComposite) y el `<rect>` del panel de caustics.
  - El comentario de "God rays convergentes" y el `.map()` sobre el array de 5 configuraciones de rayos (`ray-1`..`ray-5` con `baseAngle`, `color`, `opacity`, `width`, `height`, `duration`, `delay`), cada uno renderizando un wrapper `<div>` + `motion.div` con `clip-path` trapezoidal y animación de `rotate`.

Resultado: la `<section>` del hero quedó con su fondo simple `bg-bg` (ya presente en la clase de la sección), sin ningún overlay decorativo. El contenido interno (`<div className="relative z-10 max-w-7xl mx-auto ...">` con el texto del hero y `<HeroMockup />`) permanece exactamente igual, solo se removió la capa de fondo que estaba antes de él.

## Limpieza de código muerto / imports huérfanos
Se verificó con búsqueda (`grep`) todos los usos de `prefersReducedMotion` / `useReducedMotion` en el archivo tras la eliminación:

- `useReducedMotion` (import de `motion/react`) y la constante `const prefersReducedMotion = useReducedMotion();` (línea ~114) **se conservan intactos** porque `prefersReducedMotion` sigue usándose en otros dos lugares del archivo, ajenos al bloque eliminado:
  - `<HeroMockup prefersReducedMotion={!!prefersReducedMotion} />` (float loop de badges/mockup, UX-38).
  - `featureCardMotion(i, !!prefersReducedMotion)` (reveal "mazo de cartas" de las cards de Funcionalidades, UX-39/UX-41).
- No quedaron imports, variables ni funciones huérfanas relacionadas al bloque de caustics/god rays (el array de configuración de rayos y el filtro SVG eran literales inline dentro del bloque eliminado, sin declaraciones externas asociadas).

## No modificado (verificado explícitamente)
- Float loop de badges / `HeroMockup` (UX-38): intacto, sin cambios.
- Reveal "mazo de cartas" de cards de Funcionalidades (UX-39/UX-41): intacto, sin cambios.
- `package.json` de `apps/client`: no se tocó, la dependencia `motion` se sigue usando en el resto del archivo (Stats, Cómo funciona, CTA, HeroMockup, Features).

## Archivo modificado
- `apps/client/src/views/Landing.tsx` (único archivo tocado, según alcance de la tarea).

## Verificación de build
```
pnpm --filter @estetica/client build
```
Resultado: exit code 0. `tsc -b && vite build` completó sin errores (`✓ 707 modules transformed`, `✓ built in 1.05s`). Warning preexistente y no relacionado sobre chunk size (>500kB) — no introducido por este cambio.

```
pnpm --filter @estetica/client lint
```
Resultado: exit code 0 (`✖ 4 problems (0 errors, 4 warnings)`). Los 4 warnings son preexistentes y no relacionados a este cambio (React Compiler "incompatible library" en `ProfesionalModal.tsx`, `RegistroModal.tsx`, `Negocio.tsx`, `Turnos.tsx` por uso de `watch()` de react-hook-form).

## Estado
Listo para pasar a `reviewer`. No se cambió el `status` de `UX-43` en `feature_list.json` (sigue en `"in_progress"`, tal como corresponde al rol de implementer).
