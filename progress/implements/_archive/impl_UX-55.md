# impl_UX-55 — Bajar el volumen de los videos a la mitad

## Diagnóstico

HTML no ofrece un atributo estático para fijar el volumen inicial de un `<video>` — debe
setearse por JS sobre el elemento del DOM. Como `/guia` renderiza un `<video>` por módulo
(varios en la misma página), la solución debía asegurar que cada instancia reciba su propio
volumen sin depender de un selector global o listener compartido.

## Fix aplicado

Archivo modificado: `apps/client/src/components/landing/guide/ModuleMedia.tsx`.

- Se agregó `useRef<HTMLVideoElement | null>(null)` local al componente (cada invocación de
  `<ModuleMedia />` — una por módulo — instancia su propio ref, sin estado compartido entre
  videos).
- Se conectó el ref al `<video>` (`ref={videoRef}`) y se agregó el handler
  `onLoadedMetadata`, que setea `videoRef.current.volume = 0.5` apenas el elemento tiene
  metadata cargada (necesario porque `volume` no es seteable de forma confiable antes de
  ese evento en todos los navegadores).

```tsx
const videoRef = useRef<HTMLVideoElement | null>(null);
// ...
<video
    ref={videoRef}
    controls
    preload="none"
    playsInline
    poster={media.poster}
    className="h-full w-full object-cover"
    onLoadedMetadata={() => {
        if (videoRef.current) {
            videoRef.current.volume = 0.5;
        }
    }}
>
    <source src={media.src} type="video/mp4" />
</video>
```

No se modificó `autoplay`, `preload="none"`, `controls` ni `playsInline`. La rama
`kind === "image"` y la rama placeholder quedaron sin tocar.

## Verificación

- `pnpm --filter @estetica/client build` → exit code 0.
  - `tsc -b && vite build` completó sin errores. Bundle: `dist/assets/index-CsitUsIS.js` 1,719.63 kB (gzip 520.43 kB).
- `pnpm --filter @estetica/client lint` → exit code 0 (4 warnings preexistentes de
  `react-hooks/incompatible-library`, no relacionados con este archivo ni introducidos por
  este cambio).
- Scope check: la carpeta `apps/client/src/components/landing/guide/` está sin trackear en
  git, por lo que se verificó por timestamp de archivo que solo `ModuleMedia.tsx` (y
  `GuideIndex.tsx` por UX-54) fueron modificados en esta sesión.

## Archivos modificados

- `apps/client/src/components/landing/guide/ModuleMedia.tsx` (import de `useRef`, declaración
  de `videoRef`, prop `ref` y handler `onLoadedMetadata` agregados al `<video>` de la rama
  `kind === "video"`).
