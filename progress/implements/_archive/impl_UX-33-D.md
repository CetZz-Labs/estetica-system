# impl_UX-33-D — Rediseño Shear, Etapa 3, sub-lote D (Inventario.tsx + ProductoModal + AjusteStockModal + CargaMasivaModal)

## Alcance

Migración puramente visual (sin cambios de lógica de negocio, contratos de API ni queries de
TanStack Query) al lenguaje visual Shear (`docs/design.md`), sub-lote D de UX-33. Sandbox:
`apps/client/` exclusivamente.

**`apps/client/src/views/Inventario.tsx` venía migrado de una sesión anterior interrumpida**
(detectado ya modificado en el working tree, sin commit, al arrancar este sub-lote). Se leyó el
archivo completo y se hizo `grep` de clases legacy (`bg-card`, `bg-background`, `text-foreground`,
`text-muted-foreground`, `bg-primary`, `border-primary`, `shadow-`, `hover:-translate-y`,
`text-destructive`, `text-warning`) — cero coincidencias. El archivo ya tenía: `useTopbar({ title:
'Inventario', primaryAction: {...} })`, 3 KPI cards `bg-surface`/`rounded-card`/`p-6` con label
`text-muted uppercase text-[11.5px]` + cifra `font-serif text-4xl`, tabla `§7.8` completa con
columna "Estado" (badges `bg-alert-bg/text-alert-text` "Reponer" con `FiAlertTriangle` vs
`bg-sage-bg/text-sage-text` "En stock" con `FiCheckCircle`), botón "Importar" secundario
(`border-[var(--dotted)] text-wine`), botón "+ Nuevo Producto" en el topbar, estado `isError`
manejado con trifecta. No se encontró nada inconsistente ni a medio migrar — **no se reescribió**,
solo se verificó y se cierra junto con los 3 modales de este sub-lote.

## Archivos modificados

### `apps/client/src/components/ProductoModal.tsx`

- Footer: botón "Cancelar" migrado a texto plano `text-muted hover:text-text` (sin fondo/borde).
  Botón "Guardar"/"Crear Producto" migrado a primario `§7.2` (`bg-accent hover:opacity-90
  disabled:opacity-50 text-white rounded-ctrl`, sin sombra/lift).
- Todos los `<input>`/`<textarea>` migrados al patrón `§7.14` (`bg-bg border-border rounded-ctrl
  px-3.5 py-2.5`, foco `border-accent-rose`). Labels migrados a `text-[11.5px] font-semibold
  tracking-wide text-muted uppercase`.
- Errores de validación: `border-destructive`/`text-destructive` → `border-alert-text`/
  `text-alert-text`.
- Caja informativa ("Para modificar la cantidad en stock, usá Ajustar Stock..."): recoloreada de
  `bg-blue-50 border-blue-100 text-blue-700` (azul genérico ajeno a la paleta Shear, §2 no define
  ningún azul) a `bg-rose-bg/60 border-border text-wine` con ícono `FiInfo text-accent` — es un
  aviso informativo, no un estado de alerta, por lo que se usó el tinte `rose` (marca) en vez de
  `alert` (reservado a advertencias/errores según §8).
- Toast de éxito (`toast.success` con `style` inline): recoloreado de verde genérico
  (`#fff9f6`/`#6b8e7b`) a la paleta `sage` de Shear (`background:#EEF0E6, color:#71774F,
  borderColor:#8C9178`), igual que en `ClienteModal.tsx`/`CargaMasivaClientesModal.tsx`.
- **Deuda de lint preexistente corregida de paso**: la línea `const { stock, ...updateData } =
  data;` disparaba `@typescript-eslint/no-unused-vars` (`'stock' is assigned a value but never
  used`), documentada como deuda preexistente en `progress/current.md`. Se reemplazó por un objeto
  explícito `{ name: data.name, brand: data.brand, description: data.description }` pasado a
  `updateProduct` (mismo comportamiento — excluye `stock` del payload de edición, que ya no se
  edita desde este modal — sin destructuring de variable no usada). Confirmado con `npx eslint`
  aislado: 0 errores en el archivo tras el cambio.

### `apps/client/src/components/AjusteStockModal.tsx`

- Footer: mismo patrón que `ProductoModal` (Cancelar texto plano, "Confirmar Ajuste" primario
  `bg-accent`, antes usaba el token legacy `bg-foreground`).
- Caja "Stock Actual": `bg-white border-gray-200 shadow-sm` → `bg-surface-2 border-border` (sin
  `shadow-sm`, design.md §5 prohíbe sombra de tarjeta), texto `text-muted`/`text-text`.
- **Selector de tipo de movimiento** (Ingreso/Egreso, radio buttons estilizados como cards): color
  semántico aplicado según indicación de la consigna — Ingreso (+) usa `sage`
  (`border-sage bg-sage-bg text-sage-text`), Egreso/Merma (-) usa `alert`
  (`border-alert-text bg-alert-bg text-alert-text`). Cada opción ya combinaba ícono
  (`FiArrowUpRight`/`FiArrowDownRight`) + texto ("Ingreso (+)"/"Egreso / Merma (-)") + color, por
  lo que la trifecta de accesibilidad (color+ícono+texto) queda satisfecha sin cambios
  estructurales, solo de paleta.
- Inputs "Cantidad a mover" y "Motivo" migrados al patrón `§7.14`; error de cantidad
  `border-destructive` → `border-alert-text`.
- Caja "Stock resultante proyectado": estado inválido (`finalStock < 0`) recoloreado de
  `bg-red-50/border-red-200/text-red-600` a `bg-alert-bg/border-alert-text/text-alert-text`;
  estado válido de `bg-gray-50/border-gray-200/text-gray-600` a `bg-surface-2/border-border/
  text-text-2`.
- Toast de éxito recoloreado a la paleta `sage` (mismo valor que en `ProductoModal`).

### `apps/client/src/components/CargaMasivaModal.tsx`

Migrado siguiendo `CargaMasivaClientesModal.tsx` como referencia directa (mismo tipo de
componente, ya migrado en el sub-lote C), adaptando el copy a "productos":

- Footer: mismo patrón (Cancelar texto plano, "Confirmar Carga" primario `bg-accent`).
- Guía de formato (tabla de columnas + fila de ejemplo): cabecera `bg-surface-2 text-text-2`,
  celdas de ejemplo `bg-surface text-text-2`/`text-muted italic`, chip "Obligatorio" →
  `bg-alert-bg/text-alert-text`, chip "Opcional" → `bg-surface-2/text-muted` (ambos con
  `rounded-pill` en vez de `rounded` genérico). Link "Descargar archivo de ejemplo" → `text-accent`.
  Contenedor de la guía: `bg-bg` (antes `bg-background`, alias legacy).
- Zona de drop: borde `border-[var(--dotted)]` (gotcha ya documentado en impl_UX-33-C — colisión
  con la utilidad nativa `border-dotted` de Tailwind, por eso se usa `border-[var(--dotted)]` en
  vez de una clase de color directa), estado *drag-over* `border-accent bg-rose-bg/60`, hover
  `border-accent-rose bg-rose-bg/40`. Ícono `FiUploadCloud` recoloreado `text-dotted
  group-hover:text-accent`.
- Preview de archivo cargado y tabla de preview (primeras 10 filas): recoloreados a
  `bg-surface`/`bg-surface-2`/`text-text`/`text-text-2`/`text-muted`, borde `rounded-ctrl` en vez
  de `rounded-lg`, botón "Cambiar" → `text-alert-text`.
- Toast de éxito recoloreado a la paleta `sage` (idéntico a `CargaMasivaClientesModal.tsx`).

## Verificación

```
pnpm --filter @estetica/client build   → Exit 0 (tsc -b && vite build, sin errores de tipos)
pnpm --filter @estetica/client lint    → Exit 1 GLOBAL, pero los 4 errores/4 warnings reportados
                                          están TODOS en archivos fuera de este sub-lote
                                          (ProfesionalModal.tsx, RegistroModal.tsx,
                                          react-bits/Aurora.tsx, react-bits/SplitText.tsx,
                                          react-bits/TextType.tsx, Negocio.tsx, Turnos.tsx —
                                          ninguno tocado por esta sesión). El error preexistente
                                          en ProductoModal.tsx ('stock' unused) fue corregido y ya
                                          no aparece en el reporte.
```

`git diff --stat -- apps/client/src` confirma que, dentro de este sub-lote, solo se tocaron
`ProductoModal.tsx`, `AjusteStockModal.tsx` y `CargaMasivaModal.tsx` (`Inventario.tsx` figura
modificado en el diff pero proviene íntegramente de la sesión anterior interrumpida, no de cambios
de esta sesión — se verificó leyendo el archivo completo y no se re-escribió).

## Notas para sub-lotes futuros

- El patrón de "caja informativa" no urgente (tinte `rose-bg`/`text-wine`/ícono `FiInfo`
  `text-accent`) es reutilizable para cualquier aviso contextual que no sea un estado de
  alerta/error — reservar `alert-bg`/`text-alert-text` exclusivamente para advertencias reales
  (stock bajo, errores de validación, cancelaciones), consistente con §8 de `design.md`.
- El selector de tipo de movimiento (radio-cards con color semántico `sage`/`alert`) es reutilizable
  tal cual si UX-34 necesita un patrón similar de "elegir entre dos opciones opuestas" (ej. algún
  ajuste de agenda).
- Con este sub-lote quedan migrados los 4 archivos de la Etapa 3 asignados a "Inventario/Productos"
  del plan (`progress/plan_shear-redesign.md`). Los sub-lotes A (Modal/ConfirmModal/Pagination),
  B (Dashboard) y C (Clients/Historial) ya estaban cerrados — UX-33 queda con toda la Etapa 3
  cubierta según el mapa de vistas del plan, pendiente de auditoría del `reviewer`.
