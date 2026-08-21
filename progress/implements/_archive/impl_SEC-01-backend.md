# impl_SEC-01-backend.md — Parchear vulnerabilidades Dependabot (backend)

## Alcance
Solo `apps/server/`. Bumps de dependencias EXISTENTES (ninguna librería nueva instalada). No se tocó `apps/client/` (a cargo de otro implementer — ver `progress/implements/impl_SEC-01-frontend.md`).

## Archivos modificados
- `apps/server/package.json` — versiones de `express` y `mongoose` actualizadas.
- `pnpm-lock.yaml` (raíz) — regenerado por `pnpm update` con las nuevas resoluciones.
- Root `package.json` — **NO tocado** por este implementer. No hizo falta `pnpm.overrides` para las 4 vulnerabilidades del backend (ver estrategia abajo). El bloque `pnpm.overrides` con `brace-expansion` presente en el árbol actual pertenece al implementer de frontend (fuera de mi alcance).

## Estrategia aplicada

1. **mongoose:** el rango existente en `package.json` ya era `^9.6.0` (permite hasta <10.0.0). Corrí `pnpm --filter @estetica/server update mongoose`, que resolvió la última versión disponible dentro del rango. `pnpm` reescribió automáticamente el rango en `package.json` a `^9.9.3` (comportamiento estándar de `pnpm update`, no fue una edición manual).
2. **express / path-to-regexp / qs / body-parser:** antes de recurrir a `pnpm.overrides`, investigué si una versión más nueva de express 4.x (sin saltar a 5.x) ya declaraba rangos de sus transitivas que absorbieran las versiones parcheadas:
   - `express@4.22.2` (última 4.x publicada) declara `path-to-regexp: ~0.1.12` (incluye 0.1.13), `body-parser: ~1.20.5` (incluye 1.20.6) y `qs: ~6.15.1` (incluye 6.15.2/6.15.3).
   - Edité `apps/server/package.json`: `"express": "4.21.2"` → `"express": "4.22.2"` (se mantiene el pin exacto sin caret, igual que antes).
   - Corrí `pnpm --filter @estetica/server update mongoose express`, que resolvió todo el árbol de una sola vez.
   - **No hizo falta tocar `pnpm.overrides` en el root `package.json`** — el bump de `express` fue suficiente para arrastrar las 3 transitivas a versiones parcheadas.

## Versiones antes → después

| Paquete | Antes | Después | Requisito | Cumple |
|---|---|---|---|---|
| `mongoose` | 9.7.0 (rango `^9.6.0`) | **9.9.3** (rango `^9.9.3`) | `>=9.7.2` (GHSA-664h-wqgq-64gw) | ✅ |
| `express` | 4.21.2 | **4.22.2** | major 4.x preservado | ✅ |
| `path-to-regexp` (transitivo de express) | 0.1.12 | **0.1.13** | `>=0.1.13` (GHSA-37ch-88jc-xwx2) | ✅ |
| `qs` (transitivo de express/body-parser) | 6.13.0 | **6.15.3** | `>=6.15.2` (GHSA-6rw7-vpxm-498p, GHSA-q8mj-m7cp-5q26, GHSA-w7fw-mjwx-w883) | ✅ |
| `body-parser` (transitivo de express) | 1.20.3 | **1.20.6** | `>=1.20.6` (GHSA-v422-hmwv-36x6) | ✅ |

Confirmado con `pnpm --filter @estetica/server why path-to-regexp qs body-parser` post-update: los 3 paquetes resuelven a una única versión en todo el árbol (`express` y `@clerk/express` comparten la misma resolución), sin necesidad de overrides.

Nota: `supertest` (devDependency) trae su propio `qs@6.15.2` vía `superagent` — ya cumple el requisito por sí solo, no requirió cambios.

## `pnpm audit` (post-cambio, desde la raíz del repo)

```
2 vulnerabilities found
Severity: 2 high
```

Ambas restantes son **`xlsx` (SheetJS)** — `GHSA-4r6h-8v6p-xvw6` y `GHSA-5pgg-2g8v-p4x9`, exclusivas de `apps/client`, sin fix publicado en npm, expresamente fuera de alcance de SEC-01 (riesgo aceptado, documentado en el acceptance criteria de la feature). No corresponden a `apps/server`.

Ninguna de las 4 vulnerabilidades objetivo (mongoose, path-to-regexp, qs, body-parser) aparece en el reporte.

## Build

```
pnpm --filter @estetica/server build
> tsc
```
Exit code 0, sin errores de tipos. El bump de mongoose 9.7.0 → 9.9.3 no introdujo cambios de tipos que rompieran el build — no fue necesario tocar código fuente en `apps/server/src/`.

## Tests

```
pnpm --filter @estetica/server test
Test Files  1 failed | 2 passed (3)
Tests       4 failed | 31 passed (35)
```

Los 4 tests que fallan son los ya documentados como deuda preexistente en `progress/current.md` (`src/__tests__/tenantIsolation.test.ts`, `POST /api/registros` sin `professional` en el body — no relacionado a este cambio). Verificación de que no son regresiones nuevas: corrí un `git stash` acotado (con `git stash pop` inmediato al terminar, `git stash list` confirmado vacío después) sobre el estado previo a mis cambios y el resultado fue idéntico: **4 failed / 31 passed**, mismos 4 tests. No se rompió ningún test que antes pasara.

## Decisiones técnicas / hallazgos
- No fue necesario usar `pnpm.overrides` en el `package.json` raíz para el lado backend: la solución más limpia fue bumpear `express` dentro de la misma major (4.21.2 → 4.22.2), que ya trae declarados rangos semver más nuevos para sus 3 transitivas vulnerables. Evita el riesgo de mantenimiento de un override permanente.
- `pnpm update` reescribe automáticamente el rango caret en `package.json` al resolver (`^9.6.0` → `^9.9.3` para mongoose); no fue una decisión manual de fijar esa versión exacta, es el comportamiento estándar de la herramienta.
- No se tocó ningún archivo dentro de `apps/server/src/` — el bump no generó incompatibilidades de tipos ni de comportamiento detectables por build/tests.

## Estado
No se modificó `feature_list.json` (sigue en `"in_progress"`, tarea del reviewer cerrarla a `"done"` una vez auditados también los criterios de frontend).
