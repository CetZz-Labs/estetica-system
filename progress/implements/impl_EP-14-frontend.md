# Implementation Evidence — EP-14 Frontend

**Feature:** EP-14 — Crear y gestionar turnos (Frontend)
**Module:** Appointments
**Date:** 2026-06-16
**Role:** Frontend implementer (sandbox: `apps/client/`)

## Files Created

| File | Description |
|------|-------------|
| `apps/client/src/api/appointmentApi.ts` | API layer for Appointments (CRUD + cancel + client history) |
| `apps/client/src/views/Turnos.tsx` | Main calendar page with FullCalendar, 3 modals, 4 states |

## Files Modified

| File | Change |
|------|--------|
| `apps/client/src/types/index.ts` | Added `Appointment`, `AdminSlim` interfaces; added `duration` field to `Service` |
| `apps/client/src/router.tsx` | Added `/turnos` route pointing to `Turnos` view |
| `apps/client/src/layouts/AppLayout.tsx` | Added "Turnos" NavLink in sidebar after "Inventario" |
| `apps/client/package.json` | Added `@fullcalendar/react`, `@fullcalendar/core`, `@fullcalendar/timegrid`, `@fullcalendar/interaction`, `@fullcalendar/daygrid` |

## Architecture

### API Layer (`appointmentApi.ts`)
- Pattern follows `serviceApi.ts` exactly
- Functions: `getAppointments`, `getAppointmentById`, `createAppointment`, `updateAppointment`, `cancelAppointment`, `getClientAppointments`
- Uses centralized `api` axios instance from `src/libs/axios`
- TypeScript interfaces for form data and query params co-located

### View (`Turnos.tsx`)
- **State management:** `useState` for modals, selected appointment, date range, professional filter
- **Data fetching:** `useQuery` with `['appointments', start, end]` key, enabled only when dateRange is set
- **Mutations:** `useMutation` for create, update, cancel with proper invalidation and 409 overlap handling
- **Derived state:** `useMemo` for FullCalendar events, select options, professionals list
- **Calendar:** `@fullcalendar/react` with timeGridPlugin (day/week views), interactionPlugin (drag & drop), dayGridPlugin
- **4 states:** Loading (skeleton grid with `animate-pulse`), Error (trifecta: `FiAlertCircle` + `text-maison-red` + text), Empty (calendar icon + message), Data (FullCalendar)
- **3 modals:**
  1. **TurnoFormModal** (create/edit) — `react-hook-form` + `react-select` for client, service; `datetime-local` for time; hidden professional field; duration hint from selected service
  2. **TurnoDetailModal** — full info with status badge, client card, service card, time card, notes, cancellation info; Edit/Cancel buttons for pending/confirmed appointments
  3. **CancelTurnoModal** — optional reason textarea + confirm

### Styling
- FullCalendar overrides via `<style>` tag matching Maison design tokens
- Follows `docs/design.md` conventions (font families, colors, border radius, shadows)
- react-select styled via `StylesConfig` matching `RegistroModal.tsx` pattern
- All buttons follow documented button patterns

### Route & Navigation
- `/turnos` route added inside `AppLayout` route group
- Sidebar link "Turnos" between "Inventario" and "Configuración"

## Build Verification
- `pnpm --filter @estetica/client build` → Exit Code 0 (success)
- TypeScript compilation: no errors
- Vite build: 281 modules transformed, output generated

## Notes
- Professional filter appears only when multiple professionals are detected in appointments data
- Drag & drop rescheduling triggers `updateAppointment` with new start time
- Overlap (409) errors show specific toast warning
- `duration` field assumed present on Service type (backend now returns it)
