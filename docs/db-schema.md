# Esquema de Base de Datos — Maison CRM (MongoDB)

> **Documento de Referencia Inmutable:** Este archivo describe el schema canónico de MongoDB para Maison CRM tal como fue definido en `EsteticaSystem_SRS_v1_0.md §3.3`. Todo subagente que cree o modifique modelos Mongoose en `apps/server/src/models/` debe adherirse estrictamente a esta especificación. Si el schema evoluciona, este documento debe actualizarse en el mismo commit.

---

## Convenciones Generales

- **ODM:** Mongoose 9.6
- **Ubicación:** `apps/server/src/models/` (un archivo por colección, PascalCase)
- **Timestamps:** Todas las colecciones usan `{ timestamps: true }` → Mongoose gestiona `createdAt` y `updatedAt` automáticamente.
- **Soft delete:** Todas las colecciones (excepto `servicerecords`) tienen `isActive: Boolean` con `default: true`. Ningún documento se elimina físicamente.
- **Índices:** Declarados con `index: true` en el schema o `Schema.index()` para compuestos.
- **IDs:** `_id` es `ObjectId` generado por MongoDB (PK implícita).

---

## 5 Colecciones (Fase 1)

### `admins`
Administradores del sistema. Autenticación delegada a Clerk; esta colección solo almacena el `externalId` de Clerk para verificación de acceso.

| Campo | Tipo Mongoose | Requerido | Índice | Descripción |
|-------|--------------|-----------|--------|-------------|
| `_id` | `ObjectId` | Auto | PK | ID interno de Mongo |
| `externalId` | `String` | Sí | Único, Indexado | ID de Clerk (`user_2Nf...`). Consultado en CADA request protegido |
| `email` | `String` | Sí | Único | Email del administrador. `trim`, `lowercase` |
| `role` | `String` (enum) | No, default `'ADMIN'` | - | `'ADMIN'`, `'MANAGER'`, `'SUPERADMIN'` |
| `isActive` | `Boolean` | No, default `true` | - | Soft delete |
| `createdAt` | `Date` | Auto | - | Timestamp (Mongoose) |
| `updatedAt` | `Date` | Auto | - | Timestamp (Mongoose) |

**Reglas de negocio:**
- El middleware `checkAdminAccess` busca al usuario por `externalId` en cada request autenticado. Si no existe → 403 Forbidden.
- Las contraseñas NUNCA se almacenan. Clerk maneja autenticación.

---

### `clients`
Clientes del centro de estética. Perfil con datos de contacto y notas médicas.

| Campo | Tipo Mongoose | Requerido | Índice | Descripción |
|-------|--------------|-----------|--------|-------------|
| `_id` | `ObjectId` | Auto | PK | ID interno de Mongo |
| `firstName` | `String` | Sí | - | Nombre del cliente. `trim` |
| `lastName` | `String` | Sí | - | Apellido del cliente. `trim` |
| `phone` | `String` | No | - | Teléfono de contacto. `trim` |
| `medicalNotes` | `String` | No | - | Alergias, contraindicaciones, etc. `trim` |
| `isActive` | `Boolean` | No, default `true` | - | Soft delete. Preserva integridad del historial de visitas |
| `createdAt` | `Date` | Auto | - | Timestamp (Mongoose) |
| `updatedAt` | `Date` | Auto | - | Timestamp (Mongoose) |

**Reglas de negocio:**
- Soft delete: al desactivar (`isActive: false`) se conserva el historial de `servicerecords`.
- Las notas médicas se muestran con badge naranja en la UI (`bg-orange-50 text-maison-orange`).

---

### `services`
Catálogo de servicios estéticos ofrecidos. Cada servicio tiene un período de retoque configurable.

| Campo | Tipo Mongoose | Requerido | Índice | Descripción |
|-------|--------------|-----------|--------|-------------|
| `_id` | `ObjectId` | Auto | PK | ID interno de Mongo |
| `name` | `String` | Sí | - | Nombre del servicio. Ej: 'Color + Corte'. `trim` |
| `defaultTouchupDays` | `Number` | No | - | Días sugeridos para calcular automáticamente el próximo retoque |
| `isActive` | `Boolean` | No, default `true` | - | Soft delete |
| `createdAt` | `Date` | Auto | - | Timestamp (Mongoose) |
| `updatedAt` | `Date` | Auto | - | Timestamp (Mongoose) |

**Reglas de negocio:**
- Si `defaultTouchupDays > 0`, el sistema calcula `nextTouchupDate = serviceDate + defaultTouchupDays` al registrar una visita.
- En la UI se muestra: `"Retoque en {n} días"` o `"Sin retoque"`.

---

### `products`
Inventario de insumos/consumibles. Control de stock con validación de no negatividad.

| Campo | Tipo Mongoose | Requerido | Índice | Descripción |
|-------|--------------|-----------|--------|-------------|
| `_id` | `ObjectId` | Auto | PK | ID interno de Mongo |
| `name` | `String` | Sí | - | Nombre del producto. Ej: 'Oxidante 20 Vol'. `trim` |
| `brand` | `String` | Sí | - | Marca. Ej: 'Wella'. `trim` |
| `stock` | `Number` | Sí, default `0` | - | Cantidad disponible. `min: 0` (no negativo) |
| `description` | `String` | No | - | Descripción opcional. `trim` |
| `isActive` | `Boolean` | No, default `true` | - | Soft delete |
| `createdAt` | `Date` | Auto | - | Timestamp (Mongoose) |
| `updatedAt` | `Date` | Auto | - | Timestamp (Mongoose) |

**Reglas de negocio:**
- El stock se descuenta automáticamente al registrar una visita que consume el producto (ver `servicerecords.productsUsed`).
- Validación de stock negativo: `min: [0, 'El stock no puede ser negativo']`.
- Carga masiva desde Excel/CSV usa `upsert` por nombre + marca para evitar duplicados.
- Umbrales visuales en UI: `stock === 0` → rojo, `stock <= 5` → naranja, `stock > 5` → verde.

---

### `servicerecords`
Registro de visitas (eje central del sistema). Vincula cliente + servicio + productos consumidos + estado del retoque.

| Campo | Tipo Mongoose | Requerido | Índice | Descripción |
|-------|--------------|-----------|--------|-------------|
| `_id` | `ObjectId` | Auto | PK | ID interno de Mongo |
| `client` | `ObjectId` (ref: Client) | Sí | Indexado | Cliente atendido. `ref: 'Client'` |
| `service` | `ObjectId` (ref: Service) | Sí | - | Servicio realizado. `ref: 'Service'` |
| `serviceDate` | `Date` | Sí | Indexado | Fecha del servicio |
| `notes` | `String` | No | - | Notas del servicio. Ej: "Balayage rubio miel". `trim` |
| `productsUsed` | `[{ product: ObjectId (ref: Product), quantity: Number }]` | No, default `[]` | - | Array de insumos consumidos. `quantity: { min: 0 }` |
| `nextTouchupDate` | `Date` | No | Indexado | Fecha del próximo retoque calculada automáticamente |
| `touchupStatus` | `String` (enum) | No, default `'pending'` | Indexado | `'pending'`, `'completed'`, `'cancelled'` |
| `createdAt` | `Date` | Auto | - | Timestamp (Mongoose) |
| `updatedAt` | `Date` | Auto | - | Timestamp (Mongoose) |

**Índices compuestos:**

| Índice | Colección | Columnas | Propósito |
|--------|-----------|----------|-----------|
| `idx_touchup_status_date` | `servicerecords` | `touchupStatus: 1, nextTouchupDate: 1` | Consulta rápida de próximos retoques (Dashboard principal) |

**Reglas de negocio:**
- Al crear un `servicerecord`, se descuenta `stock` de cada producto en `productsUsed`.
- Si el cliente ya tiene un `servicerecord` previo con el mismo `client` + `service` y `touchupStatus: 'pending'`, ese retoque anterior se auto-completa (`touchupStatus: 'completed'`).
- El `nextTouchupDate` se calcula como `serviceDate + service.defaultTouchupDays`.
- En el Dashboard, los retoques se clasifican por urgencia visual según `nextTouchupDate`:
  - Atrasado / Hoy → rojo (`bg-maison-red`)
  - Próximos 1–7 días → naranja (`bg-maison-orange`)
  - Próximos 8–21 días → verde (`bg-maison-green`)
  - Más de 21 días → gris (`bg-gray-400`)

---

## Diagrama de Relaciones (Refs)

```
admins (independiente, solo Clerk verification)
  ─── (sin relaciones)

clients ──< servicerecords.client (ref)
services ──< servicerecords.service (ref)
products ──< servicerecords.productsUsed[].product (ref)
```

> Nota: MongoDB no tiene FK con restricción CASCADE. La integridad referencial se gestiona a nivel de aplicación (soft delete impide eliminar clientes con historial).

---

## Resumen de Índices

| Colección | Campo(s) | Tipo | Propósito |
|-----------|----------|------|-----------|
| `admins` | `externalId` | Único | Lookup de autenticación por Clerk ID |
| `admins` | `email` | Único | Unicidad de email |
| `servicerecords` | `client` | Simple | Historial de visitas por cliente |
| `servicerecords` | `serviceDate` | Simple | Ordenamiento cronológico |
| `servicerecords` | `nextTouchupDate` | Simple | Filtro de próximos retoques |
| `servicerecords` | `touchupStatus` | Simple | Filtro por estado |
| `servicerecords` | `touchupStatus: 1, nextTouchupDate: 1` | Compuesto | Dashboard: próximos retoques pendientes |

---

## Notas para Subagentes (Convenciones Mongoose)

1. **Nombres de modelos:** PascalCase singular → `Client`, `ServiceRecord`.
2. **Nombres de archivo:** PascalCase → `Client.ts`, `ServiceRecord.ts`.
3. **Ubicación:** Todos los modelos viven en `apps/server/src/models/`.
4. **Interfaces:** Exportar interfaz con prefijo `I` → `IClient extends Document`.
5. **Timestamps:** Usar `{ timestamps: true }` en opciones del schema (genera `createdAt`/`updatedAt` automáticamente).
6. **Enums:** Usar `enum: [...]` en el schema y array de strings en la interfaz (union type).
7. **Soft deletes:** Propiedad `isActive` con `default: true`. NO usar `mongoose-delete`. Filtrar manualmente con `{ isActive: true }` en los servicios.
8. **Refs:** Usar `{ type: Schema.Types.ObjectId, ref: 'ModelName' }`. Poblar con `.populate('field')`.
9. **Validación:** Usar `required: [true, 'mensaje']` y `min`/`max` para números. No usar validadores personalizados a menos que sea indispensable.
