# Plan y Estado de la Sesión Actual

## Metadatos de la Sesión
- **Última actualización:** 2026-09-30
- **Rama:** `feature/UX-80-detalle-visita-consumo-productos` (sin mergear; el usuario la probó en entorno real y pidió el rediseño UX-90 sobre ella)
- **Feature en curso:** UX-90 — Gestión de stock con envase abierto (`in_progress`)

## Plan de Acción (UX-90)
Diseño completo: `progress/explores/explore_UX-90.md`. Decisiones del usuario: stock incluye el abierto (Opción B, pool de puntos enteros 1 envase = 100); un solo envase abierto por producto; barra con abierto arranca en lo que queda del abierto; se elimina el checkbox "usar envase abierto"; `adjustStock` a 0 descarta el abierto; update condicional con reintento/409.
- [ ] PR1 backend (`impl_UX-90-backend.md`): `utils/stockPool.ts` + tests, `services/stockService.ts`, modelo `usedPercent`, create/update/delete + `completeAppointment` unificados, duplicados rechazados, `adjustStock`, validators, docs.
- [ ] Reviewer PR1.
- [ ] PR1b script de migración (+1 stock por producto con abierto) — requiere confirmación del usuario con datos reales; dry-run primero.
- [ ] PR2 frontend (2a/2b si excede 400 líneas) — recién después del backend.

## Pendientes de decisión del usuario
- "Cant." multi-envase (recomendado: mantener como tope k de envases nuevos, default 1) — afecta solo el frontend.
- Confirmar migración +1 con datos reales antes de aplicar.

## Backlog sin cambios
- UX-34, UX-35, EP-18 a EP-25; xlsx@0.18.5 riesgo aceptado (SEC-01); deuda de test `tenantIsolation.test.ts` (4 fallos preexistentes).

## Bloqueos y Riesgos Conocidos
- Rama sin mergear; UX-79 pendiente de validación humana (wa.me).
- Incidente previo `git stash` (memoria `reviewer-git-stash-incident`): ningún subagente usa `git stash` sin acotar y hacer pop; verificar `git stash list` vacío al cierre.
- Nota OPS-01: si un build falla con `Cannot find module`, ver `progress/history.md`.
