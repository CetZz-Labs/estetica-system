# Sistema de Diseño y Directrices de Interfaz (Maison CRM UI/UX)

> **Estándar de Calidad para el Subagente Revisor:** Este documento rige de manera inmutable el aspecto visual, accesibilidad y comportamiento de la interfaz de usuario en `apps/client`. El subagente `reviewer` evaluará los componentes creados por el `implementer` contra estas especificaciones. Si un patrón o token visual no se encuentra en este archivo, se considerará inválido.

---

## 1. Filosofía de Interfaz: Clean Minimalism

Maison CRM adopta un enfoque de **minimalismo limpio y cálido** diseñado para la operación diaria de un centro de estética. La interfaz prioriza la legibilidad de datos del cliente, la velocidad de registro de visitas y el escaneo rápido del estado de retoques e inventario. Las superficies son claras, los acentos tipográficos son serif para elegancia, y los estados críticos usan colores vibrantes sobre fondos neutros.

### El Patrón Bento Grid Estructural

La distribución de información en Dashboards y listados se organiza mediante celdas modulares:

- Cada tarjeta dentro de la grilla tiene fondo blanco sólido, bordes beige sutiles y un propósito informativo único.
- El espacio en blanco separa conceptos, reduciendo la fatiga cognitiva del operador sin sacrificar densidad de datos.

---

## 2. Paleta de Colores Inmutable (Tokens Tailwind v4)

Los tokens se definen en `apps/client/src/index.css` mediante la directiva `@theme {}` de Tailwind v4.

### 2.1 Colores de Marca (Maison)

| Token | Valor Hex | Uso y Aplicación en la Interfaz |
|-------|-----------|---------------------------------|
| `--color-maison-bg` | `#FDFBF7` | Fondo general de la aplicación. Beige extremadamente claro, cálido. |
| `--color-maison-text` | `#2C2A29` | Color por defecto para texto principal y títulos. Casi negro, cálido. |
| `--color-maison-primary` | `#1A1A1A` | Casi negro puro. Botones primarios, fondos de acción, texto de alto impacto. |
| `--color-maison-card` | `#FFFFFF` | Fondo de tarjetas, bloques Bento Grid, tablas, modales y sidebar. Blanco puro. |
| `--color-maison-border` | `#EAE6DF` | Borde por defecto en tarjetas, inputs, tablas y divisores. Beige claro. |
| `--color-maison-red` | `#E06B5E` | Rojo semántico: retoques atrasados, stock agotado, errores. |
| `--color-maison-orange` | `#E5A059` | Naranja semántico: retoques próximos (1-7 días), stock bajo (≤ 5), notas médicas. |
| `--color-maison-green` | `#54A885` | Verde semántico: retoques futuros (8-21 días), stock saludable, operaciones exitosas. |

> **Contraste AA mínimo verificado:** `text-maison-text` (#2C2A29) sobre `bg-maison-bg` (#FDFBF7) = 13.2:1. `text-maison-red` (#E06B5E) sobre fondo blanco = 3.5:1 (usar solo para acentos, no para texto corrido).

### 2.2 Colores del Sistema (Tailwind nativos)

Usar directamente clases Tailwind para escalas de grises, manteniendo consistencia:

| Clase | Hex | Uso |
|-------|-----|-----|
| `text-gray-400` | `#9CA3AF` | Metadatos, subtítulos, etiquetas secundarias |
| `text-gray-500` | `#6B7280` | Texto de cuerpo secundario, placeholders |
| `text-gray-600` | `#4B5563` | Texto de interfaz, contenido de tablas |
| `bg-gray-50` | `#F9FAF8` | Fondos de filas hover, badges, secciones de nota |
| `bg-gray-200` | `#E5E7EB` | Esqueletos (skeleton loading) `animate-pulse` |

---

## 3. Sistema Tipográfico y Jerarquía

Maison CRM utiliza una combinación de dos familias tipográficas.

- **Títulos y Display:** `"Playfair Display"` (Serif editorial clásico; confiere sofisticación y calidez a títulos de página y encabezados de módulo).
- **Cuerpo e Interfaz (UI):** `"Inter"` (Sans-serif optimizado para pantallas; lectura limpia en todos los tamaños).

Ambas declaradas en `@theme` como `--font-serif` y `--font-sans`.

### Escala de Utilidades Tipográficas

| Uso | Clase | Fuente | Tamaño | Tracking |
|-----|-------|--------|--------|----------|
| Saludo / Título de página | `font-serif text-3xl sm:text-4xl` | Playfair Display | `1.875rem` / `2.25rem` | normal |
| Título de modal | `font-serif text-2xl` | Playfair Display | `1.5rem` | normal |
| Título de tarjeta/módulo | `font-serif text-xl` | Playfair Display | `1.25rem` | normal |
| Número estadístico (KPI) | `font-serif text-3xl` | Playfair Display | `1.875rem` | normal |
| Nombre de servicio en card | `font-serif text-xl` | Playfair Display | `1.25rem` | normal |
| Iniciales de avatar | `font-serif text-lg` | Playfair Display | `1.125rem` | normal |
| Cuerpo estándar | `font-sans text-sm` | Inter | `0.875rem` | normal |
| Label de sección | `font-sans text-xs font-semibold tracking-widest uppercase` | Inter | `0.75rem` | `0.1em` |
| Tabla / dato tabular | `font-sans text-sm` | Inter | `0.875rem` | normal |
| Badge / pill | `font-sans text-xs font-semibold` | Inter | `0.75rem` | normal |

### Principios de Jerarquía Visual

#### Emphasize by De-emphasizing
- Las **etiquetas secundarias** de tarjetas, secciones y cabeceras usan: `text-xs` · `uppercase` · `tracking-widest` · `font-semibold` · color atenuado (`text-gray-400`).
- El **dato principal** (número de KPI, nombre de cliente) ejerce peso visual mediante la fuente serif (`font-serif`), tamaños grandes (`text-3xl`/`text-4xl`) y color `text-maison-text`.
- Prohibido que la etiqueta secundaria compita en peso visual con el dato principal.

#### Labels are a Last Resort
- Los datos deben autocontextualizarse mediante formato o posición en el layout.
- Micro-iconos semánticos (`react-icons/fi`) acompañan datos cuando aportan contexto.
- Los placeholders en inputs siguen formato: `"Ej: Coloración completa"`.

---

## 4. Componentes y Patrones de UI

### 4.1 Sidebar (Navegación)

| Propiedad | Valor |
|-----------|-------|
| Fondo | `bg-maison-card` con `border-r border-maison-border` |
| Ancho | `w-64` (fijo) |
| Logo | `font-serif text-2xl font-bold tracking-wide` → "Maison" + subtítulo "Estudio · CRM" |
| Ítems inactivos | `text-gray-500` con `hover:text-maison-text hover:bg-gray-50` |
| Ítem activo | `bg-maison-bg text-maison-text border border-maison-border` |
| Transición | `transition-colors` |
| Móvil | Slide-in desde izquierda con overlay `bg-black/40 backdrop-blur-sm`, header sticky con hamburguesa `FiMenu`/`FiX` |
| Cierre | Botón `FiX` en header + clic en overlay + clic en enlace (`closeMenu`) |

### 4.2 Botones

| Tipo | Clases | Uso |
|------|--------|-----|
| **Primario** | `bg-maison-primary hover:bg-black text-white px-5 py-2.5 rounded-full text-sm font-medium flex items-center gap-2 transition-colors shadow-sm cursor-pointer` | Acciones principales (Nueva Visita, Agregar Cliente, Guardar) |
| **Secundario** | `bg-white border border-gray-200 hover:border-gray-300 text-gray-600 px-4 py-2.5 rounded-full text-sm font-medium transition-colors shadow-sm` | Acciones secundarias (Directorio, Carga Masiva) |
| **En línea** (icon button) | `p-2 text-gray-400 hover:text-maison-primary transition-colors cursor-pointer` | Editar, Eliminar (dentro de cards) |
| **En línea con hover reveal** | `sm:opacity-0 sm:group-hover:opacity-100` | Acciones que aparecen al hover de la card/fila |
| **Modal footer** | `px-5 py-2.5 rounded-xl text-sm font-medium` | Cancelar (texto gris, hover bg-gray-100), Guardar (primario) |
| **Disabled** | `disabled:bg-gray-400 disabled:cursor-not-allowed` | Botón primario deshabilitado |

### 4.3 Tarjetas (Cards)

| Propiedad | Valor |
|-----------|-------|
| Fondo | `bg-maison-card` |
| Borde | `border border-maison-border` |
| Border radius | `rounded-2xl` (16px) |
| Padding | `p-5` o `p-6` |
| Sombra | `shadow-sm` (sutil) |
| Hover | `hover:shadow-md` (opcional, ej. cards de servicios) |
| Transición | `transition-all` o `transition-colors` |

### 4.4 Formularios (Inputs)

| Propiedad | Valor |
|-----------|-------|
| Fondo | `bg-maison-bg` |
| Borde default | `border border-maison-border` |
| Borde error | `border-maison-red` |
| Border radius | `rounded-xl` (12px) |
| Padding | `px-4 py-2.5` |
| Focus | `focus:outline-none focus:ring-2 focus:ring-gray-200 focus:border-gray-400` |
| Label | `text-xs font-bold tracking-widest text-gray-500 uppercase` |
| Placeholder | `placeholder:text-gray-400` o texto inline |

### 4.5 Modal

Basado en el componente `Modal` (`apps/client/src/components/ui/Modal.tsx`).

| Elemento | Clases / Valor |
|----------|----------------|
| Overlay | `fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4 backdrop-blur-sm` |
| Contenedor | `bg-maison-card border border-maison-border rounded-2xl w-full {maxWidth} shadow-xl overflow-hidden` |
| Max width default | `max-w-md` (puede variar: `max-w-lg`, `max-w-3xl`) |
| Header | `p-5 sm:p-6 border-b border-maison-border bg-maison-bg shrink-0` |
| Título | `font-serif text-2xl text-maison-text` |
| Subtítulo | `text-gray-500 text-sm mt-0.5` |
| Body | `p-5 sm:p-6 overflow-y-auto custom-scrollbar` |
| Footer | `p-5 sm:p-6 border-t border-maison-border bg-gray-50/50 flex flex-col-reverse sm:flex-row justify-end gap-3 shrink-0` |

### 4.6 Tablas

| Elemento | Clases / Valor |
|----------|----------------|
| Contenedor | `bg-maison-card border border-maison-border rounded-2xl shadow-sm overflow-hidden` |
| Scroll horizontal | `overflow-x-auto` wrap, `min-w-[520px]` en `<table>` |
| Table | `w-full text-left border-collapse` |
| Head | `border-b border-maison-border bg-maison-bg/50` |
| TH | `px-4 sm:px-6 py-4 text-xs font-bold tracking-widest text-gray-500 uppercase` |
| Body rows | `divide-y divide-maison-border` |
| Hover | `hover:bg-gray-50 transition-colors` |

### 4.7 Badges / Pills

| Propiedad | Valor |
|-----------|-------|
| Clase base | `inline-block px-2.5 py-0.5 text-xs font-semibold rounded-full border` |
| Verde (stock ok) | `bg-green-50 text-green-600 border-green-200` |
| Naranja (stock bajo) | `bg-orange-50 text-orange-600 border-orange-200` |
| Rojo (sin stock) | `bg-red-50 text-red-600 border-red-200` |
| Rojo (atrasado) | `bg-red-50 text-maison-red border border-red-100` |
| Naranja (próximo) | `bg-orange-50 text-maison-orange border border-orange-100` |
| Verde (futuro) | `bg-green-50 text-maison-green border border-green-100` |
| Gris (lejano) | `bg-gray-50 text-gray-500 border border-gray-200` |

### 4.8 Skeleton Loading

| Elemento | Clases |
|----------|--------|
| Contenedor | `animate-pulse` |
| Bloque | `h-{n} bg-gray-200 rounded-{w}` |
| Avatar | `w-{n} h-{n} bg-gray-200 rounded-full shrink-0` |
| Texto línea | `h-{n} bg-gray-200 rounded w-{frac}` |

Los skeletons replican exactamente la estructura visual del contenido real (mismas clases de layout, gap, flex) para evitar saltos de layout (CLS).

### 4.9 Search Input

| Propiedad | Valor |
|-----------|-------|
| Contenedor | `relative w-full sm:w-96` |
| Icono | `absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-gray-400` |
| Input | `w-full pl-11 pr-4 py-2.5 bg-maison-card border border-maison-border rounded-xl focus:outline-none focus:ring-2 focus:ring-gray-200 focus:border-gray-400 transition-all shadow-sm` |

### 4.10 Empty States

| Propiedad | Valor |
|-----------|-------|
| Contenedor | `bg-maison-card border border-maison-border rounded-2xl p-12 text-center shadow-sm` |
| Icono wrapper | `w-16 h-16 bg-maison-bg border border-maison-border rounded-full flex items-center justify-center mx-auto mb-4` |
| Título | `text-lg font-serif text-maison-text mb-2` |
| Texto | `text-sm text-gray-500` |

### 4.11 Error States

| Propiedad | Valor |
|-----------|-------|
| Contenedor | `p-12 text-center text-maison-red` |
| Mensaje | Texto amigable: "No pudimos cargar los {recurso} en este momento. Por favor, intenta de nuevo." |

---

## 5. Bordes, Sombras y Radios

| Elemento | Border Radius |
|----------|---------------|
| Tarjetas, modales, contenedores | `rounded-2xl` (16px) |
| Inputs, botones de modal | `rounded-xl` (12px) |
| Badges, pills | `rounded-full` (9999px) |
| Botones de acción (header) | `rounded-full` (9999px) |
| Avatares, indicadores de timeline | `rounded-full` (9999px) |
| Tabla, contenedor de tabla | `rounded-2xl` (el overflow-hidden lo aplica) |

- **Bordes:** El divisor por defecto es `1px` sólido usando `--color-maison-border` (`#EAE6DF`).
- **Sombras:** Se usa exclusivamente `shadow-sm` para separar planos elevados. Prohibido `shadow-lg`, `shadow-xl` o sombras difusas.
- **Hover en cards:** `hover:shadow-md transition-all` (solo en ciertos contextos como cards de servicios).

---

## 6. Accesibilidad (WCAG 2.1 Nivel AA)

### La Regla de Oro de la Trifecta Visual (Checkpoint C6)

Queda terminantemente prohibido delegar la comunicación de un estado crítico **únicamente a un código de color**. Todo componente visual que exprese estados sensibles debe incluir de forma simultánea:

1. **Color Semántico:** Texto e icono en el color del estado (rojo/naranja/verde).
2. **Icono Descriptivo:** Provisto por `react-icons/fi` (Feather Icons).
3. **Texto Descriptivo Claro:** Explicación textual del estado.

#### Implementaciones existentes en la codebase:

| Estado | Color | Icono | Texto |
|--------|-------|-------|-------|
| Notas médicas (cliente) | `--color-maison-orange` | `(ninguno aún)` | Badge "Notas Médicas" con fondo `bg-orange-50` |
| Stock bajo | `--color-maison-orange` | `FiAlertTriangle` | Card "Stock Bajo (≤ 5)" con conteo |
| Sin stock | `--color-maison-red` | `FiBox` | Card "Sin Stock" con conteo |
| Retoque atrasado | `--color-maison-red` | (dot color) | Label "Atrasado Xd" |
| Retoque próximo | `--color-maison-orange` | (dot color) | Label "En X días" / "Mañana" |
| Error en formulario | `--color-maison-red` | `FiAlertCircle` | Mensaje de error debajo del input |
| Operación exitosa | `--color-maison-green` | (toast nativo) | Toast "Cliente registrado exitosamente" |

### Gestión de Foco

- Todos los elementos interactivos usan `focus:outline-none` con `focus:ring-2 focus:ring-gray-200` (inputs) o patrón equivalente.
- Botones icon-only deben tener `aria-label` descriptivo.
- Checkboxes deben tener `<label>` asociado.

---

## 7. Notificaciones (Toast)

- **Librería:** `sonner` (`toast.success()`, `toast.error()`, `toast.info()`).
- **Posición:** Top-right (default de sonner).
- **Estilo personalizado para éxito:**
  ```tsx
  toast.success('Mensaje', {
    style: { background: '#FDFBF7', color: '#54A885', borderColor: '#54A885' }
  })
  ```
- **Duración:** Default de sonner (aproximadamente 4s).

---

## 8. Responsive Breakpoints

| Breakpoint | Clase | Comportamiento |
|------------|-------|----------------|
| Móvil (`<640px`) | Default | Layout vertical, sidebar oculto, botones full-width relativos |
| Tablet (`≥640px`) | `sm:` | Header con flex row, sidebar visible, grid de 2 columnas |
| Desktop (`≥768px`) | `md:` | Sidebar fijo a la izquierda, grid de 2-3 columnas, hover reveals |
| Desktop grande (`≥1024px`) | `lg:` | Grid de 3 columnas, sidebar + contenido en fila |

Sidebar: en móvil ocupa toda la pantalla con slide-in; en `md:` es fija (`fixed md:relative`).

---

## 9. Animaciones y Transiciones

- **Hover en botones:** `transition-colors` (150ms ease-out).
- **Hover en cards/filas:** `transition-all` o `transition-colors` (150ms).
- **Hover reveals:** `sm:opacity-0 sm:group-hover:opacity-100 transition-all` / `transition-opacity`.
- **Sidebar móvil:** `transform transition-transform duration-300 ease-in-out`.
- **Skeleton loading:** `animate-pulse` (Tailwind nativo, 2s infinite).
- **Modal overlay:** sin animación de entrada (inmediatez). `backdrop-blur-sm` estático.
- **Prohibido:** sombras animadas, gradientes, Framer Motion o librerías de animación externas.

---

## 10. Iconografía

- **Set:** `react-icons/fi` (Feather Icons — iconos delgados y minimalistas).
- **Tamaños:** `text-lg` (1.125rem), `text-xl` (1.25rem), `text-2xl` (1.5rem), `text-5xl` (3rem para estados vacíos).
- **Íconos usados en la codebase existente:**

| Icono | Uso |
|-------|-----|
| `FiUsers` | KPI Total de Clientes |
| `FiScissors` | KPI Servicios Realizados, estado vacío servicios |
| `FiCalendar` | KPI Próximos Retoques |
| `FiPlus` | Botón Nueva Visita, Agregar Servicio/Cliente/Producto |
| `FiCheck` | Botón completar retoque |
| `FiEdit2` | Botón editar (servicios, productos) |
| `FiTrash2` | Botón eliminar (servicios) |
| `FiClock` | Badge de retoque en días |
| `FiBox` | Estado vacío / Sin Stock |
| `FiAlertTriangle` | Alerta stock bajo |
| `FiLayers` | KPI Total Productos |
| `FiActivity` | Botón Ajustar Stock |
| `FiUploadCloud` | Carga Masiva |
| `FiSearch` | Input de búsqueda |
| `FiFileText` | Icono archivo cargado |
| `FiCheckCircle` | Confirmar Carga (masiva) |
| `FiUser` | Botón Ver Perfil (cliente) |
| `FiPhone` | Teléfono del cliente |
| `FiMenu` | Hamburguesa (sidebar móvil) |
| `FiX` | Cerrar (modal, sidebar móvil) |
| `FiAlertCircle` | Error de formulario |
| `FiInfo` | Info banner (producto en edición) |
| `FiArrowUpRight` / `FiArrowDownRight` | Ajuste de stock (ingreso/egreso) |

---

## 11. Scrollbar Personalizado

Clase utilitaria `custom-scrollbar` para listas internas con overflow:

```css
.custom-scrollbar::-webkit-scrollbar { width: 4px; }
.custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
.custom-scrollbar::-webkit-scrollbar-thumb {
  background-color: var(--color-maison-border);
  border-radius: 20px;
}
.custom-scrollbar:hover::-webkit-scrollbar-thumb {
  background-color: #D1CEC7;
}
```

---

## ❌ Qué NO Hacer en la Capa Visual

- ❌ No usar sombras pesadas (`shadow-lg`, `shadow-xl`) ni efectos de desenfoque de fondo (`backdrop-blur-sm` solo autorizado en overlay de modal y sidebar móvil).
- ❌ No introducir colores fuera de los tokens definidos en `index.css` o Tailwind nativos `gray-*`. Prohibido gradientes.
- ❌ No omitir el atributo `aria-label` en botones interactivos que contengan exclusivamente un icono gráfico.
- ❌ No usar fuentes distintas a las dos autorizadas: `Playfair Display` (serif) e `Inter` (sans).
- ❌ No usar Framer Motion ni librerías de animación externas. Solo utilidades nativas de Tailwind (`transition-*`, `animate-pulse`, `transform transition-transform`).
- ❌ No introducir animaciones de entrada en modales, alertas o notificaciones. Deben aparecer instantáneamente.
