# Plan y Estado de la Sesión Actual

## Metadatos de la Sesión
- **Última actualización:** 2026-06-28
- **Sesión:** — (sin feature activa)
- **Feature en curso:** ninguna

## Plan de Acción
_Sin tareas activas. A la espera de la próxima feature._

## Estado del Backlog
- EP-12 Acceso diferenciado por rol (RBAC) → **done**
- EP-11 Gestión de Profesionales agendables → done
- EP-15 Conversión de turno a visita registrada → done
- EP-14 Crear y gestionar turnos → done
- UX-05 Sistema de invitaciones Profesionales → **cerrado**
- UX-06 Renombrado Shear + 404 + calendario fixes → **cerrado**
- UX-07 Scroll calendario + validación nextTouchupDate → **cerrado**
- UX-08 Rango horario + widget retoques mejorado → **cerrado**
- UX-09 Fecha sugerida + próximos turnos + badge cancelado + auto-cálculo → **cerrado**

## Bloqueos y Riesgos Conocidos
- Backfill manual de `tenantId` pendiente para datos legados (operativo, no bloquea desarrollo).
- Deuda de lint preexistente: `apps/client/src/components/ProductoModal.tsx:37` (`'stock' unused`).
- Observación UX-05: `GET /api/profesionales` expone `inviteToken` e `inviteTokenExpiry`. Candidato a `select('-inviteToken -inviteTokenExpiry')`.
- Deuda UX-09: `window.confirm` pre-existente en `handleCancelTouchup` (Dashboard.tsx) y `handleDelete` (ProfileClient.tsx) — violación GOV-CLIENT mandate 3, pendiente.
- Deuda UX-09: estado `isError` ausente en queries del Dashboard — 4 estados incompletos (patrón pre-existente).
