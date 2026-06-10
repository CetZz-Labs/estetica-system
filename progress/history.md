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
