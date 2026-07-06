# impl_UX-15-frontend.md — Crash de página en blanco al clickear un turno pasado (tachado)

## Feature
UX-15 — Alcance: reemplazar la expresión inválida de formateo de fecha en el modal de detalle de turno cancelado por el helper compartido `formatDateTime`.

## Nota de proceso
El implementer original interrumpió su sesión por un error de infraestructura (Cloudflare 522, dos intentos) después de aplicar el cambio en el código pero antes de escribir esta bitácora. El leader verificó el diff aplicado (coincide exactamente con lo encomendado), corrió el build/lint y completa esta bitácora en su nombre.

## Archivo modificado
- `apps/client/src/views/Turnos.tsx`

## Cambio

Import agregado (línea ~28):
```typescript
import { formatDateTime } from '../utils/dates';
```

Línea 751 (antes):
```typescript
<p className="text-xs text-red-500">{new Date(selectedAppointment.cancelledAt).toLocaleDateString('es-AR', { dateStyle: 'long', timeStyle: 'short' })}</p>
```

Línea 752 (después):
```typescript
<p className="text-xs text-red-500">{formatDateTime(selectedAppointment.cancelledAt)}</p>
```

`cancelledAt` llega del backend como string ISO (serializado por Express/Mongoose); `formatDateTime` (`apps/client/src/utils/dates.ts`) ya acepta `string | Date` en el resto del codebase (uso equivalente confirmado en `Dashboard.tsx`), por lo que no requiere conversión adicional.

## Alcance respetado
No se tocaron las otras dos ocurrencias de `toLocaleTimeString` ad-hoc en el mismo archivo (líneas ~527, ~733, deuda técnica ya documentada en `progress/current.md`, fuera de esta feature). No se agregó `ErrorBoundary`. No se tocó backend.

## Verificación
```
pnpm --filter @estetica/client build   → Exit Code 0
pnpm --filter @estetica/client lint    → Exit Code 1 (único error preexistente y no relacionado en ProductoModal.tsx:37; 4 warnings preexistentes de react-hooks/incompatible-library, ninguno introducido por este cambio)
```
