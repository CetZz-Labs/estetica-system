# Plan y Estado de la Sesión Actual

## Metadatos de la Sesión
- **Última actualización:** 2026-07-31
- **Sesión:** activa
- **Feature en curso:** ninguna — UX-67 cerrada

## Plan de Acción
_(sin feature activa — plantilla vacía hasta la próxima tarea)_

## Estado del Backlog
- UX-67 (edición de productos usados/notas en historial de visitas) → done, ver `progress/history.md` para el detalle completo
- (resto del backlog sin cambios respecto a sesiones anteriores, ver `progress/history.md`)

### Pendientes
- UX-34 Rediseño Shear Etapa 4 (Agenda, Servicios, Config, perfiles)
- UX-35 Rediseño Shear Etapa 5 (limpieza de alias-puente + cierre)
- EP-18 a EP-22 Reportes (Fase 5)
- EP-23 a EP-25 Pagos (Fase 6)

## Bloqueos y Riesgos Conocidos
- Pedido de cliente sobre "registrar visitas anteriores" descartado como no-bug (2026-07-31, verificado manualmente por el usuario) — sin acción de código pendiente.
- Reporte de cliente (2026-07-31): "Productos usados" no se veía en `Historial.tsx` tras crear una visita. Diagnosticado (explorer + verificación empírica con el usuario): NO es pérdida de datos — `productsUsed` se guarda y descuenta stock correctamente. Causa raíz real: `RegistroModal.tsx` (`onSuccess` del `useMutation` de creación) no invalida `queryClient.invalidateQueries({ queryKey: ['service-records'] })` al crear una visita, a diferencia de `EditRegistroModal.tsx` que sí lo hace — la tabla de Historial queda con caché stale hasta la próxima recarga completa (F5) o remount de la vista. Confirmado por el usuario: con F5 los productos aparecen correctamente. **Decisión del usuario: dejarlo así, no se prioriza el fix.** Si en el futuro se retoma, es un cambio de una línea en `RegistroModal.tsx`.
- Riesgo TOCTOU aceptado en la reconciliación de stock por delta (P17, `docs/patterns-backend.md`): preexistente desde `createServiceRecord`, no introducido por UX-67. Mitigación opcional (`findOneAndUpdate` atómico con `$gte`) documentada pero no aplicada — evaluar si el volumen de escritura concurrente lo justifica en el futuro.
- Ver `progress/history.md` para deuda heredada de sesiones anteriores — sin cambios adicionales en esta entrada.
