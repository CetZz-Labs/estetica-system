# Reporte de Revisión Técnica — Feature UX-58

**Veredicto Final:** APPROVED
**Auditor:** Subagente Reviewer
**Timestamp:** 2026-07-29

## Contexto auditado

- `apps/client/src/components/landing/guide/guideContent.ts`
- `apps/client/src/views/Guia.tsx`
- `apps/client/src/components/landing/guide/ModuleMedia.tsx`
- Bitácora: `progress/implements/impl_UX-58.md`
- Acceptance criteria de `UX-58` en `feature_list.json` (línea 976-981)

## Verificación empírica de assets (filesystem)

Confirmado que los 5 archivos referenciados existen en disco y coinciden byte a byte con el `src` declarado en `guideContent.ts`:

- `apps/client/public/media/login/login.png` → usado en `media: { kind: 'image', src: '/media/login/login.png', ... }` (línea 64)
- `apps/client/public/media/visitas/registar_visitas.png` → línea 236
- `apps/client/public/media/profesionales/profesionales.png` (imagen de módulo) → línea 317
- `apps/client/public/media/profesionales/agregar_profesional.png` (imagen de paso) → línea 328
- `apps/client/public/media/historial/historial.png` → línea 347

No hay ningún `src` "huérfano" (que apunte a un archivo inexistente) ni ningún archivo subido que quede sin referenciar.

## Mapeo de Checkpoints (Quality Gates)

- [x] **C2 (Coherencia de Estados y Enfoque Atómico):** `feature_list.json` tiene exactamente 1 feature `in_progress` (UX-58, ahora cerrada por este review). `progress/current.md` referencia la feature en curso. Bitácora `impl_UX-58.md` en disco.
- [x] **C3 (Fidelidad Arquitectónica):**
  - `GuideStep.media?: ModuleMedia` (guideContent.ts:37) es un campo opcional, reutiliza el tipo `ModuleMedia` ya existente — no introduce un tipo paralelo. Los 8 módulos y el resto de los ~30 pasos que no declaran `media` no se ven afectados (TypeScript permite `undefined` sin cambios adicionales).
  - Los 5 módulos con video (`dashboard`, `clientes`, `servicios`, `inventario`, `turnos`) permanecen con `{ kind: 'video', src: '/media/<slug>/demo.mp4', ... }` sin alteración de contenido (confirmado por lectura íntegra del archivo).
  - `Guia.tsx:151-153` — `{step.media && <ModuleMedia media={step.media} inline />}` se agrega dentro del `.map` de steps, después del bloque `step.soft` (línea 148-150), sin alterar el render de `step.list`/`step.soft` existente ni el `ModuleMedia` de nivel de módulo (línea 126, sin la prop `inline`, sigue intacto).
  - `ModuleMedia.tsx`: prop `inline?: boolean` con default `false` (línea 10, 18). El único cambio de comportamiento es `wrapperClass` (línea 20: `inline ? "mt-4 max-w-md" : "mt-8"`), aplicado uniformemente a los 3 estados (video/imagen/placeholder). El call-site de nivel de módulo en `Guia.tsx:126` no pasa `inline`, por lo que conserva el comportamiento anterior (`mt-8`, ancho completo) — no hay regresión visual para los 8 módulos ya en producción.
- [x] **C4 (Compilación Estática + Lint):**
  - `pnpm --filter @estetica/client build` → Exit Code 0 (verificado en esta sesión de revisión; único warning es el pre-existente de tamaño de chunk, no relacionado).
  - `pnpm --filter @estetica/client lint` → Exit Code 0, 0 errores. 4 warnings preexistentes (`react-hooks/incompatible-library` en `ProfesionalModal.tsx`, `RegistroModal.tsx`, `Negocio.tsx`, `Turnos.tsx`) — archivos no tocados por esta feature, no bloqueantes.
- [ ] C5 — no aplica a este review individual (lo cierra el leader al finalizar el protocolo de sesión completo).
- [ ] C6 — no aplica (feature 100% frontend, sin cambios en modelos Mongoose).
- [ ] C7 — no aplica (sin endpoints ni variables de entorno tocadas).
- [ ] C8 — no aplica (sin cambio de contrato de API; `guideContent.ts` es un archivo de datos estático de UI, no una API pública versionada).

## Hallazgos no bloqueantes

- El repositorio tiene actualmente varios archivos de una feature previa (`Guia.tsx`, `landing/guide/`, `apps/client/public/media/`) en estado `??` (untracked) en `git status` — no forman parte del diff de UX-58 propiamente dicho, sino de UX-50/UX-56/UX-57 sin commitear todavía. No es un hallazgo de esta feature, pero el leader debería considerar consolidar commits pendientes antes de que crezca más la pila de features sin versionar.

## Conclusión

Los 4 módulos objetivo (`login`, `historial`, `visitas`, `profesionales`) están conectados a capturas reales verificadas en disco, el campo opcional `GuideStep.media` no rompe el contrato existente, `ModuleMedia` con `inline` es retrocompatible, y los 5 módulos con video quedan intactos. Builds y lint en verde. Se aprueba el cierre de UX-58.
