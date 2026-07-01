# impl_EP-17-notifSettings-frontend.md

## Feature
EP-17 — Recordatorio de turno por mail (Fase 4) — Stack 2: sección "Ajustes > Notificaciones" (frontend).

## Alcance de esta bitácora
Solo frontend (`apps/client`). Consume el contrato `GET/PUT /api/notificaciones` (implementado en paralelo por el subagente de backend). La contraseña SMTP nunca se recibe del backend; el GET expone `hasSmtpPassword: boolean`.

## Archivos creados
- `apps/client/src/api/notificationSettingsApi.ts` — funciones `getNotificationSettings` / `updateNotificationSettings` + interfaces `NotificationSettings` (respuesta GET, con `hasSmtpPassword`) y `NotificationSettingsFormData` (payload PUT, con `smtpPassword?` opcional).
- `apps/client/src/views/Notificaciones.tsx` — vista de configuración, réplica estructural de `Negocio.tsx`:
  - 4 estados: loading (skeleton `animate-pulse` calcado del layout real), error (trifecta color+icono `FiBell`+texto), data (no aplica "empty" — es un recurso singleton de configuración, igual que `Negocio.tsx`/`Disponibilidad.tsx`).
  - `useForm<NotificationSettingsFormData>()` con `reset()` en `useEffect([data, reset])`. El campo `smtpPassword` siempre resetea a `''`, nunca se precarga con el valor real ni con un dummy.
  - Campos: `smtpHost` (text), `smtpPort` (number, `valueAsNumber`), `smtpSecure` (checkbox con estilo tomado de `Inventario.tsx` — `w-4 h-4 rounded border-gray-300 text-maison-primary focus:ring-maison-primary`), `smtpUser` (text), `smtpPassword` (password, placeholder condicional según `data?.hasSmtpPassword`), `fromEmail` (email con validación de patrón inline), `fromName` (text), `reminderHoursBefore` (number, min 1 / max 168, default 24).
  - Indicador de contraseña con Trifecta: `FiCheckCircle` + `text-maison-green` + "Contraseña configurada" si `hasSmtpPassword`; `FiAlertCircle` + `text-gray-500` + "Sin contraseña configurada" en caso contrario.
  - `onSubmit`: clona el form data y hace `delete payload.smtpPassword` si el campo quedó vacío, para no pisar la contraseña guardada en el backend (refuerzo explícito además del manejo server-side).
  - Mutation: `onSuccess` → `toast.success('Configuración guardada')` + `invalidateQueries(['notification-settings'])`; `onError` → `handleApiError(error, 'Error al guardar la configuración')`.
  - Mismo layout que `Negocio.tsx`: `p-4 md:p-8 max-w-2xl mx-auto`, card `bg-maison-card border border-maison-border rounded-2xl shadow-sm p-6 sm:p-8`, labels `text-xs font-bold tracking-widest text-gray-500 uppercase`.

## Archivos modificados
- `apps/client/src/router.tsx`: import de `Notificaciones` + nueva ruta protegida `/configuracion/notificaciones` (rol `ADMIN`), siguiendo el patrón exacto de `/configuracion/disponibilidad`.
- `apps/client/src/layouts/AppLayout.tsx`: nuevo `NavLink` "Notificaciones" en el bloque de sidebar "Configuración" (visible solo para `role === 'ADMIN'`), junto a "Mi Negocio" y "Disponibilidad".

## Verificación

### Build
```
pnpm --filter @estetica/client build
```
Resultado: **Exit Code 0**. `tsc -b && vite build` completado sin errores de tipos. Bundle generado en `dist/` (warning preexistente de chunk >500kB, no relacionado a esta feature).

### Lint
```
pnpm --filter @estetica/client lint
```
Resultado: **Exit Code 1**, pero el único `error` reportado es el preexistente y documentado en `progress/current.md`:
```
apps\client\src\components\ProductoModal.tsx
  37:25  error  'stock' is assigned a value but never used
```
Ningún archivo tocado en esta feature (`notificationSettingsApi.ts`, `Notificaciones.tsx`, `router.tsx`, `AppLayout.tsx`) genera errores nuevos. Los 4 `warning` restantes (`react-hooks/incompatible-library` sobre `watch()` de react-hook-form) son un patrón preexistente ya presente en `Negocio.tsx`, `Turnos.tsx`, `ProfesionalModal.tsx` y `RegistroModal.tsx` — mi archivo `Notificaciones.tsx` no usa `watch()`, así que no agrega ningún warning nuevo de ese tipo.

## Decisiones técnicas / Hallazgos
- No hay estado "empty" en esta vista porque `/configuracion/notificaciones` es un recurso singleton de configuración (mismo patrón que `Negocio.tsx` y `Disponibilidad.tsx`), no un listado.
- El checkbox `smtpSecure` reutiliza el estilo visual ya auditado en `Inventario.tsx` (filtro "Solo stock bajo"), no se inventó un nuevo patrón de checkbox.
- Pendiente de integración real: el backend `/api/notificaciones` se está implementando en paralelo (Stack 2 backend) — esta vista ya está lista para consumirlo apenas el endpoint esté disponible; el contrato de API fue acordado de antemano (ver `NotificationSettings`/`NotificationSettingsFormData`).

## Estado
Listo para reviewer. No se modificó `feature_list.json` (permanece `in_progress`, responsabilidad del subagente validador/leader tras integrar con el backend de EP-17 completo).
