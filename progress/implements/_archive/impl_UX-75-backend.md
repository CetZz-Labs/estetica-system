# impl_UX-75-backend.md

## Feature
UX-75 — Revertir apellido opcional del cliente (vuelve a ser obligatorio). Revert parcial y quirúrgico de los cambios de requeridad introducidos por UX-73, sin tocar UX-72 (borrado de historial) ni UX-74 (fix fecha de hoy) que conviven en el mismo commit/archivos.

## Sandbox
`apps/server/` (única capa tocada, más una línea de documentación de bajo riesgo en `docs/db-schema.md`, fuera de `apps/server/src` pero puramente descriptiva).

## Archivos modificados

1. `apps/server/src/models/Client.ts`
   - Interfaz `IClient`: `lastName?: string;` → `lastName: string;`
   - Schema: `lastName: { type: String, required: false, trim: true }` → `lastName: { type: String, required: true, trim: true }`

2. `apps/server/src/routes/clientRoutes.ts` (3 lugares)
   - POST `/` (creación individual): `body('lastName').optional({ checkFalsy: true }).trim()` → `body('lastName').notEmpty().withMessage('El apellido (lastName) es obligatorio').trim()`
   - POST `/carga-masiva`: `body('*.lastName').optional({ checkFalsy: true })` → `body('*.lastName').notEmpty().withMessage('Cada cliente debe tener lastName')`
   - PUT `/:id`: `body('lastName').optional({ checkFalsy: true }).trim()` → `body('lastName').optional().notEmpty().withMessage('El apellido no puede estar vacío').trim()` (sigue siendo `optional()` a nivel de "el campo puede omitirse en un PATCH parcial", pero si viene, no puede ser vacío — igual que `firstName` en la misma ruta, comportamiento pre-UX-73)

3. `apps/server/src/controllers/clientController.ts` (`createBulkClients`)
   - `if (!firstName) { skipped++; continue; }` → `if (!firstName || !lastName) { skipped++; continue; }`

4. `docs/db-schema.md` (documentación, fuera de `apps/server/src`, revertido por ser de bajo riesgo y consistencia)
   - Fila `lastName`: `No (UX-73) | ... Opcional: el usuario puede no recordarlo/no quererlo cargar` → `Sí | - | Apellido del cliente. \`trim\`` (idéntico al estado pre-UX-73)

No se tocó `serviceRecordController.ts`, `serviceRecordRoutes.ts`, `CHANGELOG.md` ni ningún otro archivo relacionado con UX-72/UX-74.

## Diff aplicado (exacto, verificado vía `git diff`)

```diff
diff --git a/apps/server/src/controllers/clientController.ts b/apps/server/src/controllers/clientController.ts
@@ -131,7 +131,7 @@ export const createBulkClients = async (req: Request, res: Response) => {
             const firstName = String(cli.firstName || '').trim();
             const lastName = String(cli.lastName || '').trim();
 
-            if (!firstName) {
+            if (!firstName || !lastName) {
                 skipped++;
                 continue;
             }

diff --git a/apps/server/src/models/Client.ts b/apps/server/src/models/Client.ts
@@ -3,7 +3,7 @@ import mongoose, { Schema, Document, Types } from 'mongoose';
 export interface IClient extends Document {
     tenantId: Types.ObjectId;
     firstName: string;
-    lastName?: string;
+    lastName: string;
     phone?: string;
     email?: string;
     medicalNotes?: string;
@@ -15,7 +15,7 @@ export interface IClient extends Document {
 const ClientSchema: Schema = new Schema({
     tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
     firstName: { type: String, required: true, trim: true },
-    lastName: { type: String, required: false, trim: true },
+    lastName: { type: String, required: true, trim: true },
     phone: { type: String, trim: true },
     email: { type: String, trim: true, lowercase: true },
     medicalNotes: { type: String, trim: true }, // Ej: "Alérgica a la PPD"

diff --git a/apps/server/src/routes/clientRoutes.ts b/apps/server/src/routes/clientRoutes.ts
@@ -22,7 +22,7 @@ router.post(
     '/',
     [
         body('firstName').notEmpty().withMessage('El nombre (firstName) es obligatorio').trim(),
-        body('lastName').optional({ checkFalsy: true }).trim(),
+        body('lastName').notEmpty().withMessage('El apellido (lastName) es obligatorio').trim(),
         body('phone').optional().isString().trim(),
         body('email').optional({ checkFalsy: true }).isEmail().withMessage('Email inválido').normalizeEmail(),
         body('medicalNotes').optional().isString().trim(),
@@ -37,7 +37,7 @@ router.post(
     [
         body().isArray({ min: 1 }).withMessage('Se esperaba un array de clientes'),
         body('*.firstName').notEmpty().withMessage('Cada cliente debe tener firstName'),
-        body('*.lastName').optional({ checkFalsy: true }),
+        body('*.lastName').notEmpty().withMessage('Cada cliente debe tener lastName'),
         body('*.phone').optional().isString().trim(),
         body('*.email').optional({ checkFalsy: true }).isEmail().withMessage('Email inválido en una o más filas'),
         body('*.medicalNotes').optional().isString().trim(),
@@ -65,7 +65,7 @@ router.put(
     [
         param('id').isMongoId().withMessage('El ID proporcionado no es válido'),
         body('firstName').optional().notEmpty().withMessage('El nombre no puede estar vacío').trim(),
-        body('lastName').optional({ checkFalsy: true }).trim(),
+        body('lastName').optional().notEmpty().withMessage('El apellido no puede estar vacío').trim(),
         body('phone').optional().isString().trim(),
         body('email').optional({ checkFalsy: true }).isEmail().withMessage('Email inválido').normalizeEmail(),
         body('medicalNotes').optional().isString().trim(),

diff --git a/docs/db-schema.md b/docs/db-schema.md
@@ -75,7 +75,7 @@ Clientes del centro de estética. Perfil con datos de contacto y notas médicas.
 | `_id` | `ObjectId` | Auto | PK | ID interno de Mongo |
 | `tenantId` | `ObjectId` (ref: Tenant) | Sí | Indexado | Tenant propietario del cliente |
 | `firstName` | `String` | Sí | - | Nombre del cliente. `trim` |
-| `lastName` | `String` | No (UX-73) | - | Apellido del cliente. `trim`. Opcional: el usuario puede no recordarlo/no quererlo cargar |
+| `lastName` | `String` | Sí | - | Apellido del cliente. `trim` |
 | `phone` | `String` | No | - | Teléfono de contacto. `trim` |
 | `email` | `String` | No | - | Email de contacto. `trim`, `lowercase`. Sin restricción de unicidad |
 | `medicalNotes` | `String` | No | - | Alergias, contraindicaciones, etc. `trim` |
```

## Resultado del build

```
> pnpm --filter @estetica/server build
> @estetica/server@1.0.0 build C:\_dev\Cetzz\shear-system\apps\server
> tsc
```
Exit code 0. Sin errores de TypeScript.

## Notas para el reviewer

- Frontend (`apps/client/src/components/ClienteModal.tsx`, `CargaMasivaClientesModal.tsx`, `apps/client/src/types/index.ts`) sigue reflejando el estado de UX-73 (lastName opcional en UI/tipos). Esta feature UX-75 fue delegada **solo al sandbox backend**; el revert del lado frontend (si corresponde) queda para un implementer de frontend separado o para que el reviewer confirme el alcance con el leader.
- No se tocó `serviceRecordController.ts`/`serviceRecordRoutes.ts` (UX-72/UX-74) ni `CHANGELOG.md`, tal como fue instruido.
- El diff es exactamente el inverso del diff de UX-73 en los 4 archivos listados — verificado línea por línea contra el pedido original.
- No se marcó nada como `"done"` en `feature_list.json` — queda pendiente de que el reviewer verifique y cierre.
