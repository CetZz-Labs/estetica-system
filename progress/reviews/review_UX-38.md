# Reporte de Revisión Técnica — Feature UX-38

**Veredicto Final:** APPROVED
**Auditor:** Subagente Reviewer
**Timestamp:** 2026-07-21

## Resumen de auditoría

Feature de frontend puro (`apps/client/src/views/Landing.tsx`, único archivo de código tocado). Se auditó contra `feature_list.json` (acceptance_criteria de UX-38), `docs/design.md` §13.1 (excepción documentada por el leader), `docs/patterns-frontend.md`, `.claude/rules/frontend.md` y `CHECKPOINTS.md`.

### Verificación de acceptance criteria (feature_list.json → UX-38)

1. **`motion` como única dependencia nueva:** confirmado en `apps/client/package.json:22` (`"motion": "12.42.2"`). No se agregaron `gsap`/`@gsap/react`/`ogl`/`react-bits`. `ls apps/client/src/components/react-bits` → no existe (sigue eliminado desde UX-37).
2. **Movimiento continuo en el hero:** confirmado — 3 blobs decorativos (`motion.div`, `Landing.tsx:216-232`) con loop `x`/`y`/`scale` (`repeat: Infinity`), más el float de los 2 badges del `HeroMockup` (`Landing.tsx:599-627`). No introduce gradientes ni sombras de card; tipografía y jerarquía del hero no se alteran.
3. **Scroll-reveal con stagger en Features:** confirmado — contenedor `motion.div` con `variants={featuresContainer}` (`staggerChildren: 0.08`), `whileInView`, `viewport={{ once: true, amount: 0.3 }}` (`Landing.tsx:309-343`); cada card usa `variants={fadeSlideUp}`.
4. **Animaciones adicionales coherentes (Stats, Cómo funciona, CTA) sin monotonía:** confirmado — Stats usa timing/desplazamiento distinto (`staggerChildren: 0.05`, slide de 12px, sin hover) vs. Features (slide 20px + hover `scale`); Cómo funciona usa slide horizontal alternado por signo (zig-zag); CTA usa solo fade de opacidad sin animar el bloque `wine`. Los 4 puntos usan variaciones de intensidad/eje distintas — no es el mismo efecto repetido.
5. **Ninguna otra vista importa `motion`:** confirmado — `grep -rn "from 'motion" apps/client/src` → único resultado es `views/Landing.tsx` (líneas 4 y 5).
6. **`prefers-reduced-motion: reduce` respetado en todos los loops infinitos:** confirmado — `useReducedMotion()` (Landing.tsx:109) controla (a) los 3 blobs del fondo (`animate={prefersReducedMotion ? undefined : {...}}`, líneas 219/224/229) y (b) los 2 badges flotantes del `HeroMockup` vía prop `prefersReducedMotion` y objetos `floatA`/`floatB` condicionales (líneas 506-511). El resto de las animaciones (`whileInView`, fades de entrada única) no son loops y no requieren guard adicional — coherente con el criterio de aceptación.
7. **Sin gradientes/box-shadow de card/+1 bloque wine/modo oscuro:** verificado con grep dedicado — cero coincidencias de `gradient`, `shadow-`/`box-shadow` y `dark:` en `Landing.tsx` (la única coincidencia de "box-shadow" es un comentario que declara su ausencia). Un único `bg-wine` sólido en toda la vista (línea 442, sección CTA) — `bg-wine-bg` (línea 38) es un tinte de fondo de chip (§2.4), no un bloque sólido, por lo que no cuenta como segundo bloque wine. El color inline `var(--color-accent-tint)` (líneas 451/468) es un token ya existente en `index.css:89`, no un color nuevo.
8. **Build y lint exit 0:** re-ejecutados por este auditor:
   - `pnpm --filter @estetica/client build` → exit 0 (`tsc -b && vite build` completó, único warning preexistente de chunk >500kB, no relacionado).
   - `pnpm --filter @estetica/client lint` → exit 0, `0 errors, 4 warnings` — los 4 warnings son preexistentes (`react-hooks/incompatible-library` por `watch()` en `ProfesionalModal.tsx`, `Negocio.tsx`, `RegistroModal.tsx`, `Turnos.tsx`), ninguno en `Landing.tsx`.

### Verificación de la excepción docs/design.md §13.1

- Excepción localizada y leída completa (`docs/design.md:476-495`). Cubre exactamente lo implementado: librería `motion` restringida a `Landing.tsx`, efectos permitidos (loop en hero, `whileInView` con stagger, micro-hover `scale` en cards de Features) y prohibiciones explícitas (gradientes, box-shadow de card, +1 bloque wine, modo oscuro, colores fuera de §2/§14) — todas respetadas según el detalle anterior.
- El `whileHover={{ scale: 1.02 }}` en las cards de Features (`Landing.tsx:324`) es exactamente la "micro-interacción de hover con scale... limitada a la Landing" permitida por el texto de la excepción.

### HTML semántico y accesibilidad (§3 frontend.md / CHECKPOINTS C3)

- No se introdujeron `<div>`/`<span>` con `onClick` nuevos. Los `onClick` existentes en `Landing.tsx` (botón hamburguesa, backdrop del menú móvil, enlaces de cierre de menú) son patrón preexistente no tocado por esta feature (confirmado contra `impl_UX-38-frontend.md`, punto 9: "Header/nav, mobile menu, Footer: sin cambios").
- Los 3 blobs decorativos del fondo están envueltos en un contenedor `absolute inset-0 z-0 pointer-events-none aria-hidden="true"` (línea 216), y el contenido del hero se promovió a `relative z-10` (línea 234) — el fondo decorativo queda estrictamente detrás y no interfiere con la legibilidad del texto ni con los clics del `HeroMockup` ni de los CTAs.

### Bitácora del implementer

`progress/implements/impl_UX-38-frontend.md` es coherente con el código: documenta cada punto de animación agregado, las decisiones de ADR (intensidad distinta hero vs. badges, blobs como pedido adicional del usuario dentro de los límites de §13.1) y los guardrails verificados al cierre. Sin discrepancias entre lo declarado y lo auditado en el código real.

## Mapeo de Checkpoints (Quality Gates)
- [x] C2 (Coherencia de Estados y Enfoque Atómico) — única feature `in_progress`, cambios acotados a `Landing.tsx` + `package.json`, bitácora en disco.
- [x] C3 (Fidelidad Arquitectónica) — no aplica backend; frontend: sin filtrado client-side nuevo, HTML semántico preservado, sin `console.log`/`debugger`/TODO sin ticket en el diff.
- [x] C4 (Compilación Estática + Lint) — build y lint re-ejecutados por este auditor, exit 0 ambos.
- [x] C5 (Cierre de Sesión Append-Only) — pendiente de que el leader registre la entrada en `progress/history.md` y limpie `progress/current.md`; evidencias en disco (`impl_UX-38-frontend.md`, este review) ya existen.
- [x] C6 (Capa de Datos) — no aplica (sin cambios de modelos Mongoose).
- [x] C7 (Security Gate) — no aplica (sin cambios de backend/auth/tenant); sin `dangerouslySetInnerHTML` en el diff.
- [x] C8 (Estabilidad de API) — no aplica (sin cambios de contrato de API).

## Cambios Requeridos
Ninguno. Feature conforme a acceptance criteria, a la excepción documentada en `docs/design.md` §13.1, y a los checkpoints aplicables.
