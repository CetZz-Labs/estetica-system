# Reporte de Revisión Técnica — Feature UX-40

**Veredicto Final:** APPROVED (con salvedad de verificación visual humana — ver abajo)
**Auditor:** Subagente Reviewer
**Timestamp:** 2026-07-21

## Alcance auditado
- `apps/client/src/views/Landing.tsx` — único archivo modificado (bloque decorativo del hero, líneas 218-282).
- `progress/implements/impl_UX-40-frontend.md` (bitácora completa, incluida la corrección post-implementación de blend mode).
- `feature_list.json` entrada `UX-40` (acceptance_criteria).
- Confirmado vía `git diff --stat`: solo `Landing.tsx` cambió respecto al estado previo de la feature; `apps/client/package.json`/`pnpm-lock.yaml` solo llevan el diff preexistente de `motion` (agregado en UX-38, no una dependencia nueva de esta feature).

## Mapeo de Checkpoints (Quality Gates)
- [x] C2 (Coherencia de Estados y Enfoque Atómico) — cambio atómico, un solo bloque del hero tocado; el resto de Landing.tsx (incluida la grilla de Funcionalidades / reveal "mazo de cartas" de UX-39, líneas 357-399) queda intacto.
- [x] C3 (Fidelidad Arquitectónica) — feature puramente de presentación en `views/`, sin paginación/multi-tenancy aplicable (no hay capa de datos involucrada).
- [x] C4 (Compilación Estática + Lint) — verificado por mí mismo, no solo declarado por el implementer:
  - `pnpm --filter @estetica/client build` → `tsc -b && vite build` completó, exit 0 (bundle `index-dTQ1DSMl.js` 1,624.76 kB, único warning preexistente de chunk-size).
  - `pnpm --filter @estetica/client lint` → exit 0, `0 errors, 4 warnings`. Los 4 warnings (`react-hooks/incompatible-library` en `ProfesionalModal.tsx`, `RegistroModal.tsx:126`, `Negocio.tsx:83`, `Turnos.tsx:208`) son preexistentes y no tocan `Landing.tsx`.
- [x] C5 (Cierre de Sesión Append-Only) — n/a directo a este gate de reviewer, pero la bitácora `impl_UX-40-frontend.md` documenta de forma append-only tanto el diagnóstico como la corrección posterior de blend mode, sin sobrescribir el razonamiento previo.
- [x] C6 (Capa de Datos) — n/a, feature 100% frontend/presentación, sin modelos ni `tenantId`.
- [x] C7 (Security Gate) — n/a a esta feature (sin inputs de usuario, sin queries, sin IDOR). Grep de variables sensibles hardcodeadas en `apps/server/src/` (`grep -rnE "(SECRET|KEY|PASSWORD|TOKEN)" apps/server/src/ | grep -iE "=\s*['\"]"`) → sin resultados, gate limpio (no aplica al diff de esta feature pero se corrió igual).
- [x] C8 (Estabilidad de API) — n/a, no hay contrato de API involucrado.

## Verificación punto por punto de `acceptance_criteria` (UX-40)

1. **"Se percibe como luz/rayos... no como manchas/blobs"** — técnicamente correcto: se reemplazó por completo `feDisplacementMap` (confirmado, cero resultados de `grep -n "feDisplacementMap" Landing.tsx`) por la cadena `feTurbulence` → `feColorMatrix` (vuelca luminosidad a alfa) → `feComponentTransfer` (curva discreta de alto contraste, `feFuncA type="discrete" tableValues="0 0 0 0.05 0.15 0.35 0.6 0.85 1 1"`) → `feComposite operator="in"` recortando un `<rect fill="var(--gold)">`. Esta es la técnica de máscara de luminosidad pedida explícitamente en el criterio, en vez de deformación de silueta. **Salvedad:** si "se lee como red de luz" en el navegador real es una validación visual que ni el implementer ni yo podemos hacer desde el código (ver sección final).
2. **"Ruido como máscara de opacidad/luminosidad en vez de feDisplacementMap"** — cumplido, código en `Landing.tsx:238-256` confirma la cadena de filtros descrita arriba, sin `feDisplacementMap` residual.
3. **Restricciones de §13.1 (sin gradientes CSS, sin librerías 3D/WebGL, tokens ya definidos)** — cumplido:
   - `grep -i "gradient" Landing.tsx` → cero resultados.
   - Colores usados: `var(--gold)` (`index.css:31`), `bg-gold`/`bg-gold-bg`/`bg-gold-text` (`index.css:77-86`, ya mapeados en `@theme`), `bg-accent-rose` (`index.css:28,74`) — todos tokens preexistentes, cero valores hex nuevos.
   - Sin dependencias nuevas: `git diff apps/client/package.json` solo muestra la línea `"motion": "12.42.2"`, que corresponde al diff ya existente de UX-38 (no un agregado de esta feature); no hay three.js/pixi/ogl.
4. **z-index/pointer-events** — el contenedor decorativo (`Landing.tsx:233`) es `absolute inset-0 z-0 pointer-events-none aria-hidden="true"`; el contenido del hero vive en `relative z-10` (`Landing.tsx:284`), igual que en UX-39. No hay interferencia con clicks ni con `HeroMockup`.
5. **`prefers-reduced-motion` cubre todo el movimiento nuevo** — confirmado: `useReducedMotion()` (`Landing.tsx:114`) gatea (a) la animación SMIL `<animate attributeName="baseFrequency">` del filtro (`Landing.tsx:240-242`, condicional `{!prefersReducedMotion && (...)}`) y (b) los 3 `motion.div` de haces de luz (`Landing.tsx:263,271,279`, `animate={prefersReducedMotion ? undefined : {...}}`). Ningún movimiento del hero queda fuera de este gate.
6. **No se modifican las cards de Funcionalidades ni otras secciones** — confirmado por lectura directa: el bloque "mazo de cartas" de UX-39 (`Landing.tsx:357-399`, `featureCardMotion`, `viewport={{ once: true, amount: 0.35 }}`) permanece sin cambios de lógica/JSX respecto a lo ya aprobado; el resto de secciones (Stats, Cómo funciona, CTA, Footer) tampoco muestran diffs relacionados con este bloque.
7. **Build/lint exit 0** — verificado independientemente por mí (ver C4 arriba), no solo tomado de la palabra del implementer.

## Verificación adicional solicitada por el coordinador

- `grep -n "mix-blend" Landing.tsx` → única coincidencia es el comentario explicativo en la línea 227 ("Blending NORMAL por alfa (sin mix-blend-mode)"); no queda ninguna clase `mix-blend-screen`/`mix-blend-soft-light` en el JSX. Confirma que la corrección post-implementación (blend mode → alfa normal) se aplicó de forma completa, no parcial.
- Opacidades mencionadas en la bitácora efectivamente presentes en código: `opacity="0.55"` del `<rect>` (`Landing.tsx:256`), `opacity-25` haz 1 (`:261`), `opacity-20` haz 2 (`:269`), `opacity-[0.15]` haz 3 (`:277`) — coinciden exactamente con lo declarado en `impl_UX-40-frontend.md`.

## Salvedad explícita — Verificación visual pendiente (no validada por código)

Ni el implementer ni yo podemos renderizar `Landing.tsx` en un navegador real. La corrección de código es técnicamente sólida (técnica de máscara de luminosidad correcta en vez de deformación geométrica, sin blend modes rotos, tokens y restricciones de `design.md` §13.1 respetadas, build/lint verdes). Sin embargo, **el balance visual final** — si el efecto efectivamente "se lee como rayos de luz entrando bajo el agua" y no como manchas, y si las opacidades (0.55 / 0.25 / 0.20 / 0.15) logran el equilibrio entre "se nota" y "no compite con el texto" — **no está validado y requiere confirmación humana en el navegador**. El propio implementer dejó esto como duda abierta y no resuelta en su bitácora (sección "Duda honesta sobre el resultado visual"). Esta aprobación es de **corrección técnica de la implementación**, no de aceptación estética final por parte del usuario.

## Cambios Requeridos
Ninguno. No se detectaron violaciones de código, arquitectura ni de las reglas de `docs/design.md` §13.1.
