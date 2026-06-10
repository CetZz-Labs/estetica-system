# Reglas de Gobernanza — Fuente Canónica Única (Maison CRM)

> **Single Source of Truth.** Este documento es la **fuente canónica** de las reglas de seguridad y gobernanza transversales de Maison CRM. Cualquier otra mención de estas reglas (`.claude/rules/backend.md`, `.claude/rules/frontend.md`, `CHECKPOINTS.md`, `CLAUDE.md`) debe **referenciar** este archivo, nunca redefinir la regla con su propia redacción.
>
> **Regla de mantenimiento:** Si una política cambia, se edita **aquí primero**. Los demás documentos solo conservan un enunciado normativo de una línea + el enlace a la sección correspondiente de este archivo. Esto elimina el riesgo de desfase entre lo que audita el `reviewer` (CHECKPOINTS) y lo que implementa el `implementer` (rules).

**Índice de reglas canónicas:**
- [GOV-AUTH — Autenticación y Control de Acceso](#gov-auth--autenticación-y-control-de-acceso)
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

**Auditado por:** `CHECKPOINTS.md` C3 (Autenticación Obligatoria), C7 (SEC-A, SEC-B, SEC-C).

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
4. Carga masiva: identificar producto por `name + brand` combinados para upsert.

**Auditado por:** `CHECKPOINTS.md` C3 (Control de Stock).

---

## GOV-VISIT — Registro de Visitas y Retoques

**Regla:** Al registrar una visita (servicerecord), el sistema descuenta stock de los productos consumidos, genera automáticamente un próximo retoque pendiente (basado en `service.defaultTouchupDays`), y auto-completa el retoque anterior del mismo cliente+servicio.

**Por qué:** En un centro de estética, un cliente vuelve periódicamente por el mismo servicio (coloración, corte, etc.). El retoque anterior debe marcarse como completado automáticamente para mantener el timeline limpio y no acumular retoques pendientes fantasma.

**Mandatos:**
1. `nextTouchupDate = serviceDate + service.defaultTouchupDays` (si `> 0`).
2. Buscar servicerecord previo con mismo `client` + `service` + `touchupStatus: 'pending'` → set `touchupStatus: 'completed'`.
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
