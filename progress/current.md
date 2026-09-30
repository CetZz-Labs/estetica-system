# Plan y Estado de la Sesión Actual

## Metadatos de la Sesión
- **Última actualización:** 2026-09-29
- **Sesión:** activa
- **Rama:** `feature/UX-80-detalle-visita-consumo-productos` (creada desde `development`, confirmado sincronizada con `main` en `b14fdb0` antes de ramificar)
- **Feature en curso:** ninguna — UX-80 a UX-86 (7 features) cerradas esta sesión (ver `progress/history.md`).

## Plan de Acción
_(sin feature activa — plantilla vacía hasta la próxima tarea)_

## Pendiente de commitear
UX-86 (`ServiceRecordDetail.tsx`, `ProfileClient.tsx` — fix de wrap de texto) + este archivo/`history.md`/`feature_list.json`.

## Estado del Backlog
- UX-80 (ver detalle completo de visita, ambas pantallas) → **done**, ver `progress/history.md`
- UX-82 (reponer nav "Mi Negocio") → **done**, ver `progress/history.md`
- UX-81 (indicador de consumo parcial de productos, Opción C+) → **in_progress**

### Pendientes (sin cambios respecto a la sesión anterior)
- UX-34 Rediseño Shear Etapa 4 (Agenda, Servicios, Config, perfiles)
- UX-35 Rediseño Shear Etapa 5 (limpieza de alias-puente + cierre)
- EP-18 a EP-22 Reportes (Fase 5)
- EP-23 a EP-25 Pagos (Fase 6)
- **xlsx@0.18.5 — riesgo de seguridad aceptado (2026-08-20, SEC-01):** sin cambios, ver `progress/history.md`.

## Bloqueos y Riesgos Conocidos
- **UX-79 — pendiente de validación humana antes de merge (heredado, sin cambios):** probar en la app real que el link `wa.me` abre bien con números en formato viejo.
- **Nota operativa de entorno (heredada, no bloqueante):** si algún build falla con `Cannot find module '.../node_modules/...'`, ver `progress/history.md` OPS-01 (symlinks stale, `CI=true pnpm install` con aprobación humana).
- **Deuda de test preexistente (heredada, no bloqueante):** `tenantIsolation.test.ts`, 4 tests fallando por falta de `professional` en el body.
- **UX-68 — notificaciones push (heredado):** el usuario reporta que "las notificaciones no funcionan". Verificado por el leader (2026-09-29): `apps/server/.env` local SÍ tiene `VAPID_PUBLIC_KEY`/`VAPID_PRIVATE_KEY`/`VAPID_SUBJECT` configurados, pero NO tiene `SMTP_*` configurado localmente (los recordatorios por mail de EP-17/EP-17-b dependerían de eso; no se pudo verificar el `.env` real del deploy en Render desde este entorno). La causa más probable del reporte del usuario es que el toggle de opt-in en `Negocio.tsx` (UX-68) nunca fue activado/permiso de notificación del navegador nunca concedido por el usuario que las necesita — no es necesariamente un bug de código. Pendiente: confirmar con el usuario si (a) probó activar el toggle y el navegador le negó el permiso, o (b) el toggle nunca se activó, o (c) es el envío por mail (EP-17) el que falla (en ese caso, revisar `SMTP_*` en el entorno real de producción). No se abrió feature nueva todavía — a la espera de que el usuario confirme cuál de los tres síntomas es.
- Riesgo TOCTOU aceptado en la reconciliación de stock por delta (P17, `docs/patterns-backend.md`), heredado.
- **Recordatorio operativo (incidente previo, ver memoria `reviewer-git-stash-incident`):** ningún subagente debe usar `git stash` sin acotar a un archivo específico ni dejarlo sin pop. Verificar `git stash list` vacío al cierre de cada revisión.
