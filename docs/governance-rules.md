# Reglas de Gobernanza — Fuente Canónica Única (Maison CRM)

> **Single Source of Truth.** Este documento es la **fuente canónica** de las reglas de seguridad y gobernanza transversales de Maison CRM. Cualquier otra mención de estas reglas (`.claude/rules/backend.md`, `.claude/rules/frontend.md`, `CHECKPOINTS.md`, `CLAUDE.md`) debe **referenciar** este archivo, nunca redefinir la regla con su propia redacción.
>
> **Regla de mantenimiento:** Si una política cambia, se edita **aquí primero**. Los demás documentos solo conservan un enunciado normativo de una línea + el enlace a la sección correspondiente de este archivo. Esto elimina el riesgo de desfase entre lo que audita el `reviewer` (CHECKPOINTS) y lo que implementa el `implementer` (rules).

**Índice de reglas canónicas:**
- [GOV-AUTH — Autenticación y Control de Acceso](#gov-auth--autenticación-y-control-de-acceso)
- [GOV-TENANT — Aislamiento Multi-Tenant](#gov-tenant--aislamiento-multi-tenant)
- [GOV-DB — Soft Deletes e Integridad Referencial](#gov-db--soft-deletes-e-integridad-referencial)
- [GOV-STOCK — Control de Inventario y Stock](#gov-stock--control-de-inventario-y-stock)
- [GOV-VISIT — Registro de Visitas y Retoques](#gov-visit--registro-de-visitas-y-retoques)
- [GOV-ACCESS — Trifecta de Accesibilidad Visual](#gov-access--trifecta-de-accesibilidad-visual)
- [GOV-CLIENT — Seguridad de Frontend (Clerk + Sanitización)](#gov-client--seguridad-de-frontend-clerk--sanitización)

---

## GOV-AUTH — Autenticación y Control de Acceso

**Regla:** La autenticación se maneja exclusivamente via **Clerk** (Google OAuth + email/contraseña). Todo request a la API DEBE verificar que el `userId` de Clerk exista en la colección `admins` de MongoDB. Las contraseñas NUNCA se almacenan en la base de datos del sistema.

**Por qué:** Clerk maneja el ciclo completo de autenticación (registro, inicio de sesión, recuperación de contraseña, sesiones JWT). El sistema solo almacena el `externalId` del admin para verificar que el usuario tiene acceso al sistema. Esto elimina el riesgo de fuga de credenciales y la responsabilidad de implementar hashing, rate limiting de login, etc.

**Mandatos:**
1. El middleware `checkAdminAccess` busca al usuario por `externalId` en la colección `admins` en CADA request protegido. Si no existe → 403 Forbidden.
2. Todo endpoint DEBE estar autenticado excepto health check.
3. El token JWT se extrae via `getAuth(req)` de `@clerk/express`.
4. Tras `checkAdminAccess`, el middleware `checkTenantAccess` resuelve `adminInfo.tenantId` y lo cuelga en `req.tenantId` (403 si el admin no tiene tenant). Ver [GOV-TENANT](#gov-tenant--aislamiento-multi-tenant).

**Auditado por:** `CHECKPOINTS.md` C3 (Autenticación Obligatoria), C7 (SEC-A, SEC-B, SEC-C).

---

## GOV-TENANT — Aislamiento Multi-Tenant

**Regla:** Cada centro de estética (tenant) tiene sus datos completamente aislados. Toda colección de negocio incluye `tenantId` (ObjectId, ref `Tenant`, required, indexado) y **todo query de la API filtra por el `tenantId` del usuario autenticado**, sin excepción.

**Por qué:** Maison CRM es multi-tenant desde Fase 2 (EP-08). Una fuga cross-tenant (listar, leer, modificar o referenciar documentos de otro negocio) es una violación de privacidad y un defecto bloqueante. El aislamiento se garantiza a nivel de aplicación porque MongoDB no provee row-level security.

**Mandatos:**
1. Todo modelo de negocio DEBE declarar `tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true }`.
2. El middleware `checkTenantAccess` corre después de `checkAdminAccess` en TODOS los routers protegidos e inyecta `req.tenantId`.
3. Prohibido todo query Mongoose sin `tenantId` en el filtro: `findById`/`findByIdAndUpdate`/`findByIdAndDelete` se reemplazan por `findOne`/`findOneAndUpdate`/`findOneAndDelete` con `{ _id, tenantId }`.
4. Las referencias del body (ej. `client`, `service`, `product` al crear un servicerecord) DEBEN validarse contra el tenant del request antes de usarse.
5. En operaciones `upsert`/`bulkWrite`, `tenantId` va en el `filter` Y en `$setOnInsert`.
6. Prohibido aceptar `tenantId` desde el body del cliente (mass-assignment): los updates usan whitelist explícita de campos editables.
7. Los índices de consulta frecuente se anteponen con `tenantId`. Los índices únicos de negocio deben ser compuestos con `tenantId` (excepción documentada: `admins.externalId` y `admins.email` son únicos globales — un usuario Clerk pertenece a un solo tenant).
8. Toda feature nueva DEBE incluir tests de aislamiento (tenant A no ve/modifica datos de tenant B).

**Auditado por:** `CHECKPOINTS.md` C3, C6 (Índices), C7. Esquema en `docs/db-schema.md`.

---

## GOV-DB — Soft Deletes e Integridad Referencial

**Regla:** Clientes, servicios y productos usan **soft delete** (`isActive: false`). Ningún documento se elimina físicamente de la base de datos. Esto preserva la integridad referencial del historial de `servicerecords`.

**Por qué:** Si un cliente deja de asistir, eliminar su registro físicamente rompe el historial de visitas (servicerecords), que referencia al cliente por ObjectId. El soft delete mantiene la integridad referencial sin necesidad de CASCADE.

**Mandatos:**
1. Todas las colecciones excepto `servicerecords` tienen `isActive: Boolean` con `default: true`.
2. Los servicios de listado filtran con `{ isActive: true }`.
3. Servicerecords no tiene soft delete — es un registro inmutable.
4. Mongoose `timestamps: true` en todas las colecciones.

**Auditado por:** `CHECKPOINTS.md` C3 (Soft Deletes), C6 (Modelos Mongoose).

---

## GOV-STOCK — Control de Inventario y Stock

**Regla:** El stock de productos se controla con validación de no negatividad. El stock se descuenta automáticamente al registrar una visita que consume insumos. La carga masiva desde Excel/CSV usa `upsert` por nombre + marca para evitar duplicados.

**Por qué:** El inventario es un activo del centro de estética. Validar stock negativo previene egresos imposibles. El `upsert` en carga masiva evita duplicados cuando se reimporta el mismo archivo.

**Mandatos:**
1. Validación Mongoose `min: [0, 'El stock no puede ser negativo']` en el campo `stock`.
2. Las operaciones de egreso validan stock suficiente antes de descontar.
3. El descuento de stock ocurre en la misma transacción lógica que la creación de `servicerecord`.
4. Carga masiva: identificar producto por `tenantId + name + brand` combinados para upsert (con `tenantId` también en `$setOnInsert`).

**Auditado por:** `CHECKPOINTS.md` C3 (Control de Stock).

---

## GOV-VISIT — Registro de Visitas y Retoques

**Regla:** Al registrar una visita (servicerecord), el sistema descuenta stock de los productos consumidos, opcionalmente registra un próximo retoque (fecha definida explícitamente por el usuario), y auto-completa el retoque anterior del mismo cliente+servicio.

**Por qué:** En un centro de estética, un cliente vuelve periódicamente por el mismo servicio (coloración, corte, etc.). El retoque anterior debe marcarse como completado automáticamente para mantener el timeline limpio y no acumular retoques pendientes fantasma. El control explícito de la fecha de retoque evita crear citas automáticas no deseadas.

**Mandatos:**
1. `nextTouchupDate` es un campo **opcional controlado por el usuario**. El frontend ofrece un botón "Usar fecha sugerida" que calcula `serviceDate + service.defaultTouchupDays` en el cliente, pero el backend acepta el valor enviado sin auto-cálculo propio. Si el usuario no provee `nextTouchupDate`, no se genera retoque automático. _(Modificado en UX-09, 2026-06-26: el auto-cálculo fue movido al cliente para dar control explícito al usuario.)_
2. Buscar servicerecord previo con mismo `tenantId` + `client` + `service` + `touchupStatus: 'pending'` → set `touchupStatus: 'completed'`.
3. El servicerecord nuevo se crea con `touchupStatus: 'pending'`.

**Auditado por:** `CHECKPOINTS.md` C3 (ningún checkpoint específico — regla de dominio pura).

---

## GOV-ACCESS — Trifecta de Accesibilidad Visual

**Regla:** Ningún componente visual debe delegar la comunicación de un estado sensible únicamente a un código de color. Es obligatorio: **Color semántico + Icono descriptivo (react-icons/fi) + Texto descriptivo claro**.

**Por qué:** WCAG 2.1 Nivel AA. Un usuario con daltonismo no puede distinguir estados solo por color. La combinación color + icono + texto garantiza que la información llegue por al menos dos canales sensoriales.

**Mandatos:**
1. Estados de retoque: badge con color (rojo/naranja/verde/gris) + texto ("Atrasado Xd", "En X días", "Hoy") + dot de timeline.
2. Estados de stock: card con color (rojo/naranja/verde) + icono (FiBox, FiAlertTriangle) + texto ("Sin Stock", "Stock Bajo (≤ 5)").
3. Errores de formulario: color rojo + icono FiAlertCircle + mensaje de error textual.
4. Prohibido usar solo `bg-red-500` o `text-red-600` sin icono y texto acompañante.

**Auditado por:** `CHECKPOINTS.md` C3 (Transversal — Trifecta). Documentado en `docs/design.md` §6.

---

## GOV-CLIENT — Seguridad de Frontend (Clerk + Sanitización)

**Regla:** El frontend nunca almacena tokens de sesión en localStorage. Clerk maneja sesiones via cookies HttpOnly. No usar `dangerouslySetInnerHTML`. La instancia de Axios inyecta el token JWT automáticamente via interceptor de Clerk.

**Por qué:** Almacenar JWT en localStorage es vulnerable a XSS. Clerk maneja sesiones via cookies con flags Secure + HttpOnly, que no son accesibles desde JavaScript.

**Mandatos:**
1. `src/libs/axios.ts` es la única fuente de peticiones HTTP. Usa el interceptor `withToken` de Clerk.
2. Prohibido `dangerouslySetInnerHTML` en cualquier componente.
3. Prohibido `alert()` o `confirm()` en producción (usar sonner + modales).
4. Las claves de entorno (`VITE_CLERK_PUBLISHABLE_KEY`, `VITE_API_URL`) nunca se hardcodean.

**Auditado por:** `CHECKPOINTS.md` C3 (Instancia Axios Centralizada), C7 (SEC-E).

---

## Variables de Entorno Sensibles (GOV-ENV)

Toda variable crítica (`CLERK_SECRET_KEY`, `MONGODB_URI`, `VITE_CLERK_PUBLISHABLE_KEY`) se lee desde archivos `.env` o `.env.local` que están en `.gitignore`. Nunca se hardcodean en el código fuente. El backend debe fallar al arranque si falta una variable crítica, no degradar silenciosamente.

---

> **Recordatorio de gobernanza:** Cualquier regla nueva de seguridad/accesibilidad/gobernanza transversal se documenta **aquí**. Los digests inyectados a subagentes (`.claude/rules/*.md`) solo llevan el enunciado normativo + enlace a la sección de este archivo.
