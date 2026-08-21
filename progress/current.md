# Plan y Estado de la Sesión Actual

## Metadatos de la Sesión
- **Última actualización:** 2026-08-20
- **Sesión:** activa
- **Feature en curso:** ninguna — UX-72, UX-74, UX-73 y UX-75 cerradas esta sesión (ver `progress/history.md`)

## Plan de Acción
_(sin feature activa — plantilla vacía hasta la próxima tarea)_

## Estado del Backlog
- UX-72 (eliminar registro de historial con restauración de stock, rol ADMIN) → done, ver `progress/history.md`
- UX-74 (bugfix: no se podía registrar visita con fecha de hoy) → done, ver `progress/history.md`
- UX-73 (apellido opcional del cliente, incluida carga masiva) → done, ver `progress/history.md`
- UX-75 (revert de UX-73: apellido vuelve a ser obligatorio) → done, ver `progress/history.md`
- (resto del backlog sin cambios respecto a sesiones anteriores, ver `progress/history.md`)

### Pendientes
- UX-34 Rediseño Shear Etapa 4 (Agenda, Servicios, Config, perfiles)
- UX-35 Rediseño Shear Etapa 5 (limpieza de alias-puente + cierre)
- EP-18 a EP-22 Reportes (Fase 5)
- EP-23 a EP-25 Pagos (Fase 6)

## Bloqueos y Riesgos Conocidos
- **Deuda de test preexistente (no bloqueante):** `apps/server/src/__tests__/tenantIsolation.test.ts` tiene 4 tests fallando en `POST /api/registros` por no enviar `professional` en el body (obligatorio desde EP-11). Candidata a feature de mantenimiento futura.
- **UX-68 — simplificación de alcance documentada (no bloqueante):** el cron diario de push (`pushReminderScheduler.ts`) calcula "hoy" con la timezone del proceso servidor, no `tenant.timezone`.
- Reporte de cliente (2026-07-31): "Productos usados" no se veía en `Historial.tsx` tras crear una visita — **decisión del usuario: no se prioriza el fix.**
- Riesgo TOCTOU aceptado en la reconciliación de stock por delta (P17, `docs/patterns-backend.md`), heredado también por el delete de UX-72.
- **Trabajo sin commitear (2026-08-20):** todo el ciclo de esta sesión (UX-72, UX-74, UX-73, UX-75) sigue sin commitear en `apps/`, `docs/`, `CHANGELOG.md` y `feature_list.json`. Pendiente de que el usuario confirme el checkpoint de commit antes del merge a development/main que mencionó al inicio de la sesión.
- **Recordatorio operativo (incidente previo, ver memoria `reviewer-git-stash-incident`):** ningún subagente debe usar `git stash` sin acotar a un archivo específico ni dejarlo sin pop. Verificar `git stash list` vacío al cierre de cada revisión.
