# Plan y Estado de la Sesión Actual

## Metadatos de la Sesión
- **Última actualización:** 2026-08-04
- **Sesión:** activa
- **Feature en curso:** ninguna — UX-70, UX-69, UX-68 y UX-71 (fix menor sobre UX-69: quitar Próximo Retoque del form de visita pasada) cerradas

## Plan de Acción
_(sin feature activa — plantilla vacía hasta la próxima tarea)_

## Estado del Backlog
- UX-70 (quitar turno duplicado de retoque en agenda) → done, ver `progress/history.md`
- UX-69 (historial de cliente: visita pasada + paginación/filtros de fecha) → done, ver `progress/history.md`
- UX-68 (notificaciones push PWA) → done, ver `progress/history.md`. **Requiere acción del usuario humano fuera de código:** cargar el par de claves VAPID en `apps/server/.env` y `VITE_VAPID_PUBLIC_KEY` en `apps/client/.env` (valores entregados en el chat de esta sesión) — sin esto, la feature no envía push en runtime.
- (resto del backlog sin cambios respecto a sesiones anteriores, ver `progress/history.md`)

### Pendientes
- UX-34 Rediseño Shear Etapa 4 (Agenda, Servicios, Config, perfiles)
- UX-35 Rediseño Shear Etapa 5 (limpieza de alias-puente + cierre)
- EP-18 a EP-22 Reportes (Fase 5)
- EP-23 a EP-25 Pagos (Fase 6)

## Bloqueos y Riesgos Conocidos
- **Deuda de test preexistente (no bloqueante, confirmada repetidamente en UX-70/UX-69/UX-68):** `apps/server/src/__tests__/tenantIsolation.test.ts` tiene 4 tests fallando en `POST /api/registros` por no enviar `professional` en el body (obligatorio desde EP-11). Candidata a feature de mantenimiento futura.
- **UX-68 — simplificación de alcance documentada (no bloqueante):** el cron diario de push (`pushReminderScheduler.ts`) calcula "hoy" con la timezone del proceso servidor, no `tenant.timezone` (a diferencia del patrón canónico de otros controllers). Aceptable para un resumen a las 08:00 AM; revisar si se requiere precisión por tenant en una iteración futura.
- Reporte de cliente (2026-07-31): "Productos usados" no se veía en `Historial.tsx` tras crear una visita — causa raíz conocida (`RegistroModal.tsx` no invalida `['service-records']`). **Decisión del usuario: no se prioriza el fix.**
- Riesgo TOCTOU aceptado en la reconciliación de stock por delta (P17, `docs/patterns-backend.md`): preexistente desde `createServiceRecord`.
- **Recordatorio operativo (incidente 2026-08-04, ver memoria `reviewer-git-stash-incident`):** ningún subagente debe usar `git stash` sin acotar a un archivo específico ni dejarlo sin pop. Verificar `git stash list` vacío al cierre de cada revisión — ya incorporado como instrucción explícita en los prompts de reviewer de esta sesión.
