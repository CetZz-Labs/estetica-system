# impl_UX-66 — Navegación bidireccional Dashboard ↔ /guia

**Sandbox:** frontend único (`apps/client/src/`). No se tocó backend ni configuración del monorepo.

## Archivos modificados

1. `apps/client/src/layouts/AppLayout.tsx` (+1 línea)
2. `apps/client/src/views/Guia.tsx` (+47/-18 líneas)

## Cambio 1 — `AppLayout.tsx`: link "Guía" en el sidebar

Se agregó un `SidebarNavLink` nuevo apuntando a `/guia`, ubicado **fuera** de los bloques
condicionados a `role !== 'RECEPTIONIST'`/`role === 'ADMIN'`, por lo que es visible para
los 3 roles (ADMIN, PROFESSIONAL, RECEPTIONIST):

```tsx
<SidebarNavLink to="/turnos" onClick={closeMenu}>Turnos</SidebarNavLink>
<SidebarNavLink to="/historial" onClick={closeMenu}>Historial de Visitas</SidebarNavLink>
<SidebarNavLink to="/guia" onClick={closeMenu}>Guía</SidebarNavLink>

{role === 'ADMIN' && ( ... sección Equipo ... )}
```

**Decisión de UX (ubicación):** se colocó como último ítem del nav principal, inmediatamente
después de "Historial de Visitas" y antes de las secciones restringidas a ADMIN ("Equipo",
"Configuración"). Razones:
- Es un ítem transversal a todos los roles, igual que Inicio/Clientes/Servicios/Turnos/Historial
  — no tiene sentido de dominio agruparlo bajo "Equipo" o "Configuración" (ambas ADMIN-only).
- Cerrar el bloque de navegación operativa con "Guía" (en vez de intercalarla entre módulos de
  negocio) evita romper el orden mental Inicio → Clientes → Servicios → Inventario → Turnos →
  Historial que ya sigue el flujo de trabajo diario.
- No se creó una mini-sección "Ayuda" nueva (con su propio separador `border-t` + label) porque
  es un solo ítem; introducir un heading de sección para un único link habría sido ruido visual
  innecesario (ver criterio "aire en cards"/jerarquía de `docs/design.md`, aplicable por analogía
  a evitar secciones vacías de contenido).
- Se reutilizó el mismo componente `SidebarNavLink` sin ninguna modificación (mismas clases,
  mismo patrón visual: punto de color + texto, sin ícono react-icons/fi — se respetó la
  convención documentada en `docs/design.md §7.1`).

## Cambio 2 — `Guia.tsx`: CTA condicional por sesión (header + footer)

- Import agregado: `import { useAuth } from "@clerk/react";` (mismo paquete que usa
  `AppLayout.tsx` y `Landing.tsx` — se confirmó que `@clerk/clerk-react` no existe en este repo).
- `const { isLoaded, userId } = useAuth();` al inicio del componente.
- **Header:** el bloque de CTAs (antes siempre "Iniciar sesión" + "Comenzar gratis") ahora:
  - No renderiza nada hasta que `isLoaded === true` (evita flash del CTA incorrecto, mismo guard
    que usa `Landing.tsx` con su `if (!isLoaded) return <...Cargando.../>`; acá no se usa un
    early-return de página completa porque `/guia` debe mostrar el resto del contenido —hero,
    índice de módulos, etc.— independientemente del estado de auth, así que el guard se acotó
    solo al bloque de CTAs).
  - Si `userId` existe: reemplaza ambos CTAs por un único link `Volver al Dashboard` (`Link
    to="/dashboard"`), reutilizando exactamente las clases del CTA primario "Comenzar gratis"
    (`bg-accent`, `text-white`, mismo padding) + el mismo ícono `FiArrowRight`.
  - Si no hay sesión: se preserva el markup original sin cambios (mismos dos `Link` a `/login` y
    `/registro`).
- **Footer:** mismo criterio condicional aplicado al `<nav>` de links del footer — si hay
  sesión, "Iniciar sesión"/"Registrarse" se reemplazan por un único "Volver al Dashboard"
  (`Link to="/dashboard"`, mismas clases `text-xs font-medium text-muted` del resto de links del
  footer). El link "Inicio" no se modificó (queda visible siempre, con o sin sesión).
- No se tocó ninguna otra sección de `Guia.tsx` (hero, `DotField`, índice de módulos,
  `ModuleMedia`, callouts) — diff acotado estrictamente a header y footer.

## Verificación

```
pnpm --filter @estetica/client build   → tsc -b && vite build → exit 0 (bundle generado sin errores;
                                          warning preexistente de chunk-size >500kB, no relacionado)
pnpm --filter @estetica/client lint    → eslint . → 0 errors, 4 warnings preexistentes en archivos
                                          NO tocados por esta feature (ProfesionalModal.tsx,
                                          RegistroModal.tsx, Negocio.tsx, Turnos.tsx — warnings de
                                          React Compiler sobre `watch()` de react-hook-form, ya
                                          presentes antes de este cambio)
```

Ambos comandos terminaron con exit code 0.

## Notas para el reviewer

- No se agregaron dependencias nuevas ni se tocó `package.json`.
- No se modificó `router.tsx` — `/guia` ya era una ruta pública existente fuera de `AppLayout`;
  el link del sidebar simplemente navega afuera del árbol autenticado (comportamiento esperado
  documentado en el contexto de la tarea, no un bug).
- El patrón `isLoaded && (userId ? A : B)` replica fielmente el guard de `Landing.tsx:235-248`
  para evitar parpadeo, adaptado a un guard de bloque (no de página completa) porque `/guia`
  debe seguir siendo visible con o sin sesión.
