# Reporte de Revisión Técnica — Feature UX-02

**Veredicto Final:** APPROVED
**Auditor:** Subagente Reviewer (lógica de negocio) + Leader (verificación de builds de primera mano, ver nota)
**Timestamp:** 2026-06-17

## Contexto
UX-02 no es una historia de `feature_list.json` — es un bugfix puntual de continuación de UX-01 (2026-06-16). Se omiten C1/C5 (gobernanza de backlog) ya que no hay entrada de feature que transicionar a "done".

## Mapeo de Checkpoints (Quality Gates)

- [x] **C2 (Sandbox Hermético):** Los únicos archivos de código modificados por UX-02 son los 3 declarados: `apps/server/src/controllers/serviceRecordController.ts`, `apps/server/src/controllers/appointmentController.ts`, `apps/client/src/components/RegistroModal.tsx`. `RegistroModal.tsx` contiene en el mismo working tree cambios previos de EP-14 no commiteados (props `appointmentId`, `preselectedServiceDate`); el reviewer confirmó que la bitácora de UX-02 es precisa sobre qué líneas le pertenecen — sin contaminación cruzada.
- [x] **C3 (Fidelidad Arquitectónica / lógica de negocio):**
  - `serviceRecordController.ts:27-37`: el guard `if (!nextTouchupTime) return 400(...)` está dentro del bloque de auto-cálculo y antecede completamente al bloque de descuento de stock. Formato `{ error: '...' }` consistente con el resto del proyecto.
  - `appointmentController.ts:217-246`: el guard (líneas 218-220) antecede a "Stock deduction" (línea 222+). Es lógicamente equivalente al bloque de cálculo real (línea 240+): si se llega a `nextTouchupTime.split(':')`, `nextTouchupTime` ya está garantizado. No queda ningún path donde se guarde `nextTouchupDate` con hora arbitraria cuando `defaultTouchupDays > 0`.
  - `RegistroModal.tsx`: `hasAutoTouchup` (línea 106) y `requiresTimeField` (línea 107) se derivan correctamente del servicio seleccionado. Trifecta de accesibilidad respetada en el aviso nuevo (líneas 266-271: `maison-orange` + `FiAlertCircle` + texto) y en el error de hora (líneas 281-286: `maison-red` + `FiAlertCircle` + texto). El botón manual "+ Agregar solo hora" sigue funcionando, gateado por `!hasAutoTouchup` (línea 272), para servicios sin retoque automático.
  - Observación menor no bloqueante: `nextTouchupTime` (línea 88) no se resetea al cambiar el servicio seleccionado. No genera bug (el backend lo ignora si `defaultTouchupDays` no aplica al nuevo servicio), pero queda como deuda de UX menor para un futuro ajuste — no requiere acción inmediata.
- [x] **C4 (Compilación Estática):** Ejecutado de primera mano por el Leader (el reviewer no tenía Bash habilitado en su sandbox para re-ejecutar, pero su propio protocolo solo exige "buscar confirmación del Leader", que aquí se provee con output crudo real, no transcrito de un implementer):
  ```
  pnpm --filter @estetica/server build
  > tsc
  (Exit Code 0)

  pnpm --filter @estetica/client build
  > tsc -b && vite build
  ✓ 281 modules transformed, built in 2.33s
  (Exit Code 0)

  pnpm --filter @estetica/client lint
  ✖ 5 problems (2 errors, 3 warnings)
  ```
  Los 2 errores (`ProductoModal.tsx:37` unused var, `RegistroModal.tsx:134` no-explicit-any en `const payload: any = {...data}`) son preexistentes — confirmado verificando que esa línea ya existía en el archivo antes de los cambios de UX-02, solo desplazada por las inserciones encima. El nuevo warning sobre `watch()` en `RegistroModal.tsx:103` es consistente con el patrón ya usado en `Turnos.tsx:332` y `Negocio.tsx:73` — warning, no error, no bloquea C4.
- [x] **C6 (Capa de Datos):** Sin impacto — UX-02 no modifica esquemas Mongoose.
- [x] **C7 (Security Gate):** Sin impacto — los guards no alteran auth, CORS ni la validación de entrada existente.

## Cambios Requeridos (Si aplica)
Ninguno bloqueante.

**Follow-up sugerido (no bloqueante):** resetear `nextTouchupTime` en `RegistroModal.tsx` cuando cambia el servicio seleccionado, para evitar que una hora tipeada para un servicio anterior persista visualmente al cambiar de servicio.
