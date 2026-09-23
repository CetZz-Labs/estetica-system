# Reporte de Exploración — UX-78 (Recordatorios manuales de turnos por WhatsApp)

**Pregunta:** Investigar backend (contrato de `getAppointments`), normalización de teléfono, patrón de vista+nav nueva, tono/formateo del mensaje, gobernanza (PII/accesibilidad) y fuente del nombre del negocio, para que los implementers backend/frontend trabajen sin re-explorar.
**Contexto:** UX-78 — feature_list.json líneas 1429-1446, `status: "in_progress"`.
**Timestamp:** 2026-09-23

## Hallazgos

### 1. Backend — `getAppointments` (contrato y cambio a `.populate`)
1. [`apps/server/src/controllers/appointmentController.ts:135-161`]: `getAppointments` acepta query params `startDate`, `endDate` (ambos aplicados a `filter.startTime` con `$gte`/`$lte`, ninguno obligatorio), `professional` (match exacto) y `status` (match **exacto de un solo valor**, no `$in`). Filtra siempre por `tenantId` + `isActive: true` (línea 139). **No pagina** — devuelve array plano (no `{ data, meta }`), consistente con que hoy es consumido por `Turnos.tsx` como vista de calendario, no como tabla paginada.
2. **Gotcha importante para el implementer frontend:** como `status` solo acepta un valor, no hay forma de pedir "pending o confirmed" en una sola llamada. La recomendación es **no pasar `status`** al llamar `getAppointments({ startDate, endDate })` acotado a hoy, y filtrar en el cliente en memoria. Hay precedente directo en `docs/patterns-frontend.md:455`.
3. [`apps/server/src/controllers/appointmentController.ts:150-154`]: el cambio pedido es trivial — línea 151, cambiar `.populate('client', 'firstName lastName')` por `.populate('client', 'firstName lastName phone')`. Impacto en otros consumidores confirmado como nulo:
   - `getAppointmentById` y `getClientAppointments` tienen sus propios `.populate()` independientes.
   - `getUpcomingAppointments` (línea 483) ya popula `firstName lastName phone` desde antes.
   - `apps/client/src/types/index.ts:103`: el tipo `Appointment.client` ya declara `phone?: string` como opcional.

### 2. Client.phone — formato y normalización existente
1. [`apps/server/src/models/Client.ts:7,19`]: `phone?: string`, schema `{ type: String, trim: true }` — opcional, sin regex ni validación de formato.
2. No existe ninguna heuristica de normalizacion de telefono argentino en todo el frontend. Grep de tel:/phone/wa.me/whatsapp no arrojo ningun link tel: ni logica de normalizacion:
   - [`apps/client/src/views/ProfileClient.tsx:132`]: render de texto plano.
   - [`apps/client/src/views/Clients.tsx:54-55,156-157`]: busqueda simple con .includes(term).
   - [`apps/client/src/components/AppointmentDetail.tsx:42-43`]: render condicional crudo.
3. Recomendacion: escribir un helper nuevo (ej. normalizePhoneForWhatsapp en apps/client/src/utils/phone.ts) que retorne null si el telefono esta vacio, extraiga solo digitos, y anteponga 54 si falta. Ojo con el digito 9 de celular argentino: el formato E.164 esperado por WhatsApp es 54 9 codigo-area numero, y no hay garantia de que los datos historicos lo incluyan. Flaguear esta decision de producto al usuario humano antes de implementar heuristicas agresivas.

### 3. Patron de vista nueva + entrada de sidebar
1. [`apps/client/src/router.tsx:93-100`]: patron mas reciente (/configuracion/disponibilidad, EP-16) — ruta anidada dentro de <Route element={<AppLayout />}> (linea 62), envuelta en <ProtectedRoute roles={['ADMIN']}>.
2. [`apps/client/src/layouts/AppLayout.tsx:164-171`]: entrada de sidebar con separador + label "Configuracion" (solo role ADMIN) seguido de SidebarNavLink.
3. Recomendacion: /recordatorios no deberia ir bajo el bloque "Configuracion" (ADMIN-only). Los criterios de aceptacion no restringen por rol y /turnos tampoco tiene ProtectedRoute. Sugerido: ruta sin ProtectedRoute, entrada de sidebar sin el gate role === 'ADMIN', cerca de /turnos.
4. Excepcion a P1/P3: docs/patterns-backend.md:67-71 no encaja literalmente pero hay precedente en docs/patterns-frontend.md:455 (query de turnos acotada a un dia, resuelta en memoria).

### 4. Tono del mensaje predefinido de WhatsApp
1. [`apps/server/src/services/mailService.ts:26-45`]: tono formal-cordial, voseo implicito, formato Intl.DateTimeFormat('es-AR', { dateStyle: 'full', timeStyle: 'short' }).
2. Helper de fecha correcto: formatFullDateTime (apps/client/src/utils/dates.ts:100-109), NO formatCalendarDate (date-only) ni formatDateTime (corto).
3. Propuesta de texto:

   Hola {nombreCliente}! Te recordamos tu turno para "{nombreServicio}" el {fechaHoraFormateada} en {nombreNegocio}. Te esperamos!

   - nombreCliente: firstName + lastName.
   - nombreServicio: appointment.service?.name ?? 'tu turno'.
   - fechaHoraFormateada: formatFullDateTime(appointment.startTime).
   - nombreNegocio: ver punto 6.

### 5. Gobernanza relevante (GOV-CLIENT / GOV-ACCESS)
1. [`docs/governance-rules.md:135-147`] GOV-CLIENT: no aplica restriccion especifica a mostrar phone en una vista nueva — precedente extendido de mostrarlo sin enmascarar (ProfileClient.tsx:132, Clients.tsx:156-157, AppointmentDetail.tsx:43).
2. [`docs/governance-rules.md:101-113`] GOV-ACCESS (Trifecta): aplica al boton deshabilitado por falta de telefono. Sugerido: boton disabled con clase disabled:cursor-not-allowed, icono (FiAlertCircle o FiPhoneOff) + texto visible junto al boton, no solo un title/tooltip.

### 6. Fuente del nombre del negocio
1. [`apps/client/src/api/tenantApi.ts:3-15`]: getTenant() retorna { tenant: TenantSettings } con TenantSettings.name.
2. [`apps/client/src/views/Negocio.tsx:50-53`]: useQuery con queryKey ['tenant'].
3. Recomendacion: reusar el mismo queryKey ['tenant'] con getTenant en la vista nueva para compartir cache con Negocio.tsx sin duplicar la llamada de red.

## Diagnostico
El unico cambio de backend es de una sola linea (appointmentController.ts:151) y es seguro. El mayor riesgo de la feature es de producto/dato: no existe convencion de formato para Client.phone, asi que el armado del link wa.me es logica enteramente nueva (en particular el digito 9 de celular argentino). La ruta/nav nueva tiene un patron claro (EP-16), pero su ubicacion en el sidebar amerita confirmar el rol de acceso antes de implementar.

## Recomendacion
Antes de lanzar el implementer frontend, confirmar con el usuario humano: (a) que roles pueden ver /recordatorios (sugerido: todos, sin ProtectedRoute, analogo a /turnos) y (b) si se agrega un placeholder guia en ClienteModal.tsx para estandarizar la carga futura de phone con el 9 de celular AR.
