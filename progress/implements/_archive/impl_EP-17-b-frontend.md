# impl_EP-17-b-frontend.md — Migrar envío de mails a SMTP global de la app (Frontend)

**Feature:** EP-17-b — Migrar envío de mails de SMTP por-tenant a SMTP global de la aplicación
**Sandbox:** `apps/client/` (frontend únicamente, no se tocó `apps/server/`)
**Fecha:** 2026-07-08

## Resumen

Se eliminó por completo la UI de configuración SMTP por-tenant (Host, Puerto, TLS, Usuario, Contraseña, Email remitente, Nombre remitente) y se fusionó el único campo remanente (`reminderHoursBefore`) a la vista "Mi Negocio" (`Negocio.tsx`, EP-10). Se eliminó la vista/ruta/entrada de menú de "Notificaciones" ya que no tenía sentido mantener una vista propia para un solo campo.

## Archivos modificados

1. **`apps/client/src/api/notificationSettingsApi.ts`** — recortadas las interfaces `NotificationSettings` y `NotificationSettingsFormData` a un único campo opcional `reminderHoursBefore?: number`. Se mantuvieron `getNotificationSettings`/`updateNotificationSettings` apuntando a `/notificaciones` (el backend conserva ese endpoint solo para este campo, según instrucciones recibidas).

2. **`apps/client/src/views/Negocio.tsx`** — se agregó una segunda sección/card "Recordatorio de turno" con su propio `useForm<RecordatorioFormData>()`, `useQuery<NotificationSettings>({ queryKey: ['notification-settings'] })` y `useMutation` independientes (mismo patrón de guardado inmediato ya usado por la sección de datos generales del negocio: `toast.success`/`handleApiError`, `invalidateQueries` en `onSuccess`). El campo `reminderHoursBefore` es numérico con validación `required`, `min: 1`, `max: 168` (mismas reglas que tenía en `Notificaciones.tsx`). Los 4 estados (loading/error) del componente ahora combinan ambas queries (`isLoading || isNotificationLoading`, `isError || isNotificationError`) para no romper el resto de la vista (zona horaria, moneda, nombre, logo — intactos, sin tocar su form ni su mutation existente).

3. **`apps/client/src/views/Notificaciones.tsx`** — ELIMINADO (`rm`). Ya no existe vista propia para SMTP/recordatorio.

4. **`apps/client/src/router.tsx`** — eliminado el import de `Notificaciones` y la `<Route path="/configuracion/notificaciones">`.

5. **`apps/client/src/layouts/AppLayout.tsx`** — eliminada la entrada de menú "Notificaciones" del sidebar (sección Configuración). Las entradas "Mi Negocio" y "Disponibilidad" quedaron intactas.

## Verificación de referencias muertas

`grep` sobre `apps/client/src` confirmó cero coincidencias remanentes de `Notificaciones`, `smtpHost`, `smtpPort`, `smtpSecure`, `smtpUser`, `smtpPassword`, `fromEmail`, `fromName` tras los cambios.

## Resultado de build/lint

- `pnpm --filter @estetica/client build` → **Exit Code 0** (tsc -b + vite build, sin errores; solo el warning preexistente de chunk size > 500kB, no relacionado).
- `pnpm --filter @estetica/client lint` → 1 error preexistente en `ProductoModal.tsx:37` (`'stock' is assigned a value but never used`, deuda ya conocida, no tocada en esta feature) + 4 warnings `react-hooks/incompatible-library` (`ProfesionalModal.tsx`, `RegistroModal.tsx`, `Turnos.tsx`, y `Negocio.tsx:83` — este último es el mismo `watch('logo')` ya existente antes de mi cambio, solo desplazado de línea por el código agregado). **Ningún error/warning nuevo introducido** por esta feature.

## Nota para el reviewer

No se marcó la feature como `"done"` en `feature_list.json` (responsabilidad exclusiva del subagente validador). Pendiente coordinar con el implementer de backend (paralelo) para confirmar que el endpoint `/api/notificaciones` sigue existiendo con el único campo `reminderHoursBefore` — si el backend decidió mover ese campo a otro endpoint (ej. fusionado al controller de Tenant), habrá que actualizar la URL en `notificationSettingsApi.ts` en un ajuste posterior.
