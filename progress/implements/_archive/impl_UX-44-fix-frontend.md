# impl_UX-44-fix-frontend.md

## Feature
UX-44 — Landing pública — hero: animación 3D real (three.js/WebGL) + GSAP
**Ronda de corrección (`-fix`)**: bug real reportado por el usuario tras aprobación del reviewer — la animación no se veía en el navegador.

## Causa raíz (confirmada leyendo el componente completo)
`apps/client/src/views/Landing.tsx` tiene dos `return` tempranos antes del JSX del hero:
1. `if (!isLoaded)` (línea ~161) → spinner de Clerk, sin `<section ref={heroRef}>` en el DOM.
2. `if (userId)` (línea ~172) → `<Navigate to="/dashboard" />`, tampoco monta el hero.

El hero real (con las clases `.hero-eyebrow`, `.hero-title`, etc.) solo se monta cuando `isLoaded === true` **y** `userId` es falsy. El `useGSAP` (línea ~145, antes de ambos `return`) tenía `dependencies: [prefersReducedMotion]` — sin `isLoaded`. Como en el primer render real `isLoaded` es `false`, `heroRef.current` es `null` en ese momento → GSAP loguea "Invalid scope" / "target not found". Cuando Clerk resuelve la sesión y el hero real se monta, el efecto **no se re-ejecutaba** porque su única dependencia no cambió de forma relevante — la timeline quedó huérfana del render fantasma y nunca corrió contra el DOM real.

## Cambio aplicado
`apps/client/src/views/Landing.tsx:145-172` (aprox., bloque `useGSAP`):
- Agregado `isLoaded` y `userId` al array `dependencies` de `useGSAP` (antes: `[prefersReducedMotion]`, ahora: `[prefersReducedMotion, isLoaded, userId]`). Esto fuerza al hook a re-ejecutarse en el render donde el hero real ya está en el DOM.
- Agregada guarda defensiva `if (!heroRef.current) return;` al inicio del callback, para el render en que `isLoaded` es `false` (spinner) o el render en que `userId` es truthy (redirect) — en ambos casos `heroRef.current` es `null` y el hook ahora sale silenciosamente sin loguear warnings de GSAP.
- Comentario explicativo agregado in situ documentando el bug y el fix (fecha 2026-07-22).

Secuencia de renders verificada por lectura de código:
- Render 1: `isLoaded=false` → spinner, sin `heroRef` → efecto corre, guarda detiene ejecución (sin warning).
- Render 2: `isLoaded=true`, `userId` falsy → hero real montado, `heroRef.current` asignado → `isLoaded` cambió en `dependencies` → efecto se re-ejecuta con scope válido → timeline GSAP corre contra el DOM real.
- (Caso alternativo) Si `userId` es truthy en render 2 → `<Navigate>`, sin hero → efecto corre (por cambio de dep), guarda detiene ejecución sin warning.

## Hero3DScene (Canvas WebGL) — verificado, sin problema análogo
`apps/client/src/components/landing/Hero3DScene.tsx` no usa `useGSAP` ni depende de `isLoaded`. Se monta vía `<Suspense>` dentro del JSX del hero, condicionado únicamente a `webglSupported` (feature-detection síncrona en `useState` lazy initializer). Como el `<Canvas>` solo existe en el árbol cuando el hero real ya se renderiza (post `isLoaded`/`!userId`), no hay timing bug: no hay ningún efecto que dependa de un scope que pueda quedar obsoleto. Confirmado por lectura completa del archivo — no se modificó.

## `THREE.Clock` deprecation warning — no accionable desde nuestro lado
`three@0.185.1` + `@react-three/fiber@9.6.1` (versiones ya instaladas). El warning "THREE.Clock: This module has been deprecated. Please use THREE.Timer instead." se origina en el uso interno de `Clock` dentro de `@react-three/fiber` (loop interno del `Canvas`), no en código propio — no hay ninguna llamada directa a `THREE.Clock` en `Hero3DScene.tsx`. Solucionarlo requeriría actualizar `@react-three/fiber` a una versión que migre a `Timer` internamente, lo cual excede el alcance de este fix (instalación/actualización de dependencias fuera de mandato) y no está relacionado con el bug real (la animación ausente). Se documenta como **no bloqueante** — no se intentó silenciar.

## Archivos modificados
- `apps/client/src/views/Landing.tsx` (único archivo tocado en esta ronda de fix)

## Verificación
```
pnpm --filter @estetica/client build   → exit 0
pnpm --filter @estetica/client lint    → exit 0 (0 errors, 4 warnings preexistentes no relacionados: watch() de react-hook-form en ProfesionalModal.tsx, RegistroModal.tsx, Negocio.tsx, Turnos.tsx — sin relación con Landing.tsx ni con este fix)
```

## Estado
Implementación de fix completa. Pendiente de reviewer para cierre (no se cambió `feature_list.json`).
