# Implementación UX-03 — Frontend

> Decisión de negocio: quitar hora obligatoria para el próximo retoque en el formulario de registro de visita. Ver `progress/current.md`.

## Archivos modificados

### `apps/client/src/components/RegistroModal.tsx`
- Eliminados estados `showTimeField`, `nextTouchupTime`, `timeError`.
- Eliminadas variables derivadas `hasAutoTouchup`, `requiresTimeField` (y el `watch` de `useForm`, que quedó sin otro uso).
- `onSubmit` simplificado a `const onSubmit = (data: ServiceRecordPayload) => mutate(data);` (sin validación de hora).
- `mutationFn` simplificado: solo decide entre `completeAppointment(appointmentId, data)` o `createServiceRecord(data)`, sin manipular el payload.
- Bloque JSX "Próximo Retoque": eliminado el aviso naranja de retoque automático, el botón "+ Agregar solo hora" y el input `type="time"` con su validación. Queda solo el label "Próximo Retoque / Opcional" + `<input type="datetime-local" {...register('nextTouchupDate')} />`.
- Eliminado import `FiAlertCircle` (sin uso tras los cambios).

### `apps/client/src/api/serviceRecordApi.ts`
- Eliminado `nextTouchupTime?: string;` de `ServiceRecordPayload`.

### `apps/client/src/api/appointmentApi.ts`
- Eliminado `nextTouchupTime?: string;` del tipo de datos del parámetro de `completeAppointment`.

## Verificación

```
pnpm --filter @estetica/client build
✓ built in 896ms
Exit Code: 0
```

```
pnpm --filter @estetica/client lint
✖ 3 problems (1 error, 2 warnings)
```

El único error (`ProductoModal.tsx:37` — `'stock' is assigned a value but never used`) es preexistente, ya documentado en `progress/history.md` (sesión EP-14, "1 preexistente en ProductoModal.tsx"). Las 2 advertencias son de React Compiler sobre `watch()` de react-hook-form en `Negocio.tsx` y `Turnos.tsx`, también preexistentes y no relacionadas a los archivos tocados en esta tarea. **Sin errores nuevos.**

## Nota de proceso

El agente implementador aplicó los cambios de código correctamente (verificado por el Leader línea por línea) pero no tuvo permiso de herramienta Bash/Write en su sesión para correr build/lint ni escribir esta bitácora. El Leader verificó el diff, ejecutó build y lint, y dejó esta bitácora en su nombre.
