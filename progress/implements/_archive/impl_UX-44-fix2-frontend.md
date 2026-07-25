# impl_UX-44-fix2-frontend.md

## Feature: UX-44 (fix2) — Hero 3D blob invisible: caja del Canvas del mismo tamaño que el mockup

## Diagnóstico (heredado del leader, confirmado por lectura de código)

`Hero3DScene` envolvía su `<Canvas>` en `<div className="absolute inset-0 z-0 pointer-events-none">`, dentro de `.hero-visual` (`Landing.tsx` ~línea 323). `.hero-visual` no tiene tamaño propio: lo hereda de su único hijo en flujo normal, el wrapper raíz de `HeroMockup` (`<div className="relative mx-auto max-w-lg px-8 py-4">`, ~línea 563). Con `inset-0`, la caja del Canvas coincidía exactamente con esa caja, y la card opaca de `HeroMockup` (con `overflow-hidden`) ocupa casi toda esa misma caja — la esfera (radio 1.4, cámara a distancia 4.5, fov 45, ~75% del frame) quedaba prácticamente entera detrás de la card, sin margen para asomar.

## Cambio realizado

**Archivo:** `apps/client/src/components/landing/Hero3DScene.tsx`, línea 53 (wrapper del `<Canvas>`).

```diff
- <div className="absolute inset-0 z-0 pointer-events-none" aria-hidden="true">
+ <div className="absolute -inset-8 lg:-inset-12 z-0 pointer-events-none" aria-hidden="true">
```

Agregué además un comentario explicativo arriba del `return` documentando la técnica y el cálculo de seguridad (líneas 51-58 aprox.).

No se tocó `HeroMockup` (layout, badges, card, stats sin cambios) ni el fix anterior del `useGSAP` (`dependencies`, guarda `if (!heroRef.current) return;` en `Landing.tsx`) — ambos quedaron intactos.

## Por qué es seguro (cálculo del buffer respecto al gap del grid)

El grid del hero en `Landing.tsx` (~línea 279) es `grid lg:grid-cols-2 gap-12 lg:gap-16 items-center`:
- Por debajo de `lg` (mobile/sm/md): layout de una sola columna (visual apilado debajo del texto), `gap-12` = **3rem (48px)** actúa como *row-gap* vertical entre el bloque de texto y `.hero-visual`.
- A partir de `lg`: layout de 2 columnas lado a lado, `gap-16` = **4rem (64px)** actúa como *column-gap* horizontal entre la columna de texto y la columna visual.

Offsets elegidos (escala estándar de Tailwind, sin valores arbitrarios):
- Por debajo de `lg`: `-inset-8` = **2rem (32px)** < gap-12 (3rem/48px) → **1rem (16px) de buffer** antes de tocar el bloque de texto apilado arriba.
- A partir de `lg`: `-inset-12` = **3rem (48px)** < gap-16 (4rem/64px) → **1rem (16px) de buffer** antes de invadir la columna de texto a la izquierda.

En ambos breakpoints el offset negativo se queda estrictamente por debajo del gap disponible, con el mismo margen de seguridad relativo (1rem) en los dos casos — cálculo consistente y fácil de auditar.

Efecto óptico: al agrandar la caja del `Canvas` sin tocar `camera.position`/`fov`/radio de la esfera, la ventana visible en unidades de mundo (`2 * 4.5 * tan(22.5°) ≈ 3.73` unidades de alto) se mantiene constante como *proporción de FOV*, pero ahora se reparte sobre una caja de más píxeles CSS que la card de `HeroMockup` (que no cambió de tamaño). Resultado: la esfera renderiza más grande en píxeles absolutos que la card, sobresaliendo visiblemente por los bordes/detrás de ella — el efecto buscado — sin invadir el texto de la columna izquierda gracias al buffer calculado arriba.

`.hero-visual` no tiene `overflow` propio (permanece `visible`, técnica idéntica a los badges flotantes de `HeroMockup` con offsets negativos). La sección padre (`<section ref={heroRef} ... overflow-hidden ...>`) actúa como red de seguridad final: cualquier desborde accidental más allá de lo calculado se recorta sin romper el scroll ni el layout.

## Verificación

```
pnpm --filter @estetica/client build   → exit 0
pnpm --filter @estetica/client lint    → exit 0 (0 errores, 4 warnings preexistentes de react-hook-form `watch()`
                                          en ProfesionalModal.tsx, RegistroModal.tsx, Negocio.tsx, Turnos.tsx —
                                          archivos no tocados por este fix, no relacionados)
```

## Archivos modificados

- `apps/client/src/components/landing/Hero3DScene.tsx` (línea 53: className del wrapper del Canvas; + comentario explicativo)

## Estado

Implementación completa, build y lint verdes. Pendiente de revisión por el `reviewer` antes de marcar `"done"` en `feature_list.json` (regla del leader — el implementer no cambia el status).
