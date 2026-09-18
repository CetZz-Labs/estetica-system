# Plan y Estado de la Sesión Actual

## Metadatos de la Sesión
- **Última actualización:** 2026-09-18
- **Sesión:** activa
- **Feature en curso:** ninguna — UX-78 cerrada esta sesión (ver `progress/history.md`)

## Plan de Acción
_(sin feature activa — plantilla vacía hasta la próxima tarea)_

## Estado del Backlog
- UX-78 (revertir UX-70: vuelve a crearse el turno automático al registrar un retoque directo) → done, ver `progress/history.md`
- OPS-01 (endpoint público /api/health para keep-alive de Render vía cron-job.org) → done, ver `progress/history.md`
- UX-77 (eliminar por completo la tarjeta "Servicios de la semana" del Dashboard) → done, ver `progress/history.md`
- UX-76 (eliminar gráfico de barras "Servicios de la semana" del Dashboard) → done, ver `progress/history.md`
- UX-72 (eliminar registro de historial con restauración de stock, rol ADMIN) → done, ver `progress/history.md`
- UX-74 (bugfix: no se podía registrar visita con fecha de hoy) → done, ver `progress/history.md`
- UX-73 (apellido opcional del cliente, incluida carga masiva) → done, ver `progress/history.md`
- UX-75 (revert de UX-73: apellido vuelve a ser obligatorio) → done, ver `progress/history.md`
- SEC-01 (parcheo de vulnerabilidades Dependabot, bumps seguros) → done, ver `progress/history.md`

### Pendientes
- UX-34 Rediseño Shear Etapa 4 (Agenda, Servicios, Config, perfiles)
- UX-35 Rediseño Shear Etapa 5 (limpieza de alias-puente + cierre)
- EP-18 a EP-22 Reportes (Fase 5)
- EP-23 a EP-25 Pagos (Fase 6)
- **xlsx@0.18.5 — riesgo de seguridad aceptado (2026-08-20, SEC-01):** 2 advisories high sin fix publicado en npm (Prototype Pollution, ReDoS). Fix real requiere migrar al CDN de SheetJS. Uso acotado a `CargaMasivaClientesModal.tsx`, solo ADMIN. Candidata a feature futura si se prioriza.

## Bloqueos y Riesgos Conocidos
- **Nota operativa de entorno (no bloqueante, ver detalle en `progress/history.md` OPS-01):** si en una sesión futura `pnpm --filter @estetica/server build` (o client) falla con `Cannot find module '.../node_modules/<paquete>/...'`, es probablemente el mismo síntoma de symlinks `node_modules` stale tras un rename previo de la carpeta del repo — se resuelve con `CI=true pnpm install` en la raíz del monorepo, previa aprobación humana explícita.
- **Deuda de test preexistente (no bloqueante):** `apps/server/src/__tests__/tenantIsolation.test.ts` tiene 4 tests fallando en `POST /api/registros` por no enviar `professional` en el body (obligatorio desde EP-11). Candidata a feature de mantenimiento futura.
- **UX-68 — simplificación de alcance documentada (no bloqueante):** el cron diario de push (`pushReminderScheduler.ts`) calcula "hoy" con la timezone del proceso servidor, no `tenant.timezone`.
- Reporte de cliente (2026-07-31): "Productos usados" no se veía en `Historial.tsx` tras crear una visita — **decisión del usuario: no se prioriza el fix.**
- Riesgo TOCTOU aceptado en la reconciliación de stock por delta (P17, `docs/patterns-backend.md`), heredado también por el delete de UX-72.
- **Recordatorio operativo (incidente previo, ver memoria `reviewer-git-stash-incident`):** ningún subagente debe usar `git stash` sin acotar a un archivo específico ni dejarlo sin pop. Verificar `git stash list` vacío al cierre de cada revisión.
