# impl_SEC-01-frontend — Parchear vulnerabilidades Dependabot (apps/client)

## Alcance
Lado frontend de SEC-01 (`apps/client/`). No se tocó `apps/server/src/` ni ningún código de negocio — solo bumps de dependencias dentro de los rangos semver (`^`) ya declarados, más un ajuste puntual de `pnpm.overrides` en el `package.json` raíz para forzar una transitiva dev-only.

## Versiones antes / después

| Paquete | Tipo | Antes | Después | Objetivo | Cumple |
| --- | --- | --- | --- | --- | --- |
| `axios` | dependency | 1.17.0 (`^1.16.1`) | **1.19.0** (`^1.19.0`) | `>=1.18.0` | Sí |
| `react-router` | dependency | 7.17.0 (`^7.15.0`) | **7.18.2** (`^7.18.2`) | `>=7.18.2` | Sí |
| `vite` | devDependency | 8.0.16 (`^8.0.12`) | **8.2.2** (`^8.2.2`) | — (vehículo para postcss/nanoid) | — |
| `postcss` (transitivo vía vite) | transitivo | 8.5.15 | **8.5.26** | `>=8.5.23` | Sí |
| `nanoid` (transitivo vía vite>postcss) | transitivo | 3.3.12 | **3.3.18** | `>=3.3.18` | Sí |
| `eslint` | devDependency | 10.4.1 (`^10.3.0`) | **10.8.1** (`^10.8.1`) | — (vehículo para brace-expansion, no alcanzó solo) | — |
| `brace-expansion` (transitivo vía eslint>@eslint/config-array>minimatch) | transitivo dev-only | 5.0.6 | **5.0.9** | `>=5.0.9` | Sí (via override) |

Nota: `pnpm update axios react-router` y `pnpm update vite` reescribieron los rangos `^` en `apps/client/package.json` a las nuevas versiones mínimas resueltas (comportamiento normal de `pnpm update` sin `--latest`, no se usó `--latest` ni se instaló ninguna librería nueva).

## `pnpm.overrides` en el package.json raíz

Se agregó una sección nueva (no existía `pnpm.overrides` previamente, nada que fusionar en el momento de escribir):

```json
"pnpm": {
  "overrides": {
    "brace-expansion": ">=5.0.9"
  }
}
```

Motivo: `pnpm update eslint` subió eslint 10.4.1 → 10.8.1, pero `brace-expansion` seguía resuelto en 5.0.6 vía `@eslint/config-array@0.23.5 > minimatch@10.2.5` (una transitiva que eslint no controla directamente). Es dev-only y bajo riesgo — se optó por el override en vez de forzar una versión mayor de eslint fuera de su rango `^`.

`postcss`/`nanoid` **no** necesitaron override: `pnpm update vite` (dentro del rango `^8.0.12`) ya arrastró postcss 8.5.26 y nanoid 3.3.18, ambos por encima del mínimo pedido.

Verificado con `git diff apps/server/package.json` que el implementer backend (corriendo en paralelo) no había tocado `pnpm.overrides` en el momento de mi `pnpm install` — no hubo necesidad de fusionar claves. Si el backend agrega su propia sección después, deberá fusionar con la mía (`brace-expansion`) en vez de pisarla.

## Resultado de `pnpm audit` (desde la raíz, post-cambios)

8 vulnerabilidades restantes, **ninguna** corresponde a axios, react-router, postcss, nanoid ni brace-expansion (los 5 targets de este ticket ya no aparecen). Las que quedan son:
- `xlsx` (high, prototype pollution + ReDoS) — explícitamente fuera de alcance de SEC-01 por decisión de producto (SheetJS no publica fix en npm).
- `path-to-regexp`, `qs` (x2), `body-parser` (vía `apps/server > express`) — alcance del implementer backend, no tocado por mí.
- `mongoose` (vía `apps/server`) — alcance del implementer backend, no tocado por mí.

Ninguna vulnerabilidad de `apps/client` (fuera de `xlsx`, aceptado) permanece.

## Build y lint

```
pnpm --filter @estetica/client build
```
→ Exit 0. `tsc -b` sin errores de tipos (ningún breaking change de API entre react-router 7.15→7.18 afectó el código existente — no fue necesario tocar `apps/client/src/`). Salida de `vite build` normal, con el warning preexistente de chunk >500kB (no relacionado a este cambio).

```
pnpm --filter @estetica/client lint
```
→ Exit 0. 4 warnings (`react-hooks/incompatible-library`, "Compilation Skipped" del React Compiler por uso de `watch()` de react-hook-form en `ProfesionalModal.tsx`, `RegistroModal.tsx`, `Negocio.tsx`, `Turnos.tsx`) — **preexistentes**, no relacionados con los bumps de axios/react-router/vite/eslint (son sobre la interacción `react-hook-form` + React Compiler). 0 errores.

## Archivos modificados

- `C:\_dev\Cetzz\shear-system\apps\client\package.json` — bump de rangos `axios`, `react-router`, `eslint`, `vite`.
- `C:\_dev\Cetzz\shear-system\package.json` (raíz) — nueva sección `pnpm.overrides.brace-expansion` (única clave tocada, sin alterar scripts ni nada más).
- `C:\_dev\Cetzz\shear-system\pnpm-lock.yaml` — regenerado por `pnpm install`/`pnpm update`.

No se tocó ningún archivo dentro de `apps/client/src/` (no hizo falta corrección de compatibilidad post-bump) ni nada de `apps/server/`.

## Pendiente (fuera de mi sandbox)

- `xlsx` sigue en 0.18.5 sin tocar — documentar como riesgo aceptado en `CHANGELOG.md`/`docs/governance-rules.md` (criterio de aceptación transversal de SEC-01, no específico de frontend; queda a cargo de quien cierre la feature completa).
- Lado backend (mongoose, express/path-to-regexp/qs/body-parser) en curso por el implementer paralelo — no verificado por mí.
