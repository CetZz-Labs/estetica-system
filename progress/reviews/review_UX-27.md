# Reporte de Revisión Técnica — Feature UX-27

**Veredicto Final:** APPROVED
**Auditor:** Subagente Reviewer
**Timestamp:** 2026-07-10

## Historial de rondas

1. **Primera pasada (2026-07-10):** `CHANGES_REQUESTED`. Hallazgo bloqueante: la validación de "próximo retoque no puede ser fecha pasada" calculaba "hoy" con `new Date(); setHours(0,0,0,0)`, anclando el día calendario a la **zona horaria del proceso Node del servidor** en vez de `tenant.timezone`. Reproducido empíricamente: con hora real 22:50 Argentina (=01:50 UTC del día siguiente), un `nextTouchupDate` = hoy (Argentina) con hora ya pasada era rechazado incorrectamente. Ver detalle completo del hallazgo original más abajo (preservado de la primera pasada).
2. **Segunda pasada (esta, 2026-07-10):** `APPROVED`. El implementer corrigió el cálculo de "día calendario" para usar `tenant.timezone` real (con el mismo patrón ya establecido en `checkBusinessHours`), extraído a un util puro `dateUtils.ts`. Verificado en los 3 puntos de entrada, reproducido independientemente el caso límite y el caso de control, builds en verde.

## Mapeo de Checkpoints (Quality Gates)

- [x] C2 (Coherencia de Estados y Enfoque Atómico) — una sola feature `in_progress` en todo el ciclo; sandbox respetado (`serviceRecordController.ts`, `appointmentController.ts`, `dateUtils.ts` nuevo en backend; `RegistroModal.tsx` sin cambios adicionales desde la primera pasada, confirmado con `git diff`).
- [x] C3 (Fidelidad Arquitectónica — incl. paginación y multi-tenancy en queries) — el cálculo de "día calendario actual" ahora reutiliza el patrón ya establecido (`tenant.timezone` + `toLocaleDateString('en-CA', { timeZone })`), consistente con `checkBusinessHours`. No aplica paginación (no es un listado). `tenantId` intacto en todos los lookups tocados (`Client.findOne`, `Service.findOne`, `Professional.findOne`, `Appointment.findOne`, `ServiceRecord.findOneAndUpdate`, todos con `{ _id, tenantId }`).
- [x] C4 (Compilación Estática + Lint) — `pnpm --filter @estetica/server build` → **Exit Code 0** (ejecutado por el reviewer, no solo confiado a la bitácora). `pnpm --filter @estetica/client build` → **Exit Code 0**.
- [x] C5 (Cierre de Sesión Append-Only) — corresponde ahora, con veredicto verde: se procede a `feature_list.json` → `"done"`, entrada en `progress/history.md`, actualización de `progress/current.md`, archivado de `impl_*`/`explore_*`.
- [x] C6 (Capa de Datos — modelos Mongoose, `tenantId` en entidades) — no se modificó ningún modelo Mongoose en esta feature (ni en la primera ni en la segunda ronda); `Tenant.ts` (con su campo `timezone`) ya existía de EP-16, solo se consume.
- [x] C7 (Security Gate — SEC-A..H, incl. IDOR cross-tenant → 404) — sin cambios en autenticación, CORS ni en el patrón anti-IDOR existente. `grep -rnE "(SECRET|KEY|PASSWORD|TOKEN)" apps/server/src/ | grep -iE "=\s*['\"]"` no arroja hardcodeos nuevos ni preexistentes relacionados a esta feature.
- [x] C8 (Estabilidad de API) — sin cambio de contrato de respuesta (mismo shape 400/200), no aplica CHANGELOG.

## Verificación de esta segunda pasada

### 1. `dateUtils.ts` — función pura

`apps/server/src/utils/dateUtils.ts` no importa `Request`/`Response`/Mongoose, cumple la convención de `src/utils/` (`.claude/rules/backend.md` §2). Lógica:

```typescript
export const toLocalDateString = (date: Date, timezone: string): string => {
    return date.toLocaleDateString('en-CA', { timeZone: timezone });
};

export const isBeforeCalendarDay = (date: Date, referenceDate: Date, timezone: string): boolean => {
    const dateStr = toLocalDateString(date, timezone);
    const referenceStr = toLocalDateString(referenceDate, timezone);
    return dateStr < referenceStr;
};
```

Correcto: compara strings `YYYY-MM-DD` derivados en la TZ dada, nunca instantes `Date`/`.getTime()`. Mismo patrón ya auditado en `checkBusinessHours` (`appointmentController.ts:11-24`).

### 2. Los 3 call sites

- `serviceRecordController.ts:46-52` (`createServiceRecord`): `const tenant = await Tenant.findById(tenantId);` dentro del `if (finalNextTouchupDate)` — `tenantId` ya estaba en scope (línea 15), no se duplica ninguna query previa; la query a `Tenant` es nueva pero condicional (solo corre si hay `nextTouchupDate`).
- `serviceRecordController.ts:192-198` (`updateServiceRecord`): `const tenant = await Tenant.findById(req.tenantId);` dentro de `if (nextTouchupDate !== undefined && nextTouchupDate !== null)` — no había ningún `tenant`/`Tenant.findById` previo en esta función, confirmado por grep.
- `appointmentController.ts:312-318` (`completeAppointment`): `const tenant = await Tenant.findById(req.tenantId);` dentro de `if (finalNextTouchupDate)`. Confirmado por grep que `checkBusinessHours` (que también hace `Tenant.findById`, línea 12) **no** se llama desde `completeAppointment` — solo se invoca en `createAppointment` (línea 111) y `updateAppointment` (línea 253), funciones distintas — por lo que no hay query duplicada ni oportunidad de reutilizar un `tenant` ya cargado.

Los 3 puntos usan `tz = tenant?.timezone || 'America/Argentina/Buenos_Aires'`, mismo fallback documentado que `checkBusinessHours`. Ningún hardcodeo de timezone fuera de ese fallback explícito.

### 3. Reproducción independiente del caso límite (script propio, no solo confiado a la bitácora del implementer)

Se ejecutó un script Node ad-hoc (`TZ=UTC`, en el scratchpad del reviewer, no persistido en el repo) que replica exactamente la lógica de `dateUtils.ts`:

```
--- Caso 1 (crítico): "hoy" del tenant con hora ya pasada, servidor ya cruzó medianoche UTC ---
now (UTC)           = 2026-07-11T01:50:00.000Z   (22:50 Argentina del 10/07)
today (tenant)      = 2026-07-10
nextTouchupDate     = 2026-07-10T11:00:00.000Z   (08:00 Argentina del 10/07)
nextTouchup (tenant)= 2026-07-10
Rejected (bug if true)? -> false
PASS (accepted correctly)

--- Caso 2 (control): fecha genuinamente pasada para el tenant ---
nextTouchupDate (tenant) = 2026-07-09
today (tenant)           = 2026-07-10
Rejected (should be true)? -> true
PASS (rejected correctly)
```

Ambos casos se comportan según lo exigido por la regla de negocio: el caso límite (hoy del tenant, hora pasada, servidor UTC ya en el día siguiente) ya se **acepta**; el caso de control (ayer real del tenant) sigue **rechazado**. Coincide con lo reportado en la bitácora del implementer, verificado de forma independiente.

### 4. Builds (ejecutados por el reviewer)

- `pnpm --filter @estetica/server build` → **Exit Code 0**.
- `pnpm --filter @estetica/client build` → **Exit Code 0** (warning preexistente de tamaño de chunk, no bloqueante, ajeno a esta feature).

### 5. Puntos ya verificados en la primera pasada, reconfirmados intactos

- Eje de comparación contra "ahora" (no `serviceDate`) — sin cambios, confirmado en los 3 puntos.
- Aplicado a los 3 entry points (`createServiceRecord`, `updateServiceRecord`, `completeAppointment`) — confirmado.
- `handleUseSuggestedDate`, auto-completado UX-13 (`updateMany` con `$lte`), `checkBusinessHours`, validación de fecha pasada de UX-12 sobre `startTime` — cero diff adicional, confirmado por grep de `nextTouchupDate`/`updateMany` sin cambios fuera de lo esperado.
- Formato de error `400` + `{ error: 'La fecha de próximo retoque no puede ser anterior al día de hoy' }` en los 3 puntos.
- Frontend (`RegistroModal.tsx`): `git diff` confirma que el diff es idéntico al de la primera pasada (`getTodayDateString()` + `min={getTodayDateString()}` en el input `touchupDate`) — no hubo cambios frontend en el fix de timezone (era exclusivamente backend), correcto.

## Hallazgo original de la primera pasada (preservado para trazabilidad)

Ubicaciones exactas del defecto original (ya corregido): `serviceRecordController.ts:44-45` (`createServiceRecord`), `serviceRecordController.ts:189-190` (`updateServiceRecord`), `appointmentController.ts:311-312` (`completeAppointment`) — todas usaban `new Date(); setHours(0,0,0,0)` comparado por `.getTime()`, en vez de derivar el día calendario en `tenant.timezone`. Reemplazado en su totalidad por `isBeforeCalendarDay(...)` de `dateUtils.ts`.

## Deuda técnica anotada (no bloqueante, ya señalada en la primera pasada, sigue pendiente)

- `src/__tests__/tenantIsolation.test.ts` (suite EP-08, 4 tests fallidos) — preexistente, no introducido por UX-27 (payloads sin campo `professional`, obligatorio desde EP-11).
- Lint: `ProductoModal.tsx:37:25` (`'stock' is assigned a value but never used`) — preexistente, ajeno a esta feature.

## Cambios Requeridos

Ninguno. Veredicto: **APPROVED**.
