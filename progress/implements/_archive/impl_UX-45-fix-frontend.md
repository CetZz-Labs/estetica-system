# Bitácora de Implementación — UX-45 (ronda de FIX post-feedback de usuario)

**Feature:** `UX-45` — Landing pública (reabierta, `reopen_note`). Alcance de esta ronda: 4 fixes puntuales sobre `views/Landing.tsx`, sin tocar nada más aprobado en `review_UX-45.md`.

**Archivos modificados:**
- `apps/client/src/views/Landing.tsx`
- `apps/client/src/components/landing/StatIcons.tsx` (nuevo)

---

## 1. BUG bloqueante: sección Funcionalidades en blanco

Diagnóstico confirmado por lectura de código (sin navegador disponible en este entorno, igual que el leader): `featureCardReveal` animaba `clipPath` de `inset(100% 0% 0% 0%)` → `inset(0% 0% 0% 0%)` vía `whileInView`, la única técnica de reveal de todo el archivo que dependía de interpolar `clip-path` en vez de `opacity`/`transform`. El resto de secciones (Stats, CTA, footer, "Cómo funciona") usan `opacity`+`y`/`scale`/`x` y el usuario confirmó que esas SÍ se ven — patrón fuertemente correlacionado con el síntoma reportado (cards ocupando su celda del grid pero sin pintar nada = exactamente lo que produce un `clipPath`/`opacity` que nunca llega a interpolar de su estado inicial invisible).

**Fix aplicado:** reemplacé por completo la técnica. `featureCardReveal` ahora devuelve el mismo patrón `opacity`+`y` (fade + slide vertical de 28px, `duration: 0.55`, mismo `ease` cúbico-bezier que ya tenía, mismo stagger `(i % 3) * 0.12` por posición en la fila) que ya está probado en Stats/CTA/footer/"Cómo funciona" de este mismo archivo. Es deliberadamente distinto tanto del `clip-path` roto como del reveal "mazo de cartas" vetado de UX-39 (`rotateX`/`scale`/`rotate` + `perspective`): acá no hay rotación ni perspectiva 3D, solo desplazamiento vertical + fade. El bento grid (1 card grande + 5 chicas) y la sombra de hover `0 8px 24px rgba(107, 52, 68, 0.10)` (aprobada en la ronda anterior) quedan intactos — no forman parte de `featureCardReveal`, viven en el `whileHover` separado del mismo `motion.div`.

Actualicé los 3 bloques de comentario que documentaban la técnica anterior (arriba de `featureCardReveal`, el comentario de la grilla bento, y la referencia cruzada en `fadeSlideUpShort`) para que reflejen el nuevo reveal y el motivo del cambio.

## 2. BUG: línea de "Cómo funciona" se superpone al texto

Causa: el `div` de la línea de progreso (`aria-hidden`, `position: absolute`) no tenía `z-index` explícito. Un elemento posicionado absolutamente pinta por encima del flujo normal salvo que se fije el orden de apilamiento explícitamente — independiente del orden en el DOM.

**Fix aplicado:** agregué `z-0` a la className del contenedor de la línea, y `relative z-10` al `motion.div` de cada paso (el wrapper que contiene el círculo numerado + el bloque de texto). Con esto el apilamiento queda determinado sin ambigüedad: la línea (`z-0`) siempre queda detrás del contenido de cada paso (`z-10`), en ambos layouts alternados (par/impar, `flex-row`/`flex-row-reverse`). No toqué el `scaleY` ligado a scroll (`howItWorksProgress`) ni el resto de la lógica de la sección.

## 3. Ajuste: blobs del hero más rápidos y más numerosos

**Duraciones reducidas** (poco menos de la mitad, para que el drift se perciba notablemente más rápido sin llegar a un parpadeo mareante):
- Blob 1 (wine, esquina superior izquierda): `11s → 5s`
- Blob 2 (sage, esquina superior derecha): `13s → 6s`
- Blob 3 (gold, esquina inferior, `left-1/3`): `9s → 4s`

**3 blobs nuevos agregados** (mismos tokens `wine`/`sage`/`gold`, mismo componente `HeroBlob`, `blur-3xl`+`mix-blend-mode`+opacidad baja igual que los 3 originales, `aria-hidden`/`pointer-events-none` heredados del componente compartido), con tamaños/posiciones/duraciones/delays propios para que no se vean como clones:
- `bg-wine`, `top-1/3 -right-8`, `w-40/56` (sm), `duration=7`, `delay=0.8`
- `bg-sage`, `-bottom-24 right-1/4`, `w-48/64` (sm), `duration=8`, `delay=2.2`
- `bg-gold`, `top-1/2 -left-10`, `w-36/48` (sm), `duration=6.5`, `delay=1`

Total: 6 blobs decorativos en el hero. Todos reciben `prefersReducedMotion={!!prefersReducedMotion}` (la prop ya existente del componente `HeroBlob`, que internamente corta `animate` a `undefined`). No afecta legibilidad porque el contenido del hero vive en un contenedor `relative z-10` por encima de los blobs (`z-0`), independientemente de dónde se posicionen — verificado que este invariante ya existía antes del fix, no lo introduje yo.

## 4. SVGs a medida con animación perpetua (hero stat cards + Stats/"Impacto")

Creé `apps/client/src/components/landing/StatIcons.tsx` (el directorio ya existía vacío desde el retiro de `Hero3DScene.tsx` en la ronda anterior) con 5 componentes, cada uno con la misma superficie mínima que ya consumía el JSX (`size`, `className`), leyendo `useReducedMotion()` internamente para congelar el loop:

| Componente | Usado en | Animación |
|---|---|---|
| `AnimatedClockIcon` | Hero "Setup inicial" + Stats "Setup inicial" | Manecillas rotando en loop infinito (`rotate: 360`, minutero `3s`, horario `8s`, ambas vía `motion.g` con `transformOrigin: '12px 12px'` sobre el centro del viewBox) |
| `AnimatedTrendIcon` | Hero "Más eficiencia" + Stats "Más eficiencia" | Línea de tendencia ascendente dibujándose en loop (`pathLength: [0,1]` de `motion.path`, con `repeatDelay` para pausa entre ciclos) + flecha con pulso de opacidad |
| `AnimatedPeopleIcon` | Hero "Clientes activos" | Dos cabezas/hombros con pulso de `scale` sutil y desfasado (`delay: 0.6` en la segunda) |
| `AnimatedLayersIcon` | Stats "Datos centralizados" | 3 capas apiladas (rombos) con pulso de `opacity` en secuencia (`delay` 0/0.25/0.5) |
| `AnimatedBarsIcon` | Stats "Disponible 24/7" | 3 barras con `scaleY` creciendo/decreciendo en loop, `transformOrigin` en la base, desfasadas |

Reemplacé `FiUsers`/`FiTrendingUp`/`FiClock` en `heroStatCards` y `FiClock`/`FiLayers`/`FiTrendingUp`/`FiBarChart2` en el array inline de Stats por estos 5 componentes (2 se reutilizan en ambos lugares: reloj y tendencia). Mismo tamaño/proporciones (`size={22}` en hero, `size={22}` en Stats — ambos ya usaban 22, no 26-30 como sugería el enunciado; respeté el valor real del código) y mismos tokens `tint.bg`/`tint.text` de contenedor — solo cambió el ícono interno, el contenedor (`w-12 h-12 rounded-card {tint.bg}`) no se tocó.

**Íconos de Funcionalidades:** sin cambios, siguen siendo `react-icons/fi` (`FiUsers`, `FiScissors`, `FiBox`, `FiCalendar`, `FiActivity`, `FiCheckCircle`) — fuera del alcance de este pedido.

**Limpieza de imports:** removí `FiClock`, `FiLayers`, `FiBarChart2` de `Landing.tsx` (quedaban sin uso tras el reemplazo) y el import de `IconType` de `react-icons` (ya no se usa: `AnimatedStatProps.icon` ahora tipa `(props: StatIconProps) => ReactElement`, importando `StatIconProps` del nuevo archivo y agregando `ReactElement` al import de tipos de `react`). `FiUsers` y `FiTrendingUp` se mantienen importados porque siguen usándose en Funcionalidades (`FiUsers` en el copy de "Gestión de Clientes", `FiTrendingUp` en el badge de stat de las cards `featured`).

---

## Verificación

```
pnpm --filter @estetica/client build   → Exit 0 (dist/assets/index-C0wOjQKZ.js 1,644.12 kB, gzip 498.25 kB — solo el warning preexistente de chunk-size)
pnpm --filter @estetica/client lint    → Exit 0, 4 warnings preexistentes react-hooks/incompatible-library (ProfesionalModal.tsx, RegistroModal.tsx, Negocio.tsx, Turnos.tsx) — ninguno nuevo, ninguno en Landing.tsx ni StatIcons.tsx
```

Re-chequeo de invariantes ya aprobados en `review_UX-45.md` (no rotos por esta ronda):
- `grep -rniE "three|@react-three|gsap|@gsap" apps/client/src --include="*.ts" --include="*.tsx"` → 3 matches, todos comentarios históricos (`Landing.tsx:77-78,186`) + 1 falso positivo esperado (`Negocio.tsx:13`, subcadena `gsap` dentro de `notificationSettingsApi`). Cero imports reales.
- `grep -rln "from 'motion" apps/client/src --include="*.tsx"` → `Landing.tsx` + el nuevo `StatIcons.tsx` (ambos dentro del árbol de Landing). `grep ... | grep -v "views/Landing.tsx\|components/landing"` → sin resultados, cero fuga a vistas autenticadas.
- `grep -n "bg-wine" apps/client/src/views/Landing.tsx` → único bloque sólido real en línea 674 (CTA final); las otras 2 apariciones (líneas 329, 359) son blobs decorativos blur+opacidad, grandfatherizados por UX-39, no bloques sólidos.
- `grep -n "boxShadow" apps/client/src/views/Landing.tsx` → único resultado, sigue acotado al `whileHover` de las cards de Features.

---

## Decisiones técnicas / hallazgos

- El reveal de Features pasó de una técnica única y frágil (`clip-path`) a reutilizar el patrón ya probado del resto del archivo — no se inventó una tercera técnica nueva, minimizando superficie de riesgo para esta ronda de fix.
- Para el z-index de "Cómo funciona" no fue necesario reestructurar el layout alternado (par/impar) ni el spine — el fix es puramente de apilamiento (`z-0`/`z-10`), sin tocar la técnica de `scaleY` ligada a `howItWorksProgress`.
- Los 3 blobs nuevos reutilizan las mismas 3 `MotionValue` de parallax (`blobParallaxY1/2/3`) que ya existían para los blobs originales (ciclándolas por color) en vez de crear 3 `useTransform` adicionales — cada blob sigue teniendo drift/delay propio e independiente vía sus props `driftX`/`driftY`/`duration`/`delay`, solo comparten la curva de parallax de scroll del blob "hermano" del mismo color, lo cual es coherente visualmente y evita inflar el hook count del componente.
- Los 5 SVG icons usan `useReducedMotion()` internamente (no vía prop) porque solo se instancian dentro de `Landing.tsx`/`components/landing/` — consistente con que el resto de sub-componentes de Landing (`HeroBlob`, `TiltCard`, `Magnetic`) sí reciben la prop en cascada porque son genéricos y reutilizados con distintos contextos, mientras que estos 5 son de un solo uso puntual cada uno.
