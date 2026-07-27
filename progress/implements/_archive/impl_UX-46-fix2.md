# impl_UX-46-fix2 — DotField: fix de coordenadas del cursor (glow/bulge desplazado)

**Feature:** UX-46 — Landing pública — fondos animados de nivel superior (Silk en hero + fondo del resto)
**Ronda:** fix2 (2026-07-27) — reabierta por `reopen_note` en `feature_list.json`
**Sandbox:** `apps/client` (frontend)

## Contexto del bug

El usuario probó `DotField` (fondo del resto de la Landing, debajo de Funcionalidades/Stats/Cómo
funciona/CTA final/footer) en navegador real y reportó: *"no se ven los puntos, en cambio se ve un
círculo que sigue al cursor, pero debajo del mismo"*. Causa raíz ya confirmada por un diagnóstico
previo de solo lectura (no re-investigado en esta ronda, solo aplicado el fix).

El wrapper de montaje en `Landing.tsx` es `<div className="fixed inset-0 ...">` — siempre
viewport-relativo, sin importar el scroll de la página. `doResize()` calculaba `offsetX`/`offsetY`
como `rect.left/top + window.scrollX/scrollY`, pero solo corría en el mount y en `resize` de
window — nunca en scroll. `onMouseMove` usaba `e.pageX/pageY - offsetX/offsetY`, con `pageY`
incluyendo el scroll ACTUAL de la página pero `offsetY` congelado en el valor del mount. Resultado:
el cursor virtual (`mouseRef.x/y`, usado directo para `cx`/`cy` del glow SVG) quedaba desplazado
hacia abajo por la distancia exacta scrolleada desde que el componente montó — coincide al pie de
la letra con el síntoma reportado (glow debajo del cursor real). El efecto interactivo de "bulge"
de los puntos también quedaba roto por el mismo motivo (la distancia al cursor virtual desplazado
casi siempre superaba `cursorRadius`).

## Cambio 1 — `onMouseMove`: usar `clientX`/`clientY` sin compensar scroll

Archivo: `apps/client/src/components/landing/DotField.tsx`

**Antes:**
```typescript
const onMouseMove = (e: MouseEvent): void => {
    const s = sizeRef.current;
    mouseRef.current.x = e.pageX - s.offsetX;
    mouseRef.current.y = e.pageY - s.offsetY;
};
```

**Después:**
```typescript
// UX-46-fix2: el wrapper de montaje (Landing.tsx) es `fixed inset-0` — siempre
// viewport-relativo, sin importar el scroll de la página. `e.clientX`/`e.clientY` ya son
// coordenadas relativas al viewport, así que no hace falta (ni es correcto) restar ningún
// offset de scroll. El cálculo anterior (`e.pageX/pageY - offsetX/offsetY`, con el offset
// recalculado solo en mount/resize, nunca en scroll) desplazaba el cursor virtual hacia
// abajo por la distancia scrolleada desde el mount — el glow/bulge terminaba dibujándose
// debajo del cursor real a medida que el usuario scrolleaba.
const onMouseMove = (e: MouseEvent): void => {
    mouseRef.current.x = e.clientX;
    mouseRef.current.y = e.clientY;
};
```

## Cambio 2 — código muerto eliminado: `offsetX`/`offsetY`

Mismo archivo. `offsetX`/`offsetY` ya no se leen en ningún lado tras el Cambio 1 — se sacaron del
tipo `SizeState` y de su cálculo en `doResize()`.

**Antes:**
```typescript
interface SizeState {
    w: number;
    h: number;
    offsetX: number;
    offsetY: number;
}
// ...
const sizeRef = useRef<SizeState>({ w: 0, h: 0, offsetX: 0, offsetY: 0 });
// ...
sizeRef.current = {
    w, h,
    offsetX: rect.left + window.scrollX,
    offsetY: rect.top + window.scrollY,
};
```

**Después:**
```typescript
interface SizeState {
    w: number;
    h: number;
}
// ...
const sizeRef = useRef<SizeState>({ w: 0, h: 0 });
// ...
sizeRef.current = { w, h };
```

El resto de `doResize()` (cálculo de `w`/`h` desde `getBoundingClientRect()`, `canvas.width/height`,
`ctx.setTransform`, `buildDots(w, h)`) no dependía de `offsetX`/`offsetY` — sin cambios ahí,
confirmado leyendo el bloque completo antes de tocar nada.

## Cambio 3 (hallazgo secundario, aplicado) — grilla más perceptible en reposo

El diagnóstico notó que `dotRadius=1` (radio real dibujado = 0.5px) + `wine` al 10% de opacidad
sobre `bg-bg` casi blanco resultaba en una grilla muy sutil incluso sin el bug de coordenadas.
Se subieron ambos valores, dentro del rango sugerido:

Archivo: `apps/client/src/views/Landing.tsx`

- `DOTFIELD_DOT_COLOR`: `'rgba(107, 52, 68, 0.10)'` → `'rgba(107, 52, 68, 0.18)'` (comentario de la
  constante actualizado con la nota de la ronda).
- Prop `dotRadius` en el punto de montaje de `<DotField />`: `1` → `1.5` (queda igual al default del
  propio componente, `dotRadius = 1.5` en `DotField.tsx`, que hasta ahora el mount pisaba con `1`
  explícito).
- `dotSpacing`, `cursorRadius`, `cursorForce`, `bulgeStrength`, `glowRadius`, colores de glow, etc.
  no se tocaron — fuera de alcance de esta ronda.

## Verificación

```
pnpm --filter @estetica/client build   → exit 0
pnpm --filter @estetica/client lint    → exit 0 (4 warnings preexistentes en
                                          ProfesionalModal.tsx/RegistroModal.tsx/Negocio.tsx/Turnos.tsx,
                                          `react-hooks/incompatible-library` de `watch()` de
                                          react-hook-form — no relacionados con esta ronda, archivos
                                          no tocados)
```

Confirmado manualmente:
- `onMouseMove` ya no lee `s.offsetX`/`s.offsetY` en ningún lado (`grep -n "offsetX\|offsetY"
  DotField.tsx` → sin resultados).
- No quedó ninguna variable/campo declarado y no leído — el build/lint no reportó ningún warning de
  `no-unused-vars` en `DotField.tsx`/`Landing.tsx`.
- Diff de esta ronda acotado a `apps/client/src/components/landing/DotField.tsx` (Cambios 1 y 2) y
  `apps/client/src/views/Landing.tsx` (Cambio 3, solo la constante `DOTFIELD_DOT_COLOR` y la prop
  `dotRadius` del punto de montaje de `<DotField />`) — verificado con `git diff` acotado a esas dos
  líneas/bloques.

## Archivos modificados

- `apps/client/src/components/landing/DotField.tsx`
- `apps/client/src/views/Landing.tsx`

## Estado

No se marca `UX-46` como `"done"` en `feature_list.json` — corresponde exclusivamente al
`reviewer`. Feature sigue en `"in_progress"`.
