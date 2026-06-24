# AGENTS.md — Mapa de navegación para agentes de IA

> Este archivo es el **punto de entrada** obligatorio para cualquier agente autónomo o instancia de IA que trabaje en este monorepo. No actúa como una enciclopedia redundante de reglas, sino como un **mapa operativo** para habilitar la divulgación progresiva de contexto bajo demanda.

---

## 1. Antes de empezar (Obligatorio)

1. **Validación del Entorno Sano:** Verifica que `pnpm install` esté al día y que los builds compilen sin errores.
2. **Sincronización del Estado:** Lee `progress/current.md` para asimilar los objetivos de la sesión activa.
3. **Adquisición de Objetivo Único:** Abre `feature_list.json` y elige **una sola** historia de usuario en estado `"pending"`. Prohibido trabajar en más de una feature en la misma ventana de contexto.

---

## 2. Mapa del Repositorio (Monorepo Workspace)

| Archivo / Carpeta | Qué contiene | Cuándo leerlo |
| --- | --- | --- |
| `feature_list.json` | El backlog oficial del sistema con estados, IDs y criterios de aceptación. | Siempre, al iniciar sesión y antes de proponer cambios de estado. |
| `progress/current.md` | Cuadro de mando vivo gobernado por el `leader`. | Siempre, al comenzar la sesión. |
| `progress/history.md` | Bitácora *append-only* del historial consolidado de sesiones. | Si requieres contexto histórico profundo. |
| `EsteticaSystem_SRS_v1_0.md` | Especificación de Requisitos de Software del sistema. | Antes de implementar cualquier feature. |
| `docs/architecture.md` | Definición de capas arquitectónicas (Express + React). | Antes de estructurar andamiaje lógico. |
| `docs/conventions.md` | Convenciones de tipado, imports, naming y errores. | Antes de escribir o refactorizar código. |
| `docs/db-schema.md` | Esquema canónico MongoDB: colecciones, campos, índices, reglas. | **Lectura obligatoria** antes de crear o modificar modelos Mongoose. |
| `docs/design.md` | Sistema de diseño visual: tokens, componentes, accesibilidad, iconos. | **Lectura obligatoria** antes de implementar o modificar componentes React. |
| `docs/governance-rules.md` | Fuente canónica única de reglas de seguridad y gobernanza. | Al crear o modificar reglas transversales (auth, multi-tenant, stock, accesibilidad). |
| `docs/patterns-backend.md` | Catálogo de patrones backend copy-paste ya auditados: listado paginado multi-tenant, lookup anti-IDOR, ruta validada, control de stock, carga masiva, registro de visita con auto-retoque. | Antes de implementar un listado, lookup, ruta, ajuste de stock o registro de visita — copiar el patrón en vez de reinventar. |
| `docs/patterns-frontend.md` | Catálogo de patrones frontend copy-paste: función de API, query/mutation en vista, consumo de listado paginado, 4 estados async + trifecta, modal con react-hook-form, tabla + paginación. | Antes de crear una función de API, consumir un listado paginado, armar una tabla o un modal. |
| `docs/migration-guides/` | Guías de migración para breaking changes de API. | Cuando se depreca o elimina un endpoint/campo. |
| `CHECKPOINTS.md` | Compuertas de calidad inmutables (Quality Gates). | Para autoevaluación del `implementer` y auditoría del `reviewer`. |
| `.claude/rules/backend.md` | Reglas de backend: Express, Mongoose, Clerk middleware, paginación obligatoria. | Al operar dentro de `apps/server/`. |
| `.claude/rules/frontend.md` | Reglas de frontend: React, Vite, TanStack Query, Clerk, HTML semántico, trifecta. | Al operar dentro de `apps/client/`. |
| `.claude/skills/ui-ux-pro-max/` | Skill de inteligencia de diseño UI/UX (estilos, paletas, tipografías, charts) con CLI de búsqueda en Python. | Antes de diseñar/implementar una vista, landing o componente visual nuevo. |
| `.claude/agents/` | Definiciones de roles para subagentes (`leader`, `implementer`, `reviewer`, `explorer`). | Cuando actúas como orquestador. |
| `apps/client/` | Código fuente del Frontend (React SPA). Sandbox cerrado. | Al implementar UI. |
| `apps/server/` | Código fuente del Backend (Express API). Sandbox cerrado. | Al implementar lógica de negocio. |

---

## 3. Reglas de Negocio Críticas de Maison CRM (Dominio Estética)

Todo subagente que altere código fuente debe respetar los siguientes invariantes del dominio:

### 3.1 Autenticación y Control de Acceso
* La autenticación se maneja exclusivamente via **Clerk** (Google OAuth + email/contraseña).
* Todo request a la API DEBE verificar que el `userId` de Clerk exista en la colección `admins` de MongoDB.
* Las contraseñas NUNCA se almacenan en la base de datos del sistema.

### 3.2 Gestión de Clientes
* Los clientes usan **soft delete** (`isActive: false`) para preservar integridad referencial del historial.
* El perfil del cliente incluye: nombre, apellido, teléfono, notas médicas e historial de visitas.

### 3.3 Catálogo de Servicios
* Cada servicio tiene un período de retoque configurable (`defaultTouchupDays`).
* El sistema calcula automáticamente la próxima fecha de retoque basada en la fecha del servicio.

### 3.4 Inventario y Stock
* Los productos tienen control de stock con validación de stock negativo.
* La carga masiva desde Excel/CSV usa `upsert` para evitar duplicados (mismo nombre + marca).
* El stock se descuenta automáticamente al registrar una visita que consume insumos.

### 3.5 Registro de Visitas y Retoques
* Al registrar una visita, se descuenta stock de los productos consumidos.
* El sistema genera automáticamente un "próximo retoque" pendiente.
* Al registrar una nueva visita del mismo cliente+servicio, el retoque anterior se auto-completa.

### 3.6 Dashboard
* Las estadísticas se calculan en tiempo real desde la base de datos.
* Los retoques próximos usan indicadores de urgencia: rojo (atrasado), naranja (próximo), verde (futuro).

### 3.7 Trifecta de Accesibilidad Visual (WCAG 2.1 AA)
* Ningún componente visual debe delegar la comunicación de un estado sensible únicamente a un código de color.
* Es obligatorio: **Color semántico + Icono descriptivo (react-icons/fi) + Texto descriptivo claro**.

### 3.8 Aislamiento Multi-Tenant (Fase 2+ — EP-08)
* Cada centro de estética es un tenant con datos completamente aislados. Todo modelo de negocio incluye `tenantId` (ObjectId, ref `Tenant`, required, indexado).
* **Todo query de la API filtra por el `tenantId` del usuario autenticado**, resuelto server-side desde `req.adminInfo` vía `checkTenantAccess`. Prohibido aceptar `tenantId` desde el body/query/params.
* Un `_id` de otro tenant retorna **404**, nunca 403. Regla canónica completa en [`docs/governance-rules.md#gov-tenant`](docs/governance-rules.md#gov-tenant--aislamiento-multi-tenant).

### 3.9 Agenda y Turnos (Fase 4 — EP-13+)
* Los turnos (`appointments`) se pintan por estado: **pendiente (gris), confirmado (verde), cancelado (rojo tachado)** (SRS §7.1 RF-038).
* La duración del turno se calcula según la duración configurada del servicio. El sistema alerta visualmente superposiciones del mismo profesional.
* Al completar un turno, se abre el flujo de registro de visita con campos pre-completados (cliente, servicio, fecha) — ver EP-15.

---

## 4. Reglas Duras (No Negociables)

* **Enfoque de Feature Única:** Jamás contamines el Diff de una sesión mezclando refactorizaciones de otra User Story.
* **Aislamiento de Sandbox:** El código de negocio vive exclusivamente en `apps/`. Un agente de Frontend no escribe en Backend y viceversa.
* **Autenticación Obligatoria:** Todos los endpoints de la API DEBEN estar autenticados (excepto health check).
* **Verificación Basada en Evidencia:** La validez de una tarea exige la generación de un archivo físico en disco (`progress/implements/impl_<id>.md`) acompañado del build exitoso.
* **Trifecta de Accesibilidad:** Todo componente que renderice estados críticos debe incluir: **Color + Icono + Texto**.

---

## 5. Cómo Elegir y Transicionar una Tarea

```
1. Abre feature_list.json y localiza las tareas con "status": "pending".
2. Toma la de menor índice cronológico (ej. EP-01 antes que EP-02).
3. Cambia el campo "status" a "in_progress" y guarda.
4. Inicializa el plan en progress/current.md (3-5 bullets técnicos).
5. Invoca al implementer inyectándole su Skills Digest correspondiente.
```

---

## 6. Cierre de Sesión Disciplinado

1. Ejecuta builds y garantiza Exit Code 0.
2. Asegúrate de que el `reviewer` haya escrito `progress/reviews/review_<id>.md` y cambiado la feature a `"done"`.
3. Vuelca el resumen al final de `progress/history.md` (append-only).
4. Limpia `progress/current.md` a su plantilla vacía.
5. Extrae lo reutilizable de los `impl_*.md` hacia `docs/patterns-*.md` y archiva las bitácoras de la feature cerrada en `progress/{implements,explores}/_archive/` con `git mv`.
6. Elimina logs de depuración y `console.log()` sueltos.

---

## 7. Si te Bloqueas (Escalado de Fallos)

* Si enfrentas ambigüedad de dominio, detén la codificación y solicita al `leader` que instancie un `explore`.
* Si una herramienta falla, **no improvises workarounds**. Describe el motivo en `progress/current.md` como `"blocked"` y devuelve el control al humano.
