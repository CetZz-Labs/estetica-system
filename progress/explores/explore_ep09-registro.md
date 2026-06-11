# Reporte de Exploración — EP-09: Registro autónomo de tenants

**Pregunta:** Preparación técnica para la feature EP-09 (signup custom + verificación email + onboarding tenant/admin).
**Contexto:** Fase 2, post EP-08 (multi-tenancy operativo). Explorado por subagente `explorer` (af3009faf2b0d4526), persistido por el leader.
**Timestamp:** 2026-06-11

---

## 1. Frontend auth actual

| Aspecto | Hallazgo |
|---|---|
| Login | `apps/client/src/views/Login.tsx:1-20` — usa el componente **prefabricado `<SignIn>`** de `@clerk/react` con `routing="path"` y `path="/login"`. No hay flujo custom con hooks todavía. |
| Ruta de login | `apps/client/src/router.tsx:15` — `<Route path="/login/*" element={<Login />} />` (wildcard para sub-rutas de Clerk). |
| Protección de rutas | `apps/client/src/layouts/AppLayout.tsx:7-20` — `useAuth()`; si `!isLoaded` muestra "Cargando...", si `!userId` hace `<Navigate to="/login" replace />`. **Solo valida sesión Clerk, NO valida que exista Admin en MongoDB** (si la sesión existe pero el admin no, todas las llamadas API devuelven 403 — relevante para EP-09, ver §4). |
| Provider | `apps/client/src/main.tsx:27-29` — `<ClerkProvider afterSignOutUrl='/login' publishableKey={...}>` envuelve a TanStack Query y al Router. |
| Inyección JWT | `apps/client/src/libs/axios.ts:41-58` — interceptor de request que hace polling de `window.Clerk` (`waitForClerk`, líneas 27-37) y luego `window.Clerk.session.getToken()` → header `Authorization: Bearer <token>`. Funciona automáticamente apenas hay sesión activa (tras `finalize()` el POST de onboarding ya viaja autenticado). |

## 2. API de signup disponible (verificada contra la versión instalada)

**Versión instalada: `@clerk/react@6.7.3`**. Punto crítico: este paquete es el **nuevo `@clerk/react`** (no `@clerk/clerk-react`) y su **entry point principal expone la API de Signals, no la API clásica**:

- `useSignUp(): SignUpSignalValue` retorna **`{ signUp, errors, fetchStatus }`** (NO retorna `isLoaded` ni `setActive`).
- `signUp` es un `SignUpFutureResource`. Sus métodos **no lanzan excepciones: devuelven `Promise<{ error: ClerkError | null }>`**:
  - `signUp.create(params)` acepta `emailAddress`, `password` y `unsafeMetadata`.
  - `signUp.verifications.sendEmailCode()` y `signUp.verifications.verifyEmailCode({ code })` — **reemplazan a `prepareEmailAddressVerification`/`attemptEmailAddressVerification`**.
  - `signUp.finalize({ navigate? })` — **reemplaza a `setActive()`**: convierte el sign-up `status === 'complete'` en sesión activa.
  - `signUp.reset()` — limpia el estado local.
- La API clásica existe solo bajo `@clerk/react/legacy`. NO usar legacy.

### Flujo recomendado paso a paso (vista `Register.tsx`)

1. `const { signUp, errors, fetchStatus } = useSignUp();` (import desde `'@clerk/react'`).
2. Submit del form (react-hook-form): `const { error } = await signUp.create({ emailAddress, password, unsafeMetadata: { businessName, responsibleName } });` — si `error`, mensaje en español.
3. `await signUp.verifications.sendEmailCode();` → paso de código (state local `step: 'form' | 'code'`).
4. `const { error } = await signUp.verifications.verifyEmailCode({ code });`
5. Si `signUp.status === 'complete'` → `await signUp.finalize();` (sesión activa; axios ya inyecta token).
6. Llamar `POST /api/onboarding` con `{ businessName, responsibleName }` y recién entonces `navigate('/')`.
7. **Metadata:** `unsafeMetadata` se copia automáticamente al User al completarse el sign-up; el backend puede leerla vía `clerkClient.users.getUser(userId).unsafeMetadata`. Recomendación: enviar `businessName` en el body del POST y usar metadata solo como fallback/auditoría.

## 3. Backend: endpoint de onboarding

**Montaje:** `apps/server/src/server.ts:36` aplica `clerkMiddleware()` global; routers en líneas 41-46. Montar `app.use('/api/onboarding', onboardingRoutes)` **sin** `checkAdminAccess`/`checkTenantAccess` (el admin aún no existe).

**Estructura:** `src/routes/onboardingRoutes.ts` + `src/controllers/onboardingController.ts`, patrón de `clientRoutes.ts:20-30` (express-validator inline + `validateRequest`).

**Lógica del controller (`createTenantWithAdmin`):**
1. `getAuth(req)` → si no hay `userId` → 401.
2. **Email desde Clerk, no desde el body:** `clerkClient.users.getUser(userId)` (export de `@clerk/express@2.1.23`) → `primaryEmailAddress`/`emailAddresses`. El body solo necesita `businessName` (required) y `responsibleName` (opcional).
3. **Idempotencia:** `Admin.findOne({ externalId: userId })` → si existe, retornar **200 con admin/tenant existente**. Reservar 409 para colisión de `email` único con otro `externalId`.
4. Crear `Tenant` y luego `Admin` con `{ externalId, email, tenantId: tenant._id, role: 'ADMIN' }`.
5. **Consistencia:** transacciones requieren replica set; el test suite usa `MongoMemoryServer.create()` standalone (NO soporta transacciones). Usar **compensación manual**: `try { Admin.create } catch { await Tenant.findByIdAndDelete(tenant._id); throw; }`.
6. Respuesta 201 `{ tenant, admin }`.

## 4. Gate de email verificado

1. **Gate primario (Clerk):** con `verifyEmailCode`, Clerk no marca el sign-up `complete` (ni emite sesión) hasta verificar el código — siempre que la instancia tenga "Verify at sign-up" activado (configuración del Dashboard de Clerk; **acción manual del usuario**). Sin sesión → 401 en onboarding.
2. **Gate defensivo (backend, recomendado):** el controller ya llama `clerkClient.users.getUser(userId)`; verificar `user.emailAddresses.find(e => e.id === user.primaryEmailAddressId)?.verification?.status === 'verified'` → si no, 403. No requiere JWT templates ni webhooks.

## 5. Ruta `/registro` y guía de diseño

- `<Route path="/registro" element={<Register />} />` en `router.tsx` junto a la línea 15 (fuera de `<AppLayout>`). Enlace desde Login: `<Link to="/registro">` debajo del `<SignIn>` ("¿Primera vez? Registrá tu negocio").
- Diseño (de `docs/design.md`):
  1. Fondo `bg-maison-bg`, card `bg-maison-card border border-maison-border rounded-2xl shadow-sm p-6` (§4.3).
  2. Título `font-serif text-2xl text-maison-text` (Playfair); cuerpo `font-sans text-sm` (Inter) (§3).
  3. Labels: `text-xs font-bold tracking-widest text-gray-500 uppercase` (§4.4).
  4. Inputs: `bg-maison-bg border border-maison-border rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-gray-200 focus:border-gray-400`; con error → `border-maison-red` (§4.4).
  5. Botón primario: `bg-maison-primary hover:bg-black text-white px-5 py-2.5 rounded-full text-sm font-medium`, `disabled:bg-gray-400 disabled:cursor-not-allowed` — deshabilitar con `fetchStatus === 'fetching'`/`isSubmitting`.
  6. **Trifecta C6 en errores** (§6): `text-maison-red` + `FiAlertCircle` + texto bajo cada input.
  7. Toasts con `sonner` (top-right ya configurado en `router.tsx:26`).
  8. Iconos solo `react-icons/fi`; sin gradientes ni sombras grandes (§9).
  9. `react-hook-form` (`useForm<RegisterFormData>`), errores vía `errors` del form.
  10. El paso de verificación de código debe mostrar estado pending en el botón.

## 6. Validación de contraseña y email

- **Client (react-hook-form):** Email: `pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/` → 'Ingresá un email válido'. Contraseña: `/^(?=.*[A-Z])(?=.*\d).{8,}$/` → 'La contraseña debe tener al menos 8 caracteres, una mayúscula y un número' (o `validate` granular).
- **Clerk (autoritativo):** valida política de contraseñas y passwords comprometidas en `signUp.create()`; errores en el `{ error }` retornado. Mensajes genéricos en español. El usuario debe alinear la política (8+ chars) en el Dashboard de Clerk.
- **Backend:** la contraseña **nunca llega al backend**; onboarding solo valida `businessName` (`body('businessName').notEmpty().trim()`) y `responsibleName` opcional.

## Diagnóstico

El repo está listo para EP-09 sin refactors previos. Riesgos: (1) `@clerk/react` 6.7.3 usa la **API de Signals** — el flujo legacy (`prepareEmailAddressVerification`/`setActive`) fallaría en compilación desde el entry principal; (2) transacciones no viables en el test harness (memory server standalone) → compensación manual para consistencia tenant+admin.

## Recomendación

Signup con API de Signals (`create` → `verifications.sendEmailCode` → `verifyEmailCode` → `finalize`) + endpoint `POST /api/onboarding` tras `clerkMiddleware()` que tome el email verificado desde `clerkClient.users.getUser(userId)` con compensación manual del tenant ante fallo de creación del admin.
