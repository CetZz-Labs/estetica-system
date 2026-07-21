# Reporte de Revisión Técnica — Feature UX-31

**Veredicto Final:** APPROVED
**Auditor:** Subagente Reviewer
**Timestamp:** 2026-07-20

## Alcance auditado

`apps/client/src/index.css` (269 líneas, +145/-126) y `apps/client/index.html` (1 línea). Confirmado
con `git status --porcelain apps/client` / `git diff --stat apps/client` que **ningún otro archivo**
del sandbox frontend fue tocado. Fuera de `apps/client/`, el diff de esta sesión toca únicamente
artefactos de orquestación (`feature_list.json`, `progress/current.md`,
`progress/implements/impl_UX-31.md`, `progress/plan_shear-redesign.md`) — no código de producto. La
modificación preexistente de `docs/design.md` reportada en el `git status` inicial de la sesión es
anterior a esta feature y no forma parte de su diff.

## Mapeo de Checkpoints (Quality Gates)

- [x] **C2 (Coherencia de Estados y Enfoque Atómico)** — única feature `in_progress` en
  `feature_list.json`; `progress/current.md` referencia correctamente UX-31 como feature en curso;
  `impl_UX-31.md` presente en disco.
- [x] **C3 (Fidelidad Arquitectónica — Frontend/Sistema de Diseño)** — ver detalle de tokens abajo.
  N/A paginación y multi-tenancy (no aplica a CSS/HTML puro).
- [x] **C4 (Compilación Estática + Lint)** — verificado empíricamente por mí, no solo por el reporte
  del implementer:
  - `pnpm --filter @estetica/client build` → **Exit Code 0** (`tsc -b && vite build`, sin errores;
    `dist/assets/index-CaGa2cLB.css` 73.65 kB, único warning preexistente de tamaño de chunk JS no
    relacionado a esta feature).
  - `pnpm --filter @estetica/client lint` → Exit Code 1 con **6 errores + 4 warnings**, los mismos
    exactos que documenta `impl_UX-31.md`, todos en archivos `.tsx` no tocados por esta feature:
    `ProductoModal.tsx:37` (`stock` unused, deuda ya en `progress/current.md`), `react-bits/Aurora.tsx`
    (`refs`/`prefer-const`), `react-bits/SplitText.tsx` (`set-state-in-effect`),
    `react-bits/TextType.tsx` (`refs`), `AceptarInvitacion.tsx:64` (`rules-of-hooks` con `useIsDark`,
    bug preexistente que UX-32 resuelve al borrar el hook), `Negocio.tsx:83` y `Turnos.tsx:208`
    (warnings `react-hooks/incompatible-library` por `watch()` de react-hook-form). Cero errores
    nuevos atribuibles a `index.css`/`index.html` (ESLint no evalúa CSS). Regresión: **ninguna**.
- [x] **C5 (Cierre de Sesión Append-Only)** — `impl_UX-31.md` en disco con detalle completo. Pendiente
  de mi parte: marcar `"done"` en `feature_list.json` y dejar registrada la entrada en
  `progress/history.md` (tarea del leader tras este veredicto, según protocolo de cierre).
- [x] **C6 (Capa de Datos)** — N/A, feature 100% frontend (CSS/HTML), sin modelos Mongoose.
- [x] **C7 (Security Gate)** — N/A, no hay lógica de backend/autenticación/queries en esta feature.
  Verificado igualmente que no se tocó ningún archivo bajo `apps/server/` (gate de variables
  sensibles no aplica: cero archivos de configuración de entorno en el diff).
- [x] **C8 (Estabilidad de API)** — N/A, no hay contrato de API involucrado (solo estilos base).

## Auditoría de fidelidad contra `docs/design.md`

1. **Fuentes (§3):** `index.css:1` y `index.html:10` cargan exactamente
   `Cormorant+Garamond:ital,wght@0,500;0,600;0,700&family=Figtree:wght@400;500;600;700` — coincide
   carácter por carácter con el `<link>` de `design.md §3`. `Fraunces`/`Manrope` eliminados sin
   residuo (confirmado por lectura completa del archivo).
2. **Tokens `:root` (§2, §14):** los 27 tokens de `index.css:12-55` coinciden en hex exacto con
   `design.md §2.1/§2.2/§2.3/§2.4` y `§14`: `--bg:#FAF6F4`, `--surface:#FFFFFF`,
   `--surface-2:#FDFAFB`, `--border:#F0E4E4`, `--border-soft:#F7EFF1`, `--dotted:#E7D8DC`,
   `--text:#3E2A33`, `--text-2:#5C4650`, `--text-3:#7A666E`, `--muted:#A08D95`,
   `--placeholder:#B9A6AD`, `--accent:#B76E84`, `--accent-rose:#D98BA4`, `--wine:#6B3444`,
   `--sage:#8C9178`, `--gold:#C89A5B`, `--rose-bg:#F7E7EC`, `--sage-bg:#EEF0E6`,
   `--gold-bg:#F6EFE3`, `--wine-bg:#EFE3E8`, `--alert-bg:#F9E8E2`, `--sage-text:#71774F`,
   `--gold-text:#A87C3F`, `--alert-text:#B0553F`, `--rose-text:#B76E84`, `--accent-tint:#E3B9C6`
   (verificado contra el valor rgb citado en §7.5 `rgba(227,185,198,.45)` → hex correcto),
   `--hover-soft:#FAF3F5` (citado en §7.1 y §7.13), radios `--r-card:14px`/`--r-ctrl:10px`/
   `--r-pill:99px`. Sin desvíos de valor.
3. **`@theme inline` (index.css:58-137):** genera las clases con nombres literales exigidos
   (`bg-bg`, `bg-surface`, `text-text`, `bg-wine`/`text-wine`, `bg-accent-rose`, `bg-rose-bg`,
   `bg-sage-bg`, `bg-gold-bg`, `bg-wine-bg`, `bg-alert-bg`, pares `-text` de badge, etc.) y remapea
   `--font-serif`/`--font-sans` a Cormorant Garamond/Figtree — las ~64 clases `font-serif`/
   `font-sans` existentes heredan el cambio sin tocarse, tal como exige la AC de `feature_list.json`.
4. **Prohibiciones de `design.md` ("❌ Qué NO hacer"):** confirmado con grep sobre el archivo
   completo (`\.dark|shadow-sm|shadow-md|shadow-lg|shadow-xl|pageIn|animate-page-in|oklch`) → **cero
   coincidencias** salvo la línea 8 (`@custom-variant dark`, ver punto 5). Bloque `.dark` (35 líneas
   oklch), escala `--shadow-sm..xl` y keyframe `pageIn`/`.animate-page-in` eliminados por completo,
   sin alias residual.
5. **`@custom-variant dark` (index.css:5-8):** se mantuvo, documentado inline con un comentario que
   explica el motivo y referencia a UX-32 como responsable de removerla. Evalúo esto como una
   excepción razonable y no un descuido: `ThemeToggle.tsx`/`useIsDark.ts` siguen montados en
   `Landing.tsx`/`AceptarInvitacion.tsx` hasta la Etapa 2 (UX-32, ya en `pending` en
   `feature_list.json`), y ambos dependen de la variante **basada en clase** (`.dark` en `<html>`),
   no en `prefers-color-scheme`. Quitar la línea ahora habría degradado silenciosamente el toggle
   (el build seguiría verde, pero `dark:` pasaría a regirse por preferencia de SO en vez del toggle
   manual) — una regresión no detectable por `tsc`/`vite build`/`eslint`. Nota de transparencia: la
   AC literal de `feature_list.json` para UX-31 dice "se elimina por completo... `@custom-variant
   dark`"; el implementer se desvió de esa AC textual con una justificación técnica explícita y
   acotada a un plazo concreto (UX-32, ya agendada). No lo considero bloqueante, pero **debe quedar
   verificado como parte del cierre de UX-32** que la línea se elimina efectivamente (criterio de
   aceptación de UX-32 en `feature_list.json` ya lo exige indirectamente vía
   `grep -r "useIsDark|ThemeToggle"`, aunque convendría agregar explícitamente el grep de
   `@custom-variant dark` a esa verificación).
6. **Alias-puente temporales (`index.css:99-136`):** presentes y documentados con comentario que
   referencia a UX-35 como responsable de su remoción (`--color-primary`, `--color-card`,
   `--color-foreground`, `--color-background`, `--color-muted-foreground`, `--color-border`,
   `--color-secondary`, set `--color-sidebar*`, y mapeos seguros para `destructive`/`warning`/`ring`
   con uso residual detectado). Confirmado que **no existen** entradas duplicadas conflictivas de
   `--color-accent`/`--color-muted` con la semántica vieja — la resolución de conflicto documentada
   en `impl_UX-31.md` (priorizar semántica Shear nueva) es consistente con el mandato explícito de la
   consigna para `accent`, y una extensión razonable y bien documentada para el caso análogo no
   anticipado de `muted` (impacto visual conocido y acotado a skeletons `animate-pulse bg-muted`,
   correctamente escalado como riesgo para UX-32/33 en la sección "Deuda / riesgos" de
   `impl_UX-31.md`).
7. **Base styles (§14):** las 4 reglas (`a`, `a:hover`, `input::placeholder`, `input:focus`) presentes
   en `@layer base` (`index.css:147-160`) con los valores correctos (`var(--accent)`, `var(--wine)`,
   `var(--placeholder)` = `#B9A6AD`, `var(--accent-rose)`). Scrollbar global (`index.css:177-184`)
   coincide con `§14` (`8px`/`8px`, thumb `var(--dotted)`, radio `8px`). `.custom-scrollbar` legado
   remapeado a tokens nuevos (`var(--border)`/`var(--dotted)` en vez del hex viejo `#ead9cf`).

## Higiene transversal (C3)

- Sin `console.log`/`debugger`/`TODO`/`FIXME` en ninguno de los 2 archivos (grep confirmado, 0
  resultados).
- Comentarios inline de excepción/alias son trazables a features concretas (UX-32, UX-35), no
  comentarios vagos.

## Conclusión

Los dos archivos tocados cumplen la fundación de tokens/fuentes exigida por `docs/design.md` con
fidelidad exacta de valores hex, sin introducir regresiones de build/lint, y con las excepciones
temporales (alias-puente, `@custom-variant dark`) correctamente documentadas y acotadas a etapas
futuras ya planificadas. Apruebo el cierre de UX-31.

**Siguiente feature a activar:** `UX-32` (Shell: AppLayout + topbar + fin del modo oscuro), que
permanece en `"pending"` — su activación (`"in_progress"`) es responsabilidad del leader, no de este
reviewer.

## Acción tomada sobre `feature_list.json`

Actualizado el campo `"status"` de la feature `UX-31` de `"in_progress"` a `"done"`. No se tocó el
`"status"` de ninguna otra feature (UX-32 permanece `"pending"`).
