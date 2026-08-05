# impl_UX-68-frontend — Notificaciones push (PWA): frontend

**Feature:** UX-68 — Notificaciones push (PWA) en celular: turnos y retoques del día
**Sandbox:** `apps/client/` (implementer frontend)
**Fecha:** 2026-08-04

---

## Archivos creados

- `apps/client/public/manifest.json` — manifest mínimo de instalabilidad PWA. `name: "Maison CRM"`, `short_name: "Maison"`, `background_color: #FAF6F4` (`--bg`), `theme_color: #B76E84` (`--accent`), un único ícono `shear-favicon.png` (489×483, único asset existente apto para manifest — se documenta el tamaño real en vez de inventar dimensiones cuadradas estándar).
- `apps/client/public/sw.js` — Service Worker vanilla (sin build tool), un solo listener `push` → `self.registration.showNotification(...)`, sin lógica de caching/offline (fuera de alcance).
- `apps/client/src/api/pushNotificationApi.ts` — `savePushSubscription` (`POST /notificaciones/push-subscription`) y `deletePushSubscription` (`DELETE /notificaciones/push-subscription`), mismo estilo que `serviceRecordApi.ts`.
- `apps/client/src/utils/webPush.ts` — dos helpers puros: `urlBase64ToUint8Array` (conversión estándar VAPID base64url → `Uint8Array<ArrayBuffer>`, requerido por `PushManager.subscribe()`) e `isIOS` (heurística por `navigator.userAgent` para mostrar la aclaración de instalación en pantalla de inicio).

## Archivos modificados

- `apps/client/index.html` — `<link rel="manifest" href="/manifest.json" />` + `<meta name="theme-color" content="#B76E84" />`.
- `apps/client/src/main.tsx` — registro condicional del Service Worker (`'serviceWorker' in navigator` → `navigator.serviceWorker.register('/sw.js')` en `window.load`, con `.catch(console.error)`). Solo registra el SW; no pide permiso de notificaciones ni suscribe — eso es la acción explícita del usuario en la UI de opt-in.
- `apps/client/src/views/Negocio.tsx` — nueva card "Notificaciones push" agregada al final de la vista (ver decisión de ubicación abajo). Agrega estado `pushState` (`'checking' | 'unsupported' | 'enabled' | 'disabled' | 'denied'`), efecto de montaje que resuelve el estado inicial vía `navigator.serviceWorker.ready` + `pushManager.getSubscription()` (o `Notification.permission === 'denied'`), y `handleTogglePush` con la lógica completa de opt-in/opt-out.

---

## Decisión de ubicación de la UI

Se agregó la card de opt-in a `Negocio.tsx` (`/configuracion/negocio`), como tercera sección debajo de "Datos del negocio" y "Recordatorio de turno" (email a clientes, EP-17-b). Se prefirió **no** crear una vista nueva porque:
1. Es la única pantalla de "Configuración" existente en el router (`router.tsx` solo define `/configuracion/negocio`), y ya aloja otra preferencia de notificaciones (aunque de canal distinto: email a clientes vs. push al dispositivo del admin logueado).
2. El archivo resultante (~460 líneas) sigue siendo una sola vista con 3 cards independientes, cada una con su propio estado — no comparte formulario ni validación cruzada, así que no hay acoplamiento que justifique dividir en una ruta nueva solo por esta feature.
3. Evita tocar `router.tsx`/`AppLayout.tsx` (fuera del alcance parametrizado de esta historia).

## Decisiones técnicas

1. **`urlBase64ToUint8Array` — tipado explícito `Uint8Array<ArrayBuffer>`.** TypeScript 6 (lib DOM actualizada) infiere `new Uint8Array(n)` como `Uint8Array<ArrayBufferLike>` por defecto, que ya no es asignable a `BufferSource` (que exige `ArrayBuffer`, no `SharedArrayBuffer`) al pasarlo a `applicationServerKey`. Se anota el tipo de retorno de la función y de la variable interna como `Uint8Array<ArrayBuffer>` explícitamente — sin esto, `tsc -b` falla (`TS2322`). No es un problema del algoritmo, es una diferencia de tipado entre versiones de `lib.dom.d.ts`.
2. **`subscription.toJSON()` sin cast a `any`.** Se valida explícitamente `json.endpoint && json.keys?.p256dh && json.keys?.auth` antes de llamar a `savePushSubscription`, lanzando un error legible si el navegador devuelve una suscripción incompleta (caso defensivo, no debería ocurrir en la práctica pero evita un `as` inseguro).
3. **Desactivar es "best effort" en el backend.** Al desactivar, `subscription.unsubscribe()` (browser) se ejecuta primero; si el `DELETE` al backend falla después (red, etc.), se captura por separado con `handleApiError` sin revertir el estado local — la suscripción del navegador ya se invalidó, así que la UI debe reflejar "desactivado" de todas formas (evita un estado inconsistente donde el toggle dice "activado" pero el navegador ya no tiene suscripción).
4. **Estado inicial `'checking'` bloquea el toggle.** Mientras se resuelve `navigator.serviceWorker.ready` + `getSubscription()` en el efecto de montaje, el botón queda `disabled` (igual que en `'unsupported'`) para evitar un doble-toggle antes de conocer el estado real.
5. **Permiso `'denied'` no reintenta automáticamente.** Si `Notification.requestPermission()` devuelve `'denied'`, se setea `pushState('denied')` y se muestra la trifecta (color `text-destructive` + `FiBellOff` + texto "Notificaciones bloqueadas por el navegador" + mensaje inline aclaratorio). No hay reintento automático — el usuario debe cambiar el permiso manualmente desde la configuración del navegador.
6. **Aviso de iOS siempre visible si `isIOS()` es true**, sin distinguir Safari de otros navegadores en iOS (todos comparten WebKit y la misma limitación de Push API solo-si-instalada) — evita sobre-ingeniería de detección de user agent.
7. **Reutilización exacta del patrón de toggle** (`role="switch"`, `aria-checked`, `aria-label`, pill `w-10 h-6` con `bg-primary`/`bg-gray-300`) ya usado en `Disponibilidad.tsx` — no se inventó un componente nuevo.
8. **`VITE_VAPID_PUBLIC_KEY`** se lee vía `import.meta.env.VITE_VAPID_PUBLIC_KEY`, mismo patrón que `VITE_CLERK_PUBLISHABLE_KEY`/`VITE_API_URL`. Si no está configurada, se muestra `toast.error` y no se intenta suscribir (no crashea la app). El valor real debe cargarlo el usuario humano en `apps/client/.env` (ver `progress/implements/impl_UX-68-backend.md`).

---

## Resultado build/lint

```
pnpm --filter @estetica/client build
```
`tsc -b && vite build` → exit code 0.

```
pnpm --filter @estetica/client lint
```
Exit code 0. 4 warnings preexistentes de `react-hooks/incompatible-library` (uso de `watch()` de `react-hook-form`, no memoizable por el React Compiler) — ninguno introducido por esta feature; el de `Negocio.tsx` línea 87 (`logoValue = watch('logo')`) ya existía antes de este cambio.

---

## Pendiente / responsabilidad del usuario humano

- Cargar `VITE_VAPID_PUBLIC_KEY` en `apps/client/.env` (no versionado) con el mismo valor público generado y documentado en `progress/implements/impl_UX-68-backend.md`.
- Verificación manual end-to-end (suscribir, recibir un push real, desuscribir) requiere HTTPS o `localhost` + backend con `VAPID_PRIVATE_KEY` configurada — fuera del alcance de este build estático.
