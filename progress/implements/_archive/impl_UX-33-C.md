# impl_UX-33-C — Rediseño Shear, Etapa 3, sub-lote C (Clients.tsx + ClienteModal + CargaMasivaClientesModal + Historial.tsx)

## Alcance

Migración puramente visual (sin cambios de lógica de negocio, contratos de API ni queries de
TanStack Query) de 4 archivos frontend al lenguaje visual Shear (`docs/design.md`), sub-lote C
de UX-33. Sandbox: `apps/client/` exclusivamente.

## Archivos modificados

### `apps/client/src/views/Clients.tsx`

- `useTopbar({ title: 'Clientes', primaryAction: { label: '+ Agregar Cliente', onClick: handleOpenNewCliente } })`
  como primera línea del componente — se preservó el copy exacto del botón original ("+ Agregar
  Cliente"). El botón "Importar" (carga masiva) quedó como botón secundario en el cuerpo de la
  vista (no en el topbar, que solo admite una acción primaria).
- La lista `<ul>` original se reemplazó por una `<table>` real siguiendo el patrón `docs/design.md
  §7.8`: contenedor `bg-surface border border-border rounded-card overflow-hidden`, cabecera
  `bg-surface-2` con labels `text-muted text-[11.5px] uppercase`, filas con padding `px-5 py-[13px]`,
  borde inferior `border-border-soft`, hover `bg-surface-2`.
- Columnas: **Cliente** (avatar con iniciales + nombre), **Contacto** (teléfono en `text-text-2`,
  email en `text-accent hover:underline`), **Notas** (chip `bg-gold-bg/text-gold-text` con
  `FiAlertCircle` + texto "Notas médicas" cuando `medicalNotes` está presente; `—` en `text-muted`
  si no).
- **Fila clickeable sin romper HTML semántico:** en vez de un `<tr onClick>` (prohibido por
  `.claude/rules/frontend.md` — simula un control sin equivalente nativo), se usó el patrón
  *stretched link*: el `<Link to="/clientes/:id">` real vive en la primera celda con
  `after:content-[''] after:absolute after:inset-0` y el `<tr>` tiene `className="relative"`, de
  forma que el pseudo-elemento `::after` se estira sobre todo el ancho de la fila (el `tr` es el
  contenedor de posicionamiento). El link `mailto:` de la celda de contacto lleva `relative z-10`
  para seguir siendo clickeable por encima del overlay. Único `<a>` real por fila — cumple
  accesibilidad de teclado (Tab) sin introducir un widget ARIA compuesto.
- Búsqueda propia de la vista (separada del buscador global del topbar) migrada al patrón de
  input `§7.14` (`bg-bg border-border rounded-ctrl`, foco `border-accent-rose`).
- Se preservaron los 4 estados (loading skeleton con `animate-pulse` sobre `bg-surface-2`, error
  con trifecta `bg-alert-bg/text-alert-text` + `FiAlertTriangle` + texto, empty "sin clientes
  aún"/"sin resultados de búsqueda", data) y toda la lógica de filtrado client-side existente —
  **no existe paginación server-side en `/clientes`** (`getClients()` devuelve `Client[]` plano,
  confirmado en `api/clientApi.ts`), por lo que no se introdujo ninguna — es fuera de alcance de
  este sub-lote (migración visual, no funcional).

**Algoritmo de tint rotativo de avatar (para reutilizar en sub-lotes futuros, ej. Profesionales
UX-34):**

```typescript
const AVATAR_TINTS = [
    { bg: 'bg-rose-bg', text: 'text-rose-text' },
    { bg: 'bg-sage-bg', text: 'text-sage-text' },
    { bg: 'bg-gold-bg', text: 'text-gold-text' },
    { bg: 'bg-wine-bg', text: 'text-wine' },
] as const;

const getAvatarTint = (id: string): { bg: string; text: string } => {
    let hash = 0;
    for (let i = 0; i < id.length; i++) {
        hash = (hash * 31 + id.charCodeAt(i)) >>> 0;
    }
    return AVATAR_TINTS[hash % AVATAR_TINTS.length];
};
```

Hash simple (base 31, `>>> 0` para forzar unsigned 32-bit) sobre el `_id` de Mongo — determinístico
(mismo cliente siempre mismo color), sin dependencias externas. Las 4 parejas fondo/texto se
tomaron literalmente de `docs/design.md §2.4` (rose-bg/`--rose-text`, sage-bg/`--sage-text`,
gold-bg/`--gold-text`, wine-bg/`--wine`, este último sin variable `--wine-text` propia — usa
`text-wine` directamente, ya que `--wine-bg` es la versión tenue del mismo `--wine`). No existe
todavía un util compartido (`src/utils/avatarTint.ts`); extraerlo es una mejora opcional para
cuando un segundo consumidor (ej. Profesionales) lo necesite.

### `apps/client/src/components/ClienteModal.tsx`

- Footer: botón "Cancelar" migrado a texto plano `text-muted hover:text-text` (sin fondo/borde,
  seleccion visual consistente con el mismo patrón usado en Dashboard.tsx sub-lote B). Botón
  "Guardar Cliente" migrado a primario `§7.2` (`bg-accent hover:opacity-90 text-white rounded-ctrl`,
  sin sombra/lift).
- Todos los `<input>`/`<textarea>` migrados al patrón `§7.14` (`bg-bg border-border rounded-ctrl
  px-3.5 py-2.5`, foco `border-accent-rose`). Labels migrados a `text-[11.5px] font-semibold
  tracking-wide text-muted uppercase`.
- Bordes de error de validación: `border-destructive` → `border-alert-text`; mensajes de error
  inline: `text-destructive` → `text-alert-text` (color Shear explícito en vez del alias legacy
  `destructive`, aunque ambos resuelven al mismo valor `--alert-text` vía el bridge de `index.css`).

### `apps/client/src/components/CargaMasivaClientesModal.tsx`

- Footer con el mismo patrón que ClienteModal (Cancelar texto plano, Confirmar primario `bg-accent`).
- Guía de formato (tabla de columnas + fila de ejemplo): recoloreada a tokens Shear — cabecera
  `bg-surface-2 text-text-2`, celdas de ejemplo `bg-surface text-text-2`/`text-muted italic`, chip
  "Obligatorio" → `bg-alert-bg/text-alert-text` (antes rojo genérico), chip "Opcional" →
  `bg-surface-2/text-muted` (antes gris genérico). Link "Descargar archivo de ejemplo" → `text-accent`.
  Contenedor de la guía: `bg-bg` (antes `bg-background`, alias legacy).
- Zona de drop: borde `border-[var(--dotted)]` (ver gotcha de naming Tailwind ya documentado —
  colisión con la utilidad nativa `border-dotted`), estado *drag-over* `border-accent bg-rose-bg/60`,
  hover `border-accent-rose bg-rose-bg/40`. Ícono `FiUploadCloud` recoloreado `text-dotted
  group-hover:text-accent`.
- Preview de archivo cargado y tabla de preview (primeras 10 filas): recoloreados a
  `bg-surface`/`bg-surface-2`/`text-text`/`text-text-2`/`text-muted`, botón "Cambiar" → `text-alert-text`.
- Toast de éxito (`toast.success` con `style` inline, fuera del sistema de clases Tailwind):
  recoloreado de verde genérico (`#fff9f6`/`#6b8e7b`) a la paleta `sage` de Shear
  (`background:#EEF0E6, color:#71774F, borderColor:#8C9178`).

### `apps/client/src/views/Historial.tsx`

- `useTopbar({ title: 'Historial de Visitas' })` sin `primaryAction` — no existe ninguna acción de
  creación directa desde esta vista (confirmado en el código original).
- Se retiró el `<header>` propio con el título (ahora vive en el topbar).
- Panel de filtros (`react-select` x3 + inputs de fecha x2 + "Limpiar filtros"): contenedor
  `bg-surface border-border rounded-card`, labels `text-[11.5px] text-muted uppercase`, inputs de
  fecha migrados a `§7.14`, botón "Limpiar filtros" migrado a estilo secundario (`bg-surface
  border-[var(--dotted)] text-wine hover:bg-hover-soft`).
- `selectStyles` de `react-select` (objeto de estilos inline, no Tailwind) recoloreado con los hex
  literales de los tokens Shear: `control` fondo `#FAF6F4` (bg), borde `#F0E4E4` (border) / foco
  `#D98BA4` (accent-rose), radio `10px`; `option` seleccionada `#B76E84` (accent) texto blanco,
  focus/hover `#F7E7EC` (rose-bg), texto `#3E2A33` (text); `placeholder` `#B9A6AD` (placeholder).
- Tabla migrada al mismo patrón `§7.8` que Clients.tsx (cabecera `bg-surface-2`, filas
  `border-border-soft`, hover `bg-surface-2`). El punto de color por profesional
  (`registro.professional.color`, inline `style`) se preservó tal cual — es un color fijo por
  profesional (`docs/design.md §9`), no un token Shear genérico.
- **Se preservó íntegramente** el patrón `{data, meta}` paginado server-side (P1/P3): `queryKey`
  con `page`/`limit`/filtros, `keepPreviousData`, reset de `page` a 1 en cada cambio de filtro,
  `<Pagination>` (ya migrado en sub-lote A, sin tocar) consumiendo `meta.total`. Fechas mostradas
  con `formatCalendarDate` de `utils/dates.ts` (sin cambios).

## Verificación

```
pnpm --filter @estetica/client build   → Exit 0 (tsc -b && vite build, sin errores de tipos)
pnpm --filter @estetica/client lint    → 5 errores / 4 warnings preexistentes, TODOS en archivos
                                          fuera de este sub-lote (ProductoModal.tsx,
                                          ProfesionalModal.tsx, RegistroModal.tsx, react-bits/*,
                                          Negocio.tsx, Turnos.tsx — ninguno tocado por esta sesión,
                                          confirmado con `git diff --stat`).
npx eslint src/views/Clients.tsx src/views/Historial.tsx src/components/ClienteModal.tsx \
    src/components/CargaMasivaClientesModal.tsx
                                        → 0 errores, 0 warnings (verificación aislada de los 4
                                          archivos de este sub-lote).
```

`git diff --stat` confirma que solo se modificaron los 4 archivos listados arriba dentro del
alcance de este sub-lote (más archivos ya migrados en sub-lotes previos A/B, no tocados de nuevo).

## Notas para sub-lotes futuros

- El algoritmo `getAvatarTint` (hash + 4 parejas rose/sage/gold/wine) está documentado arriba
  para que Profesionales (UX-34) lo reutilice si necesita el mismo tipo de avatar — no se extrajo
  a un util compartido todavía (single consumer).
- El patrón *stretched link* (`after:content-[''] after:absolute after:inset-0` en un `<Link>`
  dentro de la primera celda + `relative` en el `<tr>`) es la solución elegida para filas de
  tabla clickeables sin violar la regla de HTML semántico (`.claude/rules/frontend.md §3`,
  "prohibido `<div>`/`<tr>` con `onClick` simulando navegación"). Reutilizable en cualquier tabla
  futura (ej. Inventario/Productos si necesita navegar a detalle).
