# impl_UX-51 — "Cómo funciona": reveal reversible al scrollear

## Feature
`UX-51` — Landing pública — "Cómo funciona": los pasos también desaparecen (animación inversa) al
salir de vista, no solo al aparecer.

## Cambios
Archivo modificado: `apps/client/src/views/Landing.tsx` (sección `id="como-funciona"`).

1. `motion.div` de cada paso (contenedor `flex flex-col sm:flex-row...`): `viewport={{ once: true,
   amount: 0.4 }}` → `viewport={{ once: false, amount: 0.4 }}`. Sin tocar `initial`/`whileInView`
   (fade + slide horizontal ±140px según paridad) ni `transition` (`spring`, `bounce: 0.4`,
   `duration: 0.8`).
2. `motion.div` interno del círculo numerado: `viewport={{ once: true, margin: '-50% 0px -50%
   0px' }}` → `viewport={{ once: false, margin: '-50% 0px -50% 0px' }}`. Sin tocar `initial`/
   `whileInView` (`opacity`/`scale`) ni `transition` (`duration: 0.5`, `ease: 'easeOut'`).

No se tocó ninguna otra línea de la sección ni de otras secciones de `Landing.tsx` como parte de
esta feature (el archivo comparte pase con UX-52/UX-53, ver sus propias bitácoras; también trae
diffs preexistentes de una edición manual del usuario anterior a esta sesión — no forman parte de
ninguna de las tres features).

## Decisiones técnicas
- Con `once: false`, `motion` revierte automáticamente al estado `initial` cuando el elemento sale
  del viewport en cualquier dirección (scroll hacia abajo o hacia arriba) — no hace falta lógica
  adicional de estado.
- El círculo numerado recibe el mismo cambio para evitar la inconsistencia descrita en el pedido
  (círculo iluminado permanentemente mientras el texto ya se ocultó).
- La rama `prefersReducedMotion` (`initial={false}`, `whileInView={undefined}`) no se tocó: al
  no pasarse variantes de animación cuando el usuario prefiere reducir movimiento, el estado
  siempre visible se mantiene sin animación, independientemente de `once`.

## Verificación
```
pnpm --filter @estetica/client build   → exit code 0
pnpm --filter @estetica/client lint    → exit code 0 (4 warnings preexistentes de
                                          react-hooks/incompatible-library en otros archivos,
                                          no relacionadas con este cambio)
```

`git --no-pager diff --ignore-all-space --stat -- apps/client/src/views/Landing.tsx` confirmado:
el diff real de las tres features del pase (UX-51/UX-52/UX-53) más los cambios preexistentes de la
edición manual del usuario se mantiene acotado, sin reindentación espuria de bloques ajenos a lo
tocado.

## Estado
Implementación terminada. NO se cambió `feature_list.json` (sigue en `"in_progress"`, tarea
exclusiva del reviewer).
