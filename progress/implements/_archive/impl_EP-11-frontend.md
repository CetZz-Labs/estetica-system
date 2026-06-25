# Bitácora de Implementación — EP-11 Frontend (Profesionales agendables)

**Feature:** EP-11 — Gestión de Profesionales agendables
**Sandbox:** `apps/client/` (NO se tocó `apps/server/` ni config del monorepo)
**Fecha:** 2026-06-24
**Build:** `pnpm --filter @estetica/client build` → **Exit Code 0**
**Lint:** `pnpm --filter @estetica/client lint` → Exit Code 1 **por un error PRE-EXISTENTE fuera de EP-11** (ver §Lint). Los archivos de EP-11 son lint-clean (0 errors).

---

## Plan de acción ejecutado
- Tipos: `Professional`, `Appointment.professional` → `{_id,name,color}`, `ServiceRecord.professional?`.
- `professionalApi.ts` (mirror de serviceApi) con manejo del conflicto 409 en delete.
- Vista `Profesionales.tsx` + `ProfesionalModal.tsx` (CRUD, trifecta de estado, flujo de baja con turnos futuros).
- Selector de profesional (requerido) en `Turnos.tsx` y `RegistroModal.tsx`; filtro/colores reales en calendario.
- Profesional en historial de cliente (`ProfileClient.tsx`), tolerando legacy.
- Ruta `/profesionales` + entrada de sidebar "Profesionales".

---

## Archivos creados
| Archivo | Rol |
| --- | --- |
| `apps/client/src/api/professionalApi.ts` | Capa API. `ProfessionalFormData`, `LinkableAdmin`, `FutureAppointment`, clase `ProfessionalDeleteConflict`. Funciones: `getProfessionals(includeInactive?)`, `getLinkableAdmins()`, `createProfessional`, `updateProfessional`, `deleteProfessional(id, confirm?)`. El DELETE captura el 409 y relanza `ProfessionalDeleteConflict` con `futureAppointments` para que la vista lo muestre. |
| `apps/client/src/components/ProfesionalModal.tsx` | Modal RHF (mirror de ServicioModal). Campos `name` (req), `color` (`<input type="color">` + 8 swatches preset clickeables con `setValue`), select opcional "Vincular a usuario" poblado con `getLinkableAdmins()`. `reset()` en `useEffect` al abrir. Invalida `['professionals']`. |
| `apps/client/src/views/Profesionales.tsx` | Vista de gestión (mirror de Servicios). Usa `getProfessionals(true)` (incluye inactivas). 4 estados (skeleton / error trifecta color+icono+texto / empty / data). Cards con swatch de color, badge de estado **TRIFECTA** (Activa: verde+`FiCheckCircle`+texto / Inactiva: gris+`FiSlash`+texto). Acciones: editar, desactivar (`FiSlash`), reactivar (`FiRotateCcw`, `PUT isActive:true`). **Flujo de baja:** al recibir `ProfessionalDeleteConflict`, abre un `<Modal>` listando los turnos futuros (cliente·servicio·fecha) con aviso naranja+`FiAlertTriangle` y botón "Desactivar de todas formas" → reenvía `deleteProfessional(id, confirm:true)`. |

## Archivos modificados
| Archivo | Cambio |
| --- | --- |
| `apps/client/src/types/index.ts` | + `interface Professional`. `Appointment.professional` `{_id,email?}` → `{_id,name,color}`. + `professional?: {_id,name,color}` en `ServiceRecord`. |
| `apps/client/src/api/appointmentApi.ts` | + `professional: string` en `AppointmentFormData`. |
| `apps/client/src/api/serviceRecordApi.ts` | + `professional: string` en `ServiceRecordPayload`. |
| `apps/client/src/views/Turnos.tsx` | import `getProfessionals`/`Professional`; query `['professionals','active']`; `professional` en `AppointmentFormData` local + en todos los `reset()` (header, dateSelect, openEdit) + en el `<Controller>` selector requerido del form. Filtro del calendario ahora lista **nombres reales** de profesionales activas (no emails). Eventos coloreados con `professional.color` (borderColor). Bloque de profesional (dot color + nombre) en el modal de detalle. Prefill de profesional al completar turno → pasa `preselectedProfessionalId` a RegistroModal. |
| `apps/client/src/components/RegistroModal.tsx` | import `getProfessionals`/`Professional`; query `['professionals','active']`; nuevo prop `preselectedProfessionalId`; `professional` en defaultValues + `reset()`; `<Controller>` selector de profesional **requerido**. |
| `apps/client/src/views/ProfileClient.tsx` | import `FiUser`; cada visita del historial muestra la profesional (dot de color + nombre); legacy sin profesional → "Sin asignar". |
| `apps/client/src/router.tsx` | import `Profesionales`; ruta `/profesionales`. |
| `apps/client/src/layouts/AppLayout.tsx` | import `FiUsers`; sección separada "Equipo" con NavLink `/profesionales` ("Profesionales") + ícono `FiUsers`. |

---

## Decisiones aplicadas
- **Manejo del 409 en capa API:** `deleteProfessional` envuelve el delete en try/catch; ante status 409 relanza una clase de error tipada `ProfessionalDeleteConflict` (con `futureAppointments`). La vista distingue ese error vía `instanceof` y abre el modal de aviso; cualquier otro error cae en `handleApiError` + toast. Así no se rompe la convención de "datos solo vía `src/api/`".
- **Reasignación fina diferida a Turnos:** según el contrato, el modal de conflicto solo avisa y permite confirmar la baja forzada (`confirm:true`); la reasignación de cada turno se hace desde Turnos vía el `PUT` existente. Se invalidan `['professionals']` y `['appointments']` tras la baja.
- **Selector de profesional:** se usó `react-select` con `<Controller>` (mismo patrón ya presente en Turnos/RegistroModal) para consistencia visual y de validación inline. Requerido en creación de turno y de visita.
- **Colores en calendario:** se mantuvo la paleta de estado para el fondo del evento (semántica de estado intacta) y se usó el color de la profesional para el `borderColor`, evitando perder la señal de estado (overdue/cancelado/etc.).
- **Trifecta:** estado activa/inactiva en cards y el aviso de conflicto cumplen Color + Icono (`react-icons/fi`) + Texto. El estado de error de carga también (color rojo + `FiAlertCircle` + texto).
- **Prefill de profesional al completar turno:** se propaga `appointment.professional._id` al `RegistroModal` para que el registro herede la profesional del turno; el backend igualmente usa `appointment.professional` en el endpoint `complete`.

---

## Build
```
> @estetica/client@0.0.0 build
> tsc -b && vite build
✓ built in 4.09s
EXIT_CODE=0
```
(El warning de chunk > 500 kB es pre-existente y global, no introducido por EP-11.)

## Lint
`pnpm --filter @estetica/client lint` → **Exit Code 1**, causado por **1 error PRE-EXISTENTE ajeno a EP-11**:
```
src/components/ProductoModal.tsx
  37:25  error  'stock' is assigned a value but never used  @typescript-eslint/no-unused-vars
```
- `ProductoModal.tsx` NO fue tocado por EP-11 (no aparece en mi change-set; último commit que lo modificó: setup del monorepo). Está fuera del alcance de la feature.
- Verificación dirigida sobre los 11 archivos de EP-11 (`npx eslint <archivos EP-11>`): **0 errors**, solo 2 warnings `react-hooks/incompatible-library` por `watch()` — patrón benigno ya presente y aceptado en la codebase (Negocio.tsx, Turnos.tsx).

> No corregí `ProductoModal.tsx` por respetar el alcance estricto de EP-11 (la regla de no añadir cambios no parametrizados). Queda señalado al Leader como deuda de lint pre-existente.

---

## Notas
- NO se instalaron dependencias. NO se modificó `apps/server/`.
- `feature_list.json` NO fue modificado (cierre lo hace el reviewer).
