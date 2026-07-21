# Reporte de Revisión Técnica — Feature UX-32

**Veredicto Final:** APPROVED
**Auditor:** Subagente Reviewer
**Timestamp:** 2026-07-20

## Alcance auditado

`apps/client/src/layouts/AppLayout.tsx` (reescrito), `apps/client/src/layouts/TopbarContext.tsx`
(nuevo), `apps/client/src/views/AceptarInvitacion.tsx` (recorte puntual), `apps/client/src/views/Landing.tsx`
(recorte puntual), y el borrado de `apps/client/src/components/ui/ThemeToggle.tsx` +
`apps/client/src/hooks/useIsDark.ts`. Confirmado con `git status --porcelain apps/client` que
**ningún otro archivo** del sandbox frontend fue tocado — `index.css`/`index.html` (fundación de
UX-31, ya aprobada) no registran cambios adicionales en esta sesión (timestamps de filesystem
confirman que `index.css` no fue modificado después de las 20:21, mientras que `AppLayout.tsx`/
`TopbarContext.tsx` se modificaron entre las 20:34–20:37, coherente con el reclamo del implementer
de no haber tocado su fundación). Fuera de `apps/client/`, el diff toca únicamente artefactos de
orquestación (`feature_list.json`, `progress/current.md`, `progress/history.md`,
`progress/implements/impl_UX-32.md`, `progress/plan_shear-redesign.md`) — la modificación de
`docs/design.md` es preexistente a esta sesión (ya señalada como tal en `review_UX-31.md`) y no
forma parte del diff de esta feature.

## Mapeo de Checkpoints (Quality Gates)

- [x] **C2 (Coherencia de Estados y Enfoque Atómico)** — única feature `in_progress` en
  `feature_list.json` al momento de esta auditoría; `impl_UX-32.md` presente en disco con bitácora
  completa; sandbox hermético confirmado (ver arriba).
- [x] **C3 (Fidelidad Arquitectónica — Frontend/Sistema de Diseño)**:
  - **Sidebar (§6.1/§7.1):** `AppLayout.tsx:139` mide `w-[236px]`, `bg-surface`,
    `border-r border-border`. El componente `SidebarNavLink` (líneas 22-42) reemplaza los
    `<NavLink>` con íconos `react-icons/fi` por punto de color 6px (`w-1.5 h-1.5`) + texto,
    padding `px-3.5 py-2.5` (14px/10px) y `rounded-[10px]` — coincide con la tabla §7.1
    (`padding 10px 14px`, `radio 10px`, punto 6px). Estado activo `bg-rose-bg text-wine font-bold`
    (línea 29) y punto `bg-accent` (línea 36); inactivo `text-text-3 font-medium hover:bg-hover-soft`
    (línea 30) y punto `bg-dotted` (línea 36) — coincide exactamente con §7.1.
    `grep -rn "FiHome\|FiUsers\|FiScissors\|FiPackage\|FiCalendar\|FiUser\|FiBriefcase\|FiClock"
    apps/client/src/layouts/AppLayout.tsx` no devuelve resultados: confirmado que se retiraron
    los 8 íconos de navegación semántica, y solo quedan `FiMenu`/`FiX` para el drawer móvil
    (controles de UI, no navegación — permitidos por `frontend.md §3`).
  - **Role-gating sin regresión (crítico):** comparado `git diff` línea por línea contra el
    `AppLayout.tsx` anterior — el orden (Inicio · Clientes · Servicios · Inventario · Turnos ·
    Historial de Visitas · Equipo[Profesionales] · Configuración[Mi Negocio, Disponibilidad]) y
    los condicionales (`role !== 'RECEPTIONIST'` para Inventario en `AppLayout.tsx:156`;
    `role === 'ADMIN'` para Profesionales en línea 163 y para Mi Negocio/Disponibilidad en línea
    172) son **idénticos** a la versión pre-cambio. Cero regresión funcional de permisos.
  - **Topbar (§6.2) + `TopbarContext.tsx`:** `TopbarProvider`/`useTopbar(config?)` implementado
    con la API documentada en `impl_UX-32.md` (título/acción/searchSlot, lectura sin args desde
    `AppLayout`, escritura con args desde las vistas vía `useEffect`). `AppLayout.tsx:200-207`
    envuelve `<main>` en `<TopbarProvider>` y renderiza `<Topbar/>` (66px: `h-[66px]`, `bg-surface
    border-b border-border`, `flex items-center justify-between`) — coincide con §6.2. Buscador
    con placeholder textual idéntico al de design.md (`AppLayout.tsx:57`), ancho `w-[320px]`,
    `bg-bg`, `rounded-[10px]` — coincide con la tabla. Botón primario `bg-accent text-white
    font-semibold px-4.5 py-2.5 rounded-[10px] hover:opacity-90` (línea 65) coincide con el patrón
    primario §7.2 (`padding 10px 18px`, sin lift/sombra). El `<Outlet/>` sigue funcionando dentro
    del provider — build/lint verdes lo confirman empíricamente, sin errores de routing.
    Desviaciones menores no bloqueantes: título en `text-2xl` (24px) vs. 26px de spec, y avatar
    resuelto con `<UserButton/>` de Clerk duplicado en vez de un círculo custom `bg-wine` con
    iniciales — ambas explícitamente documentadas en `impl_UX-32.md` como decisiones de alcance
    razonables para esta etapa (no rompen ninguna AC literal de `feature_list.json`, que solo pide
    "avatar de usuaria a la derecha").
  - **Contenedor de contenido (§6.3):** confirmado que se eliminó el wrapper
    `bg-card border border-border rounded-xl shadow-lg` y `key={location.pathname}
    className="animate-page-in"` (ver diff, bloque removido en la sección "Área de Contenido
    Principal"). El nuevo contenedor (`AppLayout.tsx:203`) usa `bg-bg p-7` — `p-7` en Tailwind
    equivale a 28px, coincide exactamente con la especificación de padding de §6.3. Import de
    `useLocation` correctamente retirado (ya sin uso).
  - **Selector de tenant (§6.1, no implementado):** decisión de alcance documentada explícitamente
    en `impl_UX-32.md`; no es una AC literal de `feature_list.json` para UX-32 (la AC solo exige el
    sidebar/topbar/fin de dark mode/contenedor). Razonable dejarlo para UX-33/34, no bloqueante.
- [x] **C4 (Compilación Estática + Lint)** — verificado empíricamente por mí (no solo por el
  reporte del implementer):
  - `pnpm --filter @estetica/client build` → **Exit Code 0** (`tsc -b && vite build`;
    `dist/assets/index-BGOEUn5n.js` 1,768.03 kB, warning preexistente de chunk grande no
    relacionado a esta feature).
  - `pnpm --filter @estetica/client lint` → Exit code del proceso 1 (deuda preexistente), pero
    **cero regresiones nuevas**: 9 problemas totales (5 errores + 4 warnings), y confirmé con
    `grep -n "\.tsx$\|\.ts$"` sobre la salida completa que los 8 archivos con problemas son
    `ProductoModal.tsx`, `ProfesionalModal.tsx`, `RegistroModal.tsx`, `react-bits/Aurora.tsx`,
    `react-bits/SplitText.tsx`, `react-bits/TextType.tsx`, `Negocio.tsx`, `Turnos.tsx` — ninguno
    de los 4 archivos tocados por esta feature (`AppLayout.tsx`, `TopbarContext.tsx`,
    `AceptarInvitacion.tsx`, `Landing.tsx`) aparece en la salida de lint.
- [x] **C5 (Cierre de Sesión Append-Only)** — `impl_UX-32.md` en disco con detalle completo;
  este archivo (`review_UX-32.md`) se agrega como evidencia. Pendiente del leader: entrada en
  `progress/history.md` y restauración de `progress/current.md`.
- [x] **C6 (Capa de Datos)** — N/A, feature 100% frontend, sin modelos Mongoose.
- [x] **C7 (Security Gate)** — N/A, no hay lógica de backend/autenticación/queries en esta
  feature. Confirmado que no se tocó ningún archivo bajo `apps/server/`.
- [x] **C8 (Estabilidad de API)** — N/A, no hay contrato de API involucrado.

## Fin del modo oscuro (verificación empírica)

- `ThemeToggle.tsx` y `useIsDark.ts` confirmados **eliminados del filesystem**
  (`ls` devuelve "No such file or directory" para ambas rutas).
- `grep -rn "ThemeToggle|useIsDark" apps/client/src` devuelve **una sola línea**, y es un
  **comentario** en `apps/client/src/index.css:5` (documentando que `@custom-variant dark` debía
  eliminarse una vez retirados ambos artefactos) — cero imports/montajes reales en código.
- `grep -rn "dark:" apps/client/src --include="*.tsx" --include="*.jsx"` → **0 resultados**: los 2
  únicos usos de la variante `dark:` en todo `src/` (ambos en `Landing.tsx`, nav pill) fueron
  retirados correctamente.
- Los 3 logos condicionales (`AppLayout.tsx` sidebar/mobile header, `AceptarInvitacion.tsx`,
  `Landing.tsx` ×3 puntos de montaje) quedaron resueltos a `/shear-logo.png` fijo, sin ternarios
  de tema residuales.

**Nota no bloqueante (deuda documentada, no de esta feature):** `@custom-variant dark` sigue
presente en `index.css:5-8` como código muerto (sin ningún `dark:` real en `src/` que lo consuma).
`index.css` no es sandbox de UX-32 (pertenece a UX-31, ya cerrada y aprobada); el propio
`review_UX-31.md` ya había anticipado este punto de limpieza para "UX-32 o UX-35". Como UX-32
tampoco lo tocó (por regla dura de sandbox), queda correctamente escalado como tarea de UX-35
(limpieza de alias-puente), consistente con `progress/plan_shear-redesign.md` Etapa 5. No amerita
bloquear este cierre.

## Sandbox hermético (C2)

`git status --porcelain apps/client` únicamente lista: `apps/client/index.html` (M, de UX-31),
`apps/client/src/components/ui/ThemeToggle.tsx` (D), `apps/client/src/hooks/useIsDark.ts` (D),
`apps/client/src/index.css` (M, de UX-31), `apps/client/src/layouts/AppLayout.tsx` (M),
`apps/client/src/views/AceptarInvitacion.tsx` (M), `apps/client/src/views/Landing.tsx` (M), y
`apps/client/src/layouts/TopbarContext.tsx` (nuevo, `??`). Ningún archivo de `views/` (salvo los 2
recortes puntuales exigidos) ni de `components/` (salvo el borrado de `ThemeToggle.tsx`) ni ninguna
otra ruta fue tocada. Los recortes en `AceptarInvitacion.tsx` (8 líneas) y `Landing.tsx` (23 líneas)
son mínimos y puntuales: solo retiran `import`/uso de `useIsDark`/`ThemeToggle`, resuelven el logo
condicional a fijo, y en `Landing.tsx` retiran los 2 usos de `dark:` y el prop `isDark` de
`HeroMockup` (necesario para no romper el build al eliminar la variable) — no hay ninguna
migración de tokens ni cambio de layout ajeno al alcance de la Etapa 2.

## Accesibilidad de foco (§11)

El buscador del topbar (`AppLayout.tsx:58`) define `focus:outline-none focus:border-accent-rose`,
coherente con el patrón de Input §7.14 (foco vía borde, sin outline nativo). Los `NavLink`/botones
del sidebar y topbar no definen ningún `outline:none` propio (confirmado con
`grep -n "outline|focus" apps/client/src/layouts/AppLayout.tsx`, único resultado es el input de
búsqueda) — conservan el foco visible por defecto del navegador, sin degradación. No hay ningún
`outline: none` sin reemplazo introducido por esta feature. Se admite como aceptable para esta
etapa (el requisito explícito de `outline: 2px solid var(--accent-rose)` en foco por teclado para
nav/botones queda como refinamiento pendiente de una etapa posterior, no bloqueante según el
alcance de UX-32).

## Higiene transversal (C3)

`grep -n "console\.|debugger|TODO|FIXME"` sobre los 4 archivos tocados por código → 0 resultados.
El `eslint-disable react-refresh/only-export-components` en `TopbarContext.tsx:1` está
correctamente justificado con comentario inline (requisito de la tarea de colocar Provider+hook en
el mismo archivo) y no introduce ningún error/warning nuevo en la salida de lint verificada arriba.

## Conclusión

El shell (`AppLayout.tsx` + `TopbarContext.tsx` nuevo) cumple con fidelidad de valores exactos
(paddings, radios, colores, tamaños en px) contra `docs/design.md §§6, 7.1`, elimina el modo oscuro
sin residuos funcionales, preserva el role-gating sin regresión, y compila/lintea sin
regresiones nuevas. Las desviaciones menores (título 24px vs 26px, avatar Clerk sin envoltorio
custom, selector de tenant no implementado, `@custom-variant dark` residual fuera de sandbox) están
documentadas y acotadas a etapas futuras ya planificadas (UX-33/34/35). Apruebo el cierre de UX-32.

**Siguiente feature a activar:** `UX-33` (Dashboard, tablas y listados), que permanece en
`"pending"` — su activación (`"in_progress"`) es responsabilidad del leader, no de este reviewer.

## Acción tomada sobre `feature_list.json`

Actualizado el campo `"status"` de la feature `UX-32` de `"in_progress"` a `"done"`. No se tocó el
`"status"` de ninguna otra feature (UX-33 permanece `"pending"`).
