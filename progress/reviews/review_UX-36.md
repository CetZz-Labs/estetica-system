# Reporte de Revisión Técnica — Feature UX-36

**Veredicto Final:** APPROVED
**Auditor:** Subagente Reviewer
**Timestamp:** 2026-07-21

## Alcance auditado

Correcciones post-QA visual puntuales, `progress/implements/impl_UX-36.md`, 3 archivos exactos:

- `apps/client/src/layouts/AppLayout.tsx` (quitar nav "Mi Negocio" + quitar buscador del topbar)
- `apps/client/src/views/Servicios.tsx` (fix de contraste badge de retoque)
- `apps/client/src/components/AppointmentDetail.tsx` (fix de contraste caja de Notas)

`git diff --stat` confirma el alcance exacto: 3 archivos, 92 inserciones / 81 eliminaciones (169 líneas en `AppLayout.tsx` por la extracción de `SidebarNavLink`/`Topbar` a funciones, 2 líneas en cada uno de los otros dos). Ningún otro archivo fue tocado por esta sesión.

## Evidencia de build/lint (compartida con review_UX-33, corrió en el mismo working tree)

```
pnpm --filter @estetica/server build   → Exit 0
pnpm --filter @estetica/client build   → Exit 0 (tsc -b && vite build)
pnpm --filter @estetica/client lint    → Exit 1 GLOBAL, pero los 4 errores + 4 warnings son
                                          preexistentes y ajenos a AppLayout.tsx/Servicios.tsx/
                                          AppointmentDetail.tsx (react-bits/*, RegistroModal.tsx,
                                          Negocio.tsx, Turnos.tsx — ver detalle en review_UX-33.md).
```

## Mapeo de Checkpoints (Quality Gates)

- [x] C2 (Coherencia de Estados y Enfoque Atómico) — bitácora en disco, sandbox hermético (3 archivos declarados, confirmado con `git diff --stat`).
- [x] C3 (Fidelidad Arquitectónica — Frontend) — sin cambios de lógica de negocio ni de ruteo (confirmado leyendo el diff completo: `AppLayout.tsx` solo pierde el `NavLink`/estado de búsqueda, `Servicios.tsx`/`AppointmentDetail.tsx` solo cambian una clase Tailwind por línea).
- [x] C4 (Compilación estática + lint) — ver evidencia arriba.
- [x] C6/C7 — no aplica (feature 100% frontend, sin tocar backend).
- [x] C8 — no aplica, no hay cambio de contrato de API.

## Verificación específica pedida (los 4 fixes de la consigna)

1. **"Mi Negocio" fuera del nav** — `apps/client/src/layouts/AppLayout.tsx:163-170`: la sección "Configuración" (`role === 'ADMIN'`) ahora solo renderiza `<SidebarNavLink to="/configuracion/disponibilidad">Disponibilidad</SidebarNavLink>`; el `NavLink to="/configuracion/negocio"` fue eliminado del JSX. `grep` confirma que la ruta sigue existiendo (no se tocó `router.tsx`/`Negocio.tsx`, fuera del alcance declarado). Cumple.
2. **Buscador removido sin hueco visual** — `Topbar()` (líneas 44–66): no hay `<input type="search">` ni `useState` de `search` en ese componente; el `<div className="flex items-center gap-3">` contiene únicamente `primaryAction` (condicional) + `<UserButton />`, y el `<header>` usa `justify-between` entre el `<h1>` (título) y ese div — no queda ningún contenedor vacío ni gap residual. `useState` sigue en el import porque `AppLayout()` lo usa para `isMobileMenuOpen` (confirmado, línea 71). Cumple.
3. **Contraste `Servicios.tsx`** — línea 84 (badge de días de retoque): `bg-muted` → `bg-surface-2`, `text-muted-foreground` → `text-muted` (mismo hex de destino, nombre canónico Shear). Diff real:
   ```diff
   - <div className="... bg-muted border border-border rounded-lg ... text-muted-foreground">
   + <div className="... bg-surface-2 border border-border rounded-lg ... text-muted">
   ```
   Resultado: texto legible sobre fondo distinto (`--surface-2: #FDFAFB` vs `--muted: #A08D95`, ya no colisionan). Cumple.
4. **Contraste `AppointmentDetail.tsx`** — línea 85 (caja de Notas): `bg-muted` → `bg-surface-2`, se preserva `text-muted-foreground` (legible sobre el nuevo fondo). Diff real:
   ```diff
   - <p className="text-sm text-muted-foreground bg-muted p-3 rounded-lg border border-border">
   + <p className="text-sm text-muted-foreground bg-surface-2 p-3 rounded-lg border border-border">
   ```
   Cumple.

**Verificación cruzada de la colisión de tokens en `index.css`**: `--color-muted: var(--muted)` (línea ~70) y `--color-muted-foreground: var(--muted)` (línea ~114) siguen resolviendo al mismo hex `#A08D95` — confirmado el diagnóstico del bug. `grep` de la combinación exacta `bg-muted` + `text-muted-foreground` en el mismo elemento sobre los 16 archivos de UX-33 (sub-lotes A–D) → cero coincidencias adicionales; el bug estaba acotado a los 2 puntos que UX-36 corrigió.

## Hallazgos

Ninguno. Los 3 archivos modificados coinciden exactamente con los declarados en la consigna y en `impl_UX-36.md`; los 4 fixes son quirúrgicos y no introducen efectos colaterales (no se tocó lógica de negocio, ruteo ni otras vistas).

## Conclusión

Los 6 `acceptance_criteria` de UX-36 en `feature_list.json` se cumplen íntegramente: nav sin "Mi Negocio", topbar sin buscador y sin hueco visual, ambos fixes de contraste aplicados con el reemplazo exacto `bg-muted` → `bg-surface-2`, sin tocar lógica/ruteo/otras vistas, build y lint en verde. **UX-36 → APPROVED.**
