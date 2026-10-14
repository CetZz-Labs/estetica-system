# Plan y Estado de la Sesión Actual

## Metadatos de la Sesión
- **Última actualización:** 2026-10-14
- **Sesión:** en curso — REP-3 in_progress
- **Rama:** `feature/REP-3-reportes-productos` (apilada sobre REP-2, commit 90abf35)
- **Feature en curso:** REP-3 — Reportes: productos (EP-20)

## Plan de Acción
- Sin explorer nuevo: Product no tiene unidad (`quantity` = envases) y `LOW_STOCK_THRESHOLD = 5` en productController.
- [ ] implementer backend → `progress/implements/impl_REP-3-backend.md`
- [ ] implementer frontend → `progress/implements/impl_REP-3-frontend.md`
- [ ] builds + lint → reviewer → `progress/reviews/review_REP-3.md`
- [ ] history, current, archivar, commit.

## Contrato de API (REP-3)
`GET /api/reportes/productos?from&to` → `{ range, totals:{productsUsed,usages,unitsConsumed}, topProducts:[{productId,name,brand,usages,unitsConsumed,stock}] (top 10), lowStock:{threshold, total, items:[{productId,name,brand,stock}] (máx 20, stock asc)} }`. Fuente ServiceRecord.productsUsed (serviceDate UTC); unitsConsumed = suma de quantity excluyendo ítems con usedExistingUnit=true (no tocan stock).

## Bloqueos y Riesgos Conocidos
- Validación humana pendiente: `/reportes` (REP-1/2), UX-92, C9 de UX-91.
- Deuda: bundle grande; `getTodayDateString` sin tz del tenant; 4 tests preexistentes de POST /api/registros.
