# Reporte de Revisión Técnica — Feature UX-46 (ronda de fix)

**Veredicto Final:** APPROVED (tras re-auditoría del fix post-review)
**Auditor:** Subagente Reviewer
**Timestamp:** 2026-07-27

## Resumen de lo auditado

Ronda bundle sobre `apps/client/src/views/Landing.tsx` (4 cambios): Silk más notorio (speed/opacidad/noiseIntensity), `ShapeGrid` → `DotField`, `TrustMarquee` restyleada con `LogoLoop`, header traslúcido con blur. Archivos nuevos: `apps/client/src/components/landing/DotField.tsx`, `apps/client/src/components/landing/LogoLoop.tsx`. `apps/client/src/components/landing/ShapeGrid.tsx` borrado.

## Corridas propias (reviewer)

- `pnpm --filter @estetica/client build` → **exit 0**. Único warning es preexistente (`chunk size > 500kB`, no introducido en esta ronda).
- `pnpm --filter @estetica/client lint` → **exit 0**, 4 warnings (`react-hooks/incompatible-library` por `watch()` de react-hook-form en `ProfesionalModal.tsx`, `RegistroModal.tsx`, `Negocio.tsx`, `Turnos.tsx`) — todos preexistentes, ninguno en archivos tocados en esta ronda (`DotField.tsx`, `LogoLoop.tsx`, `Landing.tsx`, `Silk.tsx` no generan warnings nuevos).
- `grep -rn "ShapeGrid" apps/client/src` → el archivo `ShapeGrid.tsx` NO existe (`ls` confirma). Los 5 matches restantes son comentarios de documentación histórica ("`DotField reemplazó a ShapeGrid`", "mismo patrón que `Silk`/`ShapeGrid`") en `DotField.tsx:65,73` y `Landing.tsx:82,481,487` — describen con precisión el reemplazo, no son referencias muertas ni imports colgantes. Aceptado.
- `grep -rln "DotField\|LogoLoop" apps/client/src` → confinado a `components/landing/DotField.tsx`, `components/landing/LogoLoop.tsx` y `views/Landing.tsx`. Cero fuga a vistas autenticadas. OK.
- `git diff apps/client/package.json` / `pnpm-lock.yaml` → único delta: `"ogl": "1.0.11"` (ya aprobado en la ronda anterior de UX-46 para `Silk`). Confirmado que no se agregó ninguna dependencia nueva en esta ronda de fix.
- `grep -rnE "(SECRET|KEY|PASSWORD|TOKEN)" apps/server/src/ | grep -iE "=\s*['\"]"` → sin resultados. No aplica de todos modos: esta ronda no tocó `apps/server` (confirmado por `git status`, sandbox respetado).
- Sin `console.log`/`debugger`/`TODO` sin ticket en los 4 archivos tocados/creados.

## Verificación de las 3 desviaciones documentadas por el implementer

1. **`propsRef.current` sincronizado en `useEffect` sin deps (`DotField.tsx:104-112`) en vez de asignación directa durante el render.** Confirmado semánticamente equivalente: ambos efectos (el de sync sin-deps y el de setup con `[prefersReducedMotion]`) están declarados en ese orden dentro del componente, por lo que en cualquier commit donde ambos corren (mount, o cambio de `prefersReducedMotion`) React los ejecuta en orden de declaración — el sync corre primero, dejando `propsRef.current` actualizado antes de que `doResize()`/`tick()` lo lean. Como el resto de las props (`dotRadius`, `dotSpacing`, etc.) son literales estáticos en el JSX de `Landing.tsx` que nunca cambian entre renders, no hay ningún escenario real de la app donde el setup effect se dispare con un `propsRef.current` desactualizado. Aceptado — sin bug de timing (a diferencia del historial UX-44 citado).
2. **`useId()` en vez de `Math.random()` + ref para el id del gradiente SVG.** Confirmado equivalente: `useId()` genera un string estable por instancia sin necesidad de un ref, elimina el problema de pureza de render sin cambiar el comportamiento (mismo propósito: id único no colisionante entre múltiples montajes). Aceptado.
3. **`memo()` omitido en `LogoLoop.tsx`.** Razonable: el componente se monta una única vez en toda la Landing (`TrustMarquee`, lista fija de 6 ítems), sin ningún padre que fuerce re-renders frecuentes que un `memo` evitaría. No esconde un problema de rendimiento real. Aceptado.

## Hallazgo bloqueante

**`apps/client/src/components/landing/LogoLoop.tsx:37-90` (función `useAnimationLoop`)** — el loop de `requestAnimationFrame` **no respeta `prefers-reduced-motion`**: ni la función `animate` ni su primer disparo (línea 81: `rafRef.current = requestAnimationFrame(animate);`) ni la re-cola recursiva (línea 78, dentro de `animate`) consultan `prefersReducedMotion` en ningún momento. Un `grep` confirma que `prefersReducedMotion` solo aparece en 4 líneas del archivo (105, 118, 129, 132), todas fuera de `useAnimationLoop` — la prop únicamente se usa para forzar `targetVelocity = 0` (línea 129, dentro de `useMemo`), pero el RAF sigue re-encolándose indefinidamente pese a eso, porque la velocidad converge a 0 de forma asintótica (`velocityRef.current += (target - velocityRef.current) * easingFactor`, línea 70) y nunca llega a exactamente 0, así que `animate` jamás deja de correr.

Esto contradice directamente el idiom ya establecido en este mismo commit para los otros 2 fondos animados de la Landing:
- `Silk.tsx:129-143` (patrón canónico, `docs/patterns-frontend.md § P15`, punto 5): con `prefersReducedMotion` true, `renderer.render()` se llama una única vez y **nunca** se invoca `requestAnimationFrame`.
- `DotField.tsx:302-314`: guarda explícita `if (!prefersReducedMotion) { rafRef.current = requestAnimationFrame(tick); }`, con comentario propio documentando la intención ("agregada por el leader, ausente en el original de react-bits").

`LogoLoop.tsx` es el único de los 3 loops de animación de esta ronda que no implementa la guarda. Consecuencia práctica: un usuario con `prefers-reduced-motion: reduce` sigue disparando `requestAnimationFrame` a 60fps de forma indefinida mientras la franja de confianza esté montada (consumo de CPU/batería innecesario, incluso si el desplazamiento visual del track se vuelve imperceptible tras converger la velocidad a ~0). El propio checklist de esta ronda de revisión pedía confirmar explícitamente "con la prop en `true` ninguno de los dos loops de RAF/velocidad sigue animando indefinidamente" — para `LogoLoop` esa condición **no se cumple**.

**Fix esperado (no implementado por este reviewer, solo señalado):** replicar el idiom de `DotField.tsx`/`Silk.tsx` — dentro de `animate` (o en el punto de disparo inicial), gatear la re-cola de `requestAnimationFrame` con `prefersReducedMotion` (recibida como parámetro de `useAnimationLoop` o leída de `targetVelocity === 0 && prefersReducedMotion`), dejando el track en su posición estática tras aplicar el offset inicial una sola vez.

## Hallazgo no bloqueante

**`apps/client/src/components/landing/DotField.tsx:88-90`** — los valores por defecto de `gradientFrom`/`gradientTo`/`glowColor` en la firma del componente (`'rgba(168, 85, 247, 0.35)'`, `'rgba(180, 151, 207, 0.25)'`, `'#120F17'`) son literalmente los tonos morado/oscuro de la demo de react-bits que la bitácora dice explícitamente que NO se deben usar ("Colores mapeados a tokens Shear (NO los hex morado/oscuro de la demo del usuario)"). En la práctica esto no filtra a producción porque el único punto de montaje (`Landing.tsx:492-506`) pasa las 3 props de forma explícita con los tokens Shear (`DOTFIELD_DOT_COLOR`/`DOTFIELD_GLOW_COLOR`). Igualmente, dejar esos defaults fuera de marca en un componente reutilizable es una trampa latente para una futura ronda que monte `DotField` sin pasar esas 3 props explícitas. No bloquea esta ronda (cero impacto visual real, `DotField` no se usa en ningún otro lugar hoy) pero se documenta para que quede resuelto si se reutiliza el componente en el futuro.

## Mapeo de Checkpoints (Quality Gates)

- [x] C2 (Coherencia de Estados y Enfoque Atómico) — sandbox hermético respetado (`apps/client` exclusivamente), única feature `in_progress`, bitácora en disco.
- [ ] C3 (Fidelidad Arquitectónica — incl. paginación y multi-tenancy en queries) — **falla** por el gap de `prefers-reduced-motion` en `LogoLoop.tsx` (idiom P15 no aplicado consistentemente entre los 3 fondos animados de esta misma ronda). Paginación/multi-tenancy no aplica (feature 100% frontend/visual, sin queries).
- [x] C4 (Compilación Estática + Lint) — build y lint exit 0, sin errores ni warnings nuevos.
- [x] C5 (Cierre de Sesión Append-Only) — no aplica cierre todavía (feature vuelve a `CHANGES_REQUESTED`, no se cierra en esta ronda).
- [x] C6 (Capa de Datos — modelos Mongoose, `tenantId` en entidades) — no aplica (sin cambios de backend/DB en esta ronda).
- [x] C7 (Security Gate — SEC-A..H, incl. IDOR cross-tenant → 404) — no aplica (sin backend tocado); `grep` de secretos hardcodeados sin resultados; sin `dangerouslySetInnerHTML` (el `<style>` de `LogoLoop.tsx` es JSX normal, no inyección de HTML no confiable).
- [x] C8 (Estabilidad de API — CHANGELOG si hay cambio de contrato) — no aplica (sin cambios de contrato de API).

## Cambios Requeridos

1. `apps/client/src/components/landing/LogoLoop.tsx:37-90` (función `useAnimationLoop`, en particular la re-cola de línea 78 y el disparo inicial de línea 81): gatear el `requestAnimationFrame` con `prefersReducedMotion` para que, en `true`, el loop deje de re-encolarse tras aplicar el offset final una sola vez — mismo idiom que ya implementan `Silk.tsx:129-143` y `DotField.tsx:302-314` en esta misma ronda. Justificación: instrucción explícita de esta auditoría ("con la prop en `true` ninguno de los dos loops de RAF/velocidad sigue animando indefinidamente") y consistencia con `docs/patterns-frontend.md § P15` punto 5, ya aplicado a los otros 2 fondos animados del mismo commit.

## Re-auditoría del fix post-review (2026-07-27)

El implementer aplicó ambos hallazgos de la primera pasada (bitácora: sección "Fix post-review" de `progress/implements/impl_UX-46-fix.md`). Re-verificación propia, no basada en lo reportado por el implementer:

1. **Hallazgo bloqueante — RAF de `LogoLoop.tsx` sin guarda de `prefersReducedMotion` → CORREGIDO.** Confirmado por lectura directa de `apps/client/src/components/landing/LogoLoop.tsx`:
   - `useAnimationLoop` ahora recibe `prefersReducedMotion: boolean` como 6º parámetro (línea 43), invocado desde `LogoLoop` en la línea 157 (`useAnimationLoop(trackRef, targetVelocity, seqWidth, false, undefined, prefersReducedMotion);`).
   - Dentro del `useEffect` (líneas 50-101), el orden de ejecución es: (a) resuelve `track`/`seqSize`, (b) aplica el `transform` estático con el offset actual (líneas 57-60), (c) `if (prefersReducedMotion) { return; }` (líneas 69-71) — el `return` ocurre **antes** de que la función `animate` esté siquiera definida (línea 73) y antes de cualquier `requestAnimationFrame` (líneas 90/93). Con reduced-motion activo es estructuralmente imposible que se llame `requestAnimationFrame` en este flujo — no es una convergencia asintótica como el bug original, es un corte real.
   - `prefersReducedMotion` se agregó al array de dependencias del efecto (línea 101), consistente con que el efecto debe re-evaluarse si la prop cambia en caliente.
   - Posición del track en reduced-motion: `offsetRef.current` arranca en `0` (ref inicial, línea 47) y el efecto lo normaliza vía módulo (`((offsetRef.current % seqSize) + seqSize) % seqSize`, línea 58) antes de aplicarlo — con `offsetRef.current = 0` el resultado es `0`, por lo que `track.style.transform` queda en `translate3d(0px, 0, 0)`, la posición de reposo natural de la primera copia de la secuencia. No hay salto ni rotación aleatoria: el track queda estático en su posición inicial, igual que el criterio ya validado en `Silk`/`DotField` (frame único estático, sin desplazamiento).
   - Mismo patrón exacto que `Silk.tsx:139-143` (`if (prefersReducedMotion) { renderer.render(...) } else { rafRef.current = requestAnimationFrame(loop); }`) y `DotField.tsx:310-314` (`if (!prefersReducedMotion) { rafRef.current = requestAnimationFrame(tick); } else { tick(); }`) — los 3 fondos animados de la Landing ahora respetan `docs/patterns-frontend.md §P15` de forma consistente.

2. **Hallazgo no bloqueante — defaults fuera de marca en `DotField.tsx` → CORREGIDO.** Confirmado en `apps/client/src/components/landing/DotField.tsx:95-97`: `gradientFrom = 'rgba(107, 52, 68, 0.10)'`, `gradientTo = 'rgba(107, 52, 68, 0.10)'`, `glowColor = '#6B3444'` — exactamente los mismos valores que `DOTFIELD_DOT_COLOR`/`DOTFIELD_GLOW_COLOR` de `Landing.tsx`. Ya no quedan los tonos morado/oscuro de la demo de react-bits en ningún punto del archivo. `gradientFrom`/`gradientTo` siguen siendo el MISMO valor entre sí (comentario en líneas 88-94 reafirma por qué: un `linear-gradient` real de 2 tonos sigue prohibido por `docs/design.md §1.3`), consistente con el resto de la lógica ya auditada.

3. **Corridas propias post-fix:**
   - `pnpm --filter @estetica/client build` → **exit 0**. Mismo warning preexistente de chunk-size, sin errores nuevos.
   - `pnpm --filter @estetica/client lint` → **exit 0**, mismos 4 warnings preexistentes (`ProfesionalModal.tsx`, `RegistroModal.tsx`, `Negocio.tsx`, `Turnos.tsx`, ajenos a esta ronda) — sin warnings nuevos en `LogoLoop.tsx`/`DotField.tsx`.
   - `grep -rn "ShapeGrid" apps/client/src` → mismos 5 matches de comentarios de documentación histórica, sin cambios; archivo sigue borrado.
   - `grep -rln "DotField\|LogoLoop" apps/client/src` → sigue confinado a `components/landing/` + `views/Landing.tsx`.
   - `git diff --stat apps/client/package.json pnpm-lock.yaml` → mismo delta único (`ogl@1.0.11`), sin dependencias nuevas agregadas por el fix.

4. **Resto de la auditoría anterior (las 3 desviaciones ya aceptadas, los 4 puntos del bundle, greps de aislamiento, SEC-H sin secretos hardcodeados) sigue intacto** — el fix fue quirúrgico (solo tocó `LogoLoop.tsx` y `DotField.tsx`, sin volver a tocar `Landing.tsx`/`Silk.tsx`), sin efectos colaterales sobre lo ya validado.

**Conclusión:** ambos hallazgos de la ronda anterior están resueltos de forma correcta y verificable por lectura de código, sin regresiones. Se levanta el bloqueo.

## Mapeo de Checkpoints (Quality Gates) — actualizado tras el fix

- [x] C2 (Coherencia de Estados y Enfoque Atómico) — sandbox hermético respetado, única feature `in_progress` durante el ciclo, bitácora actualizada en disco con la sección "Fix post-review".
- [x] C3 (Fidelidad Arquitectónica — incl. paginación y multi-tenancy en queries) — resuelto: los 3 fondos animados de la Landing (`Silk`, `DotField`, `LogoLoop`) ahora implementan consistentemente el idiom de `docs/patterns-frontend.md §P15` para `prefers-reduced-motion`. Paginación/multi-tenancy no aplica (feature 100% frontend/visual).
- [x] C4 (Compilación Estática + Lint) — build y lint exit 0, sin errores ni warnings nuevos, re-verificado por el reviewer.
- [x] C5 (Cierre de Sesión Append-Only) — se cierra esta ronda con `"done"` en `feature_list.json` (ver abajo).
- [x] C6 (Capa de Datos — modelos Mongoose, `tenantId` en entidades) — no aplica.
- [x] C7 (Security Gate — SEC-A..H) — no aplica (sin backend tocado); sin secretos hardcodeados; sin `dangerouslySetInnerHTML`.
- [x] C8 (Estabilidad de API — CHANGELOG) — no aplica (sin cambios de contrato de API).

## Limitaciones de este entorno (sin navegador real)

No se pudo verificar visualmente: (a) el contraste real del header semitransparente (`bg-surface/70 backdrop-blur-md`) sobre el hero con `Silk` detrás en distintos navegadores/GPUs; (b) la velocidad/contraste percibido de `Silk` tras subir `speed`/opacidad/`noiseIntensity`; (c) la sensación táctil del bulge de `DotField` al mover el mouse. Estos 3 puntos se evaluaron únicamente por lectura de código (valores dentro de los rangos pedidos por el usuario, comentarios de calibración del implementer) — el usuario deberá confirmar en su navegador real antes del cierre definitivo, igual que en rondas anteriores de UX-46.
