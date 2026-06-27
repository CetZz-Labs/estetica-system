# impl_UX-09-frontend

Feature: UX-09 — Dashboard: panel de próximos turnos y mejoras al flujo de registro

## Archivos modificados

| Archivo | Cambio |
|---|---|
| `apps/client/src/api/appointmentApi.ts` | Agregada función `getUpcomingAppointments` (GET /turnos/proximos) |
| `apps/client/src/components/RegistroModal.tsx` | `watch`+`setValue` en useForm; variables derivadas `watchedServiceId/Date`, `selectedService`, `hasSuggestedTouchup`; handler `handleUseSuggestedDate`; botón "Usar sugerida" condicional en campo Próximo Retoque; invalidación de `upcoming-appointments` en onSuccess |
| `apps/client/src/views/ProfileClient.tsx` | Dot del timeline con color condicional por `touchupStatus`; badge "Retoque Cancelado" |
| `apps/client/src/views/Dashboard.tsx` | Import ampliado; 3 estados nuevos (`completedAppointmentId`, `prefillProfessional`, `prefillServiceDate`); query `proximosTurnos`; `isDashboardLoading` actualizado; mutación `cancelAppointmentMutate`; handlers `handleCancelAppointment`, `handleCompleteFromDashboard`, `handleCloseRegistroModal`; `handleOpenNewVisit` y `handleTouchupCheck` actualizados con reset completo de prefills; grid reestructurado en 3 paneles (retoques + turnos + movimientos full-width); `sm:opacity-0` removido; `<RegistroModal>` con 3 props nuevas |

## Verificaciones

- `getUpcomingAppointments` en `appointmentApi.ts`: PASS
- `watch` y `setValue` en `RegistroModal.tsx`: PASS
- `handleUseSuggestedDate` en `RegistroModal.tsx`: PASS
- `touchupStatus === 'cancelled'` en `ProfileClient.tsx`: PASS
- `proximosTurnos` y `handleCompleteFromDashboard` en `Dashboard.tsx`: PASS
- `sm:opacity-0` ausente en `Dashboard.tsx`: PASS

## Build

No ejecutado (instrucción explícita del task spec). Pendiente de ejecución por el reviewer.

## Decisiones técnicas

- Las variables derivadas con `watch()` se colocaron después de `useFieldArray` (no antes de `clientOptions` como señalaban los comentarios de placement) porque `watch` requiere que `useForm` haya sido llamado primero; es la única ubicación técnicamente válida dentro del componente.
- El helper `handleUseSuggestedDate` construye la fecha sugerida en local time (year/month/day desde el string YYYY-MM-DD del input `date`) para evitar el gotcha UTC-3 documentado en `docs/conventions.md`.
- `appt.professional?._id` usa optional chaining defensivo aunque el tipo declare `professional` como requerido, siguiendo el patrón del template de 4e.
