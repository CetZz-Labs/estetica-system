# impl_UX-42-frontend.md

## Feature
UX-42 — Landing pública — hero: reposicionar origen de los god rays a la derecha + reducir interferencia de la capa de caustics.

## Archivo modificado
- `apps/client/src/views/Landing.tsx` (único archivo tocado, bloque del fondo decorativo del hero, líneas ~218-291 previas a la edición — comentarios explicativos y valores del `<rect>` de caustics + wrappers/ángulos de los 5 god rays).

No se tocó ninguna otra sección de Landing.tsx (cards de Funcionalidades, nav, footer, etc. intactas).

## Cambios concretos

### 1. Capa de caustics (atenuada)
- Opacidad del `<rect>`: `0.55` → `0.2` (dentro del rango sugerido 0.15–0.25).
- Cobertura: de full-bleed `width="100%" height="100%"` a `width="100%" height="70%"` — se acotó a una franja superior en vez de cubrir toda la sección, para que dependa menos de estar "por todos lados" y quede subordinada al efecto de rayos.
- Filtro SVG (`feTurbulence`/máscara) sin cambios, solo el `<rect>` que consume el filtro.

### 2. Origen de los rayos reposicionado a la derecha
- Los 5 wrappers (`.map`) cambiaron `left-1/2` → `left-[65%]` (mantienen `-translate-x-1/2` para seguir centrados en ese punto). Elegí 65% (dentro del rango sugerido 62-70%) como desplazamiento moderado, ni al extremo del contenedor ni imperceptible.

### 3. Abanico reorientado hacia abajo-izquierda
- `baseAngle` de los 5 rayos: de `-26, -13, 0, 13, 26` (simétrico) a `-48, -36, -24, -12, 0` — mismo spread relativo de 12° entre rayos consecutivos, pero todo el set desplazado para que el conjunto caiga predominantemente hacia la izquierda desde el nuevo origen a la derecha. El rayo más "vertical" (antes 0°, centro del abanico) ahora es el de mayor `baseAngle` (0°) dentro del nuevo set, es decir el borde derecho del abanico, coherente con "caen hacia abajo-izquierda desde el origen a la derecha".
- Los rangos de balanceo de rotación (`ray.baseAngle - 2` a `+3`, etc.) se dejaron sin tocar — siguen siendo relativos al nuevo `baseAngle` de cada rayo, tal como se indicó en la tarea.
- Colores, anchos, alturas, duraciones y delays de cada rayo: sin cambios.

### 4. Comentarios
Se actualizaron los comentarios explicativos inline (que documentaban la composición de UX-41) para reflejar los ajustes de UX-42, dejando trazabilidad de qué cambió y por qué (feedback directo del usuario viendo el resultado real en navegador).

## Restricciones respetadas
- No se agregaron gradientes CSS nuevos, ni librerías 3D/WebGL — solo cambios de opacidad, dimensiones del `<rect>`, `left` y `baseAngle` con tokens/clases Tailwind ya existentes.
- `prefers-reduced-motion` sigue cubriendo el `<animate>` SMIL de caustics y el balanceo de rotación de los rayos (no se tocó esa lógica condicional).
- No se modificaron las cards de Funcionalidades ni ninguna otra sección de Landing.tsx.

## Verificación
- `pnpm --filter @estetica/client build` → **exit code 0** (tsc -b + vite build, solo warning preexistente de chunk size > 500kB, no relacionado).
- `pnpm --filter @estetica/client lint` → **exit code 0** (4 warnings preexistentes en `ProfesionalModal.tsx`, `RegistroModal.tsx`, `Negocio.tsx` y `Turnos.tsx` por incompatibilidad de React Compiler con `watch()` de react-hook-form; ninguno en `Landing.tsx`, 0 errores).

## Estado
Implementación completa. Pendiente de reviewer para pasar `feature_list.json` de `in_progress` a `done`.
