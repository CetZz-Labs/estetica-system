# Plan y Estado de la Sesión Actual

## Metadatos de la Sesión
- **Última actualización:** 2026-07-21
- **Sesión:** activa
- **Feature en curso:** ninguna — ciclo del rediseño Shear (fase 1 + fase 2) cerrado

## Plan de Acción
- **Ciclo del rediseño Shear cerrado en esta sesión:** `UX-31`, `UX-32`, `UX-33` (4 sub-lotes A–D),
  `UX-36` (correcciones post-QA) y `UX-37` (Fase 2 — Landing pública, 4 sub-lotes A–D) están todos
  **done**, revisados y con `impl_*.md`/`explore_*.md` archivados en `_archive/`. Ver minutas
  consolidadas en `progress/history.md` (entradas 2026-07-21).
- **Quedan `pending` del plan original** (`progress/plan_shear-redesign.md`): `UX-34` (Agenda,
  Servicios, Configuración, perfiles) y `UX-35` (limpieza final de alias-puente de tokens + cierre
  documental del ciclo). No se activan solas — esperar instrucción del usuario.
- **Gotcha para cuando se retome UX-34:** `docs/patterns-frontend.md` § P13 — el puente de tokens
  de UX-31 hace que `bg-muted` y `text-muted-foreground` resuelvan al mismo hex; grep dirigido antes
  de dar por migrada cualquier vista nueva.
- **Sin feature activa.** Próximo arranque: esperar pedido del usuario (retomar UX-34, o cualquier
  otro trabajo).

## Estado del Backlog
- UX-37 Rediseño Shear Fase 2 (Landing pública) → **done**
- UX-36 Correcciones post-QA visual (nav, topbar, contraste) → **done**
- UX-33 Rediseño Shear Etapa 3 (Dashboard, tablas, listados) → **done**
- UX-32 Rediseño Shear Etapa 2 (shell, topbar, fin modo oscuro) → **done**
- UX-31 Rediseño Shear Etapa 1 (fundación CSS) → **done**
- UX-30 Historial general de visitas (nueva vista propia) → **done**
- UX-29 Alinear leyenda de profesionales a la derecha del filtro, misma altura (Turnos.tsx) → **done**
- UX-28 Editar fecha de retoque desde el modal de detalle del Dashboard → **done**
- UX-27 Bug: "próximo retoque" aceptaba fechas pasadas → **done**
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
- UX-34 Rediseño Shear Etapa 4 (Agenda, Servicios, Config, perfiles)
- UX-35 Rediseño Shear Etapa 5 (limpieza de alias-puente + cierre)
- EP-18 a EP-22 Reportes (Fase 5)
- EP-23 a EP-25 Pagos (Fase 6)

## Bloqueos y Riesgos Conocidos
- **Riesgo sistémico UX-31/UX-36 (2026-07-21):** el bug de colisión `bg-muted`+`text-muted-foreground`
  (mismo hex `--muted`) puede reaparecer en cualquier vista de UX-34 todavía sin migrar (Turnos,
  Profesionales, Negocio, Disponibilidad, ProfileClient, RegistroModal, Login, Register). Ver
  `docs/patterns-frontend.md` § P13.
- Pendiente de commit: todo el ciclo UX-31..UX-37 sigue sin commit propio (working tree). Evaluar
  commitear antes de que crezca más el diff acumulado.
- Deuda técnica UX-33 (2026-07-21, hallazgo del reviewer): `Clients.tsx` sigue sin paginación
  server-side (`getClients()` plano, filtrado client-side desde EP-02) — candidato a migración P1/P3.
- Deuda de higiene UX-33 (2026-07-21): `CargaMasivaClientesModal.tsx`/`CargaMasivaModal.tsx` tienen
  botones de footer sin `type="button"` explícito (preexistente, sin impacto funcional).
- Deuda no bloqueante UX-37 (2026-07-21): `HeroMockup()` en `Landing.tsx` usa `p-3`/`p-4` en sus
  mini-cards decorativas, por debajo del `p-6` mínimo de cards de dashboard reales — aceptado por
  ser ilustración decorativa, respetar `p-6` si el patrón se reutiliza en una vista funcional.
- Backfill manual de `tenantId` pendiente para datos legados (operativo, no bloquea desarrollo).
- Observación UX-05: `GET /api/profesionales` expone `inviteToken` e `inviteTokenExpiry`. Candidato a `select('-inviteToken -inviteTokenExpiry')`.
- Deuda UX-09: `window.confirm` pre-existente en `handleCancelTouchup` (Dashboard.tsx) y `handleDelete` (ProfileClient.tsx) — violación GOV-CLIENT mandate 3, pendiente.
- Deuda EP-11-fix (2026-07-01): `PUT /api/profesionales/:id` no valida `confirm` con `express-validator` como sí hace el `DELETE` — asimetría de higiene, sin riesgo de seguridad.
- Deuda EP-17 (2026-07-01): sin tests automatizados para `mailService.ts`/`reminderScheduler.ts`.
- Riesgo EP-17 (2026-07-01): `pnpm --filter @estetica/server test` falla en este sandbox por un problema de entorno (descarga del binario de `mongodb-memory-server`), no por regresión de código.
- Limitación conocida UX-12 (2026-07-06, decisión de producto): la validación de superposición de turnos NO corre cuando el turno no tiene `professional` asignado. Riesgo aceptado explícitamente por el usuario.
- Deuda técnica UX-13 (2026-07-06): un `ServiceRecord` `pending` con `nextTouchupDate` null/ausente nunca se auto-completa automáticamente.
- Deuda de higiene UX-13 (2026-07-06): lógica de auto-completado de retoques duplicada en `serviceRecordController.ts` y `appointmentController.ts`.
- Deuda de higiene UX-14 (2026-07-06): `Turnos.tsx:527,733` formatea hora con `toLocaleTimeString` ad-hoc en vez de delegar en `formatDateTime`.
- Riesgo aceptado UX-14 (2026-07-06): datos históricos con offset horario incorrecto no migrados.
- Deuda EP-17-b (2026-07-08): `apps/server/src/utils/crypto.ts` queda sin consumidores tras la migración a SMTP global.
- Deuda técnica UX-30 (2026-07-10): `getClients`/`getServices`/`getProfessionals` (catálogos para selects) siguen sin paginar.
