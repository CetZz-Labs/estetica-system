# Reporte de Revisión Técnica — Feature UX-75

**Veredicto Final:** APPROVED
**Auditor:** Subagente Reviewer
**Timestamp:** 2026-08-20

## Resumen

UX-75 revierte parcialmente UX-73: el campo `lastName` de `Client` vuelve a ser obligatorio en backend (modelo + validadores + carga masiva) y frontend (formulario manual + carga masiva + tipos), preservando intactos los tweaks defensivos de renderizado que UX-73 dejó en otros archivos (no-ops inofensivos ahora que `lastName` nunca está vacío) y sin tocar nada de UX-72 (borrado de historial) ni UX-74 (fix de fecha).

Verificación de scope: `git diff --stat` contra el working tree confirma que el diff total de la sesión sin commitear toca exactamente `apps/server/src/models/Client.ts`, `apps/server/src/routes/clientRoutes.ts`, `apps/server/src/controllers/clientController.ts`, `apps/client/src/components/ClienteModal.tsx`, `apps/client/src/components/CargaMasivaClientesModal.tsx`, `apps/client/src/types/index.ts`, más `docs/db-schema.md`, `feature_list.json` y `progress/current.md`. No aparecen `Historial.tsx`, `ProfileClient.tsx`, `Clients.tsx`, `Dashboard.tsx`, `Turnos.tsx`, `RegistroModal.tsx`, `EditRegistroModal.tsx`, `AppointmentDetail.tsx`, `Profesionales.tsx`, `serviceRecordController.ts` ni `serviceRecordRoutes.ts` — cumple el acceptance criterion de no tocar UX-72/UX-74.

## Verificación punto por punto (contra `feature_list.json` → `UX-75`)

1. `apps/server/src/models/Client.ts` — `IClient.lastName: string` (sin `?`) y `lastName: { type: String, required: true, trim: true }` en el schema. Confirmado línea por línea vía `git diff`. ✅
2. `apps/server/src/routes/clientRoutes.ts` — los 3 validators revertidos exactamente como pide el AC: POST creación `body('lastName').notEmpty().withMessage('El apellido (lastName) es obligatorio').trim()`; carga masiva `body('*.lastName').notEmpty().withMessage('Cada cliente debe tener lastName')`; PUT edición `body('lastName').optional().notEmpty().withMessage('El apellido no puede estar vacío').trim()` (mismo patrón que `firstName` en la misma ruta). ✅
3. `apps/server/src/controllers/clientController.ts::createBulkClients` — filtro `if (!firstName || !lastName) { skipped++; continue; }`. ✅
4. `apps/client/src/components/ClienteModal.tsx` — `register('lastName', { required: 'Requerido' })`, label `"Apellido *"`, bloque de error inline con `<FiAlertCircle />` idéntico al patrón ya usado en `firstName` (líneas 94-114). Import de `FiAlertCircle` presente en línea 5 y `errors` correctamente destructurado de `formState` en línea 22 (`useForm<ClientFormData>()`). ✅
5. `apps/client/src/components/CargaMasivaClientesModal.tsx` — filtro de preview `.filter(c => c.firstName !== '' && c.lastName !== '')`; badge de columna Apellido en la tabla de mapeo pasó de "Opcional" (gris) a "Obligatorio" (rojo/alert), igual estilo que Nombre; fila de preview dejó el optional chaining/fallback y concatena directo `{c.firstName} {c.lastName}`. ✅
6. `apps/client/src/types/index.ts` — `ClientSlim.lastName: string`, `Client.lastName: string`, `Appointment.client.lastName: string` — los 3 sin `?`. Confirmado también que `ClientFormData.lastName` y `BulkClientData.lastName` en `apps/client/src/api/clientApi.ts` ya eran `string` requerido antes de esta feature (fuera de su alcance, sin cambios necesarios). ✅
7. `docs/db-schema.md` — fila `lastName` de la colección `clients` quedó `Sí | - | Apellido del cliente. \`trim\`` — idéntica al estado pre-UX-73, consistente con el modelo Mongoose revertido. La nota del implementer de frontend sobre "doc desactualizado" ya no aplica: el backend implementer sí lo revirtió y quedó correcto. ✅
8. Confirmado que no se tocó `Historial.tsx`, `ProfileClient.tsx`, `serviceRecordRoutes.ts`, `serviceRecordController.ts` ni ningún otro archivo de UX-72/UX-74 — ver `git diff --stat` arriba, 9 archivos modificados + 2 nuevos (`impl_UX-75-backend.md`, `impl_UX-75-frontend.md`), todos dentro del scope esperado. ✅
9. Builds ejecutados por el reviewer (no solo confiando en el reporte de los implementers):
   - `pnpm --filter @estetica/server build` → Exit Code 0 (`tsc` sin errores).
   - `pnpm --filter @estetica/client build` → Exit Code 0 (`tsc -b && vite build` sin errores).
   - `pnpm --filter @estetica/client lint` → Exit Code 0, 0 errores, 4 warnings preexistentes de `react-hooks/incompatible-library` en `ProfesionalModal.tsx:83`, `RegistroModal.tsx:128-131`, `Negocio.tsx:87`, `Turnos.tsx:208-210` — ninguno relacionado con los archivos tocados por esta feature (`ClienteModal.tsx`, `CargaMasivaClientesModal.tsx` no aparecen en la salida de lint).

## Gate de variables sensibles

`grep -rnE "(SECRET|KEY|PASSWORD|TOKEN)" apps/server/src/ | grep -iE "=\s*['\"]"` → sin matches. No aplica de forma directa a este revert (no toca configuración de entorno), pero el gate se ejecutó igual y está limpio.

## Higiene operativa

`git stash list` → vacío. No se usó `git stash` durante esta auditoría.

## Mapeo de Checkpoints (Quality Gates)

- [x] C2 (Coherencia de Estados y Enfoque Atómico) — una sola feature `in_progress` al momento de auditar (UX-75), sandbox hermético confirmado por `git diff --stat`, bitácoras `impl_UX-75-backend.md`/`impl_UX-75-frontend.md` presentes en disco.
- [x] C3 (Fidelidad Arquitectónica) — backend respeta capas (modelo/rutas/controller), validación con `express-validator`, soft-delete no afectado. Frontend respeta `register()` de react-hook-form, trifecta de accesibilidad (color rojo + ícono `FiAlertCircle` + texto "Requerido") en el error inline, HTML semántico sin cambios. No hay endpoints de listado nuevos, no aplica paginación ni multi-tenancy en este diff puntual (no se tocaron queries).
- [x] C4 (Compilación Estática + Lint) — backend y frontend build Exit Code 0, lint Exit Code 0 sin errores nuevos, verificado directamente por el reviewer.
- [x] C5 (Cierre de Sesión Append-Only) — pendiente de que el leader complete `progress/history.md`/`progress/current.md` según el protocolo (fuera del alcance de este reviewer, según instrucción explícita del leader).
- [x] C6 (Capa de Datos) — `Client.ts` mantiene `tenantId` requerido, `timestamps: true`, `isActive` con soft-delete sin cambios; único campo tocado es `lastName` (requeridad), sin alterar índices ni referencias.
- [x] C7 (Security Gate) — sin cambios de superficie de auth/IDOR/CORS/validación estructural; SEC-E reforzado (validación de `lastName` restaurada); gate de secretos hardcodeados limpio.
- [x] C8 (Estabilidad de API) — cambio de contrato: `lastName` pasa de opcional a obligatorio en request/response de `Client`. Es un **revert exacto** a un estado de contrato previamente estable y ya documentado (pre-UX-73), no una innovación nueva; no introduce breaking change respecto al estado histórico de producción. No se exige entrada nueva en `CHANGELOG.md` dado que es un revert quirúrgico de una feature reciente sin release intermedio reportado — decisión de producto explícita del usuario (2026-08-20).

## Cambios Requeridos (Si aplica)

Ninguno. Revert fiel, quirúrgico y verificado empíricamente contra los 3 diffs (backend, frontend, docs).
