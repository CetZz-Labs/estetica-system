# impl_UX-11-backend — Carga masiva de clientes (Backend)

## Feature en curso
UX-11 — Carga masiva de clientes vía Excel (capa backend)

## Plan de acción
- Leer controller y rutas de clientes para conocer estado previo
- Agregar `createBulkClients` al final de `clientController.ts`
- Actualizar import y agregar ruta `/carga-masiva` en `clientRoutes.ts` antes de los segmentos `/:id`
- Verificar build

## Archivos modificados

### `apps/server/src/controllers/clientController.ts`
- Agregado al final: función `createBulkClients` (función 6)
- Lógica: valida array de entrada, itera con `findOne` + `create` por ítem
- Dedup case-insensitive por `(firstName, lastName)` dentro del tenant usando `$regex`
- Campos opcionales (`phone`, `medicalNotes`) se mapean a `undefined` si vacíos
- Responde con conteo de `created` y `skipped` con plural correcto en español

### `apps/server/src/routes/clientRoutes.ts`
- Import ampliado: agregado `createBulkClients`
- Ruta nueva: `POST /api/clientes/carga-masiva` ubicada entre el `POST /` y el `GET /`, antes de cualquier segmento `/:id` para evitar captura incorrecta del path
- Validaciones `express-validator`: `body().isArray`, `body('*.firstName')`, `body('*.lastName')`, campos opcionales

## Decisiones técnicas
- No se usa `bulkWrite`/upsert: para clientes no se quiere actualizar datos de registros existentes (preservan historial y datos personales propios)
- El loop `findOne` + `create` es apropiado para volúmenes razonables (< 1000 clientes)
- El regex de escape (`replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&')`) protege contra caracteres especiales en nombres

## Correcciones post-review

### Seguridad — filtrado de `error.message` en respuesta 500
- **Motivo:** propagar `error.message` al cliente puede exponer nombres de colecciones internas o mensajes internos de Mongoose.
- **Cambio:** eliminado el campo `details: error.message` del `res.status(500).json(...)` en el `catch` de `createBulkClients`.
- Antes: `{ error: '...', details: error.message }`
- Despues: `{ error: 'Error al procesar la carga masiva de clientes' }`

## Build output
```
pnpm --filter @estetica/server build
> tsc
(exit code 0 — sin errores ni warnings)
```

### Build post-corrección
```
pnpm --filter @estetica/server build
> tsc
(exit code 0 — sin errores ni warnings)
```
