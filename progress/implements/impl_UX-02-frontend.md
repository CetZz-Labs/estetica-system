# Bitácora de Implementación — UX-02 (Frontend)

**Agente:** implementer (frontend) + Leader (cierre de verificación, ver nota de bloqueo abajo)
**Feature:** UX-02 — Exigir hora automáticamente cuando el servicio tiene retoque automático configurado (no está en `feature_list.json`, es bugfix puntual)

## Problema
`RegistroModal.tsx` solo exigía el campo "Hora del turno" si el usuario clickeaba manualmente el botón "+ Agregar solo hora" (`showTimeField`). Ese estado nunca se derivaba de si el servicio seleccionado tenía `defaultTouchupDays > 0` — el caso real en que el backend siempre auto-calcula `nextTouchupDate`. Resultado: el usuario podía completar y enviar el formulario sin que se le pidiera la hora, aun cuando el sistema iba a generar un retoque automático.

## Cambios — `apps/client/src/components/RegistroModal.tsx`

1. **Import (línea 5):** se agregó `FiAlertCircle` a los íconos de `react-icons/fi`.
2. **`useForm` (línea 90):** se agregó `watch` a la desestructuración.
3. **Derivación de estado (líneas 103-107, nuevas):**
   ```ts
   const selectedServiceId = watch('service');
   const nextTouchupDateValue = watch('nextTouchupDate');
   const selectedService = services?.find(s => s._id === selectedServiceId);
   const hasAutoTouchup = !!selectedService && selectedService.defaultTouchupDays > 0;
   const requiresTimeField = showTimeField || (hasAutoTouchup && !nextTouchupDateValue);
   ```
   Mismo patrón que el ya usado en `apps/client/src/views/Turnos.tsx:332` (`watch('service')`).
4. **`onSubmit` (línea 168):** la validación ahora usa `requiresTimeField` en vez de `showTimeField`, mismo mensaje de error (`'La hora del turno es obligatoria'`).
5. **JSX del bloque "Próximo Retoque" (líneas ~254-288):**
   - Si `hasAutoTouchup && !nextTouchupDateValue`: se muestra un aviso (Trifecta: color `text-maison-orange` + ícono `FiAlertCircle` + texto) — *"Este servicio tiene retoque automático a los X días — indicá la hora del turno."*
   - El botón manual "+ Agregar solo hora" solo se muestra si `!hasAutoTouchup` (servicios sin retoque automático configurado, donde sigue siendo opcional).
   - El campo `<input type="time">` se renderiza si `requiresTimeField` (en vez de `showTimeField`).
   - El mensaje de error `timeError` ahora incluye ícono `FiAlertCircle` además de color y texto (antes solo color+texto).
6. Se confirmó que `Service.defaultTouchupDays: number` ya existía en `apps/client/src/types/index.ts:62` — no fue necesario modificar tipos.

## Verificación (ejecutada por el Leader — ver nota de bloqueo)
```
pnpm --filter @estetica/client build
> tsc -b && vite build
✓ built in 2.33s
```
**Resultado: Exit Code 0.**

```
pnpm --filter @estetica/client lint
```
**Resultado: 2 errores, 3 warnings — ninguno nuevo.**
- `ProductoModal.tsx:37:25` (unused var `stock`) — archivo no tocado por este fix, preexistente.
- `RegistroModal.tsx:134:28` (`no-explicit-any` en `const payload: any = { ...data }`) — línea preexistente (ya estaba en el archivo antes de este fix, solo se desplazó por las inserciones encima).
- Los 3 warnings "Compilation Skipped: Use of incompatible library" sobre `watch()` (incluyendo el nuevo en `RegistroModal.tsx:103`) son consistentes con el patrón ya usado en `Turnos.tsx:332` y `Negocio.tsx:73` — son warnings, no errores, y no bloquean C4.

## Nota de bloqueo de herramientas
El implementer frontend completó el código vía `Edit` (que sí tenía permitido), pero las herramientas `Bash` y `Write` (archivo nuevo) le fueron denegadas en su sesión, por lo que no pudo correr build/lint ni escribir esta bitácora. El Leader verificó el diff línea por línea, ejecutó build y lint, y escribió esta bitácora en su lugar para no bloquear el cierre del ciclo.

## Archivos modificados
- `apps/client/src/components/RegistroModal.tsx`
