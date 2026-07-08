# Plan y Estado de la Sesión Actual

## Metadatos de la Sesión
- **Última actualización:** 2026-07-08
- **Sesión:** ninguna en curso
- **Feature en curso:** ninguna

## Plan de Acción
(vacío — sin feature activa. Última sesión cerró la tanda 2 de UX completa y EP-17-b. Próximo bloque disponible del backlog: EP-18+ Reportes, Fase 5.)

## Estado del Backlog
- EP-17-b Migrar envío de mails de SMTP por-tenant a SMTP global de la app → **done**
- UX-26 Bug: tooltip de hover del calendario detrás de otros elementos → **done**
- UX-24 Bug visual: Select de hora recortado por el modal → **done**
- UX-18 Rediseño visual del calendario (leyenda + colores sólidos + tooltip) → **done**
- UX-17 Selector de horario con slots de disponibilidad → **done**
- UX-23 Bug: duplicado de producto no excluía eliminados → **done**
- UX-21 Validar unicidad de nombre de servicio en catálogo → **done**
- UX-19 Eliminación rápida de producto en Inventario → **done**
- UX-22 Cerrar modal al clickear afuera (backdrop) → **done**
- UX-16 Modal de detalle al click en card de turno/retoque (Dashboard) → **done**
- UX-15 Crash de página en blanco al clickear un turno pasado (tachado) → **done**
- UX-14 Desfasaje horario al mostrar la hora de una visita/retoque → **done**
- UX-13 Retoques futuros ocultos cuando existe un retoque pendiente → **done**
- UX-12 Validación de fecha/hora al crear turnos → **done**
- EP-17 Recordatorio de turno por mail → **done**
- EP-16 Configuración de disponibilidad del negocio → done
- EP-15 Conversión de turno a visita registrada → done
- EP-14 Crear y gestionar turnos → done
- EP-13 Calendario visual de turnos → done
- EP-12 Acceso diferenciado por rol (RBAC) → done
- EP-11 Gestión de Profesionales agendables → done

### Pendientes
- EP-18 a EP-22 Reportes (Fase 5)
- EP-23 a EP-25 Pagos (Fase 6)

## Bloqueos y Riesgos Conocidos
- Deuda técnica UX-24 (2026-07-08): el fix de portal (`menuPortalTarget`+`styles.menuPortal`) se aplicó solo al Select de Hora en `Turnos.tsx`/`RegistroModal.tsx`, por decisión de producto. Los otros 7 Select (Cliente/Servicio/Profesional/Producto) comparten la misma causa raíz (mismo contenedor con overflow) y podrían recortarse igual — generalizar si se reporta el mismo síntoma.
- Riesgo aceptado UX-24 (2026-07-08): sin entorno E2E, no se verificó en navegador real que el portal no rompa el cierre por click-afuera (UX-22). Análisis de código (bubbling de React Portals por árbol de React, no DOM) indica riesgo bajo — pendiente de confirmación visual humana.
- Riesgo aceptado UX-26 (2026-07-08): mismo tipo de limitación — el fix de `z-index` en el tooltip de hover no se verificó visualmente en navegador real.
- Backfill manual de `tenantId` pendiente para datos legados (operativo, no bloquea desarrollo).
- Deuda de lint preexistente: `apps/client/src/components/ProductoModal.tsx:37` (`'stock' unused`).
- Observación UX-05: `GET /api/profesionales` expone `inviteToken` e `inviteTokenExpiry`. Candidato a `select('-inviteToken -inviteTokenExpiry')`.
- Deuda UX-09: `window.confirm` pre-existente en `handleCancelTouchup` (Dashboard.tsx) y `handleDelete` (ProfileClient.tsx) — violación GOV-CLIENT mandate 3, pendiente.
- Deuda UX-09: estado `isError` ausente en queries del Dashboard — 4 estados incompletos (patrón pre-existente).
- Deuda EP-11-fix (2026-07-01): `PUT /api/profesionales/:id` no valida `confirm` con `express-validator` como sí hace el `DELETE` — asimetría de higiene, sin riesgo de seguridad (el campo nunca se persiste).
- Deuda EP-17 (2026-07-01): sin tests automatizados para `mailService.ts`/`reminderScheduler.ts`.
- Riesgo EP-17 (2026-07-01): `pnpm --filter @estetica/server test` falla en este sandbox por un problema de entorno (descarga del binario de `mongodb-memory-server`), no por regresión de código — a confirmar en un entorno con acceso de red completo antes de asumir que la suite de tests está sana.
- Limitación conocida UX-12 (2026-07-06, decisión de producto): la validación de superposición de turnos NO corre cuando el turno no tiene `professional` asignado (campo opcional en el form). Riesgo aceptado explícitamente por el usuario — no reabrir sin nueva decisión de producto.
- Deuda técnica UX-13 (2026-07-06): tras el fix del auto-completado de retoques (`nextTouchupDate: { $lte: ... }`), un `ServiceRecord` `pending` con `nextTouchupDate` null/ausente queda excluido del `updateMany` y **nunca** se auto-completa automáticamente (antes sí se cerraba, sin importar la fecha). No es regresión respecto al criterio de aceptación, pero podría generar retoques "pending" huérfanos. Candidato a feature separada: exigir `nextTouchupDate` cuando `touchupStatus` nace `pending`.
- Deuda de higiene UX-13 (2026-07-06): la lógica de auto-completado de retoques queda duplicada en `serviceRecordController.ts` y `appointmentController.ts` (mismo filtro `updateMany`, no extraído a `services/`). Candidato a refactor futuro si se vuelve a tocar esa regla.
- Deuda de higiene UX-14 (2026-07-06, hallazgo del explorer, no corregido — fuera de alcance): `Turnos.tsx:527,733` formatea hora con `toLocaleTimeString` ad-hoc en vez de delegar en `formatDateTime`, violando `.claude/rules/frontend.md` §4. No es la causa del bug corregido, pero es candidato a limpieza futura.
- Riesgo aceptado UX-14 (2026-07-06): los `nextTouchupDate`/`startTime` ya persistidos antes del fix quedan con el offset horario incorrecto (dato histórico contaminado). No se migró — decisión explícita de acotar el alcance a "iguales visitas hacia adelante". Evaluar backfill si se reporta como problema real.
- Deuda EP-17-b (2026-07-08): `apps/server/src/utils/crypto.ts` (`encryptSecret`/`decryptSecret`) queda sin consumidores tras la migración a SMTP global por variables de entorno. Se conservó como utilitario genérico reutilizable (no se eliminó) — candidato a remover si nunca se reutiliza.
