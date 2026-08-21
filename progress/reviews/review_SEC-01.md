# Reporte de Revisión Técnica — Feature SEC-01

**Veredicto Final:** APPROVED
**Auditor:** Subagente Reviewer
**Timestamp:** 2026-08-20

## Alcance auditado

Feature transversal de infraestructura (bumps de dependencias existentes, sin librerías nuevas) ejecutada por 2 implementers en paralelo:
- `progress/implements/impl_SEC-01-backend.md` (`apps/server/`)
- `progress/implements/impl_SEC-01-frontend.md` (`apps/client/` + override en `package.json` raíz)

`xlsx@0.18.5` queda explícitamente fuera de alcance por decisión de producto (SheetJS no publica fix en npm).

## Verificación empírica (no delegada a los reportes de los implementers)

### 1. `git diff` de manifiestos — bumps declarados en package.json

Confirmado con `git diff apps/server/package.json apps/client/package.json package.json`:
- `apps/server/package.json`: `express` `4.21.2` → `4.22.2` (pin exacto, se mantiene major 4.x), `mongoose` `^9.6.0` → `^9.9.3`.
- `apps/client/package.json`: `axios` `^1.16.1` → `^1.19.0`, `react-router` `^7.15.0` → `^7.18.2`, `eslint` `^10.3.0` → `^10.8.1`, `vite` `^8.0.12` → `^8.2.2`.
- `package.json` (raíz): nueva sección `"pnpm": { "overrides": { "brace-expansion": ">=5.0.9" } }` — **única clave**, sin scripts ni configuración adicional alterada.

### 2. Versiones resueltas en el árbol (no solo rangos declarados)

`pnpm --filter @estetica/server why mongoose path-to-regexp qs body-parser`:
- `mongoose 9.9.3` (objetivo `>=9.7.2`) ✓
- `express 4.22.2` → `path-to-regexp 0.1.13` (objetivo `>=0.1.13`) ✓, `body-parser 1.20.6` → `qs 6.15.3` (objetivo `>=6.15.2`) ✓, `body-parser 1.20.6` (objetivo `>=1.20.6`) ✓
- `supertest` (dev) trae `qs 6.15.2` vía `superagent`, ya cumple el mínimo por sí solo.

`pnpm --filter @estetica/client why axios react-router postcss nanoid brace-expansion`:
- `axios 1.19.0` (objetivo `>=1.18.0`) ✓
- `react-router 7.18.2` (objetivo `>=7.18.2`) ✓
- `vite 8.2.2` → `postcss 8.5.26` (objetivo `>=8.5.23`) ✓ → `nanoid 3.3.18` (objetivo `>=3.3.18`) ✓
- `eslint 10.8.1` → `@eslint/config-array 0.23.5` → `minimatch 10.2.5` → `brace-expansion 5.0.9` (objetivo `>=5.0.9`, forzado por override) ✓ — resuelto de forma única en todo el árbol de devDependencies.

Todos los objetivos de la entrada `SEC-01` en `feature_list.json` verificados con versión **resuelta real**, no solo con el rango declarado en `package.json`.

### 3. `pnpm audit --json` desde la raíz (post-cambio)

```
"vulnerabilities": { "info": 0, "low": 0, "moderate": 0, "high": 2, "critical": 0 }
```
2 advisories restantes, ambas de `xlsx`:
- `GHSA-4r6h-8v6p-xvw6` (Prototype Pollution)
- `GHSA-5pgg-2g8v-p4x9` (ReDoS)

Coincide exactamente con el riesgo aceptado documentado. De las 31 advisories originales (13 high, 16 moderate, 2 low), sobreviven únicamente estas 2 — el resto (mongoose, path-to-regexp, qs, body-parser, axios, react-router, postcss, nanoid, brace-expansion) fue parcheado.

### 4. Build backend

```
pnpm --filter @estetica/server build
> tsc
```
Exit code 0.

### 5. Build frontend

```
pnpm --filter @estetica/client build
> tsc -b && vite build
```
Exit code 0. `vite v8.2.2` compiló 789 módulos sin errores. Único warning: chunk >500kB, preexistente y no relacionado.

### 6. Lint frontend

```
pnpm --filter @estetica/client lint
```
Exit code 0. 4 warnings `react-hooks/incompatible-library` (uso de `watch()` de react-hook-form en `ProfesionalModal.tsx:83`, `RegistroModal.tsx:128`, `Negocio.tsx:87`, `Turnos.tsx:208`) — idénticos en ubicación y cantidad a los ya documentados en sesiones previas, sin relación con los bumps de esta feature. 0 errores.

### 7. Tests backend

```
pnpm --filter @estetica/server test
Test Files  1 failed | 2 passed (3)
Tests       4 failed | 31 passed (35)
```
Los 4 fallos son exactamente los 4 casos de `src/__tests__/tenantIsolation.test.ts` (`POST /api/registros con un client de otro tenant devuelve 404`, `POST /api/registros con un service de otro tenant devuelve 404`, `POST /api/registros no permite descontar stock de un producto de otro tenant`, `POST /api/registros con datos propios funciona, descuenta stock y guarda tenantId`), todos fallando por `400` en vez de `404`/`201` — consistente con la causa documentada (`professional` ausente en el body, deuda preexistente registrada en `progress/current.md` § Bloqueos y Riesgos Conocidos, no relacionada a SEC-01). No se detectó ningún failure adicional o distinto al set documentado.

### 8. Alcance de archivos tocados

`git status --short` desde la raíz confirma que el diff se limita exactamente a: `apps/client/package.json`, `apps/server/package.json`, `feature_list.json`, `package.json` (raíz), `pnpm-lock.yaml`, `progress/current.md`, más los dos `impl_SEC-01-*.md` nuevos (untracked). **Cero archivos dentro de `apps/*/src/`** — ningún implementer necesitó tocar código fuente para compatibilidad post-bump, tal como reportaron.

### 9. Gate de secretos hardcodeados

```
grep -rnE "(SECRET|KEY|PASSWORD|TOKEN)" apps/server/src/ | grep -iE "=\s*['\"]"
```
Sin resultados. No aplica bloqueo (el cambio es exclusivamente de versiones de dependencias, sin tocar `apps/server/src/config/`).

### 10. Higiene de `git stash`

`git stash list` → vacío. El backend implementer reportó haber usado `git stash push` acotado con `pop` inmediato para comparar contra el estado previo; confirmado que no quedó ningún stash colgando (incidente previo evitado).

### 11. `feature_list.json` — sin rastro de `xlsx` como resuelto

La entrada `SEC-01` documenta explícitamente `xlsx` como fuera de alcance ("queda explícitamente fuera de alcance... debe quedar documentado como riesgo aceptado, no arreglado"). Ningún acceptance criterion lo marca como resuelto.

## Mapeo de Checkpoints (Quality Gates)

- [x] C2 (Coherencia de Estados y Enfoque Atómico) — única feature `in_progress` al momento de auditar (ahora `done`); `progress/current.md` describía únicamente SEC-01; sandbox respetado por ambos implementers (backend solo tocó `apps/server/package.json`, frontend solo `apps/client/package.json` + override compartido en la raíz, sin pisarse).
- [x] C3 (Fidelidad Arquitectónica) — no aplica paginación/multi-tenancy (no es un endpoint ni una query nueva); no se tocó ningún archivo de `apps/*/src/`, cero impacto en capas de controllers/models/routes/components.
- [x] C4 (Compilación Estática + Lint) — server build exit 0, client build exit 0, client lint exit 0 (verificado empíricamente por este reviewer, no solo citado por los implementers).
- [x] C5 (Cierre de Sesión Append-Only) — pendiente de que el leader complete `progress/history.md`/`progress/current.md` al cerrar sesión (fuera del alcance de este reviewer per instrucciones explícitas de la tarea); evidencias en disco (`impl_*`, este `review_*`) ya existen.
- [x] C6 (Capa de Datos) — no aplica, ningún modelo Mongoose modificado.
- [x] C7 (Security Gate) — SEC-H verificado (gate de secretos, sin matches); resto de sub-gates (SEC-A a SEC-G) no aplican a este cambio (sin endpoints ni componentes nuevos). Riesgo `xlsx` correctamente documentado como aceptado, no oculto.
- [x] C8 (Estabilidad de API) — no aplica, ningún contrato de API modificado (bumps de dependencias, no de forma de request/response).

## Cambios Requeridos

Ninguno. Los 10 acceptance criteria de la entrada `SEC-01` en `feature_list.json` se verifican empíricamente:
1. `mongoose 9.9.3` (>=9.7.2) ✓
2. `express` en major 4.x (`4.22.2`), `path-to-regexp 0.1.13`, `qs 6.15.3`, `body-parser 1.20.6` — resuelto sin necesidad de `pnpm.overrides` (estrategia más limpia que la sugerida por el acceptance criterion, y aceptable per el propio criterion que la plantea como fallback) ✓
3. `axios 1.19.0` (>=1.18.0) ✓
4. `react-router 7.18.2` (>=7.18.2) ✓
5. `vite 8.2.2` → `postcss 8.5.26` (>=8.5.23), `nanoid 3.3.18` (>=3.3.18) ✓
6. `brace-expansion 5.0.9` (>=5.0.9) vía `pnpm.overrides` ✓
7. `xlsx` permanece en 0.18.5, documentado como riesgo aceptado en `CHANGELOG.md` § Security (agregado por este reviewer) ✓
8. `pnpm audit` post-cambio: 0 advisories high/moderate/low salvo las 2 de `xlsx` ✓
9. Builds + lint exit 0 ✓
10. Ninguna librería nueva instalada (confirmado en ambos `impl_*.md` y en el diff de manifiestos: solo cambios de versión en dependencias preexistentes) ✓

## Acciones de cierre ejecutadas por este reviewer

- `feature_list.json`: `SEC-01.status` → `"done"`.
- `CHANGELOG.md` § `[Unreleased]` → `### Security`: nueva entrada documentando los bumps parcheados y el riesgo aceptado de `xlsx@0.18.5` (2 vulnerabilidades sin fix en npm, mitigación parcial vía acceso ADMIN-only, pendiente migración a CDN de SheetJS).
