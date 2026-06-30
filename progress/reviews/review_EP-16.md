# Reporte de Revisión Técnica — Feature EP-16

**Veredicto Final:** APPROVED
**Auditor:** Subagente Reviewer
**Timestamp:** 2026-06-30

---

## Mapeo de Checkpoints (Quality Gates)

- [x] C1 — Archivos de arnés intactos. Ningún archivo de configuración del harness fue modificado por EP-16. Naming de archivos nuevos sigue convenciones (PascalCase modelo, camelCase controller/routes).
- [x] C2 — EP-16 es la única feature en estado `in_progress`. Archivos `impl_EP-16-backend.md` e `impl_EP-16-frontend.md` existen en disco. Los archivos modificados pertenecen exclusivamente al sandbox de EP-16 (Tenant.ts, disponibilidadController.ts, disponibilidadRoutes.ts, server.ts, appointmentController.ts, disponibilidadApi.ts, Disponibilidad.tsx, Turnos.tsx, router.tsx, AppLayout.tsx, dates.ts). Sandbox hermético.
- [x] C3 Backend — Estructura en capas correcta (controllers/models/routes). `checkAdminAccess + checkTenantAccess + requireRole('ADMIN')` aplicados en `server.ts`. `express-validator` en PUT con `validateRequest` como último elemento. `try/catch` en todos los controllers. Multi-tenancy: `req.tenantId` es el `_id` del documento Tenant (el Tenant es el root entity, explícitamente excluido de la regla `tenantId` por C6). `findByIdAndUpdate(req.tenantId)` es equivalente a `findOneAndUpdate({ _id: req.tenantId })` ya que no existe riesgo de IDOR cross-tenant para el propio documento raíz. Implementer documenta esta decisión en bitácora (decisión técnica #2). Whitelist explícita: solo `businessHours.schedule` y `businessHours.blockedDates` en el `$set`. `tenantId` nunca aceptado del body. Paginación N/A (disponibilidad es un objeto de configuración único, no colección de rows).
- [x] C3 Frontend — Datos vía `disponibilidadApi.ts` + TanStack Query. 4 estados cubiertos (ver detalle más abajo). HTML semántico correcto. `formatCalendarDate` usado en lista de fechas bloqueadas. `api` de `libs/axios` como única fuente HTTP. `handleApiError` en `onError` de la mutación. `export default function Disponibilidad()`. `useQuery<BusinessHours>` tipado explícito.
- [x] C3 Transversal — Sin `console.log`, `debugger` ni `// TODO` sin ticket en archivos nuevos. Sin modificaciones a `package.json`.
- [x] C4 — Backend `pnpm --filter @estetica/server build` → Exit Code 0 (confirmado en `impl_EP-16-backend.md`). Frontend `pnpm --filter @estetica/client build` → Exit Code 0 (confirmado en `impl_EP-16-frontend.md`). Lint `pnpm --filter @estetica/client lint` → 0 errores nuevos introducidos por EP-16 (1 error preexistente en `ProductoModal.tsx:37`, 4 warnings preexistentes documentados en `progress/current.md`).
- [x] C5 — Esta revisión es la acción de cierre. Veredicto VERDE habilita al leader a: actualizar `feature_list.json`, escribir entry en `history.md`, limpiar `current.md`, y archivar `impl_EP-16-*.md`.
- [x] C6 — `Tenant.ts` usa `{ timestamps: true }`. No aplica `tenantId` en el modelo Tenant (excepción canónica de C6: "todos excepto Tenant"). Subdocumentos `schedule` y `blockedDates` con `_id: false` correcto.
- [x] C7 SEC-A — `checkAdminAccess` en todos los endpoints vía `server.ts`. SEC-B — No hay IDOR cross-tenant posible: `req.tenantId` es inyectado por `checkTenantAccess` desde el adminInfo autenticado, nunca del cliente; buscar el Tenant por su propio `_id = req.tenantId` no expone recursos ajenos. SEC-C — `getAuth(req)` en `authMiddleware.ts`. SEC-D — CORS sin cambios, no afectado por EP-16. SEC-E — `express-validator` en PUT. SEC-F — N/A. SEC-G — Sin `dangerouslySetInnerHTML`. SEC-H — Grep de secretos hardcodeados: 0 matches (confirmado con `grep -rnE "(SECRET|KEY|PASSWORD|TOKEN)" apps/server/src/ | grep -iE "=\s*['\"]"`).
- [x] C8 — EP-16 agrega nuevos contratos (`GET/PUT /api/disponibilidad`) y un campo opcional `businessHours` al schema Tenant. No modifica estructura de respuesta existente (no hay fields renombrados, tipo cambiado, ni removidos en endpoints pre-existentes). C8 requiere entrada solo para modificaciones de contrato, no para adiciones. No aplica como bloqueante. Observación menor: por convención (ver EP-11 en CHANGELOG), se recomienda agregar entry `Added` en `CHANGELOG.md` documentando los nuevos endpoints y el campo `businessHours` en Tenant.

---

## Verificación de 4 Estados — `Disponibilidad.tsx`

| Estado | Implementación | Ubicación |
|--------|---------------|-----------|
| Loading | Skeleton `animate-pulse` con 7 filas de placeholders | líneas 94–113 |
| Error | `FiAlertCircle` (icono) + `text-maison-red` (color) + texto descriptivo (texto) — Trifecta GOV-ACCESS | líneas 115–128 |
| Empty | "No hay días no laborables configurados." cuando `blockedDates.length === 0` | línea 239 |
| Data | Vista completa con horario + fechas bloqueadas | líneas 130–284 |

---

## Verificación de Accesibilidad — Toggle de Días

Los toggles usan `<button type="button" role="switch" aria-checked={dayData.isOpen} aria-label="Activar/Desactivar {día}">`. El `aria-label` actualiza su verbo dinámicamente. El estado visual se comunica a través de color (`bg-maison-primary` / `bg-gray-300`) y posición del thumb (translate-x-4 / sin translate). Los `<input type="time">` deshabilitados muestran `opacity-40 cursor-not-allowed`. Los botones de eliminación de fecha bloqueada usan `<button type="button">` con `aria-label` descriptivo que incluye `formatCalendarDate(blocked.date)`.

---

## Verificación de Timezone — `checkBusinessHours`

El helper en `appointmentController.ts` resuelve timezone del tenant (`tenant.timezone`), convierte el `Date` UTC de entrada a string local `YYYY-MM-DD` vía `toLocaleDateString('en-CA', { timeZone: tz })`, extrae horas y minutos locales vía `toLocaleTimeString('en-GB', ...)`, y obtiene el día de la semana con `new Date(localDateStr).getUTCDay()` (correcto: la string `YYYY-MM-DD` parseada como UTC midnight y el `getUTCDay()` sobre esa midnight UTC da el día correcto de la fecha local). La comparación de fechas bloqueadas usa la misma string local. El fallback `return null` cuando no hay config completa permite todos los turnos para tenants sin disponibilidad configurada.

---

## Observación Menor (No Bloqueante)

**`CHANGELOG.md`:** EP-16 introduce dos endpoints nuevos (`GET/PUT /api/disponibilidad`) y el campo `businessHours` en el modelo Tenant. No es un cambio de contrato existente (C8 no aplica), pero por convención del proyecto (EP-11 documenta sus endpoints agregados bajo `### Added`), se recomienda al leader agregar una entrada en `CHANGELOG.md ## [Unreleased] ### Added` antes de cerrar la sesión. No bloquea la aprobación.

---

## Deudas Preexistentes (No Introducidas por EP-16)

Las siguientes deudas fueron identificadas en `progress/current.md` y NO son causadas por EP-16. Se registran a título informativo para el siguiente ciclo:

1. `apps/client/src/components/ProductoModal.tsx:37` — `'stock' is assigned a value but never used` (lint error preexistente).
2. `window.confirm` en `Dashboard.tsx` y `ProfileClient.tsx` — violación GOV-CLIENT mandate 3 (preexistente, UX-09).
3. `GET /api/profesionales` expone `inviteToken`/`inviteTokenExpiry` sin `select('-...')` (preexistente, UX-05).
4. Estado `isError` ausente en queries del Dashboard (preexistente, UX-09).
