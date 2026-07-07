# Reporte de Exploración — UX-21: Unicidad de nombre de servicio

**Pregunta:** ¿Cómo implementar validación de unicidad de nombre de servicio (case-insensitive, por tenant, entre servicios activos), con error inline en el formulario, replicando el patrón ya auditado de `Product` (EP-04)?
**Contexto:** UX-21 — "Validar unicidad de nombre de servicio en el catálogo" (EP-03), `feature_list.json` en estado `in_progress`.
**Timestamp:** 2026-07-07

## Resumen ejecutivo

El módulo `Product` (EP-04) ya implementa exactamente el mismo tipo de check (nombre+marca duplicado, case-insensitive, tenant-scoped) en `createProduct`, y está documentado como patrón aceptado en `docs/db-schema.md:264` ("unicidad a nivel de aplicación, sin índice unique compuesto por la insensibilidad a mayúsculas"). Es el template exacto a replicar para `Service`, adaptado a un solo campo (`name`) en vez de dos (`name`+`brand`), y agregando el caso de edición (`updateService`) que en `Product` no está resuelto (gap detectado, ver Hallazgo 2.3).

En el frontend, no existe ningún precedente de mapear un error 400 del backend a un campo específico de react-hook-form vía `setError`. Tanto `ServicioModal.tsx` como `ProductoModal.tsx` delegan cualquier error de mutación a `handleApiError` (toast genérico). Esto significa que el criterio de aceptación 2 (error inline, no solo toast) requiere crear el patrón, no copiarlo de otro lado.

## Hallazgos por punto

### 1. Backend: Service.ts / serviceController.ts / serviceRoutes.ts

- [apps/server/src/models/Service.ts:13-24]: Schema plano, `name: { type: String, required: true, trim: true }` sin `unique`. Índice compuesto existente: `{ tenantId: 1, isActive: 1, name: 1 }` (línea 24) — pensado para el listado ordenado, no es `unique`. No agregar `unique: true` a este índice (rompería con `isActive` mixto y no cubre case-insensitivity; requeriría `collation`, ver Hallazgo 2 nota de db-schema.md:264).
- [apps/server/src/controllers/serviceController.ts:5-24] `createService`: construye el `Service` con `tenantId: req.tenantId` y guarda directamente. No hay ningún check de duplicado.
- [apps/server/src/controllers/serviceController.ts:57-87] `updateService`: usa `findOneAndUpdate({ _id: id, tenantId: req.tenantId, isActive: true }, { $set: { ...name... } })`. Ya está correctamente tenant-scoped (patrón P2), pero tampoco valida duplicados al renombrar.
- [apps/server/src/routes/serviceRoutes.ts:20-36] POST: valida `body('name').notEmpty()...isString().trim()`. [serviceRoutes.ts:51-69] PUT: `body('name').optional().notEmpty()...isString().trim()`. express-validator ya limpia/valida presencia y tipo — el check de unicidad debe ir en el controller (requiere query async a Mongo).

### 2. Patrón existente de unicidad (productController.ts — template a copiar)

- [apps/server/src/controllers/productController.ts:4]: helper `escapeRegex` a nivel de módulo — sanitiza el input antes de interpolarlo en un RegExp (evita ReDoS/injection de regex).
- [apps/server/src/controllers/productController.ts:11-25] `createProduct` — query exacta a replicar (adaptada, sin backtick-fences para evitar problemas de escritura):

  safeName = escapeRegex(name.trim())
  existingProduct = await Product.findOne({
      tenantId: req.tenantId,
      name: { $regex: new RegExp('^' + safeName + '$', 'i') },
      brand: { $regex: new RegExp('^' + safeBrand + '$', 'i') }  // Service solo necesita el campo name
  })
  if (existingProduct) return res.status(400).json({ error: 'Este insumo ya existe en el inventario...' })

  Para Service el filtro debe agregar `isActive: true` explícito (criterio de aceptación 1 dice "activos"; Product.createProduct no filtra por isActive porque en ese dominio un producto inactivo tampoco debería bloquear la creación — para Service el AC es explícito sobre "activo", así que el filtro DEBE incluir isActive: true).
- 2.3 — Gap detectado: productController.updateProduct [productController.ts:54-70] NO repite el check de duplicado al renombrar — solo createProduct lo tiene. Esto es una inconsistencia ya existente en Product que no hay que copiar a ciegas: el AC1 de UX-21 exige explícitamente cubrir también el rename ("ni renombrarse a"), así que updateService sí necesita el check (con `$ne: id` para excluirse a sí mismo en el filtro del findOne — no existe aún ejemplo de esto en el repo pero es un `$ne` estándar de Mongoose sin riesgo).
- [docs/db-schema.md:264]: nota canónica que ya documenta y justifica esta decisión de arquitectura ("unicidad a nivel de aplicación... no existe índice unique compuesto porque no replicaría la insensibilidad a mayúsculas — requeriría collation"). Este es el ancla a citar en el impl para justificar por qué no se usa un índice unique de Mongo.

### 3. docs/patterns-backend.md — sección de unicidad

- No existe una sección "P_ — Validación de unicidad/duplicados" dedicada en el catálogo (el índice del doc solo lista P1-P5: paginado, lookup tenant-scoped, ruta validada, stock, carga masiva — docs/patterns-backend.md:10-14). El patrón de unicidad solo vive implícito en productController.ts y documentado en db-schema.md:264, sin sección propia en patterns-backend.md. Oportunidad de extracción post-feature: promover este patrón a un nuevo "P6 — Validación de unicidad case-insensitive tenant-scoped" en patterns-backend.md una vez cerrado UX-21 (dos implementaciones = patrón reutilizable confirmado, criterio del ciclo de vida de progress/).

### 4. docs/governance-rules.md#gov-tenant

- [docs/governance-rules.md:34-50]: confirma mandatos aplicables: mandato 1 (tenantId required+indexado, ya cumplido en Service.ts:14), mandato 3 (reemplazar findById* por findOne* con { _id, tenantId } — ya cumplido en updateService), mandato 6 (prohibido aceptar tenantId del body — ya cumplido, serviceController.ts usa req.tenantId siempre), mandato 7 ("los índices únicos de negocio deben ser compuestos con tenantId" — no aplica aquí porque, como aclara db-schema.md:264 para el caso análogo de Product, un índice unique de Mongo no puede ser case-insensitive sin collation, por eso el check se resuelve a nivel de aplicación con regex, no con índice).
- No hay mandato específico sobre "404 vs 400" para este caso — un duplicado de nombre es un error de negocio (400), no un lookup fallido, así que no aplica la regla de "404 nunca 403" de P2; aplica el patrón normal de validación de negocio (sección 6 de .claude/rules/backend.md: "errores de negocio: retornar 400 con mensaje descriptivo").

### 5. Frontend: ServicioModal.tsx / serviceApi.ts

- [apps/client/src/components/ServicioModal.tsx:22-24]: `useForm<ServiceFormData>()` con `formState: { errors }`. Los errores inline ya existentes (errors.name, errors.duration) se muestran con el mismo bloque JSX: `<span className="flex items-center gap-1 text-xs text-maison-red mt-1 font-medium"><FiAlertCircle /> {errors.name.message}</span>` (líneas 86-90) — este es el estilo exacto a reutilizar para el error de duplicado.
- [ServicioModal.tsx:34-45]: la mutation actual solo tiene `onError: (error) => handleApiError(error, 'Error al guardar el servicio')` — no hay `setError` de react-hook-form conectado a la respuesta del backend. Para cumplir AC2 hay que agregar esta lógica (no existe en ningún lado del repo, ver Hallazgo 6).
- [apps/client/src/api/serviceApi.ts:17-26]: createService/updateService son wrappers Axios directos (api.post/api.put), no hacen manejo de error propio — el error de Axios se propaga intacto hasta el onError de la mutation en el modal.
- [apps/client/src/components/ProductoModal.tsx:34-49]: mismo patrón que ServicioModal — `onError: (error) => handleApiError(error, 'Error al guardar el producto')`. Confirma que el error 400 de "insumo duplicado" que ya lanza productController.createProduct hoy solo se ve como toast genérico en producción — es decir, ni siquiera Product (que ya tiene el check backend) resuelve hoy el inline. UX-21 sería la primera vez que se resuelve end-to-end con inline.

### 6. Formato de error HTTP actual y cómo distinguirlo en frontend

- [apps/client/src/api/errorHandler.ts:24-29]: la interfaz ApiErrorResponse reconoce 3 formas: `{ errors: ValidationError[] }` (express-validator), `{ error: string }` (controllers, incluido el 400 de duplicado), `{ error, details }` (500). No existe ningún campo estructurado tipo `field` o `code` en ningún error del backend — todo error de negocio es `{ error: 'mensaje en español' }` plano (confirmado también en productController.ts:22-24, serviceController.ts en todos los catch).
- No hay ningún precedente de `error.response.status === 409` (Conflict) en el repo — todo error de negocio usa 400 uniformemente (.claude/rules/backend.md sección 5 solo lista 400/401/403/404/500, sin 409).
- Búsqueda de `setError` en apps/client/src: el único match es `apps/client/src/views/CompletarRegistro.tsx:14` — pero es un `useState` local llamado `setError` (string de estado de formulario simple), NO el `setError` de react-hook-form. Confirmado: no existe ningún precedente real de mapear una respuesta del backend a un campo de react-hook-form vía `setError()`.
- Conclusión: el frontend no puede distinguir "nombre duplicado" de otro 400 por status code ni por una propiedad estructurada — hoy solo puede hacerlo por contenido exacto del string de `error.response.data.error`. Esto es frágil pero es el único mecanismo disponible sin tocar el contrato de error global (que excede el alcance de UX-21).

## Recomendación de implementación

**Backend — apps/server/src/controllers/serviceController.ts:**
1. Agregar el mismo helper `escapeRegex` (hoy está duplicado inline en productController.ts:4; el implementer de backend puede evaluar moverlo a `src/utils/` para no triplicarlo, pero no es obligatorio para cerrar UX-21).
2. En `createService`: antes del `new Service(...)`, agregar un `findOne({ tenantId: req.tenantId, isActive: true, name: { $regex: new RegExp('^' + escapeRegex(name.trim()) + '$', 'i') } })` → si existe, `return res.status(400).json({ error: 'Ya existe un servicio activo con este nombre.' })`. Fijar este string exacto como constante compartida (útil para el matching del frontend, ver punto 4) — sugerido: exportar una constante de mensaje desde el mismo controller para no hardcodear el string duplicado en dos capas del monorepo sin una única fuente.
3. En `updateService`: mismo check, pero excluyendo el propio documento con `_id: { $ne: id }` en el filtro del findOne — únicamente cuando `name !== undefined` (si el PUT no toca name, no hace falta re-validar).
4. No tocar el índice Mongoose existente (Service.ts:24) ni agregar `unique: true` — está deliberadamente resuelto a nivel de aplicación, mismo criterio que Product (db-schema.md:264).
5. No requiere cambios en serviceRoutes.ts (los validators de express-validator ya cubren presencia/tipo de name; el check de unicidad es async y de negocio, vive en el controller, igual que en productController).

**Frontend — apps/client/src/components/ServicioModal.tsx (+ eventualmente api/errorHandler.ts):**
1. Cambiar la firma de useForm para capturar setError además de errors: `const { register, handleSubmit, formState: { errors }, reset, setError } = useForm<ServiceFormData>(...)`.
2. En el onError de la useMutation, ANTES de delegar a handleApiError, inspeccionar la respuesta: si es un AxiosError con status === 400 y error.response.data.error coincide (exactamente, o por substring estable en lowercase, ej. contiene "ya existe un servicio activo") con el mensaje de duplicado conocido, llamar `setError('name', { type: 'manual', message: error.response.data.error })` y NO llamar a handleApiError (evitar duplicar el mismo error en toast + inline — regla de .claude/rules/frontend.md sección 5: "Prohibido duplicar el mismo error en un div de alerta inline Y en un toast"). Para cualquier otro 400/500, mantener el fallback a handleApiError.
3. El bloque JSX de error inline ya existe y se reutiliza tal cual (ServicioModal.tsx:86-90), react-hook-form pinta automáticamente errors.name.message una vez seteado por setError.
4. Este mecanismo de "mapear 400 del backend a campo de RHF via setError" es nuevo en el repo — no hay que buscar un helper genérico preexistente porque no existe (confirmado en Hallazgo 5/6). Si el implementer de frontend quiere generalizarlo (por si features futuras necesitan lo mismo, ej. Product), puede proponer un helper tipo `mapApiErrorToField` en api/errorHandler.ts, pero el mínimo viable para UX-21 es el `if` inline descrito en el punto 2.
5. No tocar serviceApi.ts — los wrappers Axios ya propagan el error intacto.

**Archivos a tocar (resumen):**
- Backend: apps/server/src/controllers/serviceController.ts (único archivo, complejidad Trivial según la matriz de escalado del Leader → 1 implementer alcanza).
- Frontend: apps/client/src/components/ServicioModal.tsx (único archivo).
- No requiere cambios en Service.ts (modelo), serviceRoutes.ts, ni serviceApi.ts.
