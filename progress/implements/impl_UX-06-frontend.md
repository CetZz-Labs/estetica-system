Feature en curso: UX-06 — Correcciones de branding, 404 y UX de calendario

## Archivos modificados

### apps/client/index.html
- Reemplazada 1 ocurrencia: `<title>Shaer | ...` -> `<title>Shear | ...`

### apps/client/src/layouts/AppLayout.tsx
- Reemplazadas 2 ocurrencias de "Shaer" por "Shear" (header móvil y sidebar desktop).

### apps/client/src/views/Landing.tsx
- Reemplazadas 8 ocurrencias de "Shaer" por "Shear":
  - Texto SVG en HeroIllustration (línea 44)
  - Pantalla de carga (línea 211)
  - Logo en header desktop (línea 241)
  - Logo en menú móvil (línea 287)
  - Texto de copy en sección funcionalidades: "Shear centraliza..."
  - Texto de copy en CTA: "...confían en Shear..."
  - Logo en footer (línea 639)
  - Copyright en footer: "Shear. Todos los derechos..."

### apps/client/src/views/AceptarInvitacion.tsx
- Reemplazada 1 ocurrencia: `<h1>Shaer</h1>` -> `<h1>Shear</h1>`

### apps/client/src/views/NotFound.tsx (nuevo)
- Creada página 404 con layout centrado, tipografía serif para el "404", enlace de vuelta a /dashboard con FiArrowLeft.
- Cumple sistema de diseño: bg-maison-bg, text-maison-text, bg-maison-primary, font-serif.

### apps/client/src/router.tsx
- Agregado import de NotFound.
- Agregada ruta `<Route path="*" element={<NotFound />} />` como última ruta, fuera del bloque AppLayout para que sea accesible sin autenticación.

### apps/client/src/views/Turnos.tsx
**Fix A — handleDateSelect:**
- Detecta si `selectInfo.startStr` (vista mes) no contiene "T" y, en ese caso, construye la hora local actual (HH:mm) para completar el string datetime-local.
- Corrige el bug donde el input `datetime-local` quedaba vacío al hacer clic en vista dayGridMonth.

**Fix B — botón "Nuevo Turno":**
- Reemplazado `new Date().toISOString().slice(0, 16)` (UTC) por construcción manual con componentes locales (`getFullYear`, `getMonth`, `getDate`, `getHours`, `getMinutes`).
- Corrige desfase de 3 horas en zona horaria Argentina (UTC-3).

**Fix C — eventContent:**
- Agregado `timeStr` calculado con `toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit', hour12: false })`.
- El chip ahora muestra `"HH:MM · Nombre - Servicio"` en todas las vistas del calendario, incluyendo dayGridMonth donde antes no se veía la hora.

## Decisiones tomadas

- El reemplazo "Shaer" -> "Shear" en Landing.tsx incluye el texto dentro del SVG decorativo (HeroIllustration, línea 44) porque es texto visible de marca, no un token CSS.
- La ruta `path="*"` se colocó fuera del outlet de AppLayout para que la página 404 no requiera autenticación y sea accesible en cualquier ruta no definida.
- El helper `pad` se define inline en el onClick del botón "Nuevo Turno" para no introducir dependencias externas; es una función trivial de un solo uso.
- No se usó `formatCalendarDate` del helper compartido para `timeStr` en eventContent porque se trata de un timestamp real (startTime es un datetime completo), no una fecha date-only; `toLocaleTimeString` con zona implícita del navegador es correcto aquí.

## Estado: COMPLETADO
