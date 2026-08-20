# CHANGELOG — Maison CRM

Registro de cambios, deprecations y breaking changes siguiendo [Keep a Changelog](https://keepachangelog.com/) y [Semantic Versioning](https://semver.org/).

## [Unreleased]

### Added
- EP-01 a EP-07 (Fase 1): Autenticación Clerk, CRUD de clientes, servicios, productos, registro de visitas, retoques y dashboard.
- EP-16: Configuración de disponibilidad del negocio. Nuevos endpoints `GET /api/disponibilidad` y `PUT /api/disponibilidad` (requiere rol ADMIN). Almacena horario semanal (7 días, apertura/cierre, abierto/cerrado) y fechas no laborables en el modelo `Tenant`. `POST /api/turnos` y `PUT /api/turnos/:id` validan automáticamente contra el horario configurado (400 si fuera de horario o día cerrado). El calendario de turnos refleja el horario de atención visualmente vía `businessHours` prop de FullCalendar.
- EP-11: Gestión de Profesionales agendables. Nueva entidad `Professional` (nombre, color, estado activa/inactiva, vínculo opcional `linkedAdmin`) desacoplada del login. Nuevos endpoints `GET/POST/PUT/DELETE /api/profesionales` y `GET /api/profesionales/linkable-admins`. La baja (`DELETE`) devuelve `409 { futureAppointments }` si la profesional tiene turnos futuros y no se envía `confirm: true`. Script de migración idempotente `scripts/migrate-ep11-professionals.ts`.
- UX-68: Notificaciones push (PWA) de turnos/retoques. Nueva entidad `PushSubscription` (tenantId, adminId, endpoint único, keys.p256dh/auth — sin soft delete, es un token de dispositivo). Nuevos endpoints `POST`/`DELETE /api/notificaciones/push-subscription` (cualquier rol autenticado, resuelve tenantId/adminId server-side). Cron diario (`0 8 * * *`) que envía un push resumen ("Hoy: N turnos, M retoques pendientes") por admin suscripto cuando hay actividad del día, con limpieza automática de suscripciones caducadas (410/404). Requiere variables de entorno nuevas `VAPID_PUBLIC_KEY`/`VAPID_PRIVATE_KEY`/`VAPID_SUBJECT` (backend) y `VITE_VAPID_PUBLIC_KEY` (frontend) — ver `apps/server/.env.example`. UI de opt-in explícito en Configuración → Mi Negocio (`/configuracion/negocio`). Limitación conocida: en iOS Safari requiere instalar la PWA a la pantalla de inicio.

### Changed

- EP-12: `Admin.role` enum cambiado de `ADMIN | MANAGER | SUPERADMIN` → `ADMIN | PROFESSIONAL | RECEPTIONIST` (SRS §6.2). El campo `role` de `GET /api/admin` devuelve ahora únicamente uno de los tres nuevos valores. Los valores `MANAGER` y `SUPERADMIN` nunca se usaron en producción (default siempre fue `ADMIN`).
- EP-12: `checkAdminAccess` ahora filtra `isActive: true`. Admins desactivados reciben 403 en todas las rutas protegidas.
- EP-12: Nuevo middleware `requireRole(...roles)` aplicado a endpoints específicos según SRS §6.2 (ver tabla de permisos por rol).
- `[CHANGED]` **UX-73**: `lastName` de `Client` pasa a ser **opcional** (antes requerido). Afecta `POST /api/clientes`, `PUT /api/clientes/:id` y `POST /api/clientes/carga-masiva` — ya no rechazan con 400 si `lastName` viene vacío o ausente; solo `firstName` sigue siendo obligatorio. Los clientes existentes no se migran (no hace falta, el campo ya estaba poblado).

- `[BREAKING]` (permitido — feature `in_progress`) **`POST /api/turnos`**: `professional` (MongoId de `Professional`) pasa a ser **requerido**. Antes el backend lo derivaba de `req.adminInfo._id`; los clientes ahora DEBEN enviarlo. Ver `docs/migration-guides/professional-from-admin-to-ep11.md`.
- `[BREAKING]` (permitido — feature `in_progress`) **`POST /api/registros`**: `professional` (MongoId de `Professional`) pasa a ser **requerido**. Se persiste en el `ServiceRecord` y se propaga al turno de retoque auto-creado.
- `[BREAKING]` (permitido — feature `in_progress`) **Forma de respuesta de `professional`**: el populate cambió de `{ _id, email }` a `{ _id, name, color }` en `GET /api/turnos`, `GET /api/turnos/:id`, `GET /api/turnos/client/:clientId`. Además `GET /api/registros/cliente/:clientId` ahora incluye `professional { _id, name, color }` (poblado; ausente en registros legacy).
- `[CHANGED]` **UX-10**: `POST /api/turnos` — `service` y `professional` pasan a ser **opcionales** (antes requeridos según EP-11). `GET /api/turnos` y `GET /api/turnos/:id` pueden retornar appointments sin `service` ni `professional` poblados (campos ausentes cuando el turno fue creado sin ellos). `PATCH /api/turnos/:id/complete` ahora acepta `service` y `professional` del body como override cuando el turno no los tiene.
- `Appointment.professional` y `ServiceRecord.professional` referencian ahora `Professional` (antes `Appointment.professional` era `ref: 'Admin'`). `ServiceRecord.professional` es opcional en el schema (registros legacy) pero requerido al crear.
- **UX-16**: `GET /api/registros/retoques` (`getUpcomingTouchups`) ahora popula `professional { _id, name, color }` y `productsUsed[].product { _id, name }` (antes `ObjectId` crudo), mismo patrón ya usado en `GET /api/registros/cliente/:clientId`.
- `[BREAKING]` (permitido — feature `in_progress`) **EP-17-b**: `GET`/`PUT /api/notificaciones` dejan de exponer/aceptar `smtpHost`, `smtpPort`, `smtpSecure`, `smtpUser`, `fromEmail`, `fromName` y `hasSmtpPassword` — la forma de request/response queda reducida a `{ reminderHoursBefore }`. El envío de mails de recordatorio (EP-17) pasa de usar credenciales SMTP configuradas por-tenant a una única cuenta SMTP de la aplicación, leída desde variables de entorno (`SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASSWORD`, `SMTP_FROM_EMAIL` en `.env`). `reminderScheduler.ts` ya no filtra tenants por tener SMTP propio configurado — todos los tenants activos (`isActive: true`) reciben recordatorios automáticamente. El `fromName` del mail sigue siendo el nombre del negocio (`tenant.name`), personalizado por tenant sobre el SMTP único de la app.
- `[BREAKING]` (permitido — feature `in_progress`) **UX-69**: `GET /api/registros/cliente/:clientId` deja de devolver un array plano de `ServiceRecord[]` y pasa a devolver `{ data: ServiceRecord[], meta: { total, page, limit, totalPages } }` (page-size 7), agregando query params opcionales `page`, `limit`, `dateFrom`, `dateTo`. `POST /api/registros` acepta un nuevo body opcional `isBackfill: boolean` (no persistido en `ServiceRecord`): en `false`/ausente exige `serviceDate >= hoy`; en `true` exige `serviceDate` estrictamente anterior a hoy (habilita registrar una visita pasada olvidada, solo desde la ficha del cliente).

### Deprecated

### Removed

- **EP-17-b**: vista `Notificaciones.tsx` y su ruta/entrada de menú eliminadas (quedaba reducida a un solo campo tras sacar la configuración SMTP). El campo `reminderHoursBefore` se fusionó a la sección "Mi Negocio" (`Negocio.tsx`, EP-10).

### Fixed

### Security

---

## [0.1.0-beta] — 2026-06-10

**Estado:** Beta cerrado (Fase 1). Siete épicas completadas + infraestructura de harness multi-agente.

### Added
- EP-01: Autenticación Clerk + middleware `checkAdminAccess`
- EP-02: CRUD de clientes con soft delete y notas médicas
- EP-03: Catálogo de servicios con período de retoque configurable
- EP-04: Inventario con control de stock y carga masiva Excel/CSV
- EP-05: Registro de visitas con descuento automático de stock
- EP-06: Dashboard con KPIs, timeline de retoques y últimos movimientos
- EP-07: Gestión de retoques (auto-completado al registrar nueva visita)
- TECH-01: Monorepo pnpm + Express + React SPA
- TECH-02: Modelos Mongoose (admins, clients, services, products, servicerecords)
- TECH-03: Arnés multi-agente (CLAUDE.md, AGENTS.md, CHECKPOINTS.md)
- TECH-04: Documentación técnica (architecture.md, conventions.md, db-schema.md, design.md)

### Known Issues
- (ninguno registrado)

---

## Política de Versionado

**Fases del proyecto:**
- **Fase 1 (Beta):** `0.1.x-beta` — Validación de concept, features core incompletas.
- **Fases 2-4 (Release Candidato):** `1.0.0-rc.N` — Multi-tenant, agenda, reporting, roles.
- **Fase 5+ (Producción):** `1.0.0+` — Cambios siguen semver (major.minor.patch).

**Deprecation Policy:**
- Todos los breaking changes van en sección `[Unreleased] → Deprecated` primero.
- Minimum deprecation period: **2 sprints (28 días)** antes de remover un field/endpoint.
- Migration guides: en `docs/migration-guides/<change>.md`.
- Notificación a stakeholders: email + release notes en GitHub.

**Release Checklist:**
1. Todos los breaking changes documentados con período de gracia cumplido.
2. Tests en verde contra staging.
3. Actualizar `## [X.Y.Z] — YYYY-MM-DD` y mover `## [Unreleased]` al tope.
4. Crear git tag: `git tag -a vX.Y.Z -m "Release X.Y.Z"`
5. Notificar a equipo + documentar migration guides si aplica.
