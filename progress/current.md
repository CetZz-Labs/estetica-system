# Plan y Estado de la Sesión Actual

## Metadatos de la Sesión
- **Última actualización:** 2026-06-25
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

## Bloqueos y Riesgos Conocidos
- Backfill manual de `tenantId` pendiente para datos legados (operativo, no bloquea desarrollo).
- Deuda de lint preexistente: `apps/client/src/components/ProductoModal.tsx:37` (`'stock' unused`), ajena a cualquier feature en curso.
- Observación UX-05: `GET /api/profesionales` expone `inviteToken` e `inviteTokenExpiry`. Candidato a `select('-inviteToken -inviteTokenExpiry')` en la próxima iteración del controlador.
