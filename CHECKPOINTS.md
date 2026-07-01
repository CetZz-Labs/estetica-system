# CHECKPOINTS — Evaluación del Estado Final (Quality Gates)

> En sistemas multi-agente basados en Harness Engineering no se evalúa el camino, se evalúa el destino. Estos son los checkpoints objetivos que un revisor (humano o el subagente `reviewer`) utilizará para validar la sanidad y la disciplina de Maison CRM.
>
> **Convención:** `[ ]` = falla bloqueante → sesión en `CHANGES_REQUESTED`. `[x]` = aprobado.

---

## C1 — El Arnés de Ingeniería está Configurado (Estado Inicial)

- [ ] **Archivos Base de Control:** Existen en la raíz del monorepo: `CLAUDE.md`, `AGENTS.md`, `CHECKPOINTS.md`, `feature_list.json`.
- [ ] **Documentación Operativa:** Existen en `docs/`: `architecture.md`, `conventions.md`, `db-schema.md`, `design.md`, `governance-rules.md`.
- [ ] **Arnés de Habilidades (Skills Digests):** Existen en `.claude/rules/`: `backend.md` y `frontend.md`.
- [ ] **Subsistema de Bitácoras:** `progress/` existe con `current.md` e `history.md` inicializados.
- [ ] **Variables de Entorno:** `apps/server/.env` existe con `CLERK_SECRET_KEY`, `MONGODB_URI`, `FRONTEND_URL`. `apps/client/.env.local` existe con `VITE_API_URL`, `VITE_CLERK_PUBLISHABLE_KEY`.

---

## C2 — Coherencia de Estados y Enfoque Atómico

- [ ] **Límite de Paralelismo:** Existe como máximo **una sola feature** con `"status": "in_progress"` en `feature_list.json`.
- [ ] **Gobernanza de Backlog:** Ninguna feature figura como `"done"` sin haber sido auditada en disco por el `reviewer` con su bitácora en `progress/reviews/review_<id>.md`.
- [ ] **Limpieza de Contexto:** `progress/current.md` describe única y exclusivamente la feature en curso.
- [ ] **Verificación Empírica:** Toda feature `"done"` cuenta con `progress/implements/impl_<id>.md` y `progress/reviews/review_<id>.md` en disco.
- [ ] **Sandbox Hermético:** Los archivos modificados pertenecen exclusivamente al módulo de la feature en curso.

---

## C3 — Fidelidad Arquitectónica y Políticas del Sistema

### Backend (Express + Mongoose)

- [ ] **Estructura Limpia:** Todo código en `apps/server/src/` pertenece a `controllers/`, `models/`, `routes/`, `middlewares/`, `config/`, `services/` (lógica de negocio fuera del ciclo request/response — integraciones externas, jobs en background) o `utils/` (funciones puras sin dependencia de Express/Mongoose). Ver `docs/architecture.md` § Backend: 6 Capas.
- [ ] **Autenticación Obligatoria:** Todo endpoint protegido usa `checkAdminAccess` middleware. Las rutas públicas (health check) están explícitamente excluidas.
- [ ] **Validación de Entrada:** Todo POST y PUT usa `express-validator` para sanitizar datos.
- [ ] **Manejo de Errores:** Cada controller maneja sus errores con try/catch y responde con códigos HTTP adecuados (400, 404, 500). Los stack traces de Mongoose nunca se propagan al cliente.
- [ ] **Soft Deletes:** Clientes, servicios y productos usan `isActive: false` para preservar historial.
- [ ] **Control de Stock:** Las operaciones de egreso validan stock suficiente antes de descontar.
- [ ] **Paginación Obligatoria:** Todo endpoint que devuelve una colección de filas de negocio potencialmente ilimitada (clientes, visitas, productos, turnos) responde paginado `{ data, meta }` con `skip`/`limit` y page-size **7**, filtrando y buscando server-side. Exenciones: widgets de dashboard, catálogos cortos, rankings top-N y agregaciones/KPIs. Patrón en `docs/patterns-backend.md` § P1.
- [ ] **Multi-tenancy en Queries:** Todo query Mongoose de negocio filtra por `tenantId` (resuelto desde `req.tenantId`, nunca del body). `findById`/`findByIdAndUpdate`/`findByIdAndDelete` reemplazados por `findOne`/`findOneAndUpdate`/`findOneAndDelete` con `{ _id, tenantId }`. Ver `docs/governance-rules.md#gov-tenant`.

### Frontend (React + Vite)

- [ ] **Desacoplamiento de Datos:** Los componentes no contienen llamadas HTTP directas. Los datos se consumen a través de funciones API en `src/api/` y hooks de TanStack Query.
- [ ] **Manejo de Estados:** Todo componente cubre los 4 estados: loading (skeleton), error (toast/trifecta), empty (mensaje), data.
- [ ] **Sin Filtrado Client-Side de Listados Ilimitados:** Prohibido traer la colección completa con `useQuery` y filtrar/buscar/paginar en memoria con `useMemo`. La paginación, filtrado y búsqueda se delegan al servidor; la `queryKey` incluye page + todos los filtros activos. Patrón en `docs/patterns-frontend.md` § P3.
- [ ] **HTML Semántico:** Ninguna acción usa `<div>`/`<span>` con `onClick` o `role="button"`. Acción → `<button>`, navegación → `<Link>`. Todo `<button>` clickeable lleva `cursor-pointer`.
- [ ] **Formateo de Fechas con Helper Compartido:** Toda fecha en la UI usa el helper compartido de fechas (`formatCalendarDate` para date-only con `timeZone: 'UTC'`, `formatDateTime` para timestamps reales). Prohibido reimplementar `toLocaleDateString`/`toLocaleString` ad-hoc (gotcha: date-only corre un día atrás en UTC-3).
- [ ] **Instancia Axios Centralizada:** `src/libs/axios.ts` es la única fuente de peticiones HTTP. Tiene interceptor JWT de Clerk.
- [ ] **Notificaciones via Sonner:** Todos los errores de API se muestran con `toast.error()` via `handleApiError()`.
- [ ] **Componentes con `export default`:** Todos los componentes y vistas usan default export.
- [ ] **Tipado Explícito:** Cada `useQuery<T>` tiene tipo genérico explícito. Las props usan interface `Props` local.
- [ ] **Refactoring-UI (Gates de Rechazo):** En tarjetas de KPI, la etiqueta es más pequeña/clara/liviana que el dato principal (no jerarquía invertida). Las cards del dashboard respetan padding mínimo `p-6`.

### Transversal

- [ ] **Higiene de Depuración:** Sin `console.log()`, `debugger`, `// TODO` sin ticket.
- [ ] **Sin Contaminación de Dependencias:** No hay modificaciones a `package.json` raíz sin aprobación.

---

## C4 — Verificación Rigurosa y Compilación Estática

- [ ] **Compilación Backend:** `pnpm --filter @estetica/server build` → Exit Code 0.
- [ ] **Compilación Frontend:** `pnpm --filter @estetica/client build` → Exit Code 0.
- [ ] **Lint Frontend:** `pnpm --filter @estetica/client lint` → Sin errores nuevos.

---

## C5 — Cierre de Sesión Disciplinado (Append-Only Gate)

- [ ] **Estado Final del Backlog:** La feature cerrada tiene `"status": "done"` aplicado por el `reviewer`.
- [ ] **Persistencia Append-Only:** `progress/history.md` tiene nueva entrada al final con fecha, objetivo, archivos modificados, ADRs y resultado de builds.
- [ ] **Cuadro de Mando Limpio:** `progress/current.md` restaurado a plantilla vacía.
- [ ] **Higiene de Archivos:** Sin artefactos de compilación, logs sueltos ni archivos temporales.
- [ ] **Evidencias en Disco:** Existen `progress/implements/impl_<id>.md` y `progress/reviews/review_<id>.md`.

---

## C6 — Capa de Datos: Modelos Mongoose y MongoDB

- [ ] **Ubicación Canónica:** Todos los modelos Mongoose residen en `apps/server/src/models/`.
- [ ] **Naming:** Archivos en PascalCase (`Client.ts`). Interfaces prefijadas con `I` (`IClient`).
- [ ] **Timestamps:** Todos los esquemas usan `{ timestamps: true }`.
- [ ] **Soft Delete:** Clientes, servicios y productos tienen `isActive: Boolean` con `default: true`.
- [ ] **Índices:** Los campos de búsqueda frecuente tienen `index: true` o índices compuestos declarados. Los índices de consulta frecuente se anteponen con `tenantId`.
- [ ] **Referencias:** Las relaciones entre colecciones usan `Schema.Types.ObjectId` con `ref`.
- [ ] **Multi-tenancy en Modelos (Fase 2+):** Todo modelo de negocio (todos excepto `Tenant`) declara `tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true }`. Los índices únicos de negocio son compuestos con `tenantId` (excepción documentada: `admins.externalId`/`admins.email` son únicos globales). Ver `docs/governance-rules.md#gov-tenant`.

---

## C7 — Security Gate

- [ ] **SEC-A (Auth):** Todo endpoint protegido tiene middleware `checkAdminAccess` (heredado a nivel de router o por ruta). Las rutas públicas (health check) están explícitamente exceptuadas.
- [ ] **SEC-B (IDOR cross-tenant):** Ningún endpoint busca un recurso por `_id` sin filtrar también por `tenantId`. Un `_id` de otro tenant retorna **404 Not Found**, nunca 403 (no revelar existencia). Las referencias del body (client/service/product) se validan contra el tenant antes de usarse.
- [ ] **SEC-C (Clerk JWT):** El token JWT se extrae via `getAuth(req)` de `@clerk/express`.
- [ ] **SEC-D (CORS):** Solo orígenes permitidos definidos en configuración (`FRONTEND_URL` + `localhost:5173`). Prohibido `origin: '*'`.
- [ ] **SEC-E (Validación):** `express-validator` usado en todos los endpoints POST/PUT con `validateRequest` como último elemento del array.
- [ ] **SEC-F (Soft-delete + unicidad):** Al reactivar un recurso soft-deleted, se verifica ausencia de duplicados activos (mismo nombre+marca de producto, o externalId de admin) en el tenant antes de restaurar.
- [ ] **SEC-G (Sin `dangerouslySetInnerHTML`):** Prohibido en frontend.
- [ ] **SEC-H (Variables sensibles):** `CLERK_SECRET_KEY`, `MONGODB_URI`, `VITE_CLERK_PUBLISHABLE_KEY` nunca se hardcodean. El backend falla al arranque si falta una variable crítica (no degrada silenciosamente). Ver `docs/governance-rules.md` → GOV-ENV.

---

## C8 — Estabilidad de Contratos de API (API Stability)

> **Quién lo verifica:** el `reviewer` en toda tarea que modifique estructuras de respuesta, renombre fields, remueva endpoints o cambie tipos. **Rationale:** sin política de deprecation, los cambios de API rompen clientes silenciosamente (web actual, móvil futuro, integraciones).

- [ ] **Cambios documentados:** Si la feature modifica la estructura de respuesta (field renombrado, tipo cambiado, field removido), existe entrada en `CHANGELOG.md` bajo `## [Unreleased]` con descripción clara.
- [ ] **Deprecation vs. Breaking:** Una *deprecation* mantiene el field viejo en paralelo con aviso `@deprecated` durante un período de gracia. Un *breaking* solo se permite si la feature está `"in_progress"` o es hotfix pre-producción.
- [ ] **Migration Guide:** Todo breaking change va acompañado de un archivo en `docs/migration-guides/<descripción>.md` con before/after y pasos de actualización.

---

**Cómo usar este archivo:** cada vez que el `implementer` notifica la culminación de una tarea, el `reviewer` ejecuta los comandos de C4 y recorre los checkpoints C2–C8 en orden. Si algún checkbox se evalúa como `[ ]` (falso), la sesión se declara en estado `CHANGES_REQUESTED` y el arnés bloquea el avance hasta resolución explícita.
