# Arquitectura Maison CRM — Sistema de Gestión para Estética

> **Documento de Calidad de Ingeniería:** Define las políticas arquitectónicas inmutables y los estándares de calidad del ecosistema Maison CRM.

---

## Stack Tecnológico

### Frontend (React SPA — `apps/client`)

| Tecnología | Versión | Propósito |
|-----------|---------|-----------|
| React | 19.2.6 | UI Framework |
| TypeScript | 6.0 | Tipado estático |
| Vite | 8.0 | Build tool + dev server |
| Tailwind CSS | 4.3 | Estilos utilitarios |
| react-router | 7.15 | Routing SPA |
| @tanstack/react-query | 5.100 | Estado del servidor |
| axios | 1.16 | HTTP client |
| react-hook-form | 7.75 | Formularios |
| @clerk/react | 6.6 | Autenticación |
| react-icons | Feather Icons | Iconografía |
| sonner | 2.0 | Toast notifications |
| react-select | 5.10 | Selectores buscables |
| xlsx | 0.18 | Parseo Excel/CSV |

### Backend (Express API — `apps/server`)

| Tecnología | Versión | Propósito |
|-----------|---------|-----------|
| Node.js | 21+ | Runtime |
| Express | 4.21.2 | Web framework |
| TypeScript | 6.0 | Tipado estático |
| Mongoose | 9.6.0 | ODM para MongoDB |
| @clerk/express | 2.1.9 | Auth middleware |
| express-validator | 7.3.2 | Validación de requests |
| cors | 2.8.6 | CORS handling |

---

## Estructura de Capas

### Frontend: 3 Capas

1. **API Layer (`src/api/`)**: Funciones async que encapsulan Axios. Una por recurso: `clientApi.ts`, `serviceApi.ts`, `productApi.ts`, `serviceRecordApi.ts`.
2. **State Layer**: TanStack Query `useQuery`/`useMutation` directamente en vistas. Cache e invalidación via `queryClient`.
3. **Presentation Layer (`src/views/`, `src/components/`)**: Componentes React que consumen queries y renderizan los 4 estados (loading, error, empty, data).

```
[ Vistas React ]
      ↓ (useQuery / useMutation)
[ API Functions (src/api/) ]
      ↓ (Axios con JWT interceptor)
[ Backend Express ]
```

### Backend: 4 Capas

1. **Routes (`src/routes/`)**: Definición de rutas Express con middleware de autenticación y validación inline.
2. **Controllers (`src/controllers/`)**: Lógica de endpoints con try/catch y respuestas HTTP.
3. **Models (`src/models/`)**: Schemas Mongoose con interfaces TypeScript.
4. **Config/Middlewares (`src/config/`, `src/middlewares/`)**: Configuración de DB, Clerk, y middlewares personalizados.

```
[ Routes ] → [ Auth Middleware ] → [ Controllers ] → [ Mongoose Models ]
                                                          ↓
                                                    [ MongoDB Atlas ]
```

---

## Flujo de Autenticación

```
[ Cliente React ]
      ↓ (Clerk <SignIn />)
[ Clerk Service ]
      ↓ (JWT Token)
[ Axios Interceptor ] → Inyecta Bearer token
      ↓
[ Backend ] → checkAdminAccess middleware
      → getAuth(req) extrae userId de Clerk
      → Busca externalId en colección admins
      → Si no existe → 403 Forbidden
      → Inyecta req.adminInfo para controladores
```

---

## Base de Datos (MongoDB — 5 colecciones)

### Colecciones:

1. **admins**: `{ externalId (unique), email (unique), role, isActive, timestamps }`
2. **clients**: `{ firstName, lastName, phone?, medicalNotes?, isActive, timestamps }`
3. **services**: `{ name, defaultTouchupDays?, isActive, timestamps }`
4. **products**: `{ name, brand, stock, description?, isActive, timestamps }`
5. **servicerecords**: `{ client (ref), service (ref), serviceDate, notes?, productsUsed[{product, quantity}], nextTouchupDate?, touchupStatus (enum), timestamps }`

### Índices compuestos:
- `servicerecords`: `{ touchupStatus: 1, nextTouchupDate: 1 }` — consulta rápida de próximos retoques.

---

## Decisiones de Arquitectura (ADRs)

### ADR-001 — Clerk como Único Proveedor de Auth
**Estado:** Activo. Clerk maneja registro, login, sesiones y JWT. El backend nunca almacena credenciales.

### ADR-002 — Double Auth Check
**Estado:** Activo. Clerk verifica el JWT, y adicionalmente el middleware `checkAdminAccess` verifica que el `externalId` exista en la colección `admins` local.

### ADR-003 — Soft Deletes para Integridad Referencial
**Estado:** Activo. Clientes, servicios y productos usan `isActive: false`. ServiceRecords se eliminan físicamente (son eventos).

### ADR-004 — Validación con express-validator
**Estado:** Activo. Todo endpoint POST/PUT usa validación inline con `express-validator` + middleware `validateRequest`.

### ADR-005 — Auto-cálculo de Retoques
**Estado:** Revisado (UX-09, 2026-06-26). El auto-cálculo del backend fue eliminado: el backend ya no calcula `nextTouchupDate` automáticamente. El frontend ofrece el botón "Usar fecha sugerida" (`serviceDate + service.defaultTouchupDays`) — el usuario elige si aplicarlo. El auto-completado de retoques pendientes (`updateMany` sobre `client + service`) se mantiene intacto. Ver [GOV-VISIT](governance-rules.md#gov-visit--registro-de-visitas-y-retoques).
