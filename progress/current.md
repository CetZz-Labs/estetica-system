# Plan y Estado de la Sesión Actual

## Metadatos de la Sesión
- **Última actualización:** 2026-10-14
- **Sesión:** cerrada — REP-4 done
- **Rama:** `feature/REP-4-reportes-clientes` (pila REP-1 → REP-2 → REP-3 → REP-4; sin mergear)
- **Feature en curso:** ninguna

## Plan de Acción
_(sin feature activa — plantilla vacía hasta la próxima tarea)_

## Aprobación pendiente antes de mergear
- **Pila REP-1 → REP-4 lista, SIN mergear.** El usuario debe probar `/reportes` en el navegador (ADMIN, datos reales, descargas de Excel, 360px) y aprobar manualmente. Ramas apiladas: `feature/REP-1-reportes-turnos` (68d7d0e) → `feature/REP-2-reportes-ocupacion-servicios` (90abf35) → `feature/REP-3-reportes-productos` (567b69b) → `feature/REP-4-reportes-clientes` (90e4378). Merge en ese orden hacia `development`. No hay push hecho.

## Estado del Backlog
- REP-1..4 → **done** (ver `progress/history.md`). Cubren EP-18, EP-20 y EP-21 (pendiente decidir si se cierran formalmente en `feature_list.json`).
- REP-5 (ingresos, EP-19): requiere precio en `Service` + snapshot en `ServiceRecord` + migración (el usuario lo difirió).
- Pendientes: UX-34, UX-35, EP-22 (exportación general), EP-23 a EP-25.

## Bloqueos y Riesgos Conocidos
- **Validación humana pendiente:** `/reportes` completo (4 secciones) y descargas de Excel en navegador; UX-92; C9 de UX-91.
- **Deuda:** `Client.lastName` required vs CHANGELOG UX-73; bundle único grande (code-splitting); `getTodayDateString` sin tz del tenant; contraste `text-white` en heatmap; `getAppointments` sin `.limit`; 4 tests preexistentes de POST /api/registros.
- **Recordatorio operativo:** ningún subagente usa `git stash`; verificar `git stash list` vacío.
