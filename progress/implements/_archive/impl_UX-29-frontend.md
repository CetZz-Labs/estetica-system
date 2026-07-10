# Implementación — UX-29 (frontend)

**Feature:** UX-29 — reubicar filtro de profesional + leyenda (UX-18) en la misma fila, leyenda a la derecha.
**Archivo modificado:** `apps/client/src/views/Turnos.tsx` (líneas 434-464 aprox., dentro de la sección de header de la vista Turnos).

## Cambio realizado

Se envolvieron los dos bloques condicionales (filtro de profesional y leyenda de profesionales) en un único contenedor `<div>` flex, en vez de ser hermanos independientes cada uno con su propio `mb-4`.

### Antes

```jsx
{professionals.length > 1 && (
    <div className="mb-4 flex items-center gap-3">
        <label className="text-xs font-bold tracking-widest text-gray-500 uppercase">Profesional</label>
        <select value={professionalFilter} onChange={e => setProfessionalFilter(e.target.value)}
            className="px-4 py-2.5 bg-maison-bg border border-maison-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-gray-200 focus:border-gray-400 transition-all cursor-pointer">
            <option value="">Todas</option>
            {professionals.map(p => (
                <option key={p._id} value={p._id}>{p.name}</option>
            ))}
        </select>
    </div>
)}

{professionals.length > 0 && (
    <div className="mb-4 flex flex-wrap items-center gap-x-4 gap-y-2 overflow-x-auto pb-1" aria-label="Referencia de profesionales">
        {professionals.map((p) => (
            <div key={p._id} className="flex shrink-0 items-center gap-2">
                <span
                    className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-maison-border font-serif text-[0.65rem] shadow-sm"
                    style={{ backgroundColor: p.color, color: getContrastTextColor(p.color) }}
                    aria-hidden="true"
                >
                    {getProfessionalInitials(p.name)}
                </span>
                <span className="whitespace-nowrap text-xs font-medium text-maison-text">{p.name}</span>
            </div>
        ))}
    </div>
)}
```

### Después

```jsx
{professionals.length > 0 && (
    <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        {professionals.length > 1 && (
            <div className="flex items-center gap-3">
                <label className="text-xs font-bold tracking-widest text-gray-500 uppercase">Profesional</label>
                <select value={professionalFilter} onChange={e => setProfessionalFilter(e.target.value)}
                    className="px-4 py-2.5 bg-maison-bg border border-maison-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-gray-200 focus:border-gray-400 transition-all cursor-pointer">
                    <option value="">Todas</option>
                    {professionals.map(p => (
                        <option key={p._id} value={p._id}>{p.name}</option>
                    ))}
                </select>
            </div>
        )}

        {professionals.length > 0 && (
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 overflow-x-auto pb-1 sm:ml-auto" aria-label="Referencia de profesionales">
                {professionals.map((p) => (
                    <div key={p._id} className="flex shrink-0 items-center gap-2">
                        <span
                            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-maison-border font-serif text-[0.65rem] shadow-sm"
                            style={{ backgroundColor: p.color, color: getContrastTextColor(p.color) }}
                            aria-hidden="true"
                        >
                            {getProfessionalInitials(p.name)}
                        </span>
                        <span className="whitespace-nowrap text-xs font-medium text-maison-text">{p.name}</span>
                    </div>
                ))}
            </div>
        )}
    </div>
)}
```

## Notas de implementación

- El contenedor exterior usa `professionals.length > 0` como condición de render (superconjunto de ambas condiciones internas: `> 1` para el filtro, `> 0` para la leyenda), evitando envolver en un `<div className="mb-4">` vacío cuando no hay profesionales.
- El `mb-4` se movió del bloque interno al contenedor padre (una sola vez, no duplicado).
- `flex-col` en mobile (apilado, comportamiento igual al actual) y `sm:flex-row sm:items-center sm:justify-between` desde el breakpoint `sm` para ponerlos en la misma fila.
- `sm:ml-auto` en la leyenda garantiza que quede pegada a la derecha tanto cuando coexiste con el filtro (aunque `justify-between` ya lo resolvería) como cuando aparece sola (caso "1 profesional": el filtro no se renderiza por `length > 1`, y sin `ml-auto` la leyenda quedaría pegada a la izquierda en vez de alineada a la derecha del contenedor).
- Caso "0 profesionales": ningún bloque se renderiza (el `<div>` padre completo desaparece), igual que antes.
- Caso "1 profesional": solo la leyenda se renderiza, alineada a la derecha por `sm:ml-auto`, sin filtro — no queda un contenedor con espacio vacío roto.
- Caso "N > 1 profesionales": ambos bloques en la misma fila, filtro a la izquierda, leyenda a la derecha (`justify-between`).
- No se tocó ninguna lógica de filtrado (`professionalFilter`, `setProfessionalFilter`), ni colores/avatares de la leyenda (`getContrastTextColor`, `getProfessionalInitials`, `p.color`), ni el `aria-label`.

## Build y lint

```
pnpm --filter @estetica/client build
```
Exit code 0. Salida: `tsc -b && vite build` completado sin errores (`✓ built in 953ms`). Solo warning preexistente de chunk size > 500kB (no relacionado).

```
pnpm --filter @estetica/client lint
```
Exit code 1, pero el único **error** reportado es el preexistente y aceptado explícitamente en la tarea: `ProductoModal.tsx:37:25 'stock' is assigned a value but never used`. El resto son 4 **warnings** de React Compiler (`react-hooks/incompatible-library`) en `ProfesionalModal.tsx`, `RegistroModal.tsx`, `Negocio.tsx` y `Turnos.tsx:208` (uso de `watch()` de react-hook-form) — preexistentes, no relacionados con el cambio de layout de esta feature (la línea 208 de `Turnos.tsx` corresponde al modal de formulario de turno, sección distinta a la editada). `Turnos.tsx` no reporta ningún error nuevo.

## Archivos modificados

- `apps/client/src/views/Turnos.tsx` (único archivo tocado)
