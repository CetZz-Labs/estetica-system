# impl_UX-58 — Página /guia: conectar capturas reales (login, visitas, profesionales, historial)

## Feature
`UX-58` — `feature_list.json` (status `in_progress`, no modificado por el implementer; el reviewer decide el pase a `done`).

## Archivos modificados

- `apps/client/src/components/landing/guide/guideContent.ts`
  - Comentario de cabecera del módulo actualizado: ya no describe los 4 módulos como "sin asset todavía" — documenta que ahora usan capturas `.png` reales con nombres de archivo ad-hoc (no `demo.mp4`).
  - `GuideStep`: nuevo campo opcional `media?: ModuleMedia` (reutiliza el tipo `ModuleMedia` ya existente), documentado con comentario explicando que solo un paso puntual lo usa.
  - Módulo `login`: `media` pasó de `{ kind: 'none' }` a `{ kind: 'image', src: '/media/login/login.png', alt: 'Pantalla de inicio de sesión de Shear' }`.
  - Módulo `visitas`: `media` pasó a `{ kind: 'image', src: '/media/visitas/registar_visitas.png', alt: 'Modal de registro de una nueva visita' }`.
  - Módulo `profesionales`: `media` pasó a `{ kind: 'image', src: '/media/profesionales/profesionales.png', alt: 'Listado de profesionales' }` (imagen de nivel de módulo). Su paso 02 ("Agregar una profesional nueva") ahora incluye `media: { kind: 'image', src: '/media/profesionales/agregar_profesional.png', alt: 'Modal de alta de una nueva profesional' }`.
  - Módulo `historial`: `media` pasó a `{ kind: 'image', src: '/media/historial/historial.png', alt: 'Listado de historial de visitas con filtros' }`.
  - Ningún otro módulo (dashboard, clientes, servicios, inventario, turnos — con video) fue tocado.

- `apps/client/src/views/Guia.tsx`
  - Dentro del `.map` de `guideModule.steps`, agregado render condicional `{step.media && <ModuleMedia media={step.media} inline />}` después del bloque `step.soft`, reutilizando el mismo componente `ModuleMedia` ya usado a nivel de módulo (sin duplicar JSX/lógica). Solo se renderiza para el paso 02 de `profesionales`; el resto de los pasos de todos los módulos no tiene `step.media`, por lo que no se ven afectados.

- `apps/client/src/components/landing/guide/ModuleMedia.tsx`
  - Ajuste menor: nueva prop opcional `inline?: boolean` (default `false`). Cuando es `true` (uso dentro de un paso), el wrapper usa `mt-4 max-w-md` en vez de `mt-8` (ancho completo), para que la captura del paso no compita visualmente con el `ModuleMedia` de nivel de módulo que sí ocupa el ancho completo del contenido. Se aplicó a los 3 estados (video/imagen/placeholder) vía una variable `wrapperClass` común — no se rediseñó el componente, mismo contrato de 3 estados y mismas clases base (`aspect-video`, `rounded-card`, `border`, etc.).

## Verificación

```
pnpm --filter @estetica/client build   → exit code 0
pnpm --filter @estetica/client lint    → exit code 0 (0 errores; 4 warnings preexistentes de react-hooks/incompatible-library en ProfesionalModal.tsx, RegistroModal.tsx, Negocio.tsx, Turnos.tsx — no relacionados con esta feature, archivos no tocados)
```

## Notas

- Se confirmó en disco que los 5 archivos de imagen ya subidos por el usuario existen antes de referenciarlos: `apps/client/public/media/login/login.png`, `apps/client/public/media/historial/historial.png`, `apps/client/public/media/visitas/registar_visitas.png`, `apps/client/public/media/profesionales/profesionales.png`, `apps/client/public/media/profesionales/agregar_profesional.png`.
- No se tocó ningún archivo fuera de `apps/client/src/components/landing/guide/` y `apps/client/src/views/Guia.tsx`.
- No se instalaron dependencias.
