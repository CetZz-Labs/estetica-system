# impl_UX-75-frontend.md

## Feature
UX-75 — Revert parcial de UX-73: volver a hacer obligatorio el campo `lastName` de `Client` en el formulario manual y en la carga masiva (frontend). Sandbox: `apps/client/`.

## Alcance respetado
- NO se tocó nada de UX-72 (botón de borrado de historial en `Historial.tsx`/`ProfileClient.tsx`) ni UX-74.
- NO se tocaron los tweaks defensivos de renderizado (`lastName?.`, `?? ''`) que UX-73 dejó en `Clients.tsx`, `ProfileClient.tsx`, `Historial.tsx`, `Dashboard.tsx`, `Turnos.tsx`, `RegistroModal.tsx`, `EditRegistroModal.tsx`, `AppointmentDetail.tsx`, `Profesionales.tsx` — quedan como no-ops inofensivos (siguen compilando igual con `lastName` requerido).

## Archivos modificados

### 1. `apps/client/src/components/ClienteModal.tsx`
Bloque del campo Apellido: se removió el badge "Opcional" y se restauró la validación `required: 'Requerido'` + mensaje de error inline con `FiAlertCircle` (mismo patrón que el campo Nombre). El import de `FiAlertCircle` ya estaba presente en el archivo (usado también por el campo Nombre) — no fue necesario re-agregarlo.

```diff
-                        <label className="text-[11.5px] font-semibold tracking-wide text-muted uppercase flex justify-between">
-                            Apellido <span className="text-muted font-normal normal-case">Opcional</span>
-                        </label>
-                        <input
-                            type="text"
-                            className="w-full px-3.5 py-2.5 bg-bg border border-border rounded-ctrl text-sm text-text focus:outline-none focus:border-accent-rose transition-colors"
-                            {...register('lastName')}
-                        />
+                        <label className="text-[11.5px] font-semibold tracking-wide text-muted uppercase">Apellido *</label>
+                        <input
+                            type="text"
+                            className={`w-full px-3.5 py-2.5 bg-bg border rounded-ctrl text-sm text-text focus:outline-none focus:border-accent-rose transition-colors ${errors.lastName ? 'border-alert-text' : 'border-border'}`}
+                            {...register('lastName', { required: 'Requerido' })}
+                        />
+                        {errors.lastName && (
+                            <span className="flex items-center gap-1 text-xs text-alert-text mt-1 font-medium">
+                                <FiAlertCircle /> {errors.lastName.message}
+                            </span>
+                        )}
```

### 2. `apps/client/src/components/CargaMasivaClientesModal.tsx`
Tres cambios inversos exactos de UX-73:
- Filtro de filas válidas del preview: ahora descarta filas sin apellido además de sin nombre.
- Celda "Apellido" de la tabla de formato: pasó de badge "Opcional" (gris) a badge "Obligatorio" (rojo/alert), igual que la celda "Nombre".
- Fila de preview de datos: dejó de usar optional chaining/fallback (`c.lastName ?? ''`), ahora concatena directo (`c.firstName} {c.lastName`), ya que `BulkClientData.lastName` (en `api/clientApi.ts`, no tocado por esta feature) ya era `string` requerido.

```diff
-                .filter(c => c.firstName !== '');
+                .filter(c => c.firstName !== '' && c.lastName !== '');
```
```diff
                                 <td className="p-2 border border-border"><span className="px-1.5 py-0.5 bg-alert-bg text-alert-text text-[10px] font-semibold rounded-pill">Obligatorio</span></td>
-                                <td className="p-2 border border-border"><span className="px-1.5 py-0.5 bg-surface-2 text-muted text-[10px] font-semibold rounded-pill">Opcional</span></td>
+                                <td className="p-2 border border-border"><span className="px-1.5 py-0.5 bg-alert-bg text-alert-text text-[10px] font-semibold rounded-pill">Obligatorio</span></td>
                                 <td className="p-2 border border-border"><span className="px-1.5 py-0.5 bg-surface-2 text-muted text-[10px] font-semibold rounded-pill">Opcional</span></td>
```
```diff
-                                        <td className="p-3 font-medium text-text">{`${c.firstName} ${c.lastName ?? ''}`.trim()}</td>
+                                        <td className="p-3 font-medium text-text">{c.firstName} {c.lastName}</td>
```

### 3. `apps/client/src/types/index.ts`
Tres campos vueltos a requeridos (quitado el `?`):
```diff
 export interface ClientSlim {
     _id: string;
     firstName: string;
-    lastName?: string;
+    lastName: string;
     phone?: string;
 }
```
```diff
 export interface Client {
     _id: string;
     firstName: string;
-    lastName?: string;
+    lastName: string;
     phone?: string;
```
```diff
-    client: { _id: string; firstName: string; lastName?: string; phone?: string };
+    client: { _id: string; firstName: string; lastName: string; phone?: string };
```

## Verificación

```
pnpm --filter @estetica/client build
```
Resultado: exit code 0. `tsc -b` compiló sin errores — los usos defensivos (`lastName?.`, `?? ''`) que UX-73 dejó en otros archivos siguen siendo TS válido aunque `lastName` ya no sea opcional (no rompieron nada, tal como se anticipó en la consigna).

```
pnpm --filter @estetica/client lint
```
Resultado: exit code 0. Solo 4 warnings preexistentes de `react-hooks/incompatible-library` (uso de `watch()` de react-hook-form en `ProfesionalModal.tsx`, `RegistroModal.tsx`, `Negocio.tsx`, `Turnos.tsx`) — no relacionados con este cambio, 0 errores.

## Notas para el reviewer
- `apps/client/src/api/clientApi.ts` (`ClientFormData.lastName` y `BulkClientData.lastName`) ya estaban tipados como `string` requerido antes de este revert — no formaban parte de la consigna de UX-73 original y no se tocaron aquí tampoco.
- `docs/db-schema.md` (línea ~78) todavía documenta `lastName` como "No (UX-73)" / opcional para la colección `clients` — queda desalineado con este revert de frontend. No se modificó por estar fuera del sandbox de este implementer (es documentación de esquema backend/canónica); si el revert de UX-73 es definitivo (incluyendo backend), alguien debe actualizar ese doc y el modelo Mongoose `Client.ts` en un paso posterior (backend), fuera del alcance de UX-75 tal como fue definida (solo frontend).
- No se tocó ningún otro archivo del sandbox frontend.
