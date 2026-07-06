# Plan y Estado de la Sesión Actual

## Metadatos de la Sesión
- **Última actualización:** 2026-07-06
- **Sesión:** Triage de feedback QA/funcional post-revisión
- **Feature en curso:** ninguna — **tanda 1 completa**, a la espera de definir si se continúa con la tanda 2

## Plan de Acción
Feedback del equipo funcional/test tras revisión de la app (2026-07-06) triagueado y volcado a `feature_list.json` como 10 items nuevos (UX-12 a UX-21), insertados antes de EP-18 por prioridad. Secuenciación acordada con el usuario: **bugs de correctitud primero**, mejoras UX en segunda tanda.

Checkpoint commiteado en `9aac2a5` (UX-12+UX-13+UX-14). UX-15 pendiente de commit.

**Tanda 1 — Bugs de correctitud (COMPLETA):**
1. ~~UX-12 — Validación de fecha/hora al crear turnos~~ → **done**
2. ~~UX-13 — Retoques futuros ocultos cuando existe un retoque pendiente~~ → **done**
3. ~~UX-14 — Desfasaje horario en hora de visita/retoque~~ → **done**
4. ~~UX-15 — Crash de página en blanco al clickear turno pasado/tachado en calendario~~ → **done**

**Tanda 2 — Mejoras UX (pendiente, a confirmar si se arranca ahora):**
5. UX-16 — Modal de detalle clickeable en cards de turno/retoque (dashboard + calendario) con acciones aceptar/cancelar
6. UX-17 — Selector de horario con intervalos fijos + slots según disponibilidad real (EP-16)
7. UX-18 — Rediseño visual del calendario (columnas por profesional + color, hover con info, colores sólidos — estilo Fresha, ver referencia del equipo)
8. UX-19 — Eliminación rápida (ícono) de producto en Inventario
9. UX-20 — Eliminación rápida (ícono) de turno en calendario
10. UX-21 — Validar unicidad de nombre de servicio en catálogo (EP-03)

**Próximo paso:** confirmar con el usuario si se continúa con UX-16 (tanda 2) en esta sesión o se corta acá.

## Estado del Backlog
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
- UX-12 a UX-15 Bugs de correctitud (tanda 1, feedback QA 2026-07-06)
- UX-16 a UX-21 Mejoras UX (tanda 2, feedback QA 2026-07-06)
- EP-18 a EP-22 Reportes (Fase 5)
- EP-23 a EP-25 Pagos (Fase 6)

## Bloqueos y Riesgos Conocidos
- Backfill manual de `tenantId` pendiente para datos legados (operativo, no bloquea desarrollo).
- Deuda de lint preexistente: `apps/client/src/components/ProductoModal.tsx:37` (`'stock' unused`).
- Observación UX-05: `GET /api/profesionales` expone `inviteToken` e `inviteTokenExpiry`. Candidato a `select('-inviteToken -inviteTokenExpiry')`.
- Deuda UX-09: `window.confirm` pre-existente en `handleCancelTouchup` (Dashboard.tsx) y `handleDelete` (ProfileClient.tsx) — violación GOV-CLIENT mandate 3, pendiente.
- Deuda UX-09: estado `isError` ausente en queries del Dashboard — 4 estados incompletos (patrón pre-existente).
- Deuda EP-11-fix (2026-07-01): `PUT /api/profesionales/:id` no valida `confirm` con `express-validator` como sí hace el `DELETE` — asimetría de higiene, sin riesgo de seguridad (el campo nunca se persiste).
- Deuda EP-17 (2026-07-01): sin tests automatizados para `mailService.ts`/`reminderScheduler.ts`. `Tenant.notificationSettings.smtpPort` sin `default` (podría defaultear a 587).
- Riesgo EP-17 (2026-07-01): `pnpm --filter @estetica/server test` falla en este sandbox por un problema de entorno (descarga del binario de `mongodb-memory-server`), no por regresión de código — a confirmar en un entorno con acceso de red completo antes de asumir que la suite de tests está sana.
- Limitación conocida UX-12 (2026-07-06, decisión de producto): la validación de superposición de turnos NO corre cuando el turno no tiene `professional` asignado (campo opcional en el form). Riesgo aceptado explícitamente por el usuario — no reabrir sin nueva decisión de producto.
- Deuda técnica UX-13 (2026-07-06): tras el fix del auto-completado de retoques (`nextTouchupDate: { $lte: ... }`), un `ServiceRecord` `pending` con `nextTouchupDate` null/ausente queda excluido del `updateMany` y **nunca** se auto-completa automáticamente (antes sí se cerraba, sin importar la fecha). No es regresión respecto al criterio de aceptación, pero podría generar retoques "pending" huérfanos. Candidato a feature separada: exigir `nextTouchupDate` cuando `touchupStatus` nace `pending`.
- Deuda de higiene UX-13 (2026-07-06): la lógica de auto-completado de retoques queda duplicada en `serviceRecordController.ts` y `appointmentController.ts` (mismo filtro `updateMany`, no extraído a `services/`). Candidato a refactor futuro si se vuelve a tocar esa regla.
- Deuda de higiene UX-14 (2026-07-06, hallazgo del explorer, no corregido — fuera de alcance): `Turnos.tsx:527,733` formatea hora con `toLocaleTimeString` ad-hoc en vez de delegar en `formatDateTime`, violando `.claude/rules/frontend.md` §4. No es la causa del bug corregido, pero es candidato a limpieza futura.
- Riesgo aceptado UX-14 (2026-07-06): los `nextTouchupDate`/`startTime` ya persistidos antes del fix quedan con el offset horario incorrecto (dato histórico contaminado). No se migró — decisión explícita de acotar el alcance a "iguales visitas hacia adelante". Evaluar backfill si se reporta como problema real.
