# Reporte de Revisión Técnica — Feature UX-37

**Veredicto Final:** APPROVED
**Auditor:** Subagente Reviewer
**Timestamp:** 2026-07-21

## Alcance auditado

`UX-37` — Rediseño Shear Fase 2 (Landing pública), implementada en 4 sub-lotes secuenciales
(`impl_UX-37-A.md`..`impl_UX-37-D.md`) sobre el único archivo de contenido
`apps/client/src/views/Landing.tsx`, más el borrado completo de
`apps/client/src/components/react-bits/` (19 archivos / 11 carpetas) y la remoción de 4
dependencias (`motion`, `gsap`, `@gsap/react`, `ogl`) de `apps/client/package.json` +
`pnpm-lock.yaml` (sub-lote D).

`git status --short` confirma el alcance exacto: `Landing.tsx` modificado, `components/react-bits/`
eliminado íntegramente, `apps/client/package.json` y `pnpm-lock.yaml` con las 4 deps removidas.
El resto de archivos modificados en el working tree (`AjusteStockModal.tsx`,
`AppointmentDetail.tsx`, `CargaMasivaClientesModal.tsx`, `CargaMasivaModal.tsx`,
`ClienteModal.tsx`, `ProductoModal.tsx`, `ui/ConfirmModal.tsx`, `ui/Modal.tsx`,
`ui/Pagination.tsx`, `ThemeToggle.tsx`/`useIsDark.ts` (borrados), `index.css`, `AppLayout.tsx`,
`appointmentStatus.tsx`, `AceptarInvitacion.tsx`, `Clients.tsx`, `Dashboard.tsx`, `Historial.tsx`,
`Inventario.tsx`, `Servicios.tsx`, `docs/design.md`, `docs/patterns-frontend.md`) corresponden a
la línea base ya aprobada de UX-31/UX-32/UX-33/UX-36 (`status: done` en `feature_list.json`,
bitácoras `review_UX-31.md`/`review_UX-32.md`/`review_UX-33.md`/`review_UX-36.md` ya en disco) —
no se auditaron, conforme a la consigna. Se verificó puntualmente que el diff de
`AceptarInvitacion.tsx` es exclusivamente la remoción de `ThemeToggle`/`useIsDark` (scope de
UX-32), confirmando que UX-37 no lo tocó.

## Verificaciones empíricas

- `grep -rn "react-bits" apps/client/src` → 0 resultados.
- `grep -rnE "from ['\"](motion|motion/react|gsap|gsap/[a-zA-Z]+|@gsap/react|ogl)['\"]" apps/client/src` → 0 resultados.
- `grep -n "motion|gsap|ogl" apps/client/package.json` → 0 resultados (las 4 deps ya no figuran).
- `grep -nE "bg-background|bg-card|text-foreground|text-muted-foreground|bg-primary|bg-muted|shadow-|hover:-translate|whileHover|hover:scale|animate-ping|bg-gradient-to|from-primary|from-background|from-card|border-ring|bg-ring" apps/client/src/views/Landing.tsx` → 0 resultados. Cero tokens legacy, cero sombras decorativas, cero lift/scale, cero gradientes, cero `animate-ping`.
- `grep -n "translate\|scale-\|group-hover" apps/client/src/views/Landing.tsx` → 0 resultados (confirma retiro del micro-lift del ícono de flecha documentado en `impl_UX-37-A.md`).
- `grep -n "console\.|debugger|TODO" apps/client/src/views/Landing.tsx` → 0 resultados.
- Tokens usados en `Landing.tsx` que no están en la tabla explícita de `docs/design.md` (`bg-alert-text`, `bg-gold-text`/`text-gold-text`, `bg-hover-soft`, `var(--color-accent-tint)`) están todos definidos en `apps/client/src/index.css` (`--alert-text`, `--gold-text`, `--hover-soft`, `--accent-tint` + sus mapeos `@theme`), heredados de UX-31/33 — no son tokens inventados por UX-37.
- `git diff -- apps/client/src/views/Landing.tsx`: confirmado que el array `features` (títulos, descripciones, `featured`/`stat`) y el array `steps` no tienen líneas `+`/`-` propias (solo contexto sin cambios) — el copy/orden de las 6 features y los 3 pasos se preservó exacto, tal como declara `impl_UX-37-B.md`. Coincide con el inventario de `explore_UX-37.md` (6 features, mismo orden).
- Rutas/navegación: `Link to="/login"`, `Link to="/registro"`, anchors `#funcionalidades`/`#como-funciona`, guard de auth (`useAuth`, `isLoaded`, `Navigate to="/dashboard"` si `userId`) preservados sin alteración funcional — coincide con el riesgo documentado en `explore_UX-37.md` § Riesgos punto 1.
- Botones: todo `<button>`/`<Link>`/`<a>` de acción usa `rounded-ctrl` (10px), patrón primario `bg-accent hover:opacity-90 text-white` / secundario `bg-surface border-[var(--dotted)] hover:bg-hover-soft text-wine` conforme a §7.2. Los únicos `rounded-full` restantes son avatares/dots/badges/pill del mockup y de los chips de eyebrow (`rounded-pill`), no botones — uso correcto según §5 (avatar 50%, pill/badge 99px).
- HTML semántico: navegación via `<Link>`/`<a href>`, acciones via `<button type="button">` con `cursor-pointer`. El único `<div onClick>` restante (línea 157, backdrop del menú mobile) es código preexistente sin tocar por esta feature (confirmado sin `+`/`-` en el diff de esa línea) — no introducido por UX-37, no forma parte del scope auditado.
- Bloque `wine` único por vista: solo el CTA final usa `bg-wine` (§1.3/§7.5); botón invertido `bg-white text-wine` da máximo contraste sobre `#6B3444` (documentado en `impl_UX-37-C.md`, punto 6) — juicio visual razonable, AA cumplido claramente al ser blanco puro sobre wine oscuro; el botón secundario `border-white/30 text-white` también cumple contraste AA sobre el mismo fondo.

## Builds

```
pnpm --filter @estetica/server build   → Exit 0
pnpm --filter @estetica/client build   → Exit 0 (tsc -b && vite build, 304 módulos, sin errores)
pnpm --filter @estetica/client lint    → Exit 0 (0 errores, 4 warnings preexistentes
                                          react-hooks/incompatible-library en ProfesionalModal.tsx,
                                          RegistroModal.tsx, Negocio.tsx, Turnos.tsx — ninguno
                                          relacionado a Landing.tsx ni a react-bits/, confirmado
                                          por lectura directa de la salida, no solo por lo
                                          declarado en impl_UX-37-D.md)
```

## Mapeo de Checkpoints (Quality Gates)

- [x] C2 (Coherencia de Estados y Enfoque Atómico) — feature única `in_progress`, sandbox
  hermético (solo `Landing.tsx` + `react-bits/` + `package.json`/`pnpm-lock.yaml`), 4 bitácoras
  `impl_UX-37-{A..D}.md` en disco.
- [x] C3 (Fidelidad Arquitectónica) — no aplica capa backend/paginación/multi-tenancy (feature
  100% frontend estático sin fetch de datos). HTML semántico correcto, `export default function
  Landing()`, sin llamadas HTTP directas.
- [x] C4 (Compilación Estática + Lint) — los 3 comandos exit 0, verificados en vivo por este
  reviewer, no solo tomados de las bitácoras.
- [x] C5 (Cierre de Sesión Append-Only) — bitácoras de implementación y esta revisión en disco;
  el orquestador cierra `history.md`/`current.md` después de este veredicto (fuera de mi
  alcance).
- N/A C6 (Capa de Datos) — sin modelos Mongoose tocados.
- [x] C7 (Security Gate) — SEC-G verificado (`grep dangerouslySetInnerHTML` sobre `Landing.tsx`
  → 0 resultados, chequeado además visualmente en la lectura completa del archivo); el resto de
  SEC-A..F/H no aplica (sin backend, sin variables de entorno tocadas).
- N/A C8 (Estabilidad de API) — sin contrato de API modificado.

## Hallazgos

Ninguno bloqueante.

**No-bloqueante / deuda de backlog (no impide aprobación):**
1. `apps/client/src/views/Landing.tsx:420-527` (`HeroMockup()`): las mini-cards internas del
   mockup usan `p-3`/`p-4`, por debajo del mínimo `p-6` que exige C3 para "cards del dashboard"
   (Refactoring-UI, `docs/design.md`/`.claude/rules/frontend.md`). Se considera fuera del alcance
   estricto de esa regla porque `HeroMockup` es una ilustración decorativa en miniatura de la app
   (no un componente de dashboard real, funcional, con datos vivos) — pero si en el futuro se
   reutiliza este patrón de mini-card en una vista real, debe respetar `p-6`. Documentado como
   nota, no como violación.

## Cierre

`feature_list.json` → `UX-37.status` actualizado a `"done"` por este reviewer.
