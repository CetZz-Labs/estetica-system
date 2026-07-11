# impl_merge-design-frontend.md

## Contexto

Resolución manual de los 6 archivos con conflicto de contenido (`UU`) del merge `design` → `dev/facu`
(rama actual `dev/facu`, `MERGE_HEAD` presente al iniciar). El commit de merge **no se realizó** —
se deja pendiente para que el leader/reviewer audite antes de cerrar (`git commit`).

Objetivo en cada archivo: preservar el 100% de la funcionalidad de `dev/facu` (HEAD, UX-12→UX-30,
EP-16, EP-17/17-b) y adoptar el restyling de `design` (tokens de tema `bg-card`/`text-foreground`/
`border-border`/etc., dark mode, iconografía) donde no contradiga esa funcionalidad.

## Archivos resueltos

### 1. `apps/client/src/components/ui/Modal.tsx`
- Conflicto: una sola línea de `className` del contenedor interno.
- Resolución: se preservó `onClick={(e) => e.stopPropagation()}` de HEAD (UX-22 — evita que el
  click dentro del modal burbujee al backdrop y lo cierre), adoptando el `className` de `design`
  (`bg-card border-border rounded-lg`, tokens de tema en vez de `bg-maison-card`/`maison-border`).
- Riesgo UX-22 verificado: el handler de cierre sigue solo en el `<div>` overlay (backdrop); el
  contenedor interno detiene la propagación — comportamiento intacto.

### 2. `apps/client/src/components/RegistroModal.tsx`
- Conflicto: un solo bloque, el campo "Próximo Retoque".
- Resolución: se mantuvo íntegro el bloque de HEAD — `<input type="date" min={getTodayDateString()}>`
  (UX-27/28, importado de `utils/dates.ts`) + `Controller` de `react-select` con portal
  (`menuPortalTarget={document.body}`, UX-24) y validación cruzada fecha/hora para el slot de
  retoque (UX-17 aplicado también al retoque). Se descartó el `<input type="datetime-local">` de
  `design` (versión pre-UX-17, sin selector de slots).
- Ajustes de estilo aplicados del lado `design`: `focus:ring-ring focus:border-ring` en el input de
  fecha; se reemplazó la clase legacy `text-maison-red` (ya no definida en el `index.css` post-merge)
  por `text-destructive` para el mensaje de error, consistente con el resto del archivo.

### 3. `apps/client/src/layouts/AppLayout.tsx`
- Conflicto: cierre del bloque de navegación "Configuración" (rol ADMIN).
- Resolución: se cerró el `<>` fragment (estructura de `design`, ya adoptada sin conflicto en las
  líneas previas del mismo bloque — ícono `FiBriefcase`/`FiClock` + wrapper de header en `<div>`
  autocerrado) **sin** reincorporar el `NavLink` a `/configuracion/notificaciones` que traía
  `design`. Motivo: la vista `Notificaciones.tsx` fue eliminada por decisión de producto ya cerrada
  en EP-17-b (SMTP global, sin configuración por tenant) y resuelta previamente por el leader
  (conflicto modify/delete, se mantiene el archivo eliminado). Reagregar el link habría dejado una
  entrada de sidebar apuntando a una ruta inexistente.
  Se removió el import ahora no usado `FiBell`.
- Las entradas de nav de UX-30 (`/historial`) y el resto de la jerarquía ya estaban auto-mergeadas
  sin conflicto (git las intercaló correctamente); no requirieron intervención.

### 4. `apps/client/src/views/Dashboard.tsx`
- 3 conflictos:
  1. **Imports de íconos**: unión de ambos sets (`FiTrash2, FiUser, FiClock, FiExternalLink, FiEdit2`
     de HEAD + `FiZap` de `design`). Se descartó `FiCalendar` del set de HEAD por quedar sin uso.
  2. **Card de "Próximos retoques"**: el lado `design` había perdido el `<button onClick={() =>
     openRetoqueDetail(registro)}>` que abre el modal de detalle (dependencia directa de UX-28,
     edición inline de fecha de retoque). Se reconstruyó envolviendo el contenido con el mismo
     `<button>` de HEAD pero con las clases/tokens de `design` (`bg-card`, `bg-primary/10`,
     `text-foreground`, `ring-card` en el dot de estado en vez de `ring-white`).
  3. **Card de "Próximos turnos"**: mismo patrón — se reintrodujo el `<button onClick={() =>
     setSelectedAppointmentDetail(appt)}>` (abre el modal de detalle de turno) dentro del `<div>`
     restyleado de `design`, adoptando también el indicador de color rediseñado (barra vertical
     `w-1 h-8` en vez del punto `w-3 h-3` de HEAD).
- El resto del archivo (KPIs, hero card, últimos movimientos, modal de detalle de retoque con
  edición inline UX-28) ya estaba auto-mergeado sin conflicto y no se tocó.

### 5. `apps/client/src/views/Inventario.tsx`
- Conflicto: acciones de fila de la tabla.
- Resolución: se tomaron las clases restyleadas de `design` para los botones "Stock" y "Editar"
  (`bg-card`, `hover:-translate-y-0.5`, etc.) y se **agregó de vuelta** el botón de eliminación
  rápida por fila (`FiTrash2` + `handleDeleteProduct`, UX-19) que `design` había omitido, estilizado
  de forma consistente con los otros dos botones (`hover:text-destructive`).

### 6. `apps/client/src/views/Turnos.tsx` (el más complejo — 4 conflictos)
  1. **Función auxiliar tope de archivo**: se conservó `getProfessionalInitials()` de HEAD (usada
     por la leyenda de profesionales, UX-29). Se descartó la definición local `STATUS_PALETTE` /
     `getStatusPalette()` de `design` porque HEAD ya extrajo esa lógica a
     `utils/appointmentStatus.tsx` (importada en la línea 32) — mantenerla habría duplicado la
     declaración y roto el build.
  2. **Filtro de profesional + leyenda (UX-29)**: se preservó la estructura completa de HEAD
     (`professionals.length > 0` envolvente, `<select>` de filtro solo si hay >1 profesional, y la
     leyenda con iniciales `getProfessionalInitials` alineada a la derecha vía `sm:ml-auto`),
     aplicando los tokens de `design` (`bg-background`, `border-border`, `text-foreground`,
     `focus:ring-ring`) que antes eran `bg-maison-bg`/`maison-border`/`maison-text`.
  3. **Campo Fecha/Hora del formulario de turno (UX-17)**: se preservó el grid de dos campos de
     HEAD — `<input type="date" min={getTodayDateString()}>` + `Controller` de `react-select` con
     portal (`menuPortalTarget`, UX-24) y validación de horario no anterior al actual — descartando
     el `<input type="datetime-local">` simple de `design` (pre-UX-17). Se aplicaron los tokens de
     `design` (`bg-background`, `border-border`/`border-destructive`, `focus:ring-ring`) en lugar de
     `bg-maison-bg`/`maison-red`.
  4. **Footer y cuerpo del modal de detalle de turno**: `design` había vuelto a inlinear el JSX del
     detalle y del footer de acciones (cancelar/editar/completar) directamente en `Turnos.tsx`, sin
     saber que HEAD ya lo había extraído a un componente compartido
     `components/AppointmentDetail.tsx` (`AppointmentDetail` + `AppointmentDetailFooter`, usado
     también por `Dashboard.tsx` para el modal "Detalle del Turno"). Reincorporar el JSX de `design`
     tal cual habría duplicado el componente y desincronizado `Dashboard.tsx`. En su lugar se
     mantuvieron las dos llamadas de HEAD al componente compartido
     (`<AppointmentDetailFooter .../>` y `<AppointmentDetail appointment={...} />`) y — para no
     perder el restyling que `design` quería para esta pantalla — **se actualizó el componente
     compartido** `apps/client/src/components/AppointmentDetail.tsx` (fuera de los 6 archivos con
     marcadores de conflicto, pero directamente implicado por esta resolución) reemplazando sus
     clases legacy (`bg-maison-bg`, `text-maison-text`, `text-maison-red`, `bg-maison-primary`, etc.)
     por los tokens nuevos de `design` (`bg-background`, `text-foreground`, `text-destructive`,
     `bg-primary`, `hover:-translate-y-0.5 hover:shadow-md`, etc.), igual que la versión que `design`
     tenía inline en `Turnos.tsx`. Este cambio beneficia automáticamente también a `Dashboard.tsx`,
     que consume el mismo componente.

## Cambio adicional fuera de los 6 archivos (justificado por el conflicto #6.4 de Turnos.tsx)

- **`apps/client/src/utils/appointmentStatus.tsx`** (archivo nuevo solo-HEAD, sin conflicto de
  merge): se actualizó `STATUS_PALETTE` de colores hex fijos (`#ECFDF5`, `#FEF2F2`, etc.) a
  variables CSS de tema (`var(--color-ring-subtle)`, `var(--color-destructive-subtle)`, etc.),
  igualando los valores que `design` había puesto en su `STATUS_PALETTE` local descartada en
  `Turnos.tsx` (ver punto 6.1). Es el único consumidor de `getStatusPalette()` en todo el código
  (`grep` confirmó un solo call-site, en `Turnos.tsx`), por lo que el cambio no afecta otras
  vistas y habilita que el calendario respete dark mode sin duplicar la función.

## Verificación

- `CI=true pnpm install` — necesario porque el merge trajo `gsap`, `@gsap/react` y `ogl` nuevos en
  `package.json`/`pnpm-lock.yaml` (componentes `react-bits/` de `design`, ya auto-mergeados sin
  conflicto) que no estaban instalados en `node_modules`. No se agregó ninguna dependencia nueva de
  mi parte — solo se sincronizó `node_modules` con el lockfile ya mergeado.
- `pnpm --filter @estetica/client build` → **exit code 0** (`tsc -b && vite build` correcto, único
  warning de tamaño de chunk >500kB, no bloqueante).
- `pnpm --filter @estetica/client lint` → **exit code 1**, con 6 errores. Solo 1 es el
  preexistente esperado (`ProductoModal.tsx:37:25`, variable `stock` sin usar). Los otros 5 son
  **preexistentes en archivos de `design` que no forman parte de los 6 conflictos ni fueron
  tocados por esta resolución** (fuera de mi sandbox de tarea):
  - `components/react-bits/Aurora/Aurora.tsx:126:5` — acceso a ref durante render.
  - `components/react-bits/Aurora/Aurora.tsx:145:13` — `prefer-const`.
  - `components/react-bits/SplitText/SplitText.tsx:49:13` — `setState` síncrono en efecto.
  - `components/react-bits/TextType/TextType.tsx:169:9` — acceso a ref durante render.
  - `views/AceptarInvitacion.tsx:64:20` — hook `useIsDark` llamado condicionalmente (regla
    `react-hooks/rules-of-hooks`).
  Estos 5 errores vienen del contenido propio de la rama `design` (archivos nuevos o auto-mergeados
  sin conflicto) y no corresponden al alcance de esta tarea de resolución de merge. Se reportan
  aquí para que el leader decida si los deriva a un `implementer` de seguimiento antes de cerrar el
  merge commit.

## Estado final

- Los 6 archivos con conflicto: marcadores eliminados, `git add` aplicado, sin restos `<<<<<<<` /
  `=======` / `>>>>>>>` (verificado con grep).
- `git status` ya no muestra rutas `UU`/`AA`/`DD` — el merge queda **resuelto pero sin commitear**,
  a la espera de auditoría del leader/reviewer.
- **No se ejecutó `git commit`**, conforme a la instrucción explícita de la tarea.

## Fix post-review: migración de tokens maison-* residuales

**Veredicto original del reviewer:** `CHANGES_REQUESTED` (`progress/reviews/review_merge-design.md`).
Causa raíz: el `index.css` de `design` (auto-mergeado sin conflicto) **elimina** las variables de
tema legacy `--color-maison-*` sin período de transición. Yo había migrado proactivamente
`AppointmentDetail.tsx`/`appointmentStatus.tsx` a los tokens nuevos (ver sección anterior) pero no
apliqué el mismo criterio a otras secciones de contenido post-divergencia de `dev/facu` que
tampoco tenían marcador de conflicto. El reviewer detectó 4 archivos con clases `maison-*` sin
resolver (ya no generan ninguna regla CSS — no-op silencioso de Tailwind v4, no error de build).

Mapeo de migración aplicado (idéntico criterio en los 4 archivos, coherente con
`AppointmentDetail.tsx`):
`bg-maison-primary`→`bg-primary` (+ `hover:bg-black`→`hover:bg-primary/90`), `text-maison-primary`→
`text-primary`, `text-maison-red`/`border-maison-red`→`text-destructive`/`border-destructive`,
`bg-maison-bg`→`bg-background`, `bg-maison-card`→`bg-card`, `border-maison-border`→`border-border`,
`text-maison-text`→`text-foreground`, radios `rounded-2xl`/`rounded-xl` legacy → `rounded-lg`
(estándar del sistema de `design` ya usado en el resto de vistas restyleadas).

### 1. `apps/client/src/views/Dashboard.tsx` — sección "Detalle del Retoque" (UX-28)
- Footer del modal (botones "Cancelar retoque"/"Registrar Visita"): migrado a
  `text-muted-foreground hover:text-destructive` y `bg-primary hover:bg-primary/90`.
- Los 4 bloques de info (cliente, servicio, profesional, fecha de retoque): `bg-maison-bg
  border-maison-border` → `bg-background border-border`; ícono contenedor `bg-white` → `bg-card`;
  texto `text-maison-text` → `text-foreground`; textos secundarios `text-gray-500` →
  `text-muted-foreground` para heredar dark mode correctamente.
- Edición inline de fecha de retoque (UX-28): inputs de fecha/hora `bg-white border-gray-200` →
  `bg-card border-border`; botón **"Guardar"** (el que el reviewer marcó explícitamente en riesgo,
  línea 607) `bg-maison-primary hover:bg-black` → `bg-primary hover:bg-primary/90`; botón "Cancelar"
  → `text-muted-foreground hover:text-foreground`; botón de lápiz (editar) →
  `text-muted-foreground hover:text-primary`.
- Lista de productos usados y notas: `bg-gray-50 border-gray-200` → `bg-muted border-border`;
  `text-maison-text` → `text-foreground`.
- Link "Ir a ficha del cliente": `text-maison-primary` → `text-primary`.
- Verificado con `grep -n "maison" Dashboard.tsx` → 0 resultados.

### 2. `apps/client/src/views/Turnos.tsx` — `<Tooltip>` del calendario (UX-26, línea ~577)
- `className="!bg-maison-primary !text-white ..."` → `className="!bg-primary
  !text-primary-foreground ..."` (usa el token `--color-primary-foreground` ya definido en
  `index.css`, theme-aware en vez de `!text-white` fijo).
- Verificado con `grep -n "maison" Turnos.tsx` → 0 resultados.

### 3. `apps/client/src/views/Historial.tsx` (UX-30, vista completa)
- Header, card de filtros y card de tabla: `bg-maison-card`/`border-maison-border` →
  `bg-card`/`border-border`; `text-maison-text` → `text-foreground`; labels `text-gray-400`/
  `text-gray-500` → `text-muted-foreground` (consistencia con el resto de vistas restyleadas,
  p. ej. `Inventario.tsx`).
- Inputs de rango de fecha (`Desde`/`Hasta`): `bg-maison-bg border-maison-border` →
  `bg-background border-border`, agregado `focus:ring-ring focus:border-ring` (patrón ya usado en
  el resto del sistema).
- Botón "Limpiar filtros": `text-gray-600 hover:bg-gray-100 border-gray-200` →
  `text-muted-foreground hover:bg-muted border-border`.
- Tabla: header `border-maison-border bg-maison-bg/50` → `border-border bg-background/50`;
  `divide-maison-border` → `divide-border`; fila hover `hover:bg-gray-50` → `hover:bg-muted/50`;
  skeleton `bg-gray-200` → `bg-muted`; estado de error `border-red-300 bg-red-50 text-red-700` →
  `border-destructive/30 bg-destructive/10 text-destructive` (mantiene la trifecta: color +
  ícono `FiAlertCircle` + texto); estado vacío `text-maison-text/60` → `text-muted-foreground/60`;
  celdas de dato `text-gray-600`/`text-gray-400` → `text-muted-foreground`/`text-muted-foreground/70`.
- Comentario inline de `selectStyles` (`// bg-maison-bg`) corregido a `// bg-background` (no
  afectaba runtime, solo referencia textual desactualizada).
- Verificado con `grep -n "maison" Historial.tsx` → 0 resultados.

### 4. `apps/client/src/views/Negocio.tsx` — sección "Recordatorio de turno" (EP-17-b)
- Card contenedora: `bg-maison-card border-maison-border rounded-2xl` → `bg-card border-border
  rounded-lg` (igual al resto de cards ya migradas en el mismo archivo, ver sección "Datos del
  Negocio" más arriba, que ya usaba estos tokens sin conflicto).
- Ícono y título: `text-gray-400`/`text-maison-text` → `text-muted-foreground`/`text-foreground`.
- Input "Horas de anticipación": `bg-maison-bg` → `bg-background`; estado de error
  `border-maison-red` (línea 282) → `border-destructive` — **se mantiene la señal de color de la
  trifecta de accesibilidad** en el borde del input inválido.
- Mensaje de error (línea 291): `text-maison-red` → `text-destructive` (color) + ícono
  `FiAlertCircle` (ya presente, sin cambios) + texto del mensaje — trifecta completa preservada.
- Botón "Guardar cambios": `bg-maison-primary hover:bg-black rounded-full` (transición simple) →
  `bg-primary hover:bg-primary/90 rounded-full` con las clases de microinteracción
  (`hover:-translate-y-0.5 hover:shadow-md active:translate-y-0 active:shadow-sm`) ya usadas por el
  botón equivalente del formulario "Datos del Negocio" en el mismo archivo, para consistencia
  visual entre ambos formularios de la misma vista.
- Verificado con `grep -n "maison" Negocio.tsx` → 0 resultados.

### Verificación post-fix
- `grep -rln "maison" apps/client/src` → solo `utils/contrastColor.ts` (comentario de
  documentación mencionando el nombre histórico del sistema de diseño, no una clase Tailwind — no
  afecta runtime, fuera de alcance).
- `pnpm --filter @estetica/client build` → **exit code 0**, sin cambios en el resumen de tamaño de
  bundle.
- `grep -c "maison" apps/client/dist/assets/*.css` → **0** (confirmado en el CSS compilado, no solo
  en el fuente).
- `pnpm --filter @estetica/client lint` → exit code 1 con **los mismos 6 errores / 4 warnings
  preexistentes**, comparados línea por línea contra la corrida anterior — ningún error nuevo
  introducido por esta migración.
- `git add` aplicado a los 4 archivos (`Dashboard.tsx`, `Turnos.tsx`, `Historial.tsx`,
  `Negocio.tsx`). `git status` sigue sin `UU`/`AA`/`DD`. **Sin `git commit`**, a la espera de la
  segunda pasada del reviewer.

## Bloqueante para decisión del leader

No hay bloqueantes que impidan continuar — no se encontró ninguna pérdida de funcionalidad
irreconciliable en los 6 archivos. El único punto que requiere decisión (no técnica, sino de
alcance) es si los 5 errores de lint preexistentes en archivos de `design` (arriba) se corrigen
como parte de esta misma sesión de merge o se derivan a una tarea de seguimiento — no se tocaron
por estar fuera del sandbox de los 6 archivos asignados.
