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

- [ ] **Estructura Limpia:** Todo código en `apps/server/src/` pertenece a `controllers/`, `models/`, `routes/`, `middlewares/` o `config/`.
- [ ] **Autenticación Obligatoria:** Todo endpoint protegido usa `checkAdminAccess` middleware. Las rutas públicas (health check) están explícitamente excluidas.
- [ ] **Validación de Entrada:** Todo POST y PUT usa `express-validator` para sanitizar datos.
- [ ] **Manejo de Errores:** Cada controller maneja sus errores con try/catch y responde con códigos HTTP adecuados (400, 404, 500).
- [ ] **Soft Deletes:** Clientes, servicios y productos usan `isActive: false` para preservar historial.
- [ ] **Control de Stock:** Las operaciones de egreso validan stock suficiente antes de descontar.

### Frontend (React + Vite)

- [ ] **Desacoplamiento de Datos:** Los componentes no contienen llamadas HTTP directas. Los datos se consumen a través de funciones API en `src/api/` y hooks de TanStack Query.
- [ ] **Manejo de Estados:** Todo componente cubre los 4 estados: loading (skeleton), error (toast/trifecta), empty (mensaje), data.
- [ ] **Instancia Axios Centralizada:** `src/libs/axios.ts` es la única fuente de peticiones HTTP. Tiene interceptor JWT de Clerk.
- [ ] **Notificaciones via Sonner:** Todos los errores de API se muestran con `toast.error()` via `handleApiError()`.
- [ ] **Componentes con `export default`:** Todos los componentes y vistas usan default export.
- [ ] **Tipado Explícito:** Cada `useQuery<T>` tiene tipo genérico explícito. Las props usan interface `Props` local.

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
- [ ] **Índices:** Los campos de búsqueda frecuente tienen `index: true` o índices compuestos declarados.
- [ ] **Referencias:** Las relaciones entre colecciones usan `Schema.Types.ObjectId` con `ref`.

---

## C7 — Security Gate

- [ ] **SEC-A (Auth):** Todo endpoint protegido tiene middleware `checkAdminAccess`.
- [ ] **SEC-B (Clerk JWT):** El token JWT se extrae via `getAuth(req)` de `@clerk/express`.
- [ ] **SEC-C (CORS):** Solo orígenes permitidos definidos en configuración.
- [ ] **SEC-D (Validación):** `express-validator` usado en todos los endpoints POST/PUT.
- [ ] **SEC-E (Sin `dangerouslySetInnerHTML`):** Prohibido en frontend.
