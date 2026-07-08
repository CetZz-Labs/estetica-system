# Reporte de Revisión Técnica — Feature UX-18

**Veredicto Final:** CHANGES_REQUESTED
**Auditor:** Subagente Reviewer
**Timestamp:** 2026-07-07

## Contexto Auditado

- `progress/implements/impl_UX-18.md` (dos rondas: implementación inicial + fix de z-index del tooltip).
- `git diff -- apps/client/src/views/Turnos.tsx apps/client/package.json` (working tree, sin commitear).
- Nuevo: `apps/client/src/utils/contrastColor.ts`.
- `feature_list.json` id `UX-18` (5 criterios de aceptación), `docs/design.md`, `.claude/rules/frontend.md`, `CHECKPOINTS.md`.
- Build y lint corridos por este auditor (no solo confirmación del implementer).

## Verificación de Builds (Responsabilidad del Leader/Auditor)

- `pnpm --filter @estetica/client build` → **Exit Code 0** confirmado por este auditor (`tsc -b && vite build`, único warning preexistente de chunk >500kB, no relacionado a la feature).
- `pnpm --filter @estetica/client lint` → Exit Code 1, pero **sin regresión**: comparé contra el baseline pre-UX-18 (`git stash` + re-lint) y el resultado es **idéntico**: 5 problemas (1 error preexistente en `ProductoModal.tsx:37`, 4 warnings preexistentes del React Compiler por `watch()` de react-hook-form en `ProfesionalModal.tsx`, `RegistroModal.tsx`, `Negocio.tsx`, `Turnos.tsx`). Cero hallazgos nuevos atribuibles a esta feature. **Cumple el gate de "sin errores/warnings nuevos".**
- No hay cambios en `apps/server/`; no aplica build de backend a esta feature (sandbox hermético respetado).

## Verificación de Criterios de Aceptación

1. **Franja/leyenda de profesionales** (`Turnos.tsx:452-467`) → Cumplido. Itera `professionals`, avatar circular `rounded-full` con `backgroundColor: p.color` + iniciales + nombre, visible si hay ≥1 profesional activo, independiente del filtro de profesional único.
2. **Colores sólidos + contraste dinámico + trifecta** → Cumplido. Verificado en el diff: `backgroundColor: professionalColor || palette.bg` (línea 186, sin `hexToRgba`), `textColor: professionalColor ? getContrastTextColor(professionalColor) : palette.text` (línea 188). `hexToRgba` fue **eliminada del archivo**, no solo dejada sin uso — confirmado con `grep -n "hexToRgba" apps/client/src/views/Turnos.tsx` (sin resultados). El ícono de estado (`getStatusIcon`) quedó **siempre presente** en ambas ramas de `eventContent` (antes condicional al dot de profesional) — trifecta completa (color sólido + ícono + texto de hora/cliente/servicio).
3. **Tooltip al hover** → Cumplido funcionalmente (ver Punto 3 más abajo sobre el detalle de implementación de la hora mostrada).
4. **Drag&drop y vistas día/semana/mes intactas** → Cumplido. `git diff` confirma que `eventDrop={handleEventDrop}`, `dateClick={handleDateClick}`, `eventClick={handleEventClick}`, `eventOverlap={...}`, `businessHours={calendarBusinessHours}`, `initialView="timeGridWeek"` y `headerToolbar={{ ..., right: 'dayGridMonth,timeGridWeek,timeGridDay' }}` permanecen byte-idénticos; el único agregado es la prop nueva `eventDidMount={handleEventDidMount}` (línea 566), que no pisa ninguna prop existente. El diff es estrictamente aditivo en esta zona.
5. **Responsive** → Cumplido. Leyenda con `flex flex-wrap items-center gap-x-4 gap-y-2 overflow-x-auto`, sin JS de media queries, consistente con la convención Tailwind-only del proyecto.

## Puntos de Auditoría Específicos Solicitados

1. **Fórmula de contraste (`contrastColor.ts`):** Matemáticamente razonable. YIQ brightness `(R*299+G*587+B*114)/1000`, umbral 128 (guía W3C AERT, documentada con cita en el propio archivo). Verificado mentalmente: `#000000` → brightness 0 → `< 128` → devuelve `WHITE` (correcto). `#FFFFFF` → brightness 255 → `>= 128` → devuelve `MAISON_TEXT` oscuro (correcto). Maneja el hex con o sin `#` (`hexColor.replace('#', '')` en línea 22). Sin `any`, tipado explícito, función pura sin dependencias de React/Mongoose — correctamente ubicada en `src/utils/`.
2. **Colores sólidos:** Confirmado — `hexToRgba` fue eliminada del archivo (no solo huérfana), y el ícono de estado (`getStatusIcon`) está siempre presente en las 3 vistas. Ver criterio 2 arriba.
3. **Fix del tooltip (z-index):** Confirmado. `portalRoot={document.body}` y `positionStrategy="fixed"` están efectivamente en el `<Tooltip>` de `Turnos.tsx` (líneas 576-581). Verificado contra `apps/client/node_modules/react-tooltip/dist/react-tooltip.d.ts`: `portalRoot?: Element | null` (línea 102) y `positionStrategy?: PositionStrategy` (línea 112) existen en la interfaz `ITooltipController` de la versión instalada (`react-tooltip@6.0.8`, confirmado en `pnpm-lock.yaml`). El razonamiento del implementer sobre el stacking context de FullCalendar es coherente con el comportamiento documentado de la librería.
4. **`eventDidMount`:** Confirmado — setea `data-tooltip-id="appointment-tooltip"` y `data-tooltip-content` (líneas 275-276) sobre `info.el`. Es una prop de FullCalendar completamente independiente de `eventClick` (no hay `preventDefault`/`stopPropagation` ni valor de retorno que intercepte el click); el modal de detalle sigue abriendo vía `eventClick={handleEventClick}` sin alteración.
5. **Drag&drop y resto de funcionalidad:** Confirmado aditivo. Ver criterio 4 arriba.
6. **Diseño:** Avatares `rounded-full` con `shadow-sm` (permitido, `shadow-lg` prohibido pero no usado), sin gradientes, sin colores fuera de token **excepto** el color arbitrario del profesional — precedente ya aceptado y verificado en `Profesionales.tsx:138` (`style={{ backgroundColor: profesional.color }}`), mismo patrón reutilizado en la nueva leyenda de `Turnos.tsx`. Cumple `docs/design.md`.

## Hallazgo Bloqueante (no señalado en los puntos de auditoría, detectado en auditoría transversal)

**`apps/client/src/views/Turnos.tsx:273`** (código 100% nuevo de esta feature, dentro de `handleEventDidMount`):

```tsx
const timeStr = new Date(appointment.startTime).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit', hour12: false });
```

Esto viola directamente `.claude/rules/frontend.md` §4:

> **Gate de rechazo:** cualquier `toLocaleDateString`/`toLocaleString` nuevo que no delegue en el helper compartido se rechaza, aunque compile.

Y el checkpoint C3 (Frontend): *"Formateo de Fechas con Helper Compartido: Toda fecha en la UI usa el helper compartido de fechas [...]. Prohibido reimplementar `toLocaleDateString`/`toLocaleString` ad-hoc."*

Agravante: `apps/client/src/utils/dates.ts:115-117` **ya expone exactamente esta función**:

```ts
export const formatTime = (dateString: string): string => {
    return new Date(dateString).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit', hour12: false });
};
```

El literal `toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit', hour12: false })` de la línea 273 es carácter por carácter idéntico al cuerpo de `formatTime`. El implementer debió importar `formatTime` de `../utils/dates` y llamar `formatTime(appointment.startTime)` en lugar de reimplementar el literal in-line. Nota de contexto: existe deuda preexistente idéntica en `Turnos.tsx:542` (documentada en `progress/current.md` como deuda de UX-14, no introducida por esta feature) — pero la línea 273 es código **nuevo** de UX-18, no deuda heredada, y el gate es explícito en que aplica a "cualquier ocurrencia nueva". No se justifica repetir el antipatrón cuando el helper correcto ya existe en el mismo repositorio y hace exactamente lo pedido.

Esto no es un defecto cosmético menor: es un gate de rechazo explícito y documentado, con una solución de una línea disponible (`import { formatTime } from '../utils/dates';` + reemplazar la línea 273).

## Mapeo de Checkpoints (Quality Gates)

- [x] C2 (Coherencia de Estados y Enfoque Atómico) — única feature `in_progress`, `progress/current.md` describe correctamente el estado, sandbox hermético (solo `apps/client/`).
- [ ] C3 (Fidelidad Arquitectónica) — violación puntual: `Turnos.tsx:273` reimplementa `toLocaleTimeString` ad-hoc en vez de usar el helper `formatTime` ya existente (frontend.md §4, gate de rechazo explícito). Resto de C3 (desacoplamiento de datos, 4 estados, sin filtrado client-side, HTML semántico, axios centralizado, sonner, export default, tipado) sin hallazgos.
- [x] C4 (Compilación Estática + Lint) — build Exit 0 confirmado por este auditor; lint sin regresiones (verificado por comparación de baseline con `git stash`).
- [ ] C5 (Cierre de Sesión Append-Only) — no aplica cierre todavía: el veredicto es CHANGES_REQUESTED, por lo tanto no corresponde marcar `"done"` ni escribir la minuta de cierre en `progress/history.md` hasta resolver el hallazgo bloqueante.
- [x] C6 (Capa de Datos) — no aplica (sin cambios de modelos/DB en esta feature).
- [x] C7 (Security Gate) — sin hallazgos. No hay `dangerouslySetInnerHTML`; el contenido del tooltip se pasa como atributo de texto plano (`data-tooltip-content`), no HTML, sin riesgo de inyección aun con nombre de cliente/servicio como input de usuario. Sin variables sensibles tocadas (`grep -rnE "(SECRET|KEY|PASSWORD|TOKEN)"` en `apps/server/src/` sin matches, y esta feature no toca backend). No aplica multi-tenancy/IDOR (sin queries nuevas).
- [x] C8 (Estabilidad de API) — no aplica: sin cambios de contrato de API (feature 100% frontend, sin tocar `apps/server/`).

## Nota de Proceso (sin impacto en el veredicto)

No fue posible verificar el hover del tooltip en un navegador real dentro de este entorno (Clerk requiere credenciales de cuenta de prueba no disponibles para el agente) — limitación de proceso ya documentada en `progress/current.md` para toda la sesión. El usuario sí probó una versión intermedia en vivo y reportó el bug de z-index, que fue corregido con `portalRoot`/`positionStrategy` y verificado estáticamente contra los tipos de la librería instalada. Esta limitación no bloquea el veredicto — la verificación de código + build/lint es la evidencia disponible en este entorno.

## Cambios Requeridos

1. `apps/client/src/views/Turnos.tsx:273`: reemplazar `new Date(appointment.startTime).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit', hour12: false })` por una llamada al helper compartido `formatTime(appointment.startTime)` (importado de `../utils/dates`), tal como exige `.claude/rules/frontend.md` §4 ("cualquier `toLocaleDateString`/`toLocaleString` nuevo que no delegue en el helper compartido se rechaza, aunque compile") y el checkpoint C3 de `CHECKPOINTS.md`. No se pide tocar la deuda preexistente de la línea 542 (fuera de alcance de UX-18), solo la ocurrencia nueva introducida por esta feature.

Tras aplicar esta corrección puntual (build/lint ya verificados en 0 regresiones), la feature queda en condiciones de re-auditoría rápida para pasar a `"done"`.

---

## Re-revisión (2026-07-07)

**Veredicto Final:** APPROVED

**Alcance de esta ronda:** verificación puntual del único hallazgo bloqueante de la ronda anterior (`Turnos.tsx:273`), documentado como resuelto en `progress/implements/impl_UX-18.md` sección "Fix post-review".

1. **Línea 273 usa el helper compartido.** Confirmado en el diff actual (`git diff -- apps/client/src/views/Turnos.tsx`):
   ```tsx
   const handleEventDidMount = useCallback((info: EventMountArg) => {
       const appointment = info.event.extendedProps.appointment as Appointment;
       const timeStr = formatTime(appointment.startTime);
       ...
   ```
   Ya no hay ningún `toLocaleTimeString`/`toLocaleDateString` reimplementado en `handleEventDidMount`. `grep -n "toLocaleTimeString|toLocaleDateString" apps/client/src/views/Turnos.tsx` arroja **una sola ocurrencia**: línea 543, dentro de `eventContent`, deuda preexistente de UX-14 explícitamente fuera del alcance de este fix (así lo delimitó esta misma revisión en la ronda anterior — "No se pide tocar la deuda preexistente de la línea 542"). No se introdujo ninguna reimplementación nueva.
2. **Import correcto y no duplicado.** `Turnos.tsx:35` agrega `import { formatTime } from '../utils/dates';`. Confirmé que no existía ningún import previo de `../utils/dates` en el archivo (el `grep` del diff muestra esta como la única línea de import de ese módulo) — no hay duplicación ni import roto. La firma `formatTime(dateString: string): string` coincide con el tipo de `Appointment.startTime` (`string`), sin necesidad de casteos.
3. **Diff acotado al fix pedido.** El `git diff` completo de `Turnos.tsx` corresponde íntegramente al alcance ya auditado de UX-18 (franja de profesionales, colores sólidos, tooltip, fix de z-index) más las dos líneas de este fix puntual (import + reemplazo de `timeStr`). No hay cambios inesperados fuera de lo documentado en `impl_UX-18.md`. Nada de esto está commiteado todavía (`git status --short` muestra los mismos archivos de la ronda anterior: `Turnos.tsx`, `package.json`, `pnpm-lock.yaml`, `feature_list.json`, `progress/current.md`, más los `?? ` nuevos de `progress/`), consistente con que se trata del mismo working tree ya revisado, solo con el fix aplicado encima.
4. **Build y lint corridos por este auditor:**
   - `pnpm --filter @estetica/client build` → **Exit Code 0** (`tsc -b && vite build`, único warning preexistente de chunk >500kB).
   - `pnpm --filter @estetica/client lint` → Exit Code 1, **idéntico al baseline** ya documentado en la ronda anterior: 1 error preexistente (`ProductoModal.tsx:37`) + 4 warnings preexistentes de React Compiler (`ProfesionalModal.tsx`, `RegistroModal.tsx`, `Negocio.tsx`, `Turnos.tsx:214`). Cero hallazgos nuevos.
5. **Sin necesidad de re-auditar el resto de UX-18.** El único punto pendiente de la ronda anterior era este hallazgo puntual; el resto de los 5 criterios de aceptación y checkpoints ya habían sido marcados `[x]` y no fueron tocados por este fix.

### Mapeo de Checkpoints (actualizado)

- [x] C2 (Coherencia de Estados y Enfoque Atómico)
- [x] C3 (Fidelidad Arquitectónica) — hallazgo bloqueante resuelto: `Turnos.tsx:273` ahora delega en `formatTime()` de `../utils/dates`.
- [x] C4 (Compilación Estática + Lint) — build Exit 0, lint sin regresiones.
- [x] C5 (Cierre de Sesión Append-Only) — corresponde ahora cerrar el circuito: `feature_list.json` pasa a `"done"`.
- [x] C6 (Capa de Datos) — no aplica.
- [x] C7 (Security Gate) — sin hallazgos (ver ronda anterior).
- [x] C8 (Estabilidad de API) — no aplica.

**Conclusión:** el hallazgo bloqueante fue corregido de forma quirúrgica, sin efectos colaterales. UX-18 queda **APPROVED**.
