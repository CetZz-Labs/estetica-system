# impl_UX-57 — Landing pública: TrustMarquee, puntos de color → íconos de funcionalidad

## Feature
`UX-57` — "Landing pública — TrustMarquee: reemplazar los puntos de color por íconos de cada funcionalidad" (`feature_list.json`, status `in_progress` al iniciar; no se modifica el status, queda a criterio del reviewer).

## Archivo tocado
`apps/client/src/views/Landing.tsx` (único archivo, zona `TrustMarquee`/`marqueeWords`/`marqueeDotColors`, aprox. líneas 62–67, 864–923 en la versión previa).

## Cambios

1. **`marqueeWords`** pasó de `string[]` a `{ word: string; icon: IconType }[]` — cada palabra lleva ahora su ícono `react-icons/fi` 1:1, el mismo que usa el array `features` de la sección Funcionalidades para el mismo concepto:
   - Clientes → `FiUsers`
   - Servicios → `FiScissors`
   - Inventario → `FiBox`
   - Turnos → `FiCalendar`
   - Visitas → `FiCheckCircle`
   - Dashboard → `FiActivity`

   Los 6 íconos ya estaban importados en el bloque `react-icons/fi` del inicio del archivo (se usan en `features`) — **no se agregó ningún import nuevo**.

2. **`marqueeDotColors`** (`['bg-accent', 'bg-sage', 'bg-gold', 'bg-wine']`) se renombró a **`marqueeIconColors`** con la variante `text-*` de los mismos 4 tokens de marca (`text-accent`, `text-sage`, `text-gold`, `text-wine`), porque ahora se aplica como color de un `Icon` (glyph), no como fondo de un `<span>` punto. Se mantiene exactamente la misma rotación por índice `% 4` (`marqueeIconColors[i % marqueeIconColors.length]`) que existía en `marqueeDotColors`.

3. **`interface MarqueeItem`**: `dotColor: string` → `icon: IconType; iconColor: string`.

4. **`TrustMarquee`**:
   - El `.map` que arma `items` ahora desestructura `{ word, icon }` de `marqueeWords` y calcula `iconColor` con la misma rotación de antes.
   - `renderItem` reemplaza el `<span className="w-2 h-2 rounded-full ...">` (el punto) por `<Icon size={16} className={`shrink-0 ${item.iconColor}`} />`, conservando el layout (`flex items-center gap-3`, el texto al lado). Se agregó `const Icon = item.icon;` dentro de `renderItem` para poder usarlo como componente JSX (convención estándar de React con `IconType`).
   - No se tocó nada del bloque `aria-hidden="true"` que envuelve todo el `TrustMarquee`, ni las props de `LogoLoop` (`speed`, `direction`, `gap`, `fadeOut`, `fadeOutColor`, `ariaLabel`, `prefersReducedMotion`) — sin cambios de velocidad/fade.
   - Se actualizó el comentario JSDoc que documenta la decisión de diseño de `marqueeWords`/`marqueeDotColors` para reflejar el cambio a íconos (referencia a UX-57).

## Restricciones respetadas
- Ningún import nuevo de íconos (se reutilizan los 6 ya usados en `features`).
- No se tocó `LogoLoop` (velocidad/fade intactos) ni ninguna otra sección de `Landing.tsx`.
- No se instalaron dependencias.
- El bloque sigue puramente decorativo (`aria-hidden="true"` en el contenedor padre, sin `aria-label`/foco nuevo en el ícono).

## Verificación

```
pnpm --filter @estetica/client build
```
→ Exit code 0. `tsc -b && vite build` completó sin errores (782 módulos transformados, bundle generado).

```
pnpm --filter @estetica/client lint
```
→ Exit code 0. Solo 4 warnings preexistentes de `react-hooks/incompatible-library` en `ProfesionalModal.tsx`, `RegistroModal.tsx`, `Negocio.tsx` y `Turnos.tsx` (no relacionados con este cambio, no tocados en esta feature).

```
git --no-pager diff --ignore-all-space --stat -- apps/client/src/views/Landing.tsx
```
→ Reporta el archivo completo con muchas líneas modificadas, pero corresponde a trabajo previo ya presente en disco sin commitear (UX-49/UX-50/UX-53/UX-56, etc.) que no forma parte de esta tarea. Se confirmó manualmente con `git --no-pager diff` completo que los únicos hunks atribuibles a esta feature son:
- La declaración de `marqueeWords`/`marqueeIconColors` (antes `marqueeDotColors`) y su comentario.
- La interfaz `MarqueeItem`.
- El cuerpo de `TrustMarquee` (el `.map` de `items` y `renderItem`).

Ningún otro hunk del diff fue introducido por este trabajo.

## Decisiones técnicas
- Se mantuvieron arrays paralelos conceptualmente unificados en un solo array de objetos (`{ word, icon }[]`) en vez de dos arrays paralelos `words[]`/`icons[]`, para evitar desincronización de índices entre palabra e ícono — más prolijo y menos propenso a error que agregar un tercer array paralelo.
- Se renombró `marqueeDotColors` → `marqueeIconColors` (en vez de mantener el nombre viejo con contenido nuevo) para que el nombre siga describiendo con precisión su contenido (clases `text-*`, no `bg-*`), evitando confusión a futuros mantenedores.
