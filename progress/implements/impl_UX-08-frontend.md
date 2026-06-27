# Bitácora de Implementación — UX-08 Frontend

**Feature:** UX-08 — Ajustes de calendario y acciones de retoque en Dashboard
**Fecha:** 2026-06-26
**Sandbox:** `apps/client/`

---

## Archivos Modificados

### 1. `apps/client/src/views/Turnos.tsx`

**Cambio:** Rango de horas del calendario FullCalendar ampliado.

- `slotMinTime`: `"08:00"` → `"06:00"`
- `slotMaxTime`: `"20:00"` → `"22:00"`

Líneas afectadas: 466–467 (post-edición).

---

### 2. `apps/client/src/views/Dashboard.tsx`

**Cambio 2a — Import de ícono:**
Agregado `FiRefreshCw` al import existente de `react-icons/fi` (línea 4).

**Cambio 2b — Nueva mutation `completeTouchup`:**
Insertada después del handler `handleCancelTouchup`. Llama a `updateServiceRecord(id, { touchupStatus: 'completed' })` e invalida las queries `['upcoming-touchups']` y `['dashboard-stats']`.

**Cambio 2c — Subtitle de sección:**
`"Historial de retoques pendientes"` → `"Los 7 más próximos · ordenados por fecha"`

**Cambio 2d — Bloque de botones de hover:**
Reemplazado bloque de 2 botones por 3 botones:

| # | Ícono | Title | Acción |
|---|-------|-------|--------|
| 1 | `FiX` | Cancelar este retoque | `handleCancelTouchup` (existente) |
| 2 | `FiCheck` | Marcar como completado | `completeTouchup(registro._id)` (nueva mutation) |
| 3 | `FiRefreshCw` | Completar y registrar próximo retoque | `handleTouchupCheck` (existente, movida) |

---

## Verificaciones Post-Edición (grep)

- `slotMinTime="08:00"` en Turnos.tsx: **0 coincidencias** (eliminado correctamente).
- `slotMinTime="06:00"` / `slotMaxTime="22:00"` en Turnos.tsx: **presentes** (líneas 466–467).
- `FiRefreshCw` en Dashboard.tsx: **2 ocurrencias** — import (línea 4) y JSX (línea 217).
- Los tres `title` de los botones de hover en Dashboard.tsx: **3 coincidencias** (líneas 200, 207, 214).

---

## Estado

Listo para revisión. Build no ejecutado por instrucción explícita del orquestador.
