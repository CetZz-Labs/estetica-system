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
| `docs/governance-rules.md` | Fuente canónica única de reglas de seguridad y gobernanza. | Al crear o modificar reglas transversales (auth, stock, accesibilidad). |
| `docs/migration-guides/` | Guías de migración para breaking changes de API. | Cuando se depreca o elimina un endpoint/campo. |
| `CHECKPOINTS.md` | Compuertas de calidad inmutables (Quality Gates). | Para autoevaluación del `implementer` y auditoría del `reviewer`. |
| `.claude/rules/backend.md` | Reglas de backend: Express, Mongoose, Clerk middleware. | Al operar dentro de `apps/server/`. |
| `.claude/rules/frontend.md` | Reglas de frontend: React, Vite, TanStack Query, Clerk. | Al operar dentro de `apps/client/`. |
| `.claude/agents/` | Definiciones de roles para subagentes. | Cuando actúas como orquestador. |
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
5. Elimina logs de depuración y `console.log()` sueltos.

---

## 7. Si te Bloqueas (Escalado de Fallos)

* Si enfrentas ambigüedad de dominio, detén la codificación y solicita al `leader` que instancie un `explore`.
* Si una herramienta falla, **no improvises workarounds**. Describe el motivo en `progress/current.md` como `"blocked"` y devuelve el control al humano.
