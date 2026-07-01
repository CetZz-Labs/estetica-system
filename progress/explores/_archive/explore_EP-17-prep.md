# Reporte de Exploración — EP-17 prep (email en Client + recordatorio de turno por mail)

**Pregunta:** Relevamiento de código actual (modelo Client, controllers, rutas, frontend de alta/carga masiva, modelo Appointment, infraestructura de mailing) para preparar (A) campo `email` opcional en Client y (B) EP-17 recordatorio automático de turno por mail.
**Contexto:** EP-17 "Recordatorio de turno por mail" (`feature_list.json`, Fase 4, status `pending`) + prerequisito de `email` en Client pedido por el usuario.
**Timestamp:** 2026-07-01

## Hallazgos

### 1. Modelo Client
1. [apps/server/src/models/Client.ts:3-12]: `IClient` actual: `tenantId`, `firstName`, `lastName`, `phone?`, `medicalNotes?`, `isActive`, timestamps. **No existe campo `email`.**
2. [apps/server/src/models/Client.ts:26]: único índice compuesto existe: `ClientSchema.index({ tenantId: 1, isActive: 1, lastName: 1 })` (cubre `getClients`). No hay índice único sobre ningún campo de `clients` — no hay `unique: true` en ningún campo del schema. Por lo tanto agregar `email` opcional no colisiona con ningún índice único compuesto tenant-scoped existente.
3. [docs/db-schema.md:62-79]: sección canónica de `clients` no menciona `email`. Habría que actualizarla junto con el cambio de modelo.

### 2. Controller de clientes (creación manual)
4. [apps/server/src/controllers/clientController.ts:5-26]: `createClient` desestructura solo `{ firstName, lastName, phone, medicalNotes }` de `req.body` — no lee `email`. Ídem `updateClient` [clientController.ts:60-88], que arma el `$set` con spread condicional `...(campo !== undefined && {...})` por cada campo — patrón a replicar para `email`.
5. [apps/server/src/routes/clientRoutes.ts:21-31]: `POST /` valida `firstName`/`lastName` (`notEmpty`) y `phone`/`medicalNotes` (`optional().isString().trim()`). No hay validador `isEmail()` en ningún lado del archivo. El patrón para `email` opcional seria `body('email').optional({ checkFalsy: true }).isEmail().normalizeEmail()`, igual en el bloque de `PUT /:id` [clientRoutes.ts:61-72].
6. [apps/server/src/routes/clientRoutes.ts:34-45]: bloque `POST /carga-masiva` valida `body('*.firstName')`/`body('*.lastName')` (obligatorios) y `body('*.phone')`/`body('*.medicalNotes')` (opcionales) — mismo patrón a extender con `body('*.email')`.

### 3. Carga masiva de clientes (backend)
7. [apps/server/src/controllers/clientController.ts:117-168]: `createBulkClients` no usa el patron `bulkWrite` con `upsert: true` documentado en `docs/patterns-backend.md § P5` (ese patron es el que sigue `createBulkProducts` para productos, ver `patterns-backend.md:214-253`). En cambio, `createBulkClients` itera con un `for...of` y por cada fila hace un `Client.findOne` con `$regex` case-insensitive sobre `firstName`+`lastName` dentro del tenant [clientController.ts:138-143] y si existe hace skip (no actualiza, no upsertea); si no existe, `Client.create(...)` [clientController.ts:150-157]. Es decir: dedup por nombre+apellido, sin upsert real — divergencia frente al patron canonico P5 usado para productos. Si se agrega `email`, debe mapearse igual que `phone`/`medicalNotes` dentro del bloque de creacion [clientController.ts:154-156].
8. No hay ninguna validacion de formato de email en el flujo de carga masiva actual.

### 4. Frontend — alta manual de cliente
9. [apps/client/src/components/ClienteModal.tsx:22-24]: `useForm<ClientFormData>()` con `defaultValues: { firstName: '', lastName: '', phone: '', medicalNotes: '' }` — no incluye `email`. El `useEffect` de `reset()` en lineas 26-37 tampoco lo contempla.
10. [apps/client/src/components/ClienteModal.tsx:118-125]: bloque de input Telefono (`type="tel"`, `register('phone')`) es el patron directo a replicar para un input `type="email"` con `register('email')` — sin validacion required, ya que es opcional.
11. [apps/client/src/api/clientApi.ts:4-9]: interfaz `ClientFormData` = `{ firstName, lastName, phone?, medicalNotes? }` — no tiene `email`. Misma interfaz se reutiliza para create y update (lineas 24-33).

### 5. Frontend — importación masiva de clientes
12. [apps/client/src/components/CargaMasivaClientesModal.tsx:15-30]: interfaz `ExcelRow` mapea multiples alias de columnas por campo (`Nombre`/`nombre`/`firstName`, etc.) — no tiene alias para `email`.
13. [apps/client/src/components/CargaMasivaClientesModal.tsx:84-91]: el `mappedData` que arma `BulkClientData[]` no incluye `email` (correspondiente a `BulkClientData` en `clientApi.ts:40-45`, que tampoco lo tiene).
14. [apps/client/src/components/CargaMasivaClientesModal.tsx:32-42]: `downloadClienteEjemplo()` genera la plantilla de ejemplo descargable (mencionada en `progress/history.md` como parte de UX-10/UX-11) con columnas fijas `['Nombre', 'Apellido', 'Telefono', 'NotasMedicas']` — necesitaria una columna `Email` agregada si se quiere permitir cargar el mail en la carga masiva.
15. [apps/client/src/components/CargaMasivaClientesModal.tsx:147-165]: la tabla "Formato del archivo" (guia visible siempre en el modal) tambien lista las 4 columnas actuales como headers — requeriria agregar columna `Email` (opcional) en la UI de guia si se agrega el campo.

### 6. Modelo Appointment
16. [apps/server/src/models/Appointment.ts:3-19]: `IAppointment` completo: `tenantId`, `client` (ref Client), `service?` (ref Service), `professional?` (ref Professional — nota: `docs/db-schema.md:171` todavia documenta `professional` como `ref: 'Admin'`, desactualizado post-EP-11), `startTime`, `endTime`, `status` (enum `pending|confirmed|cancelled|completed`), `notes?`, `cancelReason?`, `cancelledAt?`, `cancelledBy?`, `createdBy`, `isActive`, timestamps.
17. Confirmado: NO existe ningun campo `reminderSent`, `reminderScheduledAt`, `reminderSentAt` ni similar en `Appointment.ts` ni en `docs/db-schema.md:162-196` (seccion canonica de `appointments`). Habria que agregarlo desde cero para soportar el requisito "si se cancela antes del recordatorio, no debe enviarse" (idempotencia/estado del recordatorio).
18. [apps/server/src/models/Appointment.ts:43-45]: indices existentes son `{tenantId,startTime,status}`, `{tenantId,client,startTime:-1}`, `{tenantId,professional,startTime,status}` — ninguno cubre una query tipo "turnos confirmados en ventana de envio de recordatorio". Un job de scheduling necesitaria un indice adicional que incluya el futuro campo de estado del recordatorio.

### 7. Infraestructura de mailing
19. [apps/server/package.json:16-22]: dependencias actuales = `@clerk/express`, `cors`, `express`, `express-validator`, `mongoose`. Confirmado: no hay `nodemailer`, `resend`, `@sendgrid/mail` ni ninguna libreria de envio de mail instalada. Tampoco `node-cron` ni ninguna libreria de scheduling en dependencies/devDependencies.
20. No existe `apps/server/src/services/` (glob sin resultados) — no hay ningun esbozo de `mailService.ts` ni carpeta `services/`.
21. No se encontro ningun cron job, `setInterval` de scheduling, ni endpoint tipo webhook/cron externo referenciado en `apps/server/src/` ni en `docs/`.
22. [apps/server/src/index.ts:3, apps/server/src/config/db.ts:6, apps/server/src/server.ts:20,29]: patron de env vars existente via `process.env.*`. Existe `apps/server/.env` (confirmado por Glob). Habria que agregar ahi credenciales de un proveedor de mail (SMTP/API key) desde cero — no hay convencion previa de nombres de env vars para servicios de terceros mas alla de `DATABASE_URL`, `PORT`, `FRONTEND_URL`.
23. Todo lo necesario para EP-17 debe construirse desde cero: (a) elegir/instalar libreria de envio de mail (requiere aprobacion explicita del usuario humano por regla `.claude/rules/backend.md` seccion 1, "Bloqueo de Dependencias"), (b) servicio `mailService.ts`, (c) mecanismo de scheduling (cron interno tipo `node-cron` — tambien requeriria aprobacion de dependencia nueva — o un endpoint HTTP invocado por un cron externo), (d) campo(s) de estado en `Appointment` para idempotencia del recordatorio, (e) credenciales en `.env`.

### 8. Governance-rules.md / db-schema.md
24. [docs/governance-rules.md:20]: unica mencion de "email" es sobre autenticacion Clerk (email/contraseña) — no hay regla sobre email de clientes.
25. [docs/governance-rules.md:47]: regla de indices unicos compuestos con `tenantId`, con la excepcion documentada de `admins.email` (unico global). No aplica directamente a `clients.email` salvo que se decida hacerlo unico — no hay mandato de unicidad para email de cliente.
26. No existe ninguna regla de gobernanza ya escrita sobre notificaciones/mailing/recordatorios en `docs/governance-rules.md` — es territorio nuevo, el leader debera decidir si amerita una nueva seccion canonica (ej. gov-notify) antes de delegar la implementacion, dado que impacta modelos core (`Appointment`) y agrega una dependencia externa nueva.
27. `docs/db-schema.md` no documenta `clients.email` ni ningun campo de recordatorio en `appointments` (confirma hallazgos #2 y #17).

## Diagnóstico
El campo `email` no existe en ningun punto del stack (modelo, controller, rutas con validacion, frontend de alta manual, frontend de carga masiva, plantilla de ejemplo) — es un cambio transversal pero de bajo riesgo (no colisiona con indices unicos existentes) que toca 6 archivos concretos en server + 4 en client. Para EP-17, la infraestructura de mailing y scheduling es inexistente de punta a punta: no hay libreria de envio, no hay carpeta `services/`, no hay cron/scheduler, y `Appointment` carece de cualquier campo de estado de recordatorio para garantizar idempotencia y respetar "si se cancela antes del recordatorio, no se envia". No hay reglas de gobernanza previas sobre notificaciones, por lo que el diseño (eleccion de libreria, mecanismo de scheduling, campo de estado) queda abierto a decision de arquitectura del leader, incluyendo la aprobacion explicita del usuario humano para instalar cualquier dependencia nueva (mail + posible cron).

## Recomendación
Antes de delegar implementacion, el leader debe decidir y documentar en `docs/governance-rules.md` (nueva seccion) tres decisiones de arquitectura previas a instanciar implementers: (1) libreria de envio de mail a aprobar explicitamente con el usuario humano, (2) mecanismo de scheduling (cron interno vs. endpoint invocado externamente) y su campo de estado en `Appointment` (ej. `reminderSentAt?: Date`), y (3) si `email` en `Client` debe ser unico por tenant o simplemente opcional sin restriccion — recien con eso definido conviene fragmentar en PRs: una feature separada y acotada para el campo `email` (Parte A, complejidad trivial-media, 1 implementer backend + 1 frontend) y luego EP-17 como cambio complejo/transversal (multi-implementer + reviewer, dado que toca `Appointment` model, una dependencia nueva y un mecanismo de scheduling).
