# Reporte de Revisión Técnica — Feature UX-17

**Veredicto Final:** APPROVED
**Auditor:** Subagente Reviewer
**Timestamp:** 2026-07-07

## Alcance auditado

- `apps/client/src/utils/timeSlots.ts` (nuevo)
- `apps/client/src/views/Turnos.tsx` (modificado)
- `apps/client/src/components/RegistroModal.tsx` (modificado)
- `apps/server/` — confirmado sin cambios (`git diff --stat -- apps/server/` vacío).

## Mapeo de Checkpoints (Quality Gates)

- [x] C2 (Coherencia de Estados y Enfoque Atómico) — única feature `in_progress`, sandbox hermético (solo `apps/client/`), `impl_UX-17.md`/`explore_UX-17.md` en disco con nombres exactos.
- [x] C3 (Fidelidad Arquitectónica — incl. paginación y multi-tenancy en queries) — no aplica paginación (cálculo de slots de un día acotado, exención explícita de `.claude/rules/backend.md`); no hay listados de negocio ilimitados filtrados client-side (P3 no aplica a este caso). Todo `useQuery<T>` con genérico explícito. Sin `console.log`/`debugger`/TODO en los 3 archivos tocados.
- [x] C4 (Compilación Estática + Lint) — verificado personalmente (ver Evidencia de Build/Lint).
- [x] C5 (Cierre de Sesión Append-Only) — pendiente de que el leader complete `progress/history.md` y `progress/current.md`; no bloquea este veredicto (responsabilidad del leader post-review).
- [x] C6 (Capa de Datos — modelos Mongoose, `tenantId` en entidades) — no aplica, no se tocaron modelos.
- [x] C7 (Security Gate — SEC-A..H, incl. IDOR cross-tenant → 404) — no aplica, sin cambios de backend; el frontend no introduce lógica de autorización nueva. Grep de variables sensibles no arrojó hardcodeos (no se tocó ningún archivo de configuración de entorno).
- [x] C8 (Estabilidad de API — CHANGELOG si hay cambio de contrato) — contrato hacia el backend sin cambios: `onSubmit` de ambos formularios sigue enviando `startTime`/`nextTouchupDate` como ISO string idéntico al comportamiento previo. No aplica CHANGELOG.

## Verificación de criterios de aceptación (feature_list.json, id "UX-17")

1. **"El selector de hora presenta opciones en intervalos fijos, no texto libre."** — CUMPLIDO. `Turnos.tsx:640-667` (campo `time`) y `RegistroModal.tsx:354-379` (campo `touchupTime`) reemplazan el único `datetime-local` original por `<input type="date">` + `<Select>` (react-select + `Controller`) con opciones generadas por `getAvailableSlots(..., intervalMin: 15 default)`. Confirmado con grep: no queda ningún `datetime-local` en ninguno de los dos archivos.

2. **"Las opciones se filtran según el horario de atención configurado (EP-16) y los turnos existentes del profesional (sin superposición)."** — CUMPLIDO. Comparación línea por línea de `timeSlots.ts:53-94` contra `checkBusinessHours` (`apps/server/src/controllers/appointmentController.ts:10-48`):
   - Mismo day-numbering: backend `new Date(localDateStr).getUTCDay()` (línea 24) vs. frontend `new Date(dateStr).getUTCDay()` (`timeSlots.ts:69`) — ambos parsean un string `"YYYY-MM-DD"` sin sufijo horario, anclando a medianoche UTC. No se cometió el bug de `new Date(dateStr + 'T00:00:00')` (sin `Z`) documentado como gotcha en `.claude/rules/frontend.md`.
   - Mismo manejo de `blockedDates`: backend compara `bd.date === localDateStr` (línea 42); frontend `businessHours.blockedDates.some((bd) => bd.date === dateStr)` (`timeSlots.ts:64`), chequeado ANTES de generar candidatos (early return `[]`), igual al backend.
   - Mismo cálculo de minutos desde `openTime`/`closeTime`: backend usa `HH*60+MM` (líneas 33-36); frontend usa `toMinutes()` idéntico (`timeSlots.ts:73-74`).
   - Overlap: backend filtra `status: { $in: ['pending','confirmed'] }` (línea 92) y condición `startTime < endDate && endTime > startDate` (líneas 93-94); frontend replica con `.filter((a) => a.status === 'pending' || a.status === 'confirmed')` y `start < b.end && end > b.start` (`timeSlots.ts:77,89`). Estados `cancelled`/`completed` correctamente excluidos.
   - Exclusión del propio turno en edición: `timeSlots.ts:78` (`.filter((a) => a._id !== excludeAppointmentId)`), invocado con `excludeAppointmentId: editingAppointment?._id` en ambos formularios.
   - Sin profesional elegido: backend omite el chequeo de overlap completo (`if (professionalId) {...}`, línea 87); frontend replica con `overlaps = !!professionalId && busy.some(...)` (`timeSlots.ts:89`) — sin profesional, `overlaps` siempre `false`, pero el horario de atención se sigue aplicando (no hay bypass de `openMin`/`closeMin`).
   - Duración por defecto 60 min cuando no hay servicio elegido: replicado en ambos formularios (`selectedDurationMin = selectedService?.duration ?? 60` en `Turnos.tsx:378`; `touchupDurationMin = selectedService?.duration ?? 60` en `RegistroModal.tsx:149`), igual al fallback de `createAppointment`/`updateAppointment` (línea 69).
   - Patrón P8 (valor guardado "vencido" preservado en el `<Select>` aunque no esté en los slots recalculados): implementado en AMBOS formularios — `timeOptions` (`Turnos.tsx:392-399`) agrega `watchedTime` si no figura en `availableSlots`; `touchupTimeOptions` (`RegistroModal.tsx:162-169`) hace lo mismo con `watchedTouchupTime`.
   - `RegistroModal.tsx` SÍ incorporó la query de turnos del día que el explorer había confirmado ausente: `useQuery(['appointments','day', watchedTouchupDate, watchedProfessional], ...)` (líneas 135-147), scopeada a la fecha/profesional del retoque de ESE modal (no reutiliza estado de `Turnos.tsx`), con `getLocalDayRangeISO` y `placeholderData: keepPreviousData`.

3. **"El selector se actualiza dinámicamente al cambiar de fecha o profesional."** — CUMPLIDO. `availableSlots` (`Turnos.tsx:380-390`) y `availableTouchupSlots` (`RegistroModal.tsx:151-160`) son `useMemo` con `watchedDate`/`watchedTouchupDate` y `watchedProfessional` en sus dependencias; las queries de turnos del día (`['appointments','day', ...]`) tienen esos mismos valores en la `queryKey`, disparando refetch + recálculo automático sin intervención adicional.

## Evidencia de Build/Lint (verificado personalmente, no solo declarado por el implementer)

```
pnpm --filter @estetica/server build   → Exit Code 0 (sin salida, tsc limpio)
pnpm --filter @estetica/client build   → Exit Code 0 (tsc -b + vite build; único warning preexistente de chunk size >500kB, no bloqueante)
pnpm --filter @estetica/client lint    → Exit Code 1, pero conjunto de problemas IDÉNTICO al baseline:
  - 1 error preexistente no tocado: ProductoModal.tsx:37:25 ('stock' is assigned a value but never used) — confirmado preexistente (git log muestra el archivo sin cambios desde el commit inicial del monorepo, e347fac).
  - 4 warnings "Compilation Skipped" (React Compiler, uso de watch()): ProfesionalModal.tsx:83, Negocio.tsx:73 (sin relación con esta feature), RegistroModal.tsx:125, Turnos.tsx:212 (mismos archivos tocados, mismo tipo de warning ya preexistente por uso previo de watch('service'), solo desplazado de línea por el código nuevo insertado).
  - Cero errores/warnings NUEVOS introducidos por esta feature.
```

## Puntos críticos verificados sin hallazgos

1. Fidelidad `timeSlots.ts` vs. `checkBusinessHours` — sin divergencias.
2. Overlap de turnos (estados, exclusión de turno propio, condición de solapamiento) — replicado exacto.
3. Sin profesional elegido: overlap omitido, horario de atención sí aplicado — correcto.
4. Duración por defecto 60 min — replicado en ambos formularios.
5. Edición de turno "vencido" (patrón P8) — implementado en ambos formularios.
6. Query de turnos del día en `RegistroModal.tsx` — agregada, scopeada correctamente a fecha/profesional del propio modal.
7. Actualización dinámica (`useMemo` + `queryKey`) — dependencias correctas en ambos componentes.
8. Backend intacto — confirmado, `git diff --stat -- apps/server/` vacío.

## Nota no bloqueante (no constituye violación de checkpoint)

- El cálculo de día-de-semana en frontend (`new Date(dateStr).getUTCDay()`) asume que el día calendario mostrado en el `<input type="date">` del navegador coincide con el día calendario en la timezone configurada del tenant (`tenant.timezone`, usada por el backend en `toLocaleDateString('en-CA', { timeZone: tz })`). Esta asunción ya está documentada y aceptada en `explore_UX-17.md` (punto 4, "Gotcha de timezone a replicar con cuidado") como vigente en toda la app (negocio y usuarios en la misma tz, `America/Argentina/Buenos_Aires` por default) — no es una regresión introducida por esta feature, y el backend sigue actuando como red de seguridad final (400/409) si el cálculo frontend llegara a divergir en un tenant con timezone distinta a la del navegador. Se documenta para trazabilidad, no bloquea el veredicto.

## Cambios Requeridos

Ninguno.
