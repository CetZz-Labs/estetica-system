# Reporte de Revisión Técnica — Feature UX-73

**Veredicto Final:** CHANGES_REQUESTED
**Auditor:** Subagente Reviewer
**Timestamp:** 2026-08-20

## Resumen de auditoría

Revisé ambas bitácoras (`progress/implements/impl_UX-73-backend.md`, `progress/implements/impl_UX-73-frontend.md`) y el `git diff` completo de los 15 archivos reportados, acotando el análisis exclusivamente a los cambios de `lastName` (excluyendo UX-72/UX-74, ya aprobados en rondas anteriores). Corrí ambos builds y el lint:

- `pnpm --filter @estetica/server build` → **exit 0**, sin errores TS.
- `pnpm --filter @estetica/client build` → **exit 0** (único warning preexistente: chunk > 500kB).
- `pnpm --filter @estetica/client lint` → **exit 0**, 4 warnings preexistentes (`react-hooks/incompatible-library` en `ProfesionalModal.tsx`, `RegistroModal.tsx`, `Negocio.tsx`, `Turnos.tsx`), 0 errores nuevos.
- `git stash list` → vacío (no quedaron stashes colgando).
- `grep -rnE "(SECRET|KEY|PASSWORD|TOKEN)" apps/server/src/ | grep -iE "=\s*['\"]"` → sin matches (sin secretos hardcodeados).

### Backend — verificado correcto
- `apps/server/src/models/Client.ts`: `lastName?: string` en `IClient`, `required: false` con `trim: true` intacto en el schema. Índice compuesto `{ tenantId, isActive, lastName }` sin tocar.
- `apps/server/src/routes/clientRoutes.ts`: los 3 validators de `lastName` (POST `/`, POST `/carga-masiva` como `*.lastName`, PUT `/:id`) pasan de `.notEmpty()` a `.optional({ checkFalsy: true })`, replicando el patrón ya usado para `email`. `firstName` permanece `.notEmpty()` obligatorio en los 3 lugares — no se relajó por error.
- `apps/server/src/controllers/clientController.ts::createBulkClients` (la bitácora backend la nombra `bulkCreateClients`, pero la función real en el código es `createBulkClients` — solo un desajuste de nombre en la bitácora, sin impacto funcional): el filtro pasa de `if (!firstName || !lastName)` a `if (!firstName)`. Confirmé que el dedup case-insensitive `(firstName + lastName)` sigue funcionando con `lastName === ''`: el regex escapado sobre string vacío produce `/^$/i`, que matchea correctamente `lastName: ''` en Mongo sin excepciones ni bloqueo de la fila.
- `createClient`/`updateClient`: ya pasaban `lastName` tal cual (string o `undefined`) sin requerir cambios; no tienen check de duplicados propio (confirmado, fuera de alcance).
- Multi-tenancy: `createBulkClients` sigue filtrando/creando con `tenantId: req.tenantId` en la query de dedup y en el `Client.create`. Sin regresión de aislamiento.

### Frontend — verificado correcto
- `ClienteModal.tsx`: `register('lastName')` sin `required`; label pasó de `Apellido *` a `Apellido` + badge `Opcional`; bloque de error inline eliminado. `FiAlertCircle` sigue usado (por `firstName`), sin import muerto.
- `CargaMasivaClientesModal.tsx`: filtro `.filter(c => c.firstName !== '')` (ya no exige `lastName`); badge de la columna Apellido pasa de `Obligatorio` a `Opcional`; preview usa `` `${c.firstName} ${c.lastName ?? ''}`.trim() ``.
- `types/index.ts`: `ClientSlim.lastName`, `Client.lastName`, `Appointment.client.lastName` → `lastName?: string`.
- Avatares de iniciales (`Clients.tsx`, `ProfileClient.tsx`): `(cliente.lastName ?? '').charAt(0)` — no crashean, no muestran "undefined" fantasma.
- Nombres completos sin espacio colgante: patrón `` `${firstName} ${lastName ?? ''}`.trim() `` aplicado consistentemente en los 9 archivos declarados (`Clients.tsx`, `ProfileClient.tsx`, `Historial.tsx`, `Dashboard.tsx` ×4, `Turnos.tsx` ×3, `Profesionales.tsx`, `RegistroModal.tsx`, `EditRegistroModal.tsx`, `AppointmentDetail.tsx`). Grep de verificación (`\$\{[a-zA-Z.?]*lastName\}` y `lastName.charAt(` sin guard) sobre todo `apps/client/src` → 0 matches residuales.

## Mapeo de Checkpoints (Quality Gates)
- [x] C2 (Coherencia de Estados y Enfoque Atómico) — sandbox respetado (server/client separados por implementer, cambios acotados a `lastName`).
- [x] C3 (Fidelidad Arquitectónica — incl. paginación y multi-tenancy en queries) — sin regresión de `tenantId` en `createBulkClients`; no aplica paginación nueva (feature no toca listados).
- [x] C4 (Compilación Estática + Lint) — ambos builds exit 0, lint exit 0 sin errores nuevos.
- [x] C5 (Cierre de Sesión Append-Only) — n/a a este veredicto (se completa solo si el resultado es APPROVED).
- [x] C6 (Capa de Datos — modelos Mongoose, `tenantId` en entidades) — `Client.ts` correcto, `tenantId` intacto.
- [x] C7 (Security Gate — SEC-A..H, incl. IDOR cross-tenant → 404) — sin cambios de superficie de seguridad; queries de `Client` siguen scoped por tenant.
- [ ] **C8 (Estabilidad de API — CHANGELOG si hay cambio de contrato)** — **falla**. Ver hallazgo #1.

## Cambios Requeridos

1. **`CHANGELOG.md`** (raíz del monorepo), sección `## [Unreleased] → ### Changed`: falta la entrada de UX-73. El contrato de `Client` cambia (`lastName` pasa de `string` requerido a `string?` opcional) en `POST /api/clientes`, `PUT /api/clientes/:id`, `POST /api/clientes/carga-masiva` y en toda respuesta que serializa `Client`/`ClientSlim`/`Appointment.client`. Hay precedente idéntico ya documentado en el mismo archivo (línea 22): `` `[CHANGED]` **UX-10**: `POST /api/turnos` — `service` y `professional` pasan a ser **opcionales** (antes requeridos...) ``. C8 exige: *"Si la feature modifica la estructura de respuesta (field renombrado, tipo cambiado, field removido), existe entrada en CHANGELOG.md bajo `## [Unreleased]` con descripción clara."* Este es un cambio de tipo (`string` → `string | undefined`) sobre un recurso público de la API — corresponde una línea `[CHANGED]` análoga a UX-10.
2. **`docs/db-schema.md:78`**: la tabla de la colección `clients` sigue marcando `lastName` como requerido (`| \`lastName\` | \`String\` | Sí | - | Apellido del cliente. \`trim\` |`) — desactualizado tras el cambio de `apps/server/src/models/Client.ts` (`required: false`). `docs/backend.md §8` declara este archivo como "Referencia Inmutable" que todo subagente DEBE leer antes de tocar modelos Mongoose; dejarlo desactualizado induce a error a la próxima sesión que consulte el esquema. Cambiar la columna "Requerido" de `Sí` a `No` (o `No*` con nota de que se conserva vacío/`''` cuando viene de carga masiva, según corresponda al comportamiento real).

No se encontraron problemas funcionales, de seguridad, de multi-tenancy ni de accesibilidad. Ambos hallazgos son de **documentación de contrato**, resolubles sin tocar código de `apps/server/src` ni `apps/client/src`.

---

## Ronda 2

**Veredicto Final:** APPROVED
**Auditor:** Subagente Reviewer
**Timestamp:** 2026-08-20

### Verificación de los 2 fixes de documentación

El leader aplicó ambas correcciones de la Ronda 1 sin tocar `apps/`. Confirmado por `git diff` y por timestamps de archivo (`Get-Item ... LastWriteTime`): `CHANGELOG.md` y `docs/db-schema.md` se modificaron a las 19:30, mientras que todos los archivos de código (`apps/server/src/*`, `apps/client/src/*`) tienen mtime ≤ 19:26 — ningún archivo de `apps/` fue tocado durante esta ronda.

1. **`CHANGELOG.md`** — nueva línea bajo `## [Unreleased] → ### Changed` (entre EP-12/`requireRole` y el bloque `[BREAKING]` de `professional`):
   > `` `[CHANGED]` **UX-73**: `lastName` de `Client` pasa a ser **opcional** (antes requerido). Afecta `POST /api/clientes`, `PUT /api/clientes/:id` y `POST /api/clientes/carga-masiva` — ya no rechazan con 400 si `lastName` viene vacío o ausente; solo `firstName` sigue siendo obligatorio. Los clientes existentes no se migran (no hace falta, el campo ya estaba poblado). ``

   Correcto: refleja fielmente el contrato real verificado en Ronda 1 (los 3 endpoints, `firstName` sigue obligatorio, sin necesidad de migración). Sigue el precedente de formato `[CHANGED]` **UX-10** ya presente en el mismo archivo.

2. **`docs/db-schema.md:78`** — la fila de `lastName` en la tabla de `clients` pasó de `Sí` a:
   > `` | `lastName` | `String` | No (UX-73) | - | Apellido del cliente. `trim`. Opcional: el usuario puede no recordarlo/no quererlo cargar | ``

   Correcto y coherente con `Client.ts` (`required: false`).

### Chequeo de menciones residuales

Grep de `apellido|Apellido` sobre `docs/db-schema.md` completo → solo 2 matches: la fila corregida (línea 78) y la nota del índice compuesto en línea 271 (`tenantId: 1, isActive: 1, lastName: 1` — "Listado de clientes del tenant ordenado por apellido"), que describe el propósito del índice de ordenamiento y no afirma obligatoriedad del campo. No requiere cambio — sigue siendo válida con `lastName` opcional (Mongo ordena `undefined`/ausente de forma consistente al final/inicio, sin romper el índice ni la funcionalidad de listado).

No se encontraron otras menciones desactualizadas de "lastName obligatorio" en la sección `clients` de `docs/db-schema.md`.

### Verificación de `git status`

Único diff activo entre la Ronda 1 y la Ronda 2: `CHANGELOG.md` y `docs/db-schema.md`. El resto de los archivos listados en `git status` (`apps/client/src/*`, `apps/server/src/*`, `feature_list.json` previo, `progress/history.md`, `progress/current.md`) corresponden a trabajo ya auditado en Ronda 1 (UX-73) y a features hermanas (UX-72/UX-74) fuera de alcance de este veredicto, con mtimes anteriores a las 19:30 — sin cambios de código durante esta ronda.

### Mapeo de Checkpoints (Quality Gates) — Ronda 2

- [x] C2 (Coherencia de Estados y Enfoque Atómico) — sin cambios, hereda Ronda 1.
- [x] C3 (Fidelidad Arquitectónica) — sin cambios, hereda Ronda 1.
- [x] C4 (Compilación Estática + Lint) — sin cambios en `apps/`, no requiere re-build (confirmado por mtimes).
- [x] C5 (Cierre de Sesión Append-Only) — se completa con esta entrada de Ronda 2 y el cambio de `feature_list.json` a `"done"`.
- [x] C6 (Capa de Datos) — sin cambios, hereda Ronda 1.
- [x] C7 (Security Gate) — sin cambios, hereda Ronda 1.
- [x] **C8 (Estabilidad de API — CHANGELOG)** — resuelto: ambos gaps de documentación cerrados.

### Veredicto

**APPROVED.** Los 2 hallazgos de la Ronda 1 (ambos de documentación, gate C8) quedaron resueltos correctamente. `feature_list.json` actualizado: `UX-73` → `"done"`.
