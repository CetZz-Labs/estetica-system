# Reporte de Exploración — UX-29 (layout filtro + leyenda de profesionales)

**Pregunta:** ¿Dónde y cómo reubicar la leyenda de profesionales (UX-18) a la derecha del filtro de profesional, en la misma fila, sin tocar lógica de filtrado ni colores?
**Contexto:** UX-29, `apps/client/src/views/Turnos.tsx`
**Timestamp:** 2026-07-10

## Hallazgos
1. `apps/client/src/views/Turnos.tsx:434-445`: bloque del filtro — `<div className="mb-4 flex items-center gap-3">` renderizado solo si `professionals.length > 1`. Contiene `<label>` + `<select>`.
2. `apps/client/src/views/Turnos.tsx:447-462`: bloque de la leyenda (UX-18) — `<div className="mb-4 flex flex-wrap items-center gap-x-4 gap-y-2 overflow-x-auto pb-1" aria-label="Referencia de profesionales">`, renderizado si `professionals.length > 0` (condición distinta a la del filtro). Ambos son hermanos directos, sin `<div>` padre común; el apilamiento actual viene de que cada uno es un bloque `mb-4` propio, no de flex-col explícito.
3. Entre ambos bloques no hay otro elemento (ni botones de vista ni navegación de fecha — esos viven dentro de `headerToolbar` de FullCalendar, línea 517, en otro contenedor `.fc` más abajo). El reordenamiento no afecta la toolbar de FullCalendar.
4. Condiciones de render distintas (`> 1` vs `> 0`) implican que si hay exactamente 1 profesional, la leyenda aparece sola sin filtro — el layout combinado debe tolerar ese caso (leyenda ocupando toda la fila, sin `justify-between` roto).

## Diagnóstico
Los dos bloques son divs hermanos independientes, cada uno con su propio `mb-4`, lo que produce el apilamiento vertical actual (no hay `flex-col` explícito forzándolo, es simplemente el flujo de bloques por defecto). No comparten contenedor. Para alinearlos en una fila hace falta envolver ambos `if` en un único `<div>` padre con flex, preservando el mismo `aria-label` y clases internas.

## Recomendación
Envolver ambos bloques condicionales (líneas 434-462) en un contenedor único:
```jsx
<div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
    {professionals.length > 1 && (
        <div className="flex items-center gap-3">
            <label className="text-xs font-bold tracking-widest text-gray-500 uppercase">Profesional</label>
            <select value={professionalFilter} onChange={e => setProfessionalFilter(e.target.value)}
                className="px-4 py-2.5 bg-maison-bg border border-maison-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-gray-200 focus:border-gray-400 transition-all cursor-pointer">
                <option value="">Todas</option>
                {professionals.map(p => (<option key={p._id} value={p._id}>{p.name}</option>))}
            </select>
        </div>
    )}
    {professionals.length > 0 && (
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 overflow-x-auto pb-1 sm:ml-auto" aria-label="Referencia de profesionales">
            {professionals.map((p) => (/* sin cambios */))}
        </div>
    )}
</div>
```
Quitar los `mb-4` internos de cada sub-div (el `mb-4` pasa al contenedor padre). Mantener `sm:ml-auto` en la leyenda solo por seguridad para el caso "1 profesional" (leyenda sola, sin filtro) — con `justify-between` en el padre ya se separan cuando ambos están presentes; en mobile (`flex-col`) se apilan como hoy. No se toca ninguna clase de color/avatar (líneas 449-460) ni el `<select>` (línea 437-443).
