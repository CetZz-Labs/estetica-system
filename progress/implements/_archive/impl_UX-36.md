# impl_UX-36 — Correcciones post-QA visual del Rediseño Shear (nav, topbar, contraste de texto)

## Alcance

4 fixes quirúrgicos reportados por el usuario (2026-07-21) tras revisar visualmente UX-32/UX-33. NO es una migración completa de vistas (eso es alcance de UX-34). Se tocaron únicamente los 3 archivos autorizados.

## Archivos modificados

### 1. `apps/client/src/layouts/AppLayout.tsx`

**Corrección 1 — Quitar "Mi Negocio" del sidebar:**
Se eliminó el `<SidebarNavLink to="/configuracion/negocio">` de la sección "Configuración" (`role === 'ADMIN'`). Queda solo "Disponibilidad". No se tocó `router.tsx` ni `Negocio.tsx` — la ruta `/configuracion/negocio` sigue existiendo, solo se retiró la entrada de navegación.

**Corrección 2 — Quitar el buscador del topbar:**
En el componente `Topbar()`:
- Se eliminó el `<input type="search">` completo (placeholder "Buscar clientes, turnos, productos...").
- Se eliminó `const [search, setSearch] = useState('');` (confirmado con grep que `search`/`setSearch` no se usaban en ningún otro lugar).
- `useState` se mantiene en el import de React porque sigue usándose en `AppLayout()` para `isMobileMenuOpen` (confirmado con grep, línea 71 tras el cambio).
- El `<div className="flex items-center gap-3">` quedó con `primaryAction` (condicional) y `<UserButton />`, sin hueco vacío — el layout usa `justify-between` entre el título y ese div, así que el título queda a la izquierda y la acción+avatar a la derecha sin espacio residual.

### 2. `apps/client/src/views/Servicios.tsx`

**Corrección 3 — Contraste invisible en badge de días de retoque:**
Línea ~84 (badge de retoque dentro del `.map` de servicios): se reemplazó `bg-muted` por `bg-surface-2` y `text-muted-foreground` por `text-muted` (nombre canónico Shear, mismo valor hex). Resultado: `bg-surface-2 border border-border ... text-muted`. El resto del archivo (tokens legacy `bg-card`/`text-foreground`/`bg-primary`) no se tocó — su migración completa es alcance de UX-34.

### 3. `apps/client/src/components/AppointmentDetail.tsx`

**Corrección 4 — Contraste invisible en caja de Notas:**
Línea ~85 (`<p>` de la caja de Notas del modal de detalle de turno): se reemplazó `bg-muted` por `bg-surface-2`, dejando `text-muted-foreground` igual (mismo valor hex de destino, ya legible sobre `bg-surface-2`). El resto del componente (`bg-background`/`bg-card`/`text-foreground`) no se tocó — su migración completa es alcance de UX-34.

## Verificación

```
pnpm --filter @estetica/client build
```
→ Exit code 0. `tsc -b && vite build` completó sin errores (`dist/index.html`, `dist/assets/index-*.css`, `dist/assets/index-*.js` generados correctamente).

```
pnpm --filter @estetica/client lint
```
→ Exit code 1, pero los 4 errores y 4 warnings reportados son **preexistentes y ajenos a los 3 archivos tocados**:
- Errores (4): `components/react-bits/Aurora.tsx` (2), `components/react-bits/SplitText.tsx` (1), `components/react-bits/TextType.tsx` (1) — problemas de refs/setState del React Compiler en componentes de animación de terceros, no relacionados con UX-36.
- Warnings (4): `ProfesionalModal.tsx`, `RegistroModal.tsx`, `Negocio.tsx`, `Turnos.tsx` — "Compilation Skipped" por uso de `watch()` de react-hook-form, incompatibilidad conocida con React Compiler, no relacionada con UX-36.

Ningún error/warning corresponde a `AppLayout.tsx`, `Servicios.tsx` ni `AppointmentDetail.tsx`. No se corrigieron por estar fuera del alcance autorizado de esta feature (regla dura: solo 3 archivos).

`git diff --stat` confirma que solo se modificaron `apps/client/src/layouts/AppLayout.tsx`, `apps/client/src/views/Servicios.tsx` y `apps/client/src/components/AppointmentDetail.tsx` en esta sesión (el resto de archivos en el working tree ya estaban modificados por sesiones previas de UX-31/32/33, no tocados aquí).
