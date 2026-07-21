# impl_UX-32 — Rediseño Shear, Etapa 2: Shell AppLayout + Topbar + fin del modo oscuro

## Resumen de cambios

### Archivos creados
- `apps/client/src/layouts/TopbarContext.tsx` — `TopbarProvider` + hook `useTopbar(config?)`.

### Archivos modificados
- `apps/client/src/layouts/AppLayout.tsx` — reescrito por completo:
  - Sidebar `w-[236px]`, `bg-surface`, `border-r border-border`.
  - Navegación sin íconos `react-icons/fi`: nuevo componente local `SidebarNavLink` (punto de
    color 6px `bg-accent`/`bg-dotted` + texto). Activo: `bg-rose-bg text-wine font-bold`.
    Inactivo: `text-text-3 font-medium hover:bg-hover-soft`. Mismo orden y role-gating que antes
    (Inicio · Clientes · Servicios · Inventario [oculto RECEPTIONIST] · Turnos · Historial de
    Visitas · sección Equipo [ADMIN: Profesionales] · sección Configuración [ADMIN: Mi Negocio,
    Disponibilidad]) — sin cambios de rutas ni de lógica de rol.
  - Headers de sección "Equipo"/"Configuración" migrados de bridge-aliases
    (`border-sidebar-border`, `text-sidebar-foreground/40`) a tokens nativos Shear
    (`border-border`, `text-muted`) — mismo valor de color, solo limpieza.
  - Footer del sidebar (avatar + nombre + rol) se dejó tal cual (mismo patrón, solo bridge→nativo
    en bordes/hover: `border-sidebar-border`→`border-border`, `sidebar-accent/50`→`hover-soft`).
    **No se implementó el "selector de tenant"** de `design.md §6.1` (avatar+nombre de
    estética+"Cambiar estética ↓") — decisión de alcance, se prioriza topbar/fin de dark mode
    según indicación explícita de la tarea. Candidato a UX-33/34.
  - Topbar nuevo: componente local `Topbar()` (66px, `bg-surface border-b border-border`),
    montado dentro de `<TopbarProvider>` envolviendo `<main>`. Lee `{ title, primaryAction }` de
    `useTopbar()` (sin argumentos). Buscador (`<input type="search">`, sin lógica, estado local
    `search` sin conectar a ninguna query — decisión de alcance explícita de la tarea) oculto en
    `<md` (`hidden md:block`) para no competir con el header móvil existente. Botón primario solo
    se renderiza si la vista setea `primaryAction` (ninguna lo hace todavía, por diseño —
    UX-33/34). Avatar: se **duplicó** `<UserButton/>` de Clerk en el topbar (a la derecha,
    tamaño por defecto de Clerk) además de mantenerlo en el footer del sidebar — no se
    envolvió en un círculo `bg-wine` con iniciales custom porque `UserButton` ya trae su propio
    avatar/menú de Clerk y forzar un contenedor fijo rompía el recorte del componente; se prioriza
    no romper logout/perfil.
  - Contenedor de contenido: se eliminó el wrapper `bg-card border rounded-xl shadow-lg` y el
    `key={location.pathname} className="animate-page-in"`. Ahora `<Outlet/>` va directo sobre
    `bg-bg` con `p-7` (28px, Tailwind default scale). Se quitó el import de `useLocation` (ya sin
    uso).
  - Drawer móvil: se quitó `shadow-2xl` del `<aside>` en estado abierto (ya tiene
    `border-r border-border` permanente que lo distingue del fondo). `FiMenu`/`FiX` se mantienen
    (controles del drawer, no navegación semántica).
  - Los 2 logos condicionales (`isDark ? .../shear-logo-dark.png : /shear-logo.png`) se
    resolvieron a un único `<img src="/shear-logo.png">`.

- `apps/client/src/views/AceptarInvitacion.tsx` — se quitó `import useIsDark`/`ThemeToggle`, el
  `const isDark = useIsDark()` (que además violaba Rules of Hooks al estar después de returns
  condicionales — ya no aplica al eliminarse), el logo condicional (→ `/shear-logo.png` fijo) y el
  `<ThemeToggle/>` montado. Nada más de la vista se tocó.

- `apps/client/src/views/Landing.tsx` — se quitó `import useIsDark`/`ThemeToggle`, el
  `const isDark = useIsDark()`, los 3 logos condicionales (hero loading, nav, footer) → único
  `/shear-logo.png`, los 2 usos de `dark:bg-card/80` y `dark:bg-card/60` en el nav pill (se dejó
  solo el estilo claro), el `<ThemeToggle/>` montado, y el prop `isDark` de `HeroMockup` (la
  llamada `<HeroMockup isDark={isDark} />` habría quedado rota al eliminar la variable — se
  resolvió igual que el resto: `HeroMockup()` sin prop, hardcodeado a los valores claros
  `bg-white`/`bg-[#fff9f6]` que ya usaba en la rama no-dark). El resto de la vista (react-bits,
  motion/gsap, animaciones) no se tocó.

### Archivos eliminados
- `apps/client/src/components/ui/ThemeToggle.tsx`
- `apps/client/src/hooks/useIsDark.ts`

## Verificación de modo oscuro
`grep -rn "ThemeToggle|useIsDark|isDark|dark:" apps/client/src` solo devuelve 2 líneas de
**comentario** en `apps/client/src/index.css` (líneas 5-6, documentando que UX-32 debería
eliminar `@custom-variant dark (&:is(.dark *));` una vez retirados `ThemeToggle`/`useIsDark`).
**No se tocó `index.css`** (fuera de mi sandbox explícito para esta feature — regla dura de la
tarea). La línea `@custom-variant dark` queda como código muerto inofensivo (nadie usa `dark:` en
el código ya). Recomendación para el leader: limpiarla en UX-35 (limpieza de alias-puente) o
autorizar explícitamente tocar `index.css` en una iteración dedicada.

## Decisiones de la API de Topbar (para UX-33/UX-34)

Archivo: `apps/client/src/layouts/TopbarContext.tsx`.

```ts
export interface TopbarConfig {
    title: string;
    primaryAction?: { label: string; onClick: () => void };
    searchSlot?: ReactNode;
}

export function TopbarProvider({ children }: { children: ReactNode }): JSX.Element;

// Vistas: llamar en la primera línea del componente para SETEAR el topbar.
// AppLayout: llamar useTopbar() SIN argumentos para LEER el config actual sin setearlo.
export function useTopbar(config?: TopbarConfig): TopbarConfig;
```

Uso esperado en una vista (UX-33+):
```tsx
export default function Clientes() {
    useTopbar({ title: 'Clientes', primaryAction: { label: '+ Nuevo cliente', onClick: () => setModalOpen(true) } });
    // ...
}
```

**Limitación conocida y documentada en el JSDoc del archivo:** el `useEffect` interno de
`useTopbar` solo se re-dispara cuando cambian `title`, `primaryAction.label` o `searchSlot` (no en
cada render), para evitar loops de render por `onClick` inline recreado en cada render. Si una
vista futura necesita refrescar el topbar por un cambio que NO sea de esos 3 campos (ej. el
`onClick` debe capturar un valor nuevo sin cambiar el label), hay que agregar esa dependencia
explícita al array de deps de `useTopbar` en ese momento.

**Nota de lint:** `TopbarContext.tsx` lleva un `eslint-disable react-refresh/only-export-components`
a nivel de archivo (con comentario inline explicando el motivo) porque la tarea exige colocar
`TopbarProvider` + `useTopbar` en el mismo archivo (nombre exacto). Es solo una degradación del
fast-refresh de Vite en dev, no afecta producción ni introduce ningún error de build.

## Clase para `--hover-soft`

`docs/design.md`/`index.css` ya tenían el token `--color-hover-soft` (`#FAF3F5`) mapeado en
`@theme inline` desde UX-31, con clase Tailwind literal `bg-hover-soft` — no fue necesario crear
ninguna aproximación, se usó directamente `hover:bg-hover-soft` en el ítem de nav inactivo y en el
footer del sidebar.

## Resultado de build y lint

```
pnpm --filter @estetica/client build
```
`tsc -b && vite build` → **exit code 0**. Bundle: `dist/assets/index-*.js` 1,768.03 kB (warning
preexistente de chunk grande, no relacionado a esta feature).

```
pnpm --filter @estetica/client lint
```
Exit code 1, pero **sin errores/warnings nuevos**. Los 9 problemas restantes (5 errores, 4
warnings) son 100% preexistentes y ya documentados en `progress/current.md`:
- `ProductoModal.tsx:37` — `'stock' unused` (deuda de lint documentada).
- `ProfesionalModal.tsx:83`, `RegistroModal.tsx:126-129`, `Negocio.tsx:83`, `Turnos.tsx:208-210`
  — warnings de `watch()` de react-hook-form (compilador React, preexistentes).
- `Aurora.tsx:126,145`, `SplitText.tsx:49`, `TextType.tsx:169` — errores preexistentes en
  `components/react-bits/*` (fuera de mi sandbox, no tocados en esta feature).

Confirmado con `git diff --stat` que ningún archivo de `react-bits/*` ni los `watch()`
pre-existentes fueron tocados en esta sesión — los 5 archivos que edité (`AppLayout.tsx`,
`TopbarContext.tsx` nuevo, `AceptarInvitacion.tsx`, `Landing.tsx`) no aparecen en la lista de
errores/warnings restantes.

## Archivos tocados (resumen para el reviewer)
- `apps/client/src/layouts/AppLayout.tsx` (reescrito)
- `apps/client/src/layouts/TopbarContext.tsx` (nuevo)
- `apps/client/src/views/AceptarInvitacion.tsx` (recorte puntual dark mode)
- `apps/client/src/views/Landing.tsx` (recorte puntual dark mode)
- `apps/client/src/components/ui/ThemeToggle.tsx` (eliminado)
- `apps/client/src/hooks/useIsDark.ts` (eliminado)

No se tocó `apps/client/src/index.css` ni ningún archivo bajo `apps/client/src/components/`
(fuera de las 2 líneas de import/no-uso en las vistas mencionadas) ni ninguna otra vista.
