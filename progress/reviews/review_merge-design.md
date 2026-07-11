# Reporte de Revisión Técnica — Merge `design` → `dev/facu`

**Veredicto Final:** APPROVED
**Auditor:** Subagente Reviewer
**Timestamp:** 2026-07-10

> Nota de alcance: este NO es un cierre de feature de `feature_list.json` — es la auditoría de una
> resolución de merge de ramas (`MERGE_HEAD` presente, sin commitear). El veredicto aplica al estado
> actual del índice, no a un ID de `feature_list.json`. Esta es la **segunda pasada** de auditoría.

## Ronda 1 (histórico) — CHANGES_REQUESTED

La primera pasada aprobó la resolución funcional de los 6 conflictos de contenido, `AppLayout.tsx`
(decisión de producto sobre `Notificaciones.tsx`) y el build/lint sin regresiones, pero bloqueó el
merge por una violación de C3: el `index.css` de `design` (adoptado sin marcador de conflicto)
eliminó las variables de tema legacy `--color-maison-*` sin período de transición, y 4 archivos de
contenido post-divergencia de `dev/facu` seguían referenciando clases `maison-*` que ya no resolvían
a ningún color (`Dashboard.tsx` sección "Detalle del Retoque", `Turnos.tsx:577` Tooltip, `Historial.tsx`
completo, `Negocio.tsx` sección "Recordatorio de turno"). Detalle completo en el historial de git de
este mismo archivo / `impl_merge-design-frontend.md`.

## Ronda 2 — Verificación del fix (esta pasada)

### 1. Grep global de clases `maison-*`

```
$ grep -rn "maison" apps/client/src --include="*.tsx" --include="*.ts" --include="*.css"
apps/client/src/utils/contrastColor.ts:12: * Calcula el color de texto (blanco o el oscuro del sistema `maison-text`) que mantiene
```

**0 coincidencias de clases Tailwind.** El único match es un comentario de documentación en
`contrastColor.ts` que menciona el nombre histórico del sistema de diseño — no es una clase, no
afecta runtime, fuera de alcance de este gate.

También verificado en el CSS compilado: `grep -c "maison" apps/client/dist/assets/*.css` → **0**.

### 2. Lectura completa de los 4 archivos reportados

- **`Dashboard.tsx`** (líneas 490-672, sección "Detalle del Retoque" completa): migración coherente
  y completa. Footer del modal (`text-muted-foreground hover:text-destructive`, `bg-primary
  hover:bg-primary/90`), los 4 bloques de info (`bg-background border-border`, íconos en `bg-card`,
  `text-foreground`), edición inline de fecha de retoque (botón "Guardar" en línea 607 ahora
  `bg-primary hover:bg-primary/90 text-white` — riesgo de contraste roto señalado en ronda 1
  **resuelto**), link "Ir a ficha del cliente" en `text-primary`. Idéntico criterio de tokens que
  `AppointmentDetail.tsx`. Sin restos `maison-*`.
- **`Turnos.tsx:577`**: `<Tooltip className="!bg-primary !text-primary-foreground !text-xs !rounded-lg !py-1.5 !px-3">`.
  Mejora incluso sobre el enfoque anterior (`!text-white` fijo): usa el token
  `--color-primary-foreground`, theme-aware para dark mode.
- **`Historial.tsx`** (archivo completo, 306 líneas): header, card de filtros (`bg-card
  border-border`), inputs de rango de fecha (`bg-background border-border focus:ring-ring`), tabla
  (`border-border`, `divide-border`, `hover:bg-muted/50`), los 4 estados completos y correctos
  (loading: skeleton `animate-pulse` con `bg-muted`; error: `border-destructive/30 bg-destructive/10
  text-destructive` + `FiAlertCircle` + texto — trifecta íntegra; empty: `text-muted-foreground/60` +
  `FiClock` + mensaje condicional según filtros activos; data: tabla con `text-foreground`/
  `text-muted-foreground`). `selectStyles` de `react-select` sigue con colores hex hardcodeados
  (`#FDFBF7`, etc.) porque `react-select` no soporta clases Tailwind directamente — es el mismo
  patrón ya usado en el resto de las vistas con `react-select` del proyecto (no es una regresión de
  este merge, está fuera del alcance de los 4 archivos reportados).
- **`Negocio.tsx`** (líneas 240-310, sección "Recordatorio de turno"): card contenedora `bg-card
  border-border rounded-lg`, input "Horas de anticipación" con estado de error
  `border-destructive` (línea 282) + mensaje `text-destructive` (línea 291) + ícono
  `FiAlertCircle` + texto descriptivo — **trifecta de accesibilidad confirmada e intacta**, con el
  mismo criterio que el resto del archivo (formulario "Datos del Negocio").

### 3. Build y Lint (ejecutados por mí)

- `pnpm --filter @estetica/client build` → **Exit Code 0** (`tsc -b && vite build`, único warning de
  tamaño de chunk >500kB, no bloqueante, sin cambios respecto a ronda 1).
- `pnpm --filter @estetica/client lint` → Exit code 1 con **exactamente los mismos 6 errores** de
  ronda 1, comparados uno por uno:
  1. `ProductoModal.tsx:37:25` — `'stock' is assigned a value but never used`.
  2. `react-bits/Aurora.tsx:126:5` — acceso/mutación de ref durante render.
  3. `react-bits/Aurora.tsx:145:13` — `prefer-const`.
  4. `react-bits/SplitText.tsx:49:13` — `setState` síncrono en efecto.
  5. `react-bits/TextType.tsx:169:9` — acceso a ref durante render.
  6. `views/AceptarInvitacion.tsx:64:20` — `react-hooks/rules-of-hooks` (hook condicional).
  Más 4 warnings preexistentes de "Compilation Skipped" del React Compiler por uso de
  `watch()` de react-hook-form (`ProfesionalModal.tsx`, `RegistroModal.tsx`, `Negocio.tsx`,
  `Turnos.tsx`) — no bloqueantes, no relacionados con la migración de tokens.
  **Ningún error nuevo introducido.** Ninguno de los 4 archivos migrados (`Dashboard.tsx`,
  `Turnos.tsx`, `Historial.tsx`, `Negocio.tsx`) aparece en la lista de errores.

### 4. Resto de la resolución del merge (re-confirmado, sin cambios)

- `git status --short | grep -E "^UU|^AA|^DD"` → sin salida, cero conflictos pendientes.
- `apps/client/src/views/Notificaciones.tsx` → no existe en disco, 0 referencias en `apps/client/src`
  (`grep -rn "Notificaciones"` → 0 resultados). Decisión de producto de EP-17-b respetada.
- `apps/server/` → sin diff cacheado, backend intacto (merge puramente frontend).
- Los 6 archivos con conflicto de contenido y `AppointmentDetail.tsx`/`appointmentStatus.tsx`
  (auditados en detalle en ronda 1) no muestran cambios adicionales — la única modificación de esta
  ronda fue la migración de tokens en los 4 archivos señalados.

## Mapeo de Checkpoints (Quality Gates)

- [x] C2 (Coherencia de Estados y Enfoque Atómico) — 4 estados completos y correctos en `Historial.tsx`; sin regresión en el resto de vistas migradas.
- [x] C3 (Fidelidad Arquitectónica — Sistema de Diseño) — **violación de ronda 1 resuelta**: 0 clases `maison-*` residuales, tokens coherentes con `AppointmentDetail.tsx` y el resto de vistas restyleadas por `design`.
- [x] C4 (Compilación Estática + Lint) — build Exit Code 0; lint con los mismos 6 errores/4 warnings preexistentes, ninguno nuevo.
- [x] C5 (Cierre de Sesión Append-Only) — bitácora del implementer documenta ambas rondas correctamente, sin sobrescribir el registro de la primera.
- [x] C6 (Capa de Datos) — no aplica, merge puramente frontend, backend sin diff.
- [x] C7 (Security Gate) — no aplica, sin cambios de auth/tenant/queries.
- [x] C8 (Estabilidad de API) — no aplica, sin cambio de contrato.

## Veredicto

**APPROVED.** El bloqueante de ronda 1 (tokens `maison-*` residuales tras la eliminación de las
variables de tema legacy en `index.css`) está completamente resuelto en los 4 archivos señalados, con
migración coherente al mapeo de tokens ya validado en `AppointmentDetail.tsx`, preservando
explícitamente la trifecta de accesibilidad en los estados de error de `Negocio.tsx` e
`Historial.tsx`. Build y lint confirmados por este auditor sin regresiones. El resto de la
resolución del merge (6 conflictos de contenido + decisión de producto sobre `Notificaciones.tsx` +
backend intacto) permanece sin cambios respecto a la ronda 1, ya validado.

**Listo para el commit final de merge (a cargo del leader).**
