# Implementación — UX-14 (Desfasaje horario al mostrar la hora de una visita/retoque) — Frontend

**Sandbox:** `apps/client/` (frontend exclusivo, no se tocó `apps/server/`)
**Timestamp:** 2026-07-06

## Archivo y línea modificados

`apps/client/src/components/RegistroModal.tsx` — función `onSubmit` (antes en la línea ~170).

### Antes

```tsx
const onSubmit = (data: ServiceRecordPayload) => mutate(data);
```

### Después

```tsx
const onSubmit = (data: ServiceRecordPayload) => {
    const payload: ServiceRecordPayload = {
        ...data,
        ...(data.nextTouchupDate ? { nextTouchupDate: new Date(data.nextTouchupDate).toISOString() } : {}),
    };
    mutate(payload);
};
```

## Justificación de la implementación

Se replicó exactamente el patrón ya probado en `apps/client/src/views/Turnos.tsx:294` (`new Date(data.startTime).toISOString()`), con una diferencia deliberada: `nextTouchupDate` es **opcional** en `ServiceRecordPayload` (`api/serviceRecordApi.ts:10`) y el `defaultValues`/`reset` del formulario lo inicializan como `''` (línea 103 y 139). `new Date('').toISOString()` lanza `RangeError: Invalid time value`, por lo que la conversión se aplica condicionalmente (spread solo si `data.nextTouchupDate` tiene valor), igual que `Turnos.tsx:295-296` hace con `data.service`/`data.professional` (campos opcionales del mismo formulario).

Esto cubre el input `datetime-local` naive → ISO string con offset UTC correcto, anclado en la timezone real del navegador (Argentina), independientemente de la timezone del proceso Node del backend.

## Confirmación de punto único de envío

Se revisó si `RegistroModal` tiene otro punto de envío del mismo campo (creación vs. edición de turno completado):

- El componente tiene **un solo** `useMutation` (línea ~145) con un único `mutationFn` que bifurca internamente según `appointmentId`:
  - Si `appointmentId` está presente → `completeAppointment(appointmentId, data)` (turno convertido a visita, EP-15).
  - Si no → `createServiceRecord(data)` (registro de visita directo, EP-05).
- Ambas ramas reciben el **mismo `data`** proveniente del único `onSubmit`/`handleSubmit(onSubmit)` del formulario (línea 197, `id="registroForm"`). No existe un segundo formulario, botón de submit ni llamada a `mutate` en el archivo.
- `grep` de `nextTouchupDate` en todo `apps/client/src` confirma que el único punto de escritura del campo hacia el payload de red es el `onSubmit` recién modificado; los otros usos (`Dashboard.tsx:219-234`) son solo lectura/visualización con `formatDate`, sin re-envío.
- **Conclusión:** el fix cubre ambos flujos (creación y completar turno) porque comparten el mismo payload de formulario, tal como anticipaba el diagnóstico del `explorer`. No se detectó ningún otro punto de entrada (ej. import masivo no aplica — `nextTouchupDate` no forma parte de la carga masiva de Inventario/EP-04, que es de productos, no de registros de servicio).

## No se modificó

- El registro del input (`{...register('nextTouchupDate')}`, línea 292) — intacto.
- `formatDateTime`/`formatCalendarDate` (`apps/client/src/utils/dates.ts`) — intactos.
- `apps/server/` — intacto, sin cambios de backend.
- Ningún otro campo del formulario (`client`, `service`, `professional`, `serviceDate`, `notes`, `productsUsed`).

## Verificación

### Build

```
pnpm --filter @estetica/client build
```

Resultado: **Exit Code 0**. `tsc -b && vite build` compiló sin errores. Output:

```
dist/index.html                     0.48 kB │ gzip:   0.33 kB
dist/assets/index-BUGXfepg.css     46.99 kB │ gzip:   8.52 kB
dist/assets/index-rK93w06C.js   1,564.31 kB │ gzip: 472.29 kB
✓ built in 3.15s
```

(Warning preexistente de chunk size >500kB, ajeno a este cambio.)

### Lint

```
pnpm --filter @estetica/client lint
```

Resultado: **1 error, 4 warnings** — todos preexistentes y ajenos a este cambio:
- `error` en `apps/client/src/components/ProductoModal.tsx:37` (`'stock' is assigned a value but never used`) — ya documentado en `progress/current.md` como deuda de lint preexistente, no bloqueante.
- 4 `warning` de `react-hooks/incompatible-library` (React Compiler no puede memoizar `watch()` de react-hook-form) en `ProfesionalModal.tsx:83`, `RegistroModal.tsx:110` (preexistente, no relacionado a la línea modificada en este fix), `Negocio.tsx:73` y `Turnos.tsx:405` — mismo patrón estructural en todo el codebase, no introducido por este cambio.

No se detectó ningún error o warning nuevo atribuible a la línea modificada.

## Riesgos / notas para el reviewer

- Dato histórico contaminado (registros `nextTouchupDate` ya persistidos con el offset incorrecto) queda fuera de alcance de esta feature, tal como estipula la descripción en `feature_list.json` — no se migró.
- El comportamiento observable esperado: al ingresar una hora en el `datetime-local` (ej. `07:26`), el payload ahora viaja como ISO-UTC correctamente anclado, y `formatDateTime` en dashboard/calendario mostrará la misma hora local que el usuario ingresó, sin depender de la TZ del proceso Node del backend.
