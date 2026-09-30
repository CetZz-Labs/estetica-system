# Plan y Estado de la Sesión Actual

## Metadatos de la Sesión
- **Última actualización:** 2026-09-30
- **Rama:** `feature/UX-80-detalle-visita-consumo-productos` (sin mergear; el usuario la probó en entorno real y pidió el rediseño UX-90 sobre ella)
- **Feature en curso:** UX-90 — Gestión de stock con envase abierto (`in_progress`)

## Plan de Acción (UX-90)
Diseño base: `progress/explores/explore_UX-90.md` (las partes de Opción B y migración están OBSOLETAS).
**Cambio de modelo (2026-09-30, decisión del usuario): Opción A — sin migración ni cambios de estructura de Product.** Stock = envases CERRADOS (se descuenta 1 al abrir, como antes); `currentUnitLevel` = % del único envase abierto. Pool P = L + 100*S; tras consumir U: S' = floor(P'/100), L' = P' mod 100 (0 → unset). Consumo FIFO, sin checkbox de "usar abierto", "Cant." = tope k de envases nuevos (default 1), update condicional con reintento/409, stock 0 con abierto sigue siendo utilizable.
- [x] PR1 backend (Opción B) commiteado `fc67de4`, revisado VERDE — **a reformar a Opción A**.
- [x] PR1b migración commiteada `a2a9570` — **CANCELADO, se elimina**.
- [x] PR2a RegistroModal (Opción B) implementado y revisado VERDE, sin commitear — **a reformar a Opción A**.
- [x] Rework backend a Opción A — reviewer VERDE (`review_UX-90-backend-A.md`). Migración eliminada.
- [x] Rework frontend (RegistroModal, EditRegistroModal, Detail, Inventario, Historial, ProfileClient) — reviewer VERDE (`review_UX-90-frontend-A.md`). Commiteado.
- [ ] **Validación manual del usuario en navegador** (checklist en `review_UX-90-frontend-A.md` / `impl_UX-90-frontend-A.md`). Hasta entonces UX-90 queda `in_progress`; luego: reviewer marca `done` → history.md → archivar bitácoras → limpiar este plan.
- Menores abiertos (no bloquean): M1 hint de item legacy con consumo 0 (EditRegistroModal.tsx:122 — guardar sin tocar descuenta 1 punto), B1 faltan `disabled:cursor-not-allowed` en 2 botones de RegistroModal, B2 edición sin control k, B3 form guardable si falla la carga de productos.
- [ ] Merge UX-80..89 (hasta `fd35d97`) a development/main — bloqueado por permisos, lo hace el usuario (ver conversación).

## Backlog sin cambios
- UX-34, UX-35, EP-18 a EP-25; xlsx@0.18.5 riesgo aceptado (SEC-01); deuda de test `tenantIsolation.test.ts` (4 fallos preexistentes).

## Bloqueos y Riesgos Conocidos
- Rama sin mergear; UX-79 pendiente de validación humana (wa.me).
- Incidente previo `git stash` (memoria `reviewer-git-stash-incident`): ningún subagente usa `git stash` sin acotar y hacer pop; verificar `git stash list` vacío al cierre.
- Nota OPS-01: si un build falla con `Cannot find module`, ver `progress/history.md`.
