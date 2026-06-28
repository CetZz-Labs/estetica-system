# impl_UX-11-frontend — Carga Masiva de Clientes + Guía Visual de Columnas

## Feature
UX-11 (frontend) — Carga masiva de clientes y guía visual de columnas en ambos modales de carga masiva.

## Archivos modificados / creados

| Archivo | Operación |
|---------|-----------|
| `apps/client/src/api/clientApi.ts` | Modificado — agregado `BulkClientData` interface y función `createBulkClients` |
| `apps/client/src/components/CargaMasivaClientesModal.tsx` | Creado — modal de carga masiva para clientes con guía visual de columnas |
| `apps/client/src/components/CargaMasivaModal.tsx` | Modificado — guía visual de columnas agregada antes de la zona de drop; hint text actualizado |
| `apps/client/src/views/Clients.tsx` | Modificado — botón "Carga Masiva", estado `isCargaMasivaOpen`, integración de `CargaMasivaClientesModal` |

## Decisiones técnicas

- `CargaMasivaClientesModal` replica exactamente el patrón de `CargaMasivaModal` (xlsx parsing, FileReader, mutation + invalidateQueries, footer, skeleton de preview) adaptado para el dominio clientes.
- Mapeo de columnas: acepta variantes `Nombre`/`nombre`/`firstName`, `Apellido`/`apellido`/`lastName`, `Telefono`/`telefono`/`Teléfono`/`phone`, `NotasMedicas`/`notasMedicas`/`medicalNotes`. Campos opcionales `phone`/`medicalNotes` se asignan como `undefined` cuando la celda queda vacía (evitar enviar strings vacíos al backend).
- Filtro de filas: se descartan las que no tienen `firstName` o `lastName` tras trim.
- Preview table muestra columnas "Nombre Apellido" y "Teléfono" (guion em cuando está vacío).
- La guía visual de columnas es estática (siempre visible) y se ubica antes de la zona de drop en ambos modales.
- Los dos botones en `Clients.tsx` se envuelven en un `<div className="flex items-center gap-2 sm:gap-3 flex-wrap self-start sm:self-auto">` para alineación correcta.

## Resultado del build

```
pnpm --filter @estetica/client build
Exit code: 0
✓ 692 modules transformed
built in 914ms
```

## Resultado del lint

```
pnpm --filter @estetica/client lint
Exit code: 1 (pre-existente, no introducido por esta feature)
```

Errores/advertencias detectados — todos preexistentes, ninguno en archivos de esta feature:
- `ProductoModal.tsx:37` — `@typescript-eslint/no-unused-vars` (destructuring `{ stock, ...updateData }` preexistente)
- `ProfesionalModal.tsx`, `RegistroModal.tsx`, `Negocio.tsx`, `Turnos.tsx` — warnings `react-hooks/incompatible-library` preexistentes por uso de `watch()` de react-hook-form

Ningún error ni warning nuevo introducido por los archivos de esta feature.

## Correcciones post-review (ronda 2)

Tres fixes de CSS/atributos aplicados sobre los resultados de la primera ronda:

1. **`CargaMasivaModal.tsx` — botón "Cambiar":** agregado `type="button"` y clase `cursor-pointer`.
2. **`CargaMasivaModal.tsx` — botón "Confirmar Carga":** agregado `disabled:cursor-not-allowed` al className.
3. **`CargaMasivaClientesModal.tsx` — botón "Confirmar Carga":** agregado `disabled:cursor-not-allowed` al className.

Build post-fix: exit code 0 (692 módulos, 863ms). Lint post-fix: exit code 1, mismos 5 problemas preexistentes — sin cambios.
