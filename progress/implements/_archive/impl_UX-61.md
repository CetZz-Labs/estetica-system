# impl_UX-61 — Fix: overflow horizontal en mobile ("Cómo funciona")

## Feature
`UX-61` — Landing pública: fix overflow horizontal en mobile causado por los pasos de "Cómo
funciona" sin contenedor `overflow-hidden`.

## Causa (confirmada, no re-investigada)
La `<section id="como-funciona">` no tenía ningún contenedor con `overflow-x-hidden`/
`overflow-hidden`. Sus 3 pasos usan `initial={{ opacity: 0, x: i % 2 !== 0 ? 140 : -140 }}`
(UX-48), y desde que UX-51 cambió el `viewport` de esos pasos a `once: false` (reveal
reversible), ese estado transformado fuera de pantalla (±140px) se repite en cada scroll (no solo
una vez) — sin contención horizontal, eso reserva scroll horizontal de página extra en mobile.

## Cambio realizado
Archivo: `apps/client/src/views/Landing.tsx`

- Se agregó `overflow-x-hidden` a la clase de `<section id="como-funciona">` (antes:
  `"py-24 sm:py-32 relative z-10 scroll-mt-20"`, ahora agrega `overflow-x-hidden` al final).
- Se usó `overflow-x-hidden` (no `overflow-hidden` a secas) para no recortar accidentalmente el
  reveal vertical/scale del círculo de número de cada paso (línea ~714 original, `opacity`+
  `scale`), que no necesita contención — solo el eje horizontal generaba el problema.
- Se agregó un comentario explicando el porqué (UX-61) junto a la sección.

## Verificación de otros transforms horizontales sin contención (criterio de aceptación #3)
Se corrió `grep` sobre `Landing.tsx` buscando `x: i %`, `x: -`, `initial={{ opacity: 0, x` y,
adicionalmente, `translateX|x:\s*-?\d|scaleX|rotateY` para cubrir variantes no contempladas en el
grep sugerido:

- El único `x: ±140` real es el de los pasos de "Cómo funciona" (ya corregido arriba).
- `TiltCard` (hero + CTA final) usa `rotateX`/`rotateY` vía `useSpring` con rango acotado
  (`px/py * 14` grados, `transformPerspective: 800`) — rotación 3D leve, no un desplazamiento en
  X que empuje contenido fuera del viewport; el hero y el CTA final ya están dentro de wrappers
  con `overflow-hidden` (`relative z-10 overflow-hidden bg-bg` para el hero; la card del CTA
  final también es `overflow-hidden` en su propio `motion.div`).
- `Magnetic` (hero CTAs, CTA final) desplaza en `x`/`y` con `useSpring`, pero con un factor de
  `0.35` sobre el offset del mouse dentro de su propio bounding box — desplazamiento de pocos
  píxeles, no ±140px, y no genera overflow de página observable.
- No se encontró ningún otro caso con la misma magnitud (±140px) fuera de un contenedor con
  `overflow-hidden`. No se aplicó ningún fix adicional más allá de "Cómo funciona".

## Build / Lint
```
pnpm --filter @estetica/client build   → exit code 0
pnpm --filter @estetica/client lint    → exit code 0 (solo 4 warnings preexistentes de
                                          react-hooks/incompatible-library en archivos no
                                          tocados por esta feature: ProfesionalModal.tsx,
                                          RegistroModal.tsx, Negocio.tsx, Turnos.tsx)
```

## Archivos modificados
- `apps/client/src/views/Landing.tsx`

## Nota
No se marcó la feature como `"done"` en `feature_list.json` — corresponde al reviewer.
