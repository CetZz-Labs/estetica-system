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
- **Multi-tenancy (Fase 2 / EP-08):** Toda colección de negocio (`admins`, `clients`, `services`, `products`, `servicerecords`) incluye `tenantId: ObjectId` (ref `Tenant`, required, indexado). Todos los queries de la API filtran por el `tenantId` inyectado por el middleware `checkTenantAccess`. Ver `docs/governance-rules.md` GOV-TENANT.

---

## 7 Colecciones (Fase 1 + Fase 2 + Fase 4)

### `tenants`
Centros de estética registrados (Fase 2 / EP-08). Cada tenant es un negocio independiente con datos completamente aislados.

| Campo | Tipo Mongoose | Requerido | Índice | Descripción |
|-------|--------------|-----------|--------|-------------|
| `_id` | `ObjectId` | Auto | PK | ID interno de Mongo. Es el valor referenciado por `tenantId` en el resto de colecciones |
| `name` | `String` | Sí | - | Nombre del negocio. `trim` |
| `logo` | `String` | No | - | URL del logo del negocio (EP-10) |
| `timezone` | `String` | No, default `'America/Argentina/Buenos_Aires'` | - | Zona horaria IANA (EP-10). Se usa para mostrar fechas y calcular retoques |
| `currency` | `String` | No, default `'ARS'` | - | Código ISO 4217 de moneda (EP-10) |
| `isActive` | `Boolean` | No, default `true` | - | Soft delete |
| `createdAt` | `Date` | Auto | - | Timestamp (Mongoose) |
| `updatedAt` | `Date` | Auto | - | Timestamp (Mongoose) |

**Reglas de negocio:**
- Modelo mínimo creado en EP-08. EP-09 (registro autónomo) agregó el flujo de alta. EP-10 agregó configuración (logo, zona horaria, moneda) con endpoints GET/PUT /api/negocio protegidos por `checkAdminAccess` y `checkTenantAccess`. EP-16 agregó el subdocumento `businessHours` (horarios y días bloqueados). EP-17 agregó el subdocumento `notificationSettings` (SMTP + ventana de anticipación del recordatorio de turno).
- Los datos legados (pre multi-tenant) requieren backfill manual de `tenantId` antes de desplegar.

**Subdocumento `notificationSettings` (EP-17, prerequisito del envío de recordatorios):**

| Campo | Tipo Mongoose | Requerido | Descripción |
|-------|--------------|-----------|-------------|
| `smtpHost` | `String` | No | Host del servidor SMTP del tenant. `trim` |
| `smtpPort` | `Number` | No | Puerto SMTP (típicamente 465 o 587) |
| `smtpSecure` | `Boolean` | No | `true` = TLS/SSL (puerto 465), `false` = STARTTLS (puerto 587) |
| `smtpUser` | `String` | No | Usuario/login SMTP. `trim` |
| `smtpPasswordEncrypted` | `String` | No | Contraseña SMTP cifrada en reposo con AES-256-GCM (`utils/crypto.ts`, clave `CREDENTIALS_ENCRYPTION_KEY`). **Nunca se expone vía API en texto plano ni cifrado** — `GET`/`PUT /api/notificaciones` solo devuelven `hasSmtpPassword: boolean` |
| `fromEmail` | `String` | No | Email remitente de los recordatorios. `trim` |
| `fromName` | `String` | No | Nombre remitente. `trim` |
| `reminderHoursBefore` | `Number` | No, default `24` | Horas de anticipación del recordatorio de turno. `min: 1, max: 168` |

Ver regla canónica completa en [`governance-rules.md#gov-notify`](governance-rules.md#gov-notify--notificaciones-por-mail-recordatorios-de-turno).

---

### `admins`
Administradores del sistema. Autenticación delegada a Clerk; esta colección solo almacena el `externalId` de Clerk para verificación de acceso.

| Campo | Tipo Mongoose | Requerido | Índice | Descripción |
|-------|--------------|-----------|--------|-------------|
| `_id` | `ObjectId` | Auto | PK | ID interno de Mongo |
| `externalId` | `String` | Sí | Único, Indexado | ID de Clerk (`user_2Nf...`). Consultado en CADA request protegido. Único GLOBAL (un usuario Clerk = un solo tenant) |
| `tenantId` | `ObjectId` (ref: Tenant) | Sí | Indexado | Tenant al que pertenece el admin |
| `email` | `String` | Sí | Único | Email del administrador. `trim`, `lowercase`. Único GLOBAL (decisión EP-08) |
| `role` | `String` (enum) | No, default `'ADMIN'` | - | `'ADMIN'`, `'MANAGER'`, `'SUPERADMIN'` |
| `isActive` | `Boolean` | No, default `true` | - | Soft delete |
| `createdAt` | `Date` | Auto | - | Timestamp (Mongoose) |
| `updatedAt` | `Date` | Auto | - | Timestamp (Mongoose) |

**Reglas de negocio:**
- El middleware `checkAdminAccess` busca al usuario por `externalId` en cada request autenticado. Si no existe → 403 Forbidden.
- El middleware `checkTenantAccess` (corre después) lee `adminInfo.tenantId` y lo inyecta en `req.tenantId`; si el admin no tiene tenant → 403.
- Las contraseñas NUNCA se almacenan. Clerk maneja autenticación.

---

### `clients`
Clientes del centro de estética. Perfil con datos de contacto y notas médicas.

| Campo | Tipo Mongoose | Requerido | Índice | Descripción |
|-------|--------------|-----------|--------|-------------|
| `_id` | `ObjectId` | Auto | PK | ID interno de Mongo |
| `tenantId` | `ObjectId` (ref: Tenant) | Sí | Indexado | Tenant propietario del cliente |
| `firstName` | `String` | Sí | - | Nombre del cliente. `trim` |
| `lastName` | `String` | Sí | - | Apellido del cliente. `trim` |
| `phone` | `String` | No | - | Teléfono de contacto. `trim` |
| `email` | `String` | No | - | Email de contacto. `trim`, `lowercase`. Sin restricción de unicidad |
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
| `tenantId` | `ObjectId` (ref: Tenant) | Sí | Indexado | Tenant propietario del servicio |
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
| `tenantId` | `ObjectId` (ref: Tenant) | Sí | Indexado | Tenant propietario del producto |
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
| `tenantId` | `ObjectId` (ref: Tenant) | Sí | Indexado | Tenant propietario del registro |
| `client` | `ObjectId` (ref: Client) | Sí | Indexado | Cliente atendido. `ref: 'Client'`. Debe pertenecer al mismo tenant (validado en el controller) |
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
| - | `servicerecords` | `tenantId: 1, touchupStatus: 1, nextTouchupDate: 1` | Consulta rápida de próximos retoques (Dashboard principal, acotado por tenant) |
| - | `servicerecords` | `tenantId: 1, client: 1, serviceDate: -1` | Historial de visitas por cliente dentro del tenant |
| - | `servicerecords` | `tenantId: 1, createdAt: -1` | Últimos movimientos del tenant |

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

### `appointments`
Turnos/agenda del centro de estética. Vincula cliente, servicio y profesional con validación de superposición horaria.

| Campo | Tipo Mongoose | Requerido | Índice | Descripción |
|-------|--------------|-----------|--------|-------------|
| `_id` | `ObjectId` | Auto | PK | ID interno de Mongo |
| `tenantId` | `ObjectId` (ref: Tenant) | Sí | Indexado | Tenant propietario del turno |
| `client` | `ObjectId` (ref: Client) | Sí | Indexado | Cliente agendado. `ref: 'Client'` |
| `service` | `ObjectId` (ref: Service) | Sí | - | Servicio a realizar. `ref: 'Service'` |
| `professional` | `ObjectId` (ref: Admin) | Sí | Indexado | Profesional que realiza el servicio (temporal hasta EP-11). `ref: 'Admin'` |
| `startTime` | `Date` | Sí | - | Fecha y hora de inicio del turno |
| `endTime` | `Date` | Sí | - | Fecha y hora de fin calculada: `startTime + service.duration` |
| `status` | `String` (enum) | No, default `'pending'` | Indexado | `'pending'`, `'confirmed'`, `'cancelled'`, `'completed'` |
| `notes` | `String` | No | - | Notas opcionales del turno. `trim` |
| `cancelReason` | `String` | No | - | Motivo de cancelación. `trim` |
| `cancelledAt` | `Date` | No | - | Fecha/hora de cancelación |
| `cancelledBy` | `ObjectId` (ref: Admin) | No | - | Admin que canceló el turno |
| `createdBy` | `ObjectId` (ref: Admin) | Sí | - | Admin que creó el turno |
| `isActive` | `Boolean` | No, default `true` | - | Soft delete |
| `reminderSent` | `Boolean` | No, default `false` | Indexado (compuesto) | Idempotencia del cron de recordatorios (EP-17): `true` una vez enviado el mail de recordatorio |
| `createdAt` | `Date` | Auto | - | Timestamp (Mongoose) |
| `updatedAt` | `Date` | Auto | - | Timestamp (Mongoose) |

**Índices compuestos:**

| Índice | Colección | Columnas | Propósito |
|--------|-----------|----------|-----------|
| - | `appointments` | `tenantId: 1, startTime: 1, status: 1` | Consultas de calendario por rango de fechas y estado |
| - | `appointments` | `tenantId: 1, client: 1, startTime: -1` | Historial de turnos del cliente (próximos y pasados) |
| - | `appointments` | `tenantId: 1, professional: 1, startTime: 1, status: 1` | Validación de superposición y filtro por profesional |
| - | `appointments` | `tenantId: 1, status: 1, reminderSent: 1, startTime: 1` | Cron de recordatorios (EP-17): turnos activos pendientes de aviso, dentro de la ventana de anticipación |

**Reglas de negocio:**
- `endTime` se calcula automáticamente como `startTime + service.duration` (minutos).
- Superposición: se valida que no exista otro turno `pending` o `confirmed` del mismo `professional` cuyas horas se superpongan.
- Al cancelar, se registra `cancelledAt`, `cancelledBy` y opcionalmente `cancelReason`.
- EP-17: el cron interno (`services/reminderScheduler.ts`) envía un mail de recordatorio a los turnos `pending`/`confirmed` cuyo `startTime` cae dentro de la ventana `[now, now + tenant.notificationSettings.reminderHoursBefore]` y `reminderSent: false`. Al enviarlo, marca `reminderSent: true`. Ver [`governance-rules.md#gov-notify`](governance-rules.md#gov-notify--notificaciones-por-mail-recordatorios-de-turno).

---

## Diagrama de Relaciones (Refs)

```
tenants ──< admins.tenantId (ref)
tenants ──< clients.tenantId (ref)
tenants ──< services.tenantId (ref)
tenants ──< products.tenantId (ref)
tenants ──< servicerecords.tenantId (ref)
tenants ──< appointments.tenantId (ref)

clients ──< servicerecords.client (ref)
clients ──< appointments.client (ref)
services ──< servicerecords.service (ref)
services ──< appointments.service (ref)
products ──< servicerecords.productsUsed[].product (ref)
admins ──< appointments.professional (ref)
admins ──< appointments.createdBy (ref)
admins ──< appointments.cancelledBy (ref)
```

> Nota: MongoDB no tiene FK con restricción CASCADE. La integridad referencial se gestiona a nivel de aplicación (soft delete impide eliminar clientes con historial).

---

## Resumen de Índices

| Colección | Campo(s) | Tipo | Propósito |
|-----------|----------|------|-----------|
| `admins` | `externalId` | Único (global) | Lookup de autenticación por Clerk ID |
| `admins` | `email` | Único (global) | Unicidad de email |
| `admins` | `tenantId` | Simple | Resolución de tenant en `checkTenantAccess` |
| `clients` | `tenantId: 1, isActive: 1, lastName: 1` | Compuesto | Listado de clientes del tenant ordenado por apellido |
| `services` | `tenantId: 1, isActive: 1, name: 1` | Compuesto | Listado de servicios del tenant |
| `products` | `tenantId: 1, isActive: 1, brand: 1, name: 1` | Compuesto | Listado de productos del tenant |
| `servicerecords` | `client` | Simple | Historial de visitas por cliente |
| `servicerecords` | `serviceDate` | Simple | Ordenamiento cronológico |
| `servicerecords` | `nextTouchupDate` | Simple | Filtro de próximos retoques |
| `servicerecords` | `touchupStatus` | Simple | Filtro por estado |
| `servicerecords` | `tenantId: 1, touchupStatus: 1, nextTouchupDate: 1` | Compuesto | Dashboard: próximos retoques pendientes del tenant |
| `servicerecords` | `tenantId: 1, client: 1, serviceDate: -1` | Compuesto | Historial por cliente dentro del tenant |
| `servicerecords` | `tenantId: 1, createdAt: -1` | Compuesto | Últimos movimientos del tenant |
| `appointments` | `tenantId: 1, startTime: 1, status: 1` | Compuesto | Consultas de calendario por rango de fechas y estado |
| `appointments` | `tenantId: 1, client: 1, startTime: -1` | Compuesto | Historial de turnos del cliente |
| `appointments` | `tenantId: 1, professional: 1, startTime: 1, status: 1` | Compuesto | Validación de superposición y filtro por profesional |
| `appointments` | `tenantId: 1, status: 1, reminderSent: 1, startTime: 1` | Compuesto | Cron de recordatorios (EP-17) |

> Nota: la unicidad de productos (`name + brand`) sigue siendo a nivel de aplicación (regex case-insensitive acotada por `tenantId` en `productController`). No existe índice unique compuesto porque no replicaría la insensibilidad a mayúsculas (requeriría collation).

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
10. **Multi-tenancy (obligatorio desde Fase 2):** Todo modelo de negocio nuevo DEBE incluir `tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true }`. Todo query en controllers DEBE filtrar por `req.tenantId` (inyectado por `checkTenantAccess`). Los índices de consulta frecuente deben anteponerse con `tenantId`. Ver `docs/governance-rules.md` GOV-TENANT.
