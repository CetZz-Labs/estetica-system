# Plan y Estado de la Sesión Actual

## Metadatos de la Sesión
- **Última actualización:** 2026-06-30
- **Sesión:** —
- **Feature en curso:** ninguna

## Plan de Acción
_Sin feature activa. Listo para iniciar próxima tarea._

## Estado del Backlog
- EP-16 Configuración de disponibilidad del negocio → **done**
- EP-15 Conversión de turno a visita registrada → done
- EP-14 Crear y gestionar turnos → done
- EP-13 Calendario visual de turnos → done
- EP-12 Acceso diferenciado por rol (RBAC) → done
- EP-11 Gestión de Profesionales agendables → done

### Pendientes
- EP-17 Recordatorio de turno por mail (Fase 4)
- EP-18 a EP-22 Reportes (Fase 5)
- EP-23 a EP-25 Pagos (Fase 6)

## Bloqueos y Riesgos Conocidos
- Backfill manual de `tenantId` pendiente para datos legados (operativo, no bloquea desarrollo).
- Deuda de lint preexistente: `apps/client/src/components/ProductoModal.tsx:37` (`'stock' unused`).
- Observación UX-05: `GET /api/profesionales` expone `inviteToken` e `inviteTokenExpiry`. Candidato a `select('-inviteToken -inviteTokenExpiry')`.
- Deuda UX-09: `window.confirm` pre-existente en `handleCancelTouchup` (Dashboard.tsx) y `handleDelete` (ProfileClient.tsx) — violación GOV-CLIENT mandate 3, pendiente.
- Deuda UX-09: estado `isError` ausente en queries del Dashboard — 4 estados incompletos (patrón pre-existente).
