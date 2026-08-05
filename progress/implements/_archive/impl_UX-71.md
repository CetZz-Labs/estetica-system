# impl_UX-71 — Quitar campo "Próximo Retoque" del formulario de visita pasada

## Feature
UX-71 — Ocultar el bloque "Próximo Retoque" en `RegistroModal.tsx` cuando `pastVisitMode` está activo (formulario "Registrar Visita Pasada" abierto desde `ProfileClient.tsx`).

## Archivo modificado
- `apps/client/src/components/RegistroModal.tsx`

## Cambios
1. El contenedor `<div className="grid grid-cols-1 md:grid-cols-2 gap-5">` que envuelve "Fecha del Servicio" + "Próximo Retoque" (líneas ~347-409 antes del cambio) ahora usa clase condicional:
   ```tsx
   <div className={`grid grid-cols-1 ${pastVisitMode ? '' : 'md:grid-cols-2'} gap-5`}>
   ```
   Así, en `pastVisitMode` el input "Fecha del Servicio" ocupa el ancho completo en vez de quedar con la mitad vacía.

2. El bloque completo de "Próximo Retoque" (label, botón condicional "Usar sugerida", grid interno con `touchupDate`/`touchupTime` vía `Controller`, y el `{errors.touchupTime && ...}`) se envolvió en:
   ```tsx
   {!pastVisitMode && ( ...bloque completo sin modificar internamente... )}
   ```
   Solo se agregó el condicional de renderizado — ningún JSX interno del bloque fue tocado.

3. No se tocaron ni eliminaron: `hasSuggestedTouchup`, `watchedTouchupDate`, `watchedTouchupTime`, `touchupTimeOptions`, `handleUseSuggestedDate`, el `Controller` de `touchupTime`, la query `touchupDayAppointments`, ni `availableTouchupSlots`. Siguen intactos porque son necesarios para modo normal y modo "completar turno" (`appointmentId`).

## Confirmación de los otros 2 modos
- **Modo normal** (sin `pastVisitMode` ni `appointmentId`): `pastVisitMode` es `false` (default), por lo que `!pastVisitMode` es `true` → el bloque de retoque se renderiza exactamente igual que antes, y el grid sigue en `md:grid-cols-2`.
- **Modo completar turno** (`appointmentId` presente, `pastVisitMode` no seteado → `false` por default de la prop): mismo comportamiento que el modo normal, bloque de retoque visible sin cambios.
- Ninguna lógica de `onSubmit`, mutaciones, ni queries fue alterada — solo el JSX de presentación condicional.

## Confirmación de payload sin residuales (punto 5 del brief)
Revisado el `useEffect` de apertura (líneas ~191-204): `reset({..., touchupDate: '', touchupTime: '', ...})` corre cada vez que `isOpen` cambia a `true`, y `pastVisitMode` está en el arreglo de dependencias del `useEffect`. Como cada apertura del modal (incluido un cambio de modo entre aperturas) dispara `reset()` con `touchupDate`/`touchupTime` vacíos, no queda posibilidad de que un valor residual de "Próximo Retoque" se cuele en `onSubmit` cuando `pastVisitMode` es `true` — `nextTouchupDate` solo se agrega al payload si `touchupDate && touchupTime` están ambos presentes (línea `onSubmit`), y en `pastVisitMode` el usuario nunca tiene acceso a esos inputs para poblarlos en esa sesión de apertura. No se requirió ningún cambio adicional en `onSubmit` ni en el `useEffect` de reset.

## Verificación
- `pnpm --filter @estetica/client build` → **Exit code 0** (build de TypeScript + Vite exitoso, sin errores).
- `pnpm --filter @estetica/client lint` → **Exit code 0**, 0 errores. 4 warnings preexistentes de `react-hooks/incompatible-library` (React Compiler + `watch()` de react-hook-form) en `ProfesionalModal.tsx`, `RegistroModal.tsx` (línea 128, ya existente antes del cambio, no relacionada a esta feature), `Negocio.tsx` y `Turnos.tsx` — no introducidos por este cambio, presentes en todo el codebase donde se usa `watch()`.

## Estado
Implementación completa. Pendiente de revisión por el subagente `reviewer` para marcar `"done"` en `feature_list.json`.
