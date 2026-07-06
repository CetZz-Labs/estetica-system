# Reporte de Revisión Técnica — Feature UX-12

**Veredicto Final:** CHANGES_REQUESTED
**Auditor:** Subagente Reviewer
**Timestamp:** 2026-07-06

## Alcance auditado
UX-12 — Validación de fecha/hora al crear turnos. Alcance acotado (confirmado por decisión de producto en `progress/current.md`): solo bloquear creación/edición con fecha/hora pasada. NO se audita la limitación conocida de superposición sin `professional` (riesgo aceptado, documentado en `progress/current.md` § Bloqueos y Riesgos Conocidos — no se reabre).

## Archivos auditados
- `apps/server/src/controllers/appointmentController.ts` (`createAppointment`, `updateAppointment`)
- `apps/client/src/views/Turnos.tsx`
- `progress/implements/impl_UX-12-backend.md`
- `progress/implements/impl_UX-12-frontend.md`
- `feature_list.json` (entrada `UX-12`)
- `CHECKPOINTS.md`

## Mapeo de Checkpoints (Quality Gates)
- [x] C2 (Coherencia de Estados y Enfoque Atómico) — única feature `in_progress`, `progress/current.md` describe la feature en curso, bitácoras de implementer presentes.
- [ ] C3 (Fidelidad Arquitectónica — incl. coherencia funcional del flujo de edición)
- [x] C4 (Compilación Estática + Lint) — ver detalle abajo.
- [ ] C5 (Cierre de Sesión Append-Only) — no aplica todavía (pendiente de mi veredicto; bloqueado por C3).
- [x] C6 (Capa de Datos) — sin cambios de modelos/queries.
- [x] C7 (Security Gate) — sin cambios de IDOR, auth ni multi-tenancy; validación agregada es puramente temporal (`Date.now()`).
- [x] C8 (Estabilidad de API) — no hay cambio de contrato de respuesta (solo un nuevo camino de error 400, ya cubierto por la tabla de códigos HTTP existente).

## Verificación de Builds
```
pnpm --filter @estetica/server build   → Exit Code 0
pnpm --filter @estetica/client build   → Exit Code 0
pnpm --filter @estetica/client lint    → Exit Code 1 (1 error preexistente)
```
El único error de lint es `apps/client/src/components/ProductoModal.tsx:37` (`'stock' is assigned a value but never used`), confirmado con `git diff HEAD -- apps/client/src/components/ProductoModal.tsx` (sin cambios) — archivo fuera del alcance de UX-12, deuda preexistente ya documentada en `progress/current.md`. No es bloqueante para esta feature puntual. Los 4 warnings restantes (`react-hooks/incompatible-library` sobre `watch()`) son preexistentes en otros archivos y en el propio `Turnos.tsx:401` (ya existía antes del cambio, es el mismo `watch('service')` usado para `selectedService`).

## Backend — verificación funcional
`createAppointment` (`appointmentController.ts:82-84`) y `updateAppointment` (`appointmentController.ts:193-195`) rechazan correctamente con 400 + mensaje descriptivo cuando `startTime` es pasado. El orden respecto al chequeo de solapamiento y multi-tenancy es correcto, y no se tocó ningún query sin `tenantId`.

Sin embargo, en `updateAppointment` la validación se dispara con `if (startTime && ...)` — es decir, **cualquier request que incluya `startTime` en el body queda sujeto al chequeo**, sin importar si el valor cambió respecto al turno existente. Esto es correcto en el backend de forma aislada (no puede distinguir "sin cambios" de "cambio" sin comparar contra `existing.startTime`), pero expone un problema de contrato con el frontend, detallado abajo.

## Frontend — bug funcional bloqueante

`Turnos.tsx:286-300` (`onSubmit`):
```typescript
const onSubmit = (data: AppointmentFormData) => {
    const payload: Partial<AppointmentFormData> & { startTime: string; client: string } = {
        client: data.client,
        startTime: new Date(data.startTime).toISOString(),
        notes: data.notes,
        ...(data.service ? { service: data.service } : {}),
        ...(data.professional ? { professional: data.professional } : {}),
    };

    if (editingAppointment) {
        updateMutate({ id: editingAppointment._id, data: payload });
    } else {
        createMutate(payload as AppointmentFormData);
    }
};
```
`startTime` se incluye **siempre e incondicionalmente** en el payload de `PUT`, sin comparar contra `originalStartTimeRef.current` (que solo se usa para el `validate` inline de react-hook-form, `Turnos.tsx:634-650`, y nunca se propaga al armado del payload).

El implementer documentó en `impl_UX-12-frontend.md` (línea 47) el comportamiento esperado: *"Editar turno histórico sin tocar la fecha: [...] la validación devuelve `true` y no bloquea el submit, aunque la fecha ya sea pasada"*. Esto es **falso en la práctica**, porque el bypass solo evita el error inline en el formulario — el request HTTP que sale hacia el backend sigue llevando el mismo `startTime` pasado, y `updateAppointment` (`appointmentController.ts:193`) lo rechaza igual con 400 `'No se puede reprogramar un turno a una fecha u hora pasada'`.

**Reproducción concreta:** un turno `status: 'pending'` cuyo `endTime` ya pasó se muestra en la UI como "Atrasado" (`isOverduePending`, `Turnos.tsx:88-90`) pero **sigue siendo editable** — el botón de edición en `detailFooter` (`Turnos.tsx:365-378`) solo se oculta si `status === 'cancelled' || status === 'completed'`, y "atrasado" es un estado derivado de solo-lectura en el frontend (`getRenderStatus`), no un valor persistido. Abrir el modal de edición de ese turno para, por ejemplo, agregar una nota o reasignar profesional (sin tocar la fecha) y enviar el formulario dispara un 400 del backend, mostrado como toast de error via `handleApiError` (fallback en `updateMutate.onError`, `Turnos.tsx:187-194`). Esto **rompe un flujo legítimo preexistente** (editar notas/profesional de un turno vencido) y contradice tanto el criterio de aceptación implícito de "no bloquear indebidamente" como la propia documentación del implementer, que asumió (sin probarlo end-to-end) que el bypass de validación inline era suficiente.

**Corrección esperada:** el payload de `PUT` debe omitir `startTime` cuando su valor coincide con `originalStartTimeRef.current` (o, alternativamente, el backend debería comparar contra `existing.startTime` antes de aplicar la regla — pero el patrón ya usado por el propio implementer para el resto de los campos opcionales, ej. `...(data.service ? {...} : {})`, indica que la solución idiomática es en el frontend: no enviar `startTime` si no cambió).

## Otros hallazgos (no bloqueantes)
- Higiene de depuración: sin `console.log`/`debugger`/`TODO` en los archivos tocados.
- Variables sensibles: no aplica (sin cambios de configuración de entorno).

## Cambios Requeridos
1. `apps/client/src/views/Turnos.tsx:286-293` (`onSubmit`): el payload de actualización envía `startTime` incondicionalmente incluso cuando el usuario no modificó la fecha/hora del turno en edición. Esto reintroduce el bloqueo de 400 del backend (`appointmentController.ts:193-195`) para el caso explícitamente exceptuado ("editar turno histórico sin tocar la fecha"), rompiendo la edición de notas/profesional/servicio en turnos vencidos (`status: 'pending'` con `endTime` pasado, visibles como "Atrasado" pero editables per `detailFooter`, `Turnos.tsx:365-378`). Ajustar el armado del payload para omitir `startTime` cuando `data.startTime === originalStartTimeRef.current`, replicando el mismo patrón condicional ya usado para `service`/`professional` en el mismo bloque.

## Estado del backlog
`feature_list.json` → `UX-12` se deja en `"status": "blocked"` (no se aplica `"done"`). El `leader` debe relanzar al implementer de frontend con este hallazgo puntual antes de re-solicitar revisión.

---

# Re-auditoría (segunda pasada) — Fix post-review

**Veredicto Final:** APPROVED
**Auditor:** Subagente Reviewer
**Timestamp:** 2026-07-06 (segunda pasada)

## Alcance de esta pasada
Verificación puntual del fix documentado en la sección "Fix post-review" de `impl_UX-12-frontend.md`, que ataja el único bloqueo señalado en la primera pasada (`onSubmit` de `Turnos.tsx` enviando `startTime` incondicionalmente en el `PUT`).

## Verificación del código real (no solo la bitácora)
Confirmado con `git diff HEAD -- apps/client/src/views/Turnos.tsx` y lectura directa del archivo:

- `Turnos.tsx:286-297` (`onSubmit`): ahora calcula `startTimeUnchanged = editingAppointment && originalStartTimeRef.current !== '' && data.startTime === originalStartTimeRef.current`, y el payload usa `...(startTimeUnchanged ? {} : { startTime: ... })`. El tipo del payload se ajustó correctamente de `Partial<AppointmentFormData> & { startTime: string; client: string }` a `Partial<AppointmentFormData> & { client: string }` (ya no exige `startTime` obligatorio).
- Formato consistente: `originalStartTimeRef.current` se setea con el mismo patrón de padding (`YYYY-MM-DDTHH:mm`) tanto en `openEditModal` (`Turnos.tsx:306-311`) como en el helper `getNowLocalDateTimeString` y en el valor que produce el propio `<input type="datetime-local">` vía `register`. No hay desfasaje de formato Date-vs-string que pudiera romper la comparación por igualdad estricta.
- `originalStartTimeRef.current` se resetea correctamente a `''` en ambos flujos de creación (`handleDateClick:261`, botón "Nuevo Turno" `:424`), por lo que `startTimeUnchanged` es siempre `false` en creación → `startTime` viaja siempre en el `POST` (comportamiento sin cambios respecto a la primera pasada, ya aprobado).
- **Casos verificados manualmente contra el código:**
  1. **Editar turno vencido sin tocar la fecha** (el caso bloqueante original): `data.startTime === originalStartTimeRef.current` → `startTimeUnchanged = true` → el payload del `PUT` omite `startTime`. Verificado contra `appointmentController.ts:193` (`updateAppointment`): la regla `if (startTime && new Date(startTime).getTime() < Date.now())` solo se evalúa si `startTime` está presente en el body; al omitirse, no se dispara el 400. El resto del controller maneja correctamente la ausencia de `startTime` reutilizando `existing.startTime`/`existing.endTime` para el chequeo de solapamiento (`appointmentController.ts:205-226`) — no reintroduce ningún otro bug.
  2. **Editar turno futuro sin tocar la fecha:** mismo camino (`startTimeUnchanged = true`), se omite `startTime` del payload — el `PUT` no lo necesita si no cambió, y el resto de los campos (notas/servicio/profesional) se actualiza igual. No se detecta regresión: sigue siendo posible editar un turno futuro modificando su fecha (caso 3).
  3. **Editar turno (futuro o vencido) cambiando la fecha a una nueva fecha pasada:** `data.startTime !== originalStartTimeRef.current` → `startTimeUnchanged = false` → se envía el nuevo `startTime`, rechazado con 400 por el backend. Comportamiento correcto y ya validado en la primera pasada.
  4. **Editar turno cambiando la fecha a una nueva fecha futura:** mismo camino, se envía y el backend lo acepta. No se detectó ningún caso en que el fix impida editar el `startTime` de un turno cuando el usuario sí lo cambia — el `if` compara explícitamente contra el valor original, no anula el campo de forma incondicional.
- `handleEventDrop` (`Turnos.tsx:278-284`, drag-and-drop en el calendario) sigue enviando `startTime` incondicionalmente, lo cual es correcto: un drag siempre representa un cambio real de fecha/hora, no aplica la comparación de "sin cambios". No fue tocado por este fix y no estaba señalado como bloqueante.

No se detecta ningún nuevo problema introducido por el fix (ni bloqueo de edición de turnos futuros, ni fallas de formato en la comparación de string vs Date).

## Verificación de Builds (repetida)
```
pnpm --filter @estetica/server build   → Exit Code 0
pnpm --filter @estetica/client build   → Exit Code 0
pnpm --filter @estetica/client lint    → Exit Code 1 (mismo único error preexistente en ProductoModal.tsx:37, `'stock' is assigned a value but never used` — archivo no tocado por UX-12 en ninguna de las dos pasadas, confirmado nuevamente con `git diff --stat`; ya aceptado como no bloqueante en la primera pasada)
```

## Mapeo de Checkpoints (actualizado)
- [x] C2 (Coherencia de Estados y Enfoque Atómico)
- [x] C3 (Fidelidad Arquitectónica — incl. coherencia funcional del flujo de edición) — **resuelto**: el payload ya no reintroduce el bloqueo de turnos vencidos sin cambio de fecha.
- [x] C4 (Compilación Estática + Lint) — builds en 0, lint con el mismo error preexistente ajeno al alcance.
- [x] C5 (Cierre de Sesión Append-Only) — esta entrada se agrega en modo append, sin alterar la primera pasada.
- [x] C6 (Capa de Datos)
- [x] C7 (Security Gate)
- [x] C8 (Estabilidad de API)

## Estado del backlog (actualizado)
`feature_list.json` → `UX-12` actualizado de `"status": "blocked"` a `"status": "done"`.
