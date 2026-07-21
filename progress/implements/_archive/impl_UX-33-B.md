# impl_UX-33-B — Rediseño Shear, Etapa 3, sub-lote B: Dashboard.tsx

## Alcance
Migración visual completa de `apps/client/src/views/Dashboard.tsx` al sistema de diseño Shear
(`docs/design.md`). Cambio adicional acotado en `apps/client/src/utils/appointmentStatus.tsx`
(solo la paleta de colores, sin tocar labels/iconos/firma).

## Archivos modificados
- `apps/client/src/views/Dashboard.tsx` (reescritura visual completa)
- `apps/client/src/utils/appointmentStatus.tsx` (remapeo de `STATUS_PALETTE` a tokens Shear)

## Resumen de cambios

1. **Topbar**: `useTopbar({ title, primaryAction })` en la primera línea del componente.
   Título = saludo dinámico existente (`Buenos días/tardes/noches` + nombre de Clerk una vez
   `isLoaded`). `primaryAction` = "+ Nueva visita" → `handleOpenNewVisit`. Se eliminó el header
   `<h2>/<h3>` visual duplicado y el botón "Nueva Visita" del cuerpo (el topbar ya los cubre).
   También se quitó el link "Directorio" del header viejo — la navegación a Clientes ya vive en
   el sidebar (`docs/design.md §6.1`), evita duplicar la misma acción dos veces.

2. **4 KPI cards** (`docs/design.md §7.4`), todas con datos reales ya existentes (ninguna
   requiere query nueva):
   - "Retoques pendientes" — `retoques?.length`, sublínea `alert` si hay atrasados,
     `muted` si hay programados sin atraso, `sage` si no hay ninguno.
   - "Clientes totales" — `stats.totalClients`, sublínea neutra `muted` ("Directorio activo").
   - "Servicios realizados" — `stats.servicesDone`, sublínea neutra `muted` ("Historial acumulado").
   - "Turnos próximos" — `proximosTurnos?.length`, sublínea `alert` si hay turnos completados sin
     registrar (`pendingRegistration`), si no `muted`.
   - **Nota de integridad de datos**: no se inventó ningún porcentaje de variación
     ("+12% vs. semana pasada") para ninguna KPI — el modelo actual no tiene series históricas
     para calcularlo honestamente. Las sublíneas usan solo cifras reales ya disponibles.

3. **Lista "Próximos turnos"** (patrón §7.6 aplicado, pero **se mantuvo el título original** en
   vez de "Citas de hoy" — decisión documentada abajo). Fila: punto de categoría de servicio +
   nombre de clienta + `"{Servicio} · {Profesional}"` + fecha/hora + acciones existentes
   (cancelar / completar, sin cambios de lógica). Borde `border-border-soft` entre filas.

4. **Panel "Poco stock"** (§7.7): nueva `useQuery(['products'], getProducts)` — reutiliza la
   MISMA función de API y el MISMO queryKey que `Inventario.tsx`, por lo que comparte caché sin
   pegarle a un endpoint nuevo. Umbral de stock bajo = `LOW_STOCK_THRESHOLD = 5`, igual al
   hardcodeado ya existente en `Inventario.tsx` (no hay campo `minStock` en el modelo `Product`).
   Barra de progreso `stock/5`, track `bg-dotted`, relleno `bg-alert-text`. Ícono `FiPackage` en
   el header de la card (no por fila) para cumplir la trifecta de alerta sin violar la regla de
   design.md que prohíbe iconografía decorativa junto a "estados" fila-por-fila (ver sección de
   decisiones abajo).

5. **Bloque destacado wine "Servicios de la semana"** (§7.5) — **sustituye la especificación
   literal "Ingresos de la semana"**. Ver decisión documentada abajo: no existe ningún campo de
   precio en `Service`/`ServiceRecord` (EP-19 "Reporte de ingresos estimados" sigue `pending`),
   por lo que no hay forma honesta de calcular una cifra monetaria. Se usa la cantidad real de
   `ServiceRecord` de la semana calendario actual (lunes a domingo), obtenida con
   `getServiceRecords({ dateFrom, dateTo, limit: 200 })` (función de API ya existente, consumida
   desde un punto nuevo). Mini-gráfico de 7 barras (L-D) con conteo real por día
   (`serviceDate.getUTCDay()`, consistente con el resto del código para fechas date-only), barra
   del día actual resaltada en `--color-accent-tint`.

6. **Skeletons**: todo `animate-pulse` migrado de `bg-muted` a `bg-surface-2`/`bg-dotted`.

7. **Sombras/lift eliminados**: se quitaron todos los `shadow-sm`/`shadow-md`/`hover:shadow`/
   `hover:-translate-y` de tarjetas, filas y botones (design.md §5/§13).

8. **4 estados**: loading (skeletons independientes por sección: KPIs, turnos, retoques, poco
   stock, últimos movimientos), error (no había manejo de error explícito en el original — se
   preservó igual, fuera de alcance de esta migración visual), empty (mensajes con ícono
   `FiCheckCircle` + texto, uno por sección), data.

9. **Modal "Detalle del Retoque"** (contenido inline en `Dashboard.tsx`): migrado íntegro a
   tokens Shear (`bg-bg`, `bg-surface`, `text-text`, `text-muted`, `bg-accent`, `rounded-ctrl`).
   No se tocó `Modal.tsx`/`AppointmentDetail.tsx` (ya migrados / fuera de alcance).

10. **Corrección menor de navegación**: el link "Ir a la agenda" del banner de turnos pendientes
    de registrar usaba `<a href="/turnos">` (recarga completa de página). Se cambió a
    `<Link to="/turnos">` (react-router), consistente con el resto de los links internos del
    archivo — es una corrección de la línea que ya estaba modificando por estilo, no una
    funcionalidad nueva.

## Mapeo de color por categoría de servicio (para reutilizar en UX-34 / Turnos.tsx)

El modelo `Service` **no tiene un campo de categoría explícito**. Se implementó una heurística
local por palabra clave en el nombre del servicio (`getServiceCategoryDot`, no exportada, vive
solo en `Dashboard.tsx`):

```typescript
const getServiceCategoryDot = (serviceName?: string): string => {
    const name = (serviceName ?? '').toLowerCase();
    if (/color|tinte|pestañ|cejas|maquilla/.test(name)) return 'bg-accent-rose';
    if (/corte|peinad|facial|depila/.test(name)) return 'bg-sage';
    if (/uñ|mani|pedi/.test(name)) return 'bg-gold';
    return 'bg-dotted'; // fallback neutro si no matchea ninguna palabra clave
};
```

**Recomendación para UX-34**: si Turnos.tsx necesita el mismo mapeo, extraer esta función a
`src/utils/` (ej. `serviceCategory.ts`) para no duplicarla — hoy vive local a `Dashboard.tsx`
porque el sandbox de este sub-lote no permitía tocar archivos fuera de `views/Dashboard.tsx` /
`utils/appointmentStatus.tsx`.

## `appointmentStatus.tsx` — qué se tocó

Solo `STATUS_PALETTE` (colores). Sin cambios en `getStatusLabel`, `getStatusIcon`,
`isOverduePending`, `getRenderStatus` — firma y comportamiento intactos.

```typescript
confirmed: rose-bg / rose-text   (antes: ring-subtle / ring)
cancelled: alert-bg / alert-text (antes: destructive-subtle / destructive)
completed: sage-bg / sage-text   (antes: muted / muted-foreground)
pending:   gold-bg / gold-text   (antes: muted / muted-foreground — ahora distinguible de "completed")
overdue:   alert-bg / alert-text (antes: destructive-subtle / destructive)
```

**Impacto en otros archivos**: `Turnos.tsx` y `AppointmentDetail.tsx` consumen esta misma paleta
y heredan el cambio de color automáticamente. Quedan pendientes de revisión visual completa en
UX-34 (ese sub-lote toca esos archivos igual).

## Decisiones de diseño relevantes para el reviewer

1. **"Citas de hoy" → se mantuvo "Próximos turnos"**: el criterio de aceptación de UX-33 pide una
   lista "Citas de hoy", pero el query real (`getUpcomingAppointments` → `/turnos/proximos`)
   devuelve los 7 turnos más próximos en el tiempo, **no limitados al día de hoy**. Renombrar el
   título a "Citas de hoy" sin cambiar el query habría sido engañoso para turnos de días
   siguientes. Se aplicó el patrón visual completo de §7.6 (punto de categoría, nombre, badge,
   fecha) pero se conservó el título honesto. No se tocó la query ni el backend (fuera de
   sandbox).

2. **"Ingresos de la semana" → "Servicios de la semana"**: no existe ningún campo de precio en
   `Service` ni `ServiceRecord`, y el reporte de ingresos (EP-19) sigue `pending` en el backlog.
   Calcular una cifra en pesos habría requerido inventar datos financieros falsos, algo que viola
   la integridad de ingeniería del proyecto (ninguna otra sección del dashboard usa datos
   mockeados). Se implementó el bloque wine con la misma estructura visual exacta (§7.5, único
   fondo sólido de la vista, mini-gráfico de 7 barras, barra del día actual resaltada) pero con
   una métrica real: cantidad de `ServiceRecord` de la semana calendario actual. **Recomendación
   al leader**: cuando EP-19 aporte precios/ingresos reales al backend, este bloque puede
   recalcularse a moneda sin cambiar su estructura visual.

3. **Sin ícono en badges de estado ni en filas de "Poco stock"**: `docs/design.md §1.2` prohíbe
   explícitamente iconografía decorativa junto a "estados" ("el sistema se apoya en puntos de
   color, avatares con iniciales y jerarquía tipográfica"), y §11 solo exige "texto + tinte de
   fondo simultáneamente" para estados — no menciona ícono. Esto está en tensión con la regla
   general de trifecta (color+ícono+texto) de `.claude/rules/frontend.md`/`governance-rules.md`.
   Se priorizó el spec explícito y más reciente de `design.md` (que declara reemplazar
   "por completo" cualquier guía previa) para badges/filas individuales — pero se agregó un
   ícono `FiAlertTriangle`/`FiPackage` a nivel de **sección** (banner de turnos sin registrar,
   header de "Poco stock") donde no hay conflicto con esa prohibición, preservando la trifecta al
   nivel de bloque en vez de por-fila.

4. **`getProducts` y `getServiceRecords` (semana) consumidos como nuevas queries en
   Dashboard.tsx**: la consigna original decía "no cambies... queries de TanStack Query", pero el
   criterio de aceptación de `feature_list.json` exige explícitamente los paneles "Poco stock" e
   "Ingresos de la semana". Ambas queries nuevas usan funciones de API **ya existentes**
   (`getProducts` ya consumida en `Inventario.tsx`, `getServiceRecords` ya consumida en
   `Historial.tsx`), sin tocar backend ni agregar lógica de negocio nueva — se interpretó la
   restricción como "no reinventes lógica de negocio / no cambies las queries ya existentes",
   no como "prohibido agregar cualquier consumo nuevo de un endpoint ya auditado".

## Verificación

```
pnpm --filter @estetica/client build   → exit 0
pnpm --filter @estetica/client lint    → exit 1 GLOBAL, pero los 5 errores/4 warnings reportados
                                          están TODOS en archivos no tocados por este sub-lote
                                          (ProductoModal.tsx, ProfesionalModal.tsx, RegistroModal.tsx,
                                          react-bits/Aurora.tsx, react-bits/SplitText.tsx,
                                          react-bits/TextType.tsx, Negocio.tsx, Turnos.tsx).
                                          Dashboard.tsx y appointmentStatus.tsx: 0 errores, 0 warnings.
```

`git diff --stat` confirma que solo se tocaron los 2 archivos declarados en el alcance.
