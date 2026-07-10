# Implementación — UX-27 (Frontend)

**Feature:** UX-27 — Validación de fecha mínima en "próximo retoque" (`touchupDate`) de `RegistroModal.tsx`
**Sandbox:** `apps/client/`

## Archivo modificado

- `apps/client/src/components/RegistroModal.tsx`

## Cambios

1. Se agregó un helper local `getTodayDateString()` (idéntico al de `Turnos.tsx:55-59`, sin extraerlo a un util compartido — es la segunda ocurrencia y todavía no amerita abstracción compartida según convención del repo). Ubicado inmediatamente después de la interfaz `RegistroFormValues` (~línea 63-67).
2. Se agregó el atributo nativo `min={getTodayDateString()}` al `<input type="date">` registrado como `touchupDate` (antes línea 355, ahora desplazada por el helper agregado). Mismo criterio que UX-12 en `Turnos.tsx:660-661`: bloquea a nivel de UI la selección de una fecha de retoque anterior al día calendario actual. Mismo día (hoy) queda permitido, sin importar `touchupTime`, tal como especifica la regla de negocio ya decidida.

No se tocó `handleUseSuggestedDate` (líneas ~175-184 tras el shift), que sigue generando fechas futuras compatibles con la nueva regla. Tampoco se tocó la validación existente de `touchupTime` (par fecha+hora).

## Manejo de error de backend (bypass de `min`)

Se verificó `onError: (error) => handleApiError(error, 'Error al registrar la visita')` en la mutation (líneas ~224-226, sin cambios) — ya delega a `handleApiError` + `toast.error()` según el patrón estándar del repo (`.claude/rules/frontend.md` §5). No hay ningún `<div>` de alerta inline para `touchupDate` (el único inline existente es el de `touchupTime`, para una regla distinta: par fecha+hora completo). No se duplica el mensaje de error del backend.

## Verificación

- `pnpm --filter @estetica/client build` → **Exit Code 0**.
- `pnpm --filter @estetica/client lint` → **Exit Code 1**, pero el único `error` reportado (`'stock' is assigned a value but never used` en `apps/client/src/components/ProductoModal.tsx:37:25`) es **preexistente y ajeno a esta feature** — ese archivo no fue tocado en este cambio (confirmado con `git status --porcelain`, ver diff limpio solo en `RegistroModal.tsx` del lado frontend). Los demás hallazgos del lint son `warning` de React Compiler ("Compilation Skipped: Use of incompatible library" por uso de `watch()` de react-hook-form), presentes también en `Turnos.tsx`, `Negocio.tsx`, `ProfesionalModal.tsx` — no relacionados con este cambio ni nuevos.

## Pendiente para el reviewer

- El error de lint preexistente en `ProductoModal.tsx` no bloquea esta feature pero puede requerir una tarea de limpieza aparte (fuera del alcance de UX-27).
- Los cambios de backend (`appointmentController.ts`, `serviceRecordController.ts`) fueron implementados en paralelo por otro subagente — ver su propio `impl_UX-27-backend.md`.
