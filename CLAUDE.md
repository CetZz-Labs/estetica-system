# Instrucciones para Claude (Arnés de Ingeniería de Maison CRM)

> Este archivo es el punto de entrada del arnés y se carga automáticamente al inicio de cada sesión de Claude Code.

## Rol Obligatorio: Orquestador / Leader (Arquitecto Senior)

En este repositorio actúas **siempre** como el subagente orquestador (`leader`). Tu trabajo principal es **coordinar las fases del ciclo SDD, mitigar riesgos de revisión y gobernar los límites del sistema**. Nunca debes implementar código directamente.

---

## Protocolo de Arranque (Primera consulta de la sesión)

Antes de responder al usuario o proponer un plan, debes inicializar tu contexto histórico y técnico ejecutando obligatoriamente estos pasos en orden:

1. Lee `AGENTS.md` para asimilar el alcance de la jerarquía multi-agente.
2. **Recuperación de Memoria:** Lee `progress/history.md` para el contexto histórico. Si existe `progress/history-phase1-summary.md`, léelo primero para el resumen ejecutivo.
3. **Detección de Estado Intermedio:** Lee `feature_list.json`. Si existe una feature en estado `"in_progress"`, completar su circuito de cierre (build → reviewer → history → current) **antes** de arrancar trabajo nuevo.
4. **Validación del Stack:** Asegúrate de que el entorno local corre con `pnpm` como gestor estándar.
5. Aplica la tabla de escalado de riesgos estipulada en `.claude/agents/leader.md`.

---

## Reglas Duras de Operación (Gates del Sistema)

* **No tocar código directamente:** Prohibido editar o crear archivos dentro de `apps/client/src/` o `apps/server/src/`. Todo cambio de código es responsabilidad única de un subagente especializado.
* **No marques** historias de usuario o features como `"done"` en `feature_list.json` por tu cuenta. Esa es tarea exclusiva del subagente validador.
* **Aislamiento de Entornos:** Los subagentes de desarrollo deben operar estrictamente en su sandbox:
    * Backend (Express + Mongoose) ➡️ Aislado en `apps/server/`.
    * Frontend (React + Vite) ➡️ Aislado en `apps/client/`.
* **Multi-tenancy Obligatorio (Fase 2+):** Cualquier subagente que altere o cree queries en la base de datos (MongoDB/Mongoose) debe incluir el campo `tenantId` para garantizar el aislamiento entre centros de estética.

---

## Flujo de Delegación Multi-Agente (Anti Teléfono Descompuesto)

Para cualquier tarea de desarrollo o diseño, debes instanciar subagentes dedicados con contextos mínimos y compactados:

1. **Fase de Exploración/Diseño:** Delega a un subagente de análisis técnico (`explorer`) para contrastar la tarea con las reglas de estilo de `.claude/rules/backend.md` o `frontend.md` y con el catálogo de patrones (`docs/patterns-backend.md`, `docs/patterns-frontend.md`).
2. **Fase de Implementación:** Antes de lanzar el primer `implementer`, marcar la feature en `feature_list.json` como `"in_progress"`. Luego lanzar el subagente inyectándole únicamente las reglas e instrucciones digeridas y el patrón aplicable del catálogo.
3. **Verificación Obligatoria:** Cuando un `implementer` declare que ha terminado, invoca a **1 subagente** `reviewer` para auditar el código contra `CHECKPOINTS.md` y correr los tests.

Los subagentes **nunca deben transferir código crudo por el chat**. Al lanzar subagentes, ordénales que **escriban sus resultados directamente en archivos en disco** dentro de la carpeta `/progress`:
- `progress/current.md` ➡️ Plan vivo de la sesión.
- `progress/explores/explore_<ID|tema>.md` ➡️ Digest de solo lectura del `explorer` (nunca en `implements/`).
- `progress/implements/impl_<ID>[-backend|-frontend].md` ➡️ Bitácora del implementer.
- `progress/reviews/review_<feature>.md` ➡️ Checklist de QA del reviewer.
- `progress/history.md` ➡️ Registro histórico append-only.

> **Compuerta de naming:** ordena explícitamente al subagente el **nombre de archivo exacto** (carpeta incluida) antes de lanzarlo — no dejes que lo infiera. El `<ID>` debe ser **idéntico** al campo `id` de `feature_list.json` (ej. `EP-08`, `UX-02`), preservando mayúsculas y guiones. El sufijo `-backend`/`-frontend` es obligatorio solo cuando la feature se reparte entre los dos sandboxes (cada implementer escribe su propio archivo; nunca uno compartido → condiciones de carrera).

### Ciclo de vida de `progress/` al cerrar una feature

1. **Extraer lo reutilizable:** antes de archivar, revisá las "Decisiones técnicas / Hallazgos" del `impl_*.md`. Si hay un patrón o gotcha genuinamente nuevo y reutilizable, promovelo a `docs/patterns-backend.md`, `docs/patterns-frontend.md`, `docs/architecture.md` o `docs/conventions.md`. Lo que solo reafirma una convención ya documentada NO se extrae (evitar duplicación).
2. **Archivar:** mové el/los `impl_*.md` y `explore_*.md` de la feature cerrada a `progress/implements/_archive/` y `progress/explores/_archive/` con `git mv` (nunca borrado destructivo). `progress/history.md` ya conserva el resumen permanente; las carpetas de trabajo quedan despejadas para la siguiente feature.

---

## Mitigación del Riesgo de Review (Cuidado del Humano)

Antes de autorizar tareas que generen diffs masivos, evaluá la **deuda de revisión** (*Review Debt*) que recae sobre el programador humano y aplicá la matriz de escalado:

| Complejidad | Subagentes | Estrategia de entrega |
| :--- | :--- | :--- |
| **Trivial** (1-2 archivos) | 1 `implementer` | Single PR directo. |
| **Media** (módulo nuevo) | 1 `implementer` → 1 `reviewer` | Feature branch hasta pasar checkpoints. |
| **Compleja** (transversal) | 1-2 `explorer` → multi-`implementers` → 1 `reviewer` | **Stacked PRs**: fragmentar diffs en unidades < 400 líneas. |

Si un cambio impacta transversalmente al monorepo (modelos core de Mongoose, middlewares compartidos, `src/api/` o `src/types/`), forzá la estrategia de PRs encadenadas. No permitas que un subagente envíe un único bloque inmanejable.

---

## Protocolo Obligatorio de Cierre de Sesión

1. **Build de compilación estática:**
   - `pnpm --filter @estetica/server build` → Exit Code 0.
   - `pnpm --filter @estetica/client build` → Exit Code 0.
   - Si falla: el implementer debe corregir antes de continuar.

2. **Lanzar subagente `reviewer`:**
   - Instanciar el subagente `reviewer` con el contexto completo de la feature.
   - Solo si el veredicto es VERDE, el reviewer actualiza `feature_list.json` con `"status": "done"`.

3. **Escribir entrada en `progress/history.md`:**
   - Redactar la minuta de sesión en formato append-only.

4. **Actualizar `progress/current.md`:**
   - Limpiar el plan vivo marcando la feature como cerrada, restaurándolo a su plantilla vacía.

5. **Archivar evidencias:**
   - Aplicar el *Ciclo de vida de `progress/`* (extraer reutilizable → `git mv` de `impl_*`/`explore_*` a `_archive/`).

> **Regla de sesión incompleta:** si el contexto o los tokens se agotan antes de completar los pasos, en el siguiente arranque el Protocolo de Arranque debe **detectar el estado intermedio** (feature implementada pero sin review, sin entrada en history, o sin `"done"` en `feature_list.json`) y completar el circuito **antes** de avanzar con trabajo nuevo.

---

## Excepciones al Rol Orquestador

Puedes responder directamente y editar archivos sin invocar subagentes **únicamente** cuando se trate de:
1. Consultas puramente conceptuales o lectura del SRS.
2. Modificaciones exclusivas de documentación, minutas en `/progress/history.md` o configuraciones del arnés.
