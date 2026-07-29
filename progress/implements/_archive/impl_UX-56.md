# impl_UX-56 — Landing pública: acelerar aún más la animación del fondo Silk del hero

## Feature
- id: `UX-56`
- Estado al iniciar: `in_progress` (no se modifica — el reviewer decide el pase a `"done"`).

## Cambio realizado
- Archivo modificado: `apps/client/src/views/Landing.tsx`
- Único cambio: el prop `speed` del `<Silk />` montado en el fondo del hero pasa de `7` a `22`.

```diff
- speed={7}
+ speed={22}
```

## Valor elegido y justificación
- La ronda anterior (UX-46-fix) había subido `speed` de `2.2` (default del componente) a `7`, un salto de ~3.18x, y el usuario la sintió mejor pero pidió acelerarla "aún más".
- Para mantener una progresión proporcional similar a la ronda anterior, apliqué un factor de ~3.18x sobre el valor actual: `7 * 3.18 ≈ 22.3`, redondeado a `22` (valor entero, notoriamente mayor que 7, consistente con el estilo del resto de props numéricos del componente).
- `speed` es un multiplicador lineal directo de `tOffset = uSpeed * uTime` en el shader (`Silk.tsx`), así que el cambio es matemáticamente seguro: no hay overflow, wraparound ni discontinuidad visual esperable, solo una animación de olas/ruido más rápida.

## Alcance respetado
- No se tocó el default del componente `Silk.tsx` (`speed = 2.2` permanece intacto como neutral para otros puntos de montaje futuros).
- No se modificó ningún otro prop de este `<Silk />` (`color={SILK_COLOR}`, `scale={1}`, `noiseIntensity={1.7}`, `rotation={0}` quedaron igual).
- No se tocó la rama `prefersReducedMotion` (prop `prefersReducedMotion={!!prefersReducedMotion}` intacta) — el shader sigue congelándose en un frame estático cuando el usuario tiene reduced-motion activo.
- No se modificó ninguna otra sección de `Landing.tsx`. Único diff: la línea `speed={7}` → `speed={22}` (sin reindentación espuria).

## Verificación

### Build
```
pnpm --filter @estetica/client build
```
Resultado: **exit code 0**. `tsc -b && vite build` completó sin errores (782 módulos transformados, bundle generado normalmente, único warning preexistente sobre tamaño de chunk > 500kB, no relacionado con este cambio).

### Lint
```
pnpm --filter @estetica/client lint
```
Resultado: **exit code 0**. 4 warnings preexistentes de `react-hooks/incompatible-library` (uso de `watch()` de react-hook-form en `ProfesionalModal.tsx`, `RegistroModal.tsx`, `Negocio.tsx`, `Turnos.tsx`) — ninguno relacionado con `Landing.tsx` ni con este cambio. 0 errores.

## Archivos modificados
- `apps/client/src/views/Landing.tsx` (1 línea)
