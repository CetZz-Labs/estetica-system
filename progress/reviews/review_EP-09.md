# Review — EP-09: Registro autónomo de nuevos tenants

**Reviewer:** reviewer subagent
**Fecha:** 2026-06-11
**Feature:** EP-09 — Registro autónomo de nuevos tenants (Fase 2, MultiTenant)

---

## Auditoría contra CHECKPOINTS.md

### C1 — El Arnés de Ingeniería está Configurado (Estado Inicial)
- [x] No aplica para evaluación de feature (estado inicial preexistente).

### C2 — Coherencia de Estados y Enfoque Atómico
- [x] **Límite de Paralelismo:** Solo EP-09 figura como `"in_progress"` en `feature_list.json`.
- [x] **Gobernanza de Backlog:** EP-09 no estaba marcado `"done"` sin auditoría.
- [x] **Limpieza de Contexto:** `progress/current.md` describe única y exclusivamente EP-09.
- [x] **Verificación Empírica:** `progress/implements/impl_EP-09-backend.md` existe en disco (nota: naming `impl_<id>-backend.md` consistente con EP-08).
- [x] **Sandbox Hermético:** Archivos modificados pertenecen exclusivamente a onboarding (`onboardingController.ts`, `onboardingRoutes.ts`, `Register.tsx`, `Login.tsx`, etc.). Sin contaminación de otras features.

### C3 — Fidelidad Arquitectónica y Políticas del Sistema

**Backend:**
- [x] **Estructura Limpia:** Código en `controllers/`, `routes/`, `__tests__/`.
- [x] **Autenticación Obligatoria:** Onboarding es la **excepción documentada** (SEC-A/GOV-AUTH): no usa `checkAdminAccess` porque el Admin no existe. El gate real es `getAuth(req)` + email verificado. Documentado en comentarios de código en `onboardingController.ts:7-9`, `onboardingRoutes.ts:8-10`, `server.ts:48-49`.
- [x] **Validación de Entrada:** `express-validator` con `body('businessName').notEmpty().trim()` + `validateRequest` middleware.
- [x] **Manejo de Errores:** try/catch con `401`, `403`, `409`, `400` (via middleware), `201`, `200`, `500`.

**Frontend:**
- [x] **Desacoplamiento de Datos:** `Register.tsx` usa `completeOnboarding()` desde `api/onboardingApi.ts`.
- [x] **Manejo de Estados:** Loading (botón deshabilitado + texto), error (toast + trifecta FiAlertCircle), success (navigate + toast).
- [x] **Instancia Axios Centralizada:** Usa `api` desde `src/libs/axios.ts`.
- [x] **Notificaciones via Sonner:** `toast.error()`, `toast.success()`, `handleApiError()`.
- [x] **Componentes con `export default`:** `export default function Register()`.
- [x] **Tipado Explicito:** Interfaces `RegisterFormData`, `CodeFormData`.

**Transversal:**
- [x] **Higiene de Depuración:** Sin `console.log()`, `debugger`, `// TODO`. Se encontró `console.error` en catch block de `onboardingController.ts:67` — no es `console.log()` y es práctica estándar de logging server-side. Aceptable.
- [x] **Sin Contaminación de Dependencias:** Sin modificaciones a `package.json` raíz.

### C4 — Verificación Rigurosa y Compilación Estática
- [x] **Compilación Backend:** `pnpm --filter @estetica/server build` → Exit Code 0.
- [x] **Compilación Frontend:** `pnpm --filter @estetica/client build` → Exit Code 0.
- [x] **Lint Frontend:** Sin errores nuevos. El error preexistente en `ProductoModal.tsx:37` (unused `stock`) no fue introducido por EP-09.

### C6 — Capa de Datos: Modelos Mongoose y MongoDB
- [x] **Ubicación Canónica:** `Tenant.ts` en `apps/server/src/models/`.
- [x] **Naming:** PascalCase (`Tenant.ts`), interfaz `ITenant`.
- [x] **Timestamps:** `{ timestamps: true }` en Tenant y Admin.
- [x] **Soft Delete:** `isActive: Boolean, default: true` en Tenant.
- [x] **Índices:** No requiere índices adicionales para esta feature; el lookup es por `_id`.
- [x] **Referencias:** `Admin.tenantId` → `Schema.Types.ObjectId` con `ref: 'Tenant'`.

### C7 — Security Gate
- [x] **SEC-A (Auth):** Onboarding es la excepción documentada. El gate es sesión Clerk (`getAuth`) + email verificado. Razonamiento sólido: el Admin no existe en MongoDB todavía.
- [x] **SEC-B (Clerk JWT):** `getAuth(req)` de `@clerk/express`.
- [x] **SEC-C (CORS):** Configurado en `server.ts` con orígenes permitidos.
- [x] **SEC-D (Validación):** `express-validator` en ruta POST.
- [x] **SEC-E (Sin dangerouslySetInnerHTML):** Sin ocurrencias en Register.tsx.

---

## Observaciones (no bloqueantes)

1. **`console.error` en catch:** `onboardingController.ts:67` — usar un logger estructurado sería mejor práctica, pero no es un `console.log()` y la checkpoint C3 solo prohíbe `console.log()`.
2. **`responsibleName` no persistido:** El frontend envía `responsibleName` (como campo requerido en el formulario), pero el backend lo valida y trimea sin persistirlo (no existe campo en el schema de Tenant). Documentado en `impl_EP-09-backend.md` para ser incorporado en EP-10. No es bloqueante pero es incongruente entre frontend y backend (el frontend lo marca con `*` y el backend lo ignora).
3. **Lint preexistente:** `ProductoModal.tsx:37` (variable `stock` no usada) — no introducido por EP-09.
4. **Nombre del impl file:** `impl_EP-09-backend.md` en vez de `impl_EP-09.md` — consistente con convención de EP-08.

---

## Próximos pasos (C5 — Cierre)

Una vez aceptado este review:
- [.] `feature_list.json`: EP-09 → `"done"`
- [.] `progress/history.md`: nueva entrada de cierre
- [.] `progress/current.md`: restaurar a plantilla vacía
- [.] Verificar higiene de archivos

---

## Veredicto

>> **VERDE** — Todos los checkpoints aplicables pasan. Las excepciones están documentadas (SEC-A para onboarding). Los builds compilan (Exit 0). Tests: 29/29 verdes. EP-09 puede marcarse como `done`.
