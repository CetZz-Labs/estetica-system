# Bitácora Histórica de Sesiones (Append-Only)

> **Regla de Operación:** Este archivo representa el historial inmutable a largo plazo del monorepo. Queda estrictamente prohibido modificar, reescribir o eliminar entradas anteriores. Las nuevas bitácoras se añadirán única y exclusivamente al final del archivo.

---

## 2026-06-10 — Bootstrap del Arnés de Ingeniería (Harness Setup)

* **Agente:** Humano (Arquitecto Principal) + Claude (Leader)
* **Objetivo:** Establecer la infraestructura de gobernanza multi-agente, límites funcionales y sistema de bitácoras en disco para el desarrollo disciplinado de Maison CRM.
* **Cambios Realizados:**
  - **Estructura de Control Global:** Creación de `CLAUDE.md`, `AGENTS.md` y `CHECKPOINTS.md` en la raíz del monorepo.
  - **Backlog de Ingeniería:** Volcado de 25 épicas (EP-01 a EP-25) en `feature_list.json`. Fase 1 (EP-01 a EP-07) marcada como `"done"`. Fases 2-6 (EP-08 a EP-25) en `"pending"`.
  - **Habilidades de Dominio (Skills Digests):** Configuración de políticas en `.claude/rules/backend.md` (Express/Mongoose) y `.claude/rules/frontend.md` (React/Vite/TanStack Query).
  - **Subsistema de Tracking:** Configuración de `progress/current.md` (memoria a corto plazo) y `progress/history.md` (memoria a largo plazo).
  - **Estructura de Carpetas:** Creación de `.claude/agents/`, `docs/`, `progress/explores/`, `progress/implements/`, `progress/reviews/`.

* **Verificación Técnica:** Builds compilados exitosamente:
  - `pnpm --filter @estetica/server build` → Exit Code 0
  - `pnpm --filter @estetica/client build` → Exit Code 0

* **Cierre de Sesión:** Arnés multi-agente declarado estable y listo para operar. Fase 1 completa (7 épicas implementadas). Próxima tarea: iniciar Fase 2 con EP-08 (Multi-Tenant) previa validación del roadmap con el usuario.

---

## 2026-06-10 — Documentación de DB Schema y Sistema de Diseño

* **Agente:** Claude (Implementer)
* **Objetivo:** Completar la documentación técnica faltante: esquema de base de datos y sistema de diseño visual.
* **Cambios Realizados:**
  - `docs/db-schema.md`: Documentación completa de las 5 colecciones MongoDB (admins, clients, services, products, servicerecords) basada en SRS §3.3 y modelos Mongoose reales en `apps/server/src/models/`. Incluye tipos, índices, reglas de negocio, diagrama de relaciones y convenciones para subagentes.
  - `docs/design.md`: Sistema de diseño visual completo extraído del frontend real en `apps/client/src/`. Incluye paleta de colores (tokens Tailwind v4 de `index.css`), tipografía (Playfair Display + Inter), patrones de componentes (sidebar, botones, cards, inputs, modal, tablas, badges, skeletons, empty states, search), accesibilidad WCAG 2.1 AA con Trifecta Visual, notificaciones sonner, responsive breakpoints, animaciones, iconografía Feather y scrollbar personalizado.

* **Verificación Técnica:** Archivos creados en disco. Sin cambios en código fuente — solo documentación.

---

## 2026-06-10 — Completitud del Arnés vs Example

* **Agente:** Claude (Implementer)
* **Objetivo:** Comparar estructura del proyecto contra `example/` y crear archivos faltantes.
* **Cambios Realizados:**
  - `CHANGELOG.md`: Registro de cambios inicial con Fase 1 completa, política de versionado y release checklist.
  - `init.sh`: Arnés de verificación global (pre-flight C1, builds, lint, tests) adaptado a Maison CRM (pnpm filters correctos, vars de entorno esperadas).
  - `.claude/settings.local.json`: Configuración local de Claude Desktop (plugins vacíos por defecto).
  - `docs/governance-rules.md`: Fuente canónica única de reglas transversales (GOV-AUTH, GOV-DB, GOV-STOCK, GOV-VISIT, GOV-ACCESS, GOV-CLIENT, GOV-ENV). Cada regla incluye rationale, mandatos y referencia al checkpoint que la audita.
  - `docs/migration-guides/README.md`: Estructura para futuras guías de migración por breaking changes.
- **Referencias Cruzadas Actualizadas:**
  - `AGENTS.md` §2: Nuevas filas para `docs/governance-rules.md` y `docs/migration-guides/`.
  - `CHECKPOINTS.md` C1: Incluye `governance-rules.md` en documentación operativa. Incluye `init.sh` y `CHANGELOG.md` en archivos base de control.
  - `.claude/rules/backend.md`: Nuevo §7 con enlace a governance-rules.md. §8 renumerado a §9.
  - `.claude/rules/frontend.md`: Nuevo §3.5 con enlace a governance-rules.md.

* **Archivos del Example no migrados (por decisión):**
  - `progress/seed_us04.sql`: Es PostgreSQL/TypeORM, no aplica a MongoDB/Mongoose.
  - `progress/history-phase1-summary.md`: Información ya contenida en nuestro `progress/history.md` entrada de bootstrap.
  - `docs/patterns-backend.md` y `docs/patterns-frontend.md`: Posponen — `.claude/rules/*.md` ya cubren patrones esenciales. Se crearán cuando surja necesidad de templates copy-paste.

* **Verificación Técnica:** Builds no ejecutados (solo archivos de documentación/configuración).

* **Cierre de Sesión:** Arnés completo y equivalente al ejemplo. Harness listo para iniciar desarrollo de features pendientes (EP-08 en adelante).

---

## 2026-06-11 — EP-08 Multi-Tenant: Aislamiento de datos por tenant (Fase 2)

* **Agente:** Claude (Leader) + explorer (a4120094) + implementer (a0eed35d, aa79ee1b) + reviewer (aff7d1d0)
* **Objetivo:** Introducir aislamiento multi-tenant a nivel de base de datos y API en el backend.
* **Cambios Realizados:**
  - **Modelo nuevo:** `apps/server/src/models/Tenant.ts` (name, isActive, timestamps).
  - **tenantId** (ObjectId, ref Tenant, required, index) agregado a los 5 modelos: Admin, Client, Service, Product, ServiceRecord, con índices compuestos por tenant (listados, dashboard, historial, recientes).
  - **Middleware `checkTenantAccess`** en `authMiddleware.ts`: corre tras `checkAdminAccess`, inyecta `req.tenantId` (403 si el admin no tiene tenant). Montado en los 6 routers protegidos.
  - **31 queries tenantizadas** en los 4 controllers según inventario de `progress/explores/explore_ep08-multitenant.md` §3, incluyendo bulkWrite de carga masiva (tenantId en filter + $setOnInsert) y validación de pertenencia del client al crear ServiceRecord.
  - **Hardening post-review:** PUT de servicerecords pasó de `$set: req.body` a whitelist explícita (serviceDate, notes, nextTouchupDate, touchupStatus); test anti mass-assignment agregado.
  - **Tests (nuevo arnés):** vitest + mongodb-memory-server + supertest en `apps/server/src/__tests__/` (excluidos del build). 23/23 verdes: aislamiento A/B, 403 sin tenant, cross-tenant 404, dashboard por tenant, bulk upsert por tenant, anti mass-assignment.
  - **Configuración del arnés (leader):** script `"build": "tsc"` agregado a `apps/server/package.json` (faltaba) + `ignoreDeprecations: "6.0"` en tsconfig (TS6).
  - **Docs canónicas actualizadas (leader):** `docs/db-schema.md` (colección tenants, filas tenantId, índices, diagrama, convención 10) y `docs/governance-rules.md` (nueva GOV-TENANT; GOV-AUTH mandato 4; GOV-STOCK/GOV-VISIT tenantizados).
* **ADRs:**
  - `admins.externalId` y `admins.email` se mantienen únicos GLOBALES (un usuario Clerk = un solo tenant).
  - Unicidad de productos name+brand sigue a nivel de aplicación (regex case-insensitive acotada por tenant); no se creó índice unique por la insensibilidad a mayúsculas.
* **Verificación:** server build Exit 0, client build Exit 0, tests 23/23. Reviewer: VERDE (`progress/reviews/review_EP-08.md`). EP-08 → done.
* **Pendiente operativo:** backfill manual de `tenantId` en datos legados antes de desplegar a una DB real.

---

## 2026-06-11 — EP-09 Registro autónomo de nuevos tenants (Fase 2)

* **Agente:** Claude (Leader) + explorer + implementer-backend + implementer-frontend + reviewer
* **Objetivo:** Permitir que dueñas de estéticas se registren autónomamente con formulario de registro + verificación de email + creación automática de tenant y admin.
* **Cambios Realizados:**
  - **Backend — Controller/Routes:** `POST /api/onboarding` en `onboardingController.ts` + `onboardingRoutes.ts`. Gates: 401 (no Clerk session) → 403 (email no verificado) → 200 (idempotencia) → 409 (email de otro admin) → 201 (creación Tenant + Admin con compensación manual).
  - **Backend — Montaje:** `server.ts` — montado tras `clerkMiddleware()` global, sin `checkAdminAccess`/`checkTenantAccess` (excepción documentada: el admin aún no existe).
  - **Frontend — Register.tsx:** Two-step form (datos del negocio → código de verificación) usando `useSignUp()` de Clerk Signals API. Valida email (regex), password (8+ chars, mayúscula, número). Trifecta en errores. Sonner toasts.
  - **Frontend — Login.tsx:** Enlace "¿Primera vez? Registrá tu negocio" → `/registro`.
  - **API layer:** `onboardingApi.ts` con `completeOnboarding()`.
  - **Tests:** 6 nuevos (401, 403, 400, 201, idempotencia 200, 409). Total: 29/29 verdes.
* **ADRs:**
  - Onboarding es la única excepción a SEC-A (sin `checkAdminAccess`). Gate replacement: sesión Clerk + email verificado.
  - Compensación manual en vez de transacciones (memory server standalone no soporta replica set).
  - Email autoritativo desde Clerk, no del body.
* **Verificación:** server build Exit 0, client build Exit 0, tests 29/29. Reviewer: VERDE (`progress/reviews/review_EP-09.md`). EP-09 → done.
* **Observación:** `responsibleName` se envía desde el frontend pero no se persiste — queda para EP-10 cuando se modele la config del negocio.

---

## 2026-06-11 — EP-10 Configuración básica del negocio (Fase 2)

* **Agente:** Claude (Leader) + implementer-backend + implementer-frontend + reviewer
* **Objetivo:** Sección "Mi Negocio" para que el admin personalice nombre, logo, zona horaria y moneda del centro de estética.
* **Cambios Realizados:**
  - **Backend — Modelo Tenant:** Extendido con `logo` (String), `timezone` (String, def: America/Argentina/Buenos_Aires), `currency` (String, def: ARS).
  - **Backend — Controller/Routes:** `tenantController.ts` con GET y PUT (whitelist $set, mass-assignment prevention) + `tenantRoutes.ts` con express-validator. Montado en `/api/negocio` con `checkAdminAccess` + `checkTenantAccess`.
  - **Frontend — Negocio.tsx:** Vista con formulario react-hook-form (nombre, logo URL con preview, timezone select con 11 IANA zones, currency select con 11 ISO codes). useQuery + useMutation con invalidación de caché. Skeleton loading, trifecta errors, sonner toasts.
  - **Frontend — Router/Sidebar:** Ruta `/configuracion/negocio` + enlace "Configuración" en sidebar.
  - **API layer:** `tenantApi.ts` con `getTenant()` y `updateTenant()`.
  - **Tests:** 6 nuevos (GET 200, PUT nombre, PUT timezone+currency, PUT name vacío 400, GET 401, PUT bad currency 400). Total: 35/35 verdes.
  - **Docs:** `docs/db-schema.md` — tabla tenants actualizada con logo/timezone/currency.
* **ADRs:** Logo almacenado como URL string (servicio externo como Cloudinary/S3); el frontend valida formato pero no hostea archivos.
* **Verificación:** server build Exit 0, client build Exit 0, tests 35/35. Reviewer: VERDE (`progress/reviews/review_EP-10.md`). EP-10 → done.
