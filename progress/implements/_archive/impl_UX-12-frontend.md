# Implementación UX-12 (Frontend) — Validación de fecha/hora al crear turnos

## Alcance
Bloqueo en el formulario de turnos de fechas/horas anteriores al momento actual, con validación inline react-hook-form + atributo `min` en el input nativo. No se tocó la lógica de superposición de turnos ni el backend.

## Archivo modificado
- `apps/client/src/views/Turnos.tsx` (único archivo tocado)

## Cambios realizados

1. **Import:** se agregó `useRef` a la importación de `react`.

2. **Helper puro nuevo** (junto a los otros helpers de status, antes de `interface AppointmentFormData`):
```typescript
function getNowLocalDateTimeString(): string {
    const now = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T${pad(now.getHours())}:${pad(now.getMinutes())}`;
}
```

3. **Ref para permitir edición legítima de turnos históricos** (requisito 4 del encargo): `const originalStartTimeRef = useRef<string>('');`
   - Se resetea a `''` en los dos flujos de **creación**: `handleDateClick` (click en el calendario) y el `onClick` inline del botón "Nuevo Turno" del header.
   - Se setea al valor `localStart` calculado en `openEditModal` (flujo de **edición**), justo antes del `reset()` del formulario.

4. **Validación inline + atributo `min`** en el input `datetime-local` (línea ~636-650):
```typescript
<input type="datetime-local"
    min={getNowLocalDateTimeString()}
    className={...}
    {...register('startTime', {
        required: 'La fecha y hora son obligatorias',
        validate: (value) => {
            if (originalStartTimeRef.current && value === originalStartTimeRef.current) {
                return true;
            }
            return new Date(value) >= new Date() || 'La fecha y hora no pueden ser anteriores al momento actual';
        }
    })}
/>
```
El mensaje de error se muestra inline (patrón ya existente en el archivo, `errors.startTime.message` con ícono `FiAlertCircle`, sin toast) — cumple regla de "no duplicar error en div/toast".

## Comportamiento resultante
- **Crear turno** (click en calendario o botón "Nuevo Turno"): `originalStartTimeRef` queda vacío → cualquier fecha/hora pasada dispara el error inline. El selector nativo también restringe vía `min`.
- **Editar turno futuro:** si el usuario cambia la fecha a una pasada, se bloquea igual que en creación.
- **Editar turno histórico sin tocar la fecha:** el valor del input coincide exactamente con `originalStartTimeRef.current` (mismo string generado con la misma lógica de padding) → la validación devuelve `true` y no bloquea el submit, aunque la fecha ya sea pasada. Si el usuario cambia la fecha a otra fecha pasada distinta, sí se bloquea.

## Verificación de no-duplicación de error de backend (punto 3 del encargo)
Se confirmó (sin necesidad de tocar código) que tanto `createMutate` como `updateMutate` ya manejan `onError` con: caso especial 409 (superposición, toast dedicado) → fallback a `handleApiError(error, 'Error al ... el turno')`, que internamente dispara `toast.error`. Un eventual 400 del backend por fecha pasada caerá en el fallback `handleApiError` sin necesidad de cambios adicionales, y no colisiona con el mensaje inline (son mecanismos distintos: inline = pre-submit client-side, toast = respuesta del server).

## Build y Lint
```
pnpm --filter @estetica/client build   → Exit Code 0 (OK)
pnpm --filter @estetica/client lint    → Exit Code 1
```

**Detalle del lint:** el único **error** reportado es un `@typescript-eslint/no-unused-vars` en `apps/client/src/components/ProductoModal.tsx:37` (variable `stock` sin usar). Este archivo **no fue tocado** en esta sesión (confirmado con `git diff --stat`, no aparece en el diff) — es un error preexistente, ajeno al alcance de UX-12, que ya existía en el árbol de trabajo antes de esta implementación. Los demás items del reporte son **warnings** (no errores) de tipo `react-hooks/incompatible-library` sobre `watch()` de react-hook-form, preexistentes en `Turnos.tsx`, `ProfesionalModal.tsx`, `RegistroModal.tsx` y `Negocio.tsx` — ninguno introducido por este cambio.

**Duda para el reviewer/leader:** el gate de verificación exige lint con exit code 0, pero el bloqueador es un archivo fuera de mi sandbox de tarea (`ProductoModal.tsx`, dominio de inventario, no de turnos). No lo corregí para no expandir el alcance de UX-12 ni tocar código no parametrizado en el encargo. Queda a criterio del reviewer/leader si amerita una micro-tarea de limpieza separada o si se acepta el build verde como criterio suficiente para esta feature puntual.

## Decisiones técnicas / dudas para el reviewer
- La comparación de "valor sin cambios" se hace por **igualdad de string exacta** entre el valor actual del input y el string capturado al abrir el modal de edición (mismo formato `YYYY-MM-DDTHH:mm` generado con la misma función de padding en ambos puntos). Si el usuario abre edición, no toca la fecha, pero sí re-selecciona la misma fecha/hora manualmente en el picker (mismo valor), también pasa — comportamiento correcto y esperado.
- No se tocó la lógica de superposición de turnos (`eventOverlap`, chequeo 409) ni el campo opcional de "Profesional", conforme al alcance acotado del encargo.

## Fix post-review (bloqueo reportado en `progress/reviews/review_UX-12.md`)

**Problema:** el `onSubmit` (líneas ~286-293) armaba el payload del `PUT` incluyendo `startTime` de forma incondicional. Para el caso de **editar un turno vencido sin cambiar su fecha** (ej. solo cambiar notas o profesional en un turno "Atrasado"), el input mantiene el mismo valor que `originalStartTimeRef.current` (la validación cliente ya lo permite, ver arriba), pero al construir el payload se reenviaba igual ese `startTime` ya pasado, y el backend lo rechazaba con 400 — reintroduciendo el bloqueo que la validación cliente pretendía resolver.

**Cambio aplicado** en `onSubmit`:
```typescript
const onSubmit = (data: AppointmentFormData) => {
    const startTimeUnchanged = editingAppointment
        && originalStartTimeRef.current !== ''
        && data.startTime === originalStartTimeRef.current;

    const payload: Partial<AppointmentFormData> & { client: string } = {
        client: data.client,
        notes: data.notes,
        ...(startTimeUnchanged ? {} : { startTime: new Date(data.startTime).toISOString() }),
        ...(data.service ? { service: data.service } : {}),
        ...(data.professional ? { professional: data.professional } : {}),
    };

    if (editingAppointment) {
        updateMutate({ id: editingAppointment._id, data: payload });
    } else {
        createMutate(payload as AppointmentFormData);
    }
};
```

**Comportamiento resultante:**
- **Creación:** `editingAppointment` es `null` → `startTimeUnchanged` siempre `false` → `startTime` siempre viaja en el payload (comportamiento sin cambios).
- **Edición, fecha sin tocar** (incluye turnos vencidos "Atrasado" donde solo se edita notas/profesional/servicio): `startTime` se **omite** del payload del `PUT` — el backend no lo recibe y no puede rechazarlo por estar en el pasado.
- **Edición, fecha cambiada a otra fecha pasada:** `data.startTime !== originalStartTimeRef.current` → `startTimeUnchanged` es `false` → se envía el nuevo `startTime` y el backend lo rechaza con 400 correctamente (caso que ya funcionaba y no debía romperse).
- El resto de los campos del payload de edición (`client`, `notes`, `service`, `professional`) no se vieron afectados por el cambio.

**Verificación:**
```
pnpm --filter @estetica/client build   → Exit Code 0 (OK)
pnpm --filter @estetica/client lint    → Exit Code 1 (mismo error preexistente en ProductoModal.tsx:37, ajeno a este archivo y a UX-12; sin nuevos errores/warnings introducidos por este fix)
```
