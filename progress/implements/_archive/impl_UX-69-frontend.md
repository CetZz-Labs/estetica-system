# impl_UX-69-frontend — Historial de cliente: registrar visita pasada, paginación y filtros por fecha (Frontend)

## Alcance
Parte FRONTEND de UX-69 (`apps/client/`). El backend paralelo migra `POST /api/registros` (soporte `isBackfill`) y `GET /api/registros/cliente/:clientId` (contrato paginado) — este implementer consume ese contrato exacto, ya definido de antemano, sin coordinación por chat.

## Archivos modificados

1. **`apps/client/src/utils/dates.ts`**
   - Nuevo helper `getYesterdayDateString()` (mismo estilo que `getTodayDateString()` ya existente) — se usa como `max` del input `serviceDate` en modo "visita pasada".

2. **`apps/client/src/api/serviceRecordApi.ts`**
   - `ServiceRecordPayload` gana campo opcional `isBackfill?: boolean`.
   - Nueva interfaz `ClientRecordsParams { page, limit, dateFrom?, dateTo? }`.
   - `getClientRecords(clientId, params)` migrado de `Promise<ServiceRecord[]>` (breaking) a `Promise<Paginated<ServiceRecord>>`, pasando `params` como query string vía Axios (`{ params }`), igual patrón que `getServiceRecords`.

3. **`apps/client/src/components/RegistroModal.tsx`**
   - Nuevo prop opcional `pastVisitMode?: boolean` (default `false`), sin romper ningún consumidor existente (Dashboard, completar turno).
   - Input `serviceDate`:
     - Modo normal: `min={getTodayDateString()}` (paridad con `touchupDate`, que ya lo tenía).
     - Modo `pastVisitMode`: sin `min`, con `max={getYesterdayDateString()}` + `validate` inline en `register('serviceDate', ...)` que exige `value < getTodayDateString()` (defensa en profundidad además del `max` nativo del input, mensaje "La fecha debe ser anterior a hoy"). Se agregó también el `<span>` de error inline que faltaba para `serviceDate` (mismo patrón que el resto de los campos).
   - `defaultValues.serviceDate` y el `reset()` del `useEffect` de apertura: en `pastVisitMode` arrancan en `getYesterdayDateString()` en vez de "hoy" (evita que el valor inicial viole el nuevo `max`).
   - `Modal title`/`subtitle` condicionales: "Registrar Visita Pasada" / "Cargá un servicio que se te olvidó asentar." cuando `pastVisitMode`, sin alterar los textos del modo normal.
   - `onSubmit`: agrega `isBackfill: true` al payload solo si `pastVisitMode`.
   - `onSuccess` de la mutation: se agregó `queryClient.invalidateQueries({ queryKey: ['client-history'] })` a la lista existente (prefijo sin `id` → invalida cualquier combinación `[id, page, limit, dateFrom, dateTo]` cacheada, por matching parcial de TanStack Query), sin quitar ninguna de las invalidaciones preexistentes.

4. **`apps/client/src/views/ProfileClient.tsx`**
   - Nuevo botón "Registrar visita pasada" (`FiPlus`) junto al `<h3>` de "Historial de Visitas", abre `<RegistroModal preselectedClientId={id} pastVisitMode />` controlado por `isPastVisitModalOpen` (mismo patrón que `isEditModalOpen`/`isDeleteConfirmOpen`).
   - Migración del `useQuery` `['client-history', ...]` al contrato paginado:
     - `queryKey: ['client-history', id, page, PAGE_SIZE, dateFrom, dateTo]`.
     - `queryFn: () => getClientRecords(id!, { page, limit: PAGE_SIZE, ...historyFilters })`.
     - `placeholderData: keepPreviousData`.
     - Estado local `page` (reseteado a 1 en cualquier cambio de `dateFrom`/`dateTo` vía los nuevos handlers `handleDateFromChange`/`handleDateToChange`).
   - Nuevos filtros `dateFrom`/`dateTo` (dos `<input type="date">`) + botón "Limpiar filtros" (visible solo con `hasActiveDateFilters`), dentro de la card de historial, arriba del timeline — mismo patrón visual de inputs que `serviceDate`/`touchupDate` de `RegistroModal.tsx` (paleta "legacy" de la vista, no la paleta Shear de `Historial.tsx`, para mantener consistencia con el resto de `ProfileClient.tsx`, que todavía no está migrada — ver P13 del catálogo de patrones).
   - Reutiliza `<Pagination>` (`src/components/ui/Pagination.tsx`, ya compartido, patrón P6) debajo del timeline cuando hay resultados.
   - Estados: loading (skeleton existente, sin cambios de estructura), **nuevo** estado de error (trifecta color+icono `FiAlertCircle`+texto, mismo patrón que P4/`Historial.tsx`, sin `isError` previo en este archivo), empty (dos mensajes: sin visitas en absoluto vs. "No hay visitas en el rango de fechas seleccionado." cuando hay filtro activo), data (timeline sin cambios de markup, ahora itera `registros` = `historial?.data ?? []` en vez de `historial` directo). Contador de paginación lee `meta.total` (`totalRegistros`), nunca `data.length`.

## Decisiones técnicas
- **Invalidación de `client-history` sin `id` en el prefijo:** `RegistroModal.tsx` no siempre conoce el `id` del cliente en el momento de invalidar (ej. flujo normal desde Dashboard, donde `preselectedClientId` puede venir de otro origen o no estar seteado si se eligió el cliente en el propio formulario). Se usó `queryClient.invalidateQueries({ queryKey: ['client-history'] })` (prefijo corto) en vez de intentar reconstruir la key completa — TanStack Query hace matching parcial por defecto, así que invalida cualquier combinación cacheada de `['client-history', id, page, limit, dateFrom, dateTo]` sin necesidad de conocer esos valores en el momento del `onSuccess`. Mismo criterio ya usado en el archivo para `['appointments']`.
- **`getYesterdayDateString` como helper nuevo (no reusar uno existente):** se revisó `dates.ts` completo antes de escribirlo — no existía ningún helper de "ayer" ni de aritmética de fechas relativa a hoy salvo `getTodayDateString`. Se creó siguiendo exactamente el mismo estilo (mismo padding, mismo uso de `Date` local, mismo comentario JSDoc) para no introducir un segundo estilo de cálculo de fecha en el archivo.
- **Validación inline redundante con el `max` nativo:** aunque el `max={getYesterdayDateString()}` del `<input type="date">` ya impide seleccionar hoy/futuro en la mayoría de los navegadores, se agregó igual un `validate` en `register('serviceDate', ...)` — es defensa en profundidad barata (algunos navegadores/inputs pegados con teclado pueden saltarse `max`) y es lo que pide explícitamente el criterio de aceptación ("agrega validación inline de que la fecha sea estrictamente pasada").
- **Paleta de estilos en los filtros nuevos de `ProfileClient.tsx`:** se siguió la paleta ya usada en el resto del archivo (`bg-background`, `border-border`, clases "legacy" de Maison) en vez de la paleta Shear más nueva de `Historial.tsx` (`bg-surface`, `rounded-ctrl`, etc.), para no mezclar dos sistemas de diseño dentro del mismo componente — `ProfileClient.tsx` no está en el alcance de esta feature para una migración completa a Shear.

## Verificación
```
pnpm --filter @estetica/client build   → exit 0 (tsc -b && vite build, sin errores)
pnpm --filter @estetica/client lint    → exit 0 (0 errores, 4 warnings preexistentes de react-hooks/incompatible-library en archivos no tocados por esta feature, salvo el ya existente en RegistroModal.tsx sobre watch() de react-hook-form, no introducido por este cambio)
```

## Nota para el reviewer
- No se tocó `apps/server/` (fuera de sandbox de este implementer). El contrato de API consumido (`isBackfill` en `POST /api/registros`, `{ data, meta }` en `GET /api/registros/cliente/:clientId`) es el mismo que implementa en paralelo el implementer de backend — verificar que ambas partes se integren end-to-end antes de marcar `done`.
- `RegistroModal.tsx` es un componente compartido (Dashboard, completar turno, y ahora `ProfileClient.tsx`) — el nuevo prop `pastVisitMode` es opcional y por default `false`, no debería alterar ningún flujo existente. Vale la pena que el reviewer verifique manualmente el flujo normal (crear visita desde Dashboard) además del nuevo flujo de visita pasada.

## Fix post-review (`review_UX-69.md`, Cambio Requerido #1 — bloqueante)

**Regresión detectada por el reviewer:** el `min={pastVisitMode ? undefined : getTodayDateString()}` original se aplicaba también al flujo "Completar y Registrar" de un turno agendado (`appointmentId` presente). `Dashboard.tsx`/`Turnos.tsx` precargan `serviceDate` con la fecha ORIGINAL del turno (`preselectedServiceDate` = `appt.startTime`), que puede ser anterior a hoy si el turno quedó vencido sin completarse (no hay ningún mecanismo en el repo que cancele/oculte turnos vencidos). Como `<form id="registroForm">` no tiene `noValidate`, un `serviceDate` precargado en estado `rangeUnderflow` (por debajo del nuevo `min`) bloqueaba el `submit` a nivel de Constraint Validation API nativa del navegador — `handleSubmit(onSubmit)` de react-hook-form nunca llegaba a ejecutarse, rompiendo un flujo que funcionaba antes de esta feature.

**Corrección aplicada — opción (a) de las dos propuestas por el reviewer:** no aplicar `min` cuando `appointmentId` está presente, además de cuando `pastVisitMode` está activo:

```tsx
min={pastVisitMode || appointmentId ? undefined : getTodayDateString()}
```

**Por qué (a) y no (b) (`min` condicional a `preselectedServiceDate < hoy`):** se eligió (a) porque:
1. Es consistente con el propio backend: `completeAppointment`/`PATCH /api/turnos/:id/complete` (`appointmentController.ts`) **no** recibió ningún guard nuevo de `serviceDate` en esta feature (confirmado por el reviewer) — el camino de completar un turno sigue sin restricción de fecha en el servidor, así que restringirlo únicamente en el cliente para ese mismo camino no aporta ninguna garantía real, solo fricción de UX.
2. Es más simple de leer y mantener que (b): la condición queda ligada directamente a "¿este submit va a `completeAppointment` o a `createServiceRecord`?", que es la distinción real que importa (mismo criterio que ya usa `mutationFn` unas líneas más abajo: `if (appointmentId) { await completeAppointment(...) } else { await createServiceRecord(...) }`), en vez de depender de una comparación de strings de fecha adicional que duplicaría lógica ya expresada en otro lugar del componente.
3. No reabre la puerta a elegir manualmente cualquier fecha pasada arbitraria en el flujo de creación libre sin turno asociado (sin `appointmentId` y sin `pastVisitMode`): ese caso sigue con `min={getTodayDateString()}` intacto, que es exactamente lo que pedía el criterio de aceptación original (#3).

**Validado manualmente el criterio de no-regresión:**
- Caso normal (crear visita nueva desde Dashboard, sin `appointmentId`, sin `pastVisitMode`): `min={getTodayDateString()}` se sigue aplicando — sigue bloqueado elegir fecha pasada, como pide el criterio de aceptación original.
- Caso "completar turno vencido" (`appointmentId` presente, `preselectedServiceDate` anterior a hoy): sin `min` → el input acepta el valor precargado, el submit ya no queda atrapado por la Constraint Validation API nativa.
- Caso "visita pasada" (`pastVisitMode`): sin cambios, sigue con `max={getYesterdayDateString()}` + validación inline.

No se tocó el `validate` inline de `register('serviceDate', ...)` — ya solo aplica cuando `pastVisitMode` es `true` (`if (!pastVisitMode) return true;`), por lo que el camino de completar turno tampoco pasa por esa validación adicional.

### Verificación (post-fix)
```
pnpm --filter @estetica/client build   → exit 0
pnpm --filter @estetica/client lint    → exit 0 (0 errores, mismos 4 warnings preexistentes de react-hooks/incompatible-library, ninguno nuevo)
```
