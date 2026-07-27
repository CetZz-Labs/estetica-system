# Reporte de Exploracion — UX-46 (fondos animados Silk + ShapeGrid en Landing)

**Pregunta:** Como portar Silk (react-bits, three.js -> ogl) y ShapeGrid (react-bits, canvas 2D puro) a Landing.tsx, con que puntos de montaje exactos, que colores de marca, que estrategia de reduced-motion y que texto de excepcion en docs/design.md paragrafo 13.1.
**Contexto:** UX-46, feature de UI/frontend puro sobre apps/client/src/views/Landing.tsx.
**Timestamp:** 2026-07-27

---

## 1. Resumen del pedido

- Silk: fondo de olas animadas, SOLO detras del section del hero (linea 399-486 de Landing.tsx). Explicitamente fuera de TrustMarquee.
- ShapeGrid: fondo de grilla animada, para Funcionalidades + Stats + Como funciona + CTA final + footer. Explicitamente fuera del hero y de TrustMarquee.
- Confirmado por Grep -i "marquee|carousel" sobre apps/client/src (unico match: Landing.tsx, que contiene la propia funcion TrustMarquee): es el unico elemento tipo "cinta/carrousel" del archivo, no hay otro candidato a excluir.
- Confirmado con ogl/three/gsap ausentes de pnpm-lock.yaml y de apps/client/package.json (solo motion 12.42.2 como libreria de animacion instalada) — UX-45 los elimino por completo, sin residuos.

---

## 2. Puntos de montaje exactos en Landing.tsx

### 2.1 Estructura actual relevante (lineas citadas del archivo leido integro)

- 234: div raiz del componente, className "min-h-screen bg-bg text-text font-sans".
- 333: div wrapper compartido hero+TrustMarquee, className "relative overflow-hidden bg-bg" (contiene los 6 HeroBlob, lineas 343-396).
- 399: section del hero, className "relative z-10 pt-16 sm:pt-20 pb-16 sm:pb-24", cierra en 486.
- 400: div de contenido real del hero, className "relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8" (ya z-10).
- 489: TrustMarquee, cierra el wrapper en 490.
- 493: section Features, id "funcionalidades", className "relative scroll-mt-20 bg-bg", cierra 556.
- 559: section Stats, className "py-16 sm:py-24 bg-bg", cierra 600 (sin relative hoy).
- 603: section Como funciona, id "como-funciona", className "py-24 sm:py-32 relative scroll-mt-20 bg-bg", cierra 695.
- 698: section CTA final, className "py-20 sm:py-28 bg-bg", cierra 775 (sin relative hoy).
- 780: motion.footer, className "border-t border-border bg-surface", cierra 803.
- 804: cierre de la raiz del componente.

### 2.2 Montaje de Silk (hero unicamente)

Insertar como primer hijo del section del hero (linea 399), antes del div de contenido (linea 400):

```jsx
<section className="relative z-10 pt-16 sm:pt-20 pb-16 sm:pb-24">
    {/* Fondo Silk del hero (UX-46) — ver components/landing/Silk.tsx. Decorativo puro,
        confinado a este section (no se extiende a TrustMarquee). */}
    <div aria-hidden="true" className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
        <Silk color={SILK_COLOR} speed={2.2} scale={1} noiseIntensity={1.1} rotation={0}
              prefersReducedMotion={!!prefersReducedMotion} />
    </div>

    <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* ...contenido existente sin cambios... */}
```

z-0 interno (relativo al section, que ya es relative) queda por debajo del z-10 del contenido existente — no rompe la jerarquia ya establecida.

Decision pendiente de confirmar con el usuario (no la resolvi unilateralmente, ver seccion 9 Riesgos): el hero YA tiene 6 HeroBlob (lineas 343-396) viviendo en el wrapper padre (333), pensados como el fondo decorativo del hero+marquee. Agregar Silk (un fondo animado casi opaco, ver seccion 5) encima de esos 6 blobs sin tocarlos apila dos sistemas de fondo animado simultaneos en la misma seccion, lo cual choca con design.md paragrafo 1.3 (Maximo 1-2 fondos por vista). Mi recomendacion tecnica es que el implementer retire los 6 HeroBlob del hero (lineas 343-396, quedan intactos los usos de HeroBlob en el CTA final, linea 733, que es una seccion distinta y no se toca) y los reemplace por este unico Silk. Si el usuario prefiere conservar los blobs, la alternativa es bajar la opacidad del wrapper de Silk a ~0.10-0.15 para que ambos convivan, pero esto debe confirmarse explicitamente antes de implementar — no esta autorizado por el pedido original tal como esta redactado.

Efecto colateral de retirar los blobs: el wrapper de linea 333 y el comentario de TrustMarquee (bg-surface/90, lineas 330-332) documentan que esa opacidad baja existe especificamente para dejar sangrar el blur de los blobs detras de la cinta. Si los blobs se retiran del hero, ese sangrado desaparece y TrustMarquee podria volver a bg-surface opaco — cambio menor, cosmetico, a decision del implementer/reviewer, no bloqueante.

### 2.3 Montaje de ShapeGrid (Funcionalidades -> footer)

Recomendacion tecnica (no la naive): NO envolver las 5 secciones en un div con un canvas absoluto dimensionado a la altura total del contenido (eso implicaria un canvas potencialmente de miles de px de alto, redibujado 60 veces por segundo en su totalidad cada frame — carisimo). En su lugar, montar un unico canvas position fixed del tamano del viewport, con z-0, insertado una sola vez en el arbol, antes del comentario de FEATURES (linea 492):

```jsx
{/* Fondo ShapeGrid del resto de la Landing (UX-46) — ver components/landing/ShapeGrid.tsx.
    fixed (no absolute) para que el canvas mida siempre el viewport, no el alto total de
    5 secciones — evita redibujar un canvas gigante en cada frame. z-0 para quedar detras de
    todo el contenido con z-10 explicito (ver mas abajo). */}
<div aria-hidden="true" className="fixed inset-0 z-0 pointer-events-none">
    <ShapeGrid borderColor={SHAPEGRID_BORDER} squareSize={44} direction="diagonal" speed={0.4}
               prefersReducedMotion={!!prefersReducedMotion} />
</div>

{/* FEATURES */}
<section id="funcionalidades" className="relative z-10 scroll-mt-20">
```

Cambios obligatorios que acompanan este montaje (sin estos, el canvas fixed no se ve nunca porque queda tapado por fondos opacos, o se ve donde no debe por orden de stacking):

1. Wrapper hero+marquee (linea 333): agregar z-10 explicito, de className "relative overflow-hidden bg-bg" a "relative z-10 overflow-hidden bg-bg". Sin este cambio, el wrapper del hero (position relative, sin z-index) y el canvas fixed (position fixed, z-0) son ambos elementos posicionados en el mismo stacking context raiz; sin z-index explicito mas alto en el wrapper del hero, el orden de pintado dependeria del orden en el DOM y el canvas fixed (declarado despues) podria pintarse encima del hero — justo lo que el pedido prohibe explicitamente (excluido del hero). Este es el detalle mas facil de pasar por alto del ticket.
2. Features (linea 493): de "relative scroll-mt-20 bg-bg" a "relative z-10 scroll-mt-20" (retirar bg-bg opaco, agregar z-10).
3. Stats (linea 559): de "py-16 sm:py-24 bg-bg" a "relative z-10 py-16 sm:py-24".
4. Como funciona (linea 603): de "py-24 sm:py-32 relative scroll-mt-20 bg-bg" a "py-24 sm:py-32 relative z-10 scroll-mt-20". Ojo: esta seccion ya usa z-0/z-10 internamente para la spine SVG (lineas 635-651) — esos son relativos al propio section (que ya es relative), no chocan con el z-10 nuevo del section en si mismo (son stacking contexts anidados distintos).
5. CTA final (linea 698): de "py-20 sm:py-28 bg-bg" a "relative z-10 py-20 sm:py-28".
6. Footer (linea 780): de "border-t border-border bg-surface" a "relative z-10 border-t border-border bg-surface/90" (mismo patron ya usado en TrustMarquee, linea 839, para dejar sangrar el fondo decorativo sin sacrificar contraste).

Sin los pasos 2-6, quitar solo el bg-bg no alcanza si no se agrega z-10: sin position/z-index explicito, cada section es un bloque no posicionado en flujo normal, que en el orden de pintado del navegador se pinta antes que elementos posicionados (el canvas fixed) sin importar el orden en el DOM — es decir, sin el z-10, el canvas fixed (aunque z-0) terminaria pintandose siempre encima de las 5 secciones, tapando el contenido real. Por eso las 5 secciones necesitan quedar explicitamente posicionadas (relative) con z-index mayor (z-10), no alcanza con solo quitarles el fondo solido.

Las cards internas (feature cards, stat cards, el bloque TiltCard del CTA) siguen con bg-surface opaco sin cambios — el grid solo queda visible en el espacio negativo entre cards/texto, tal como pide el punto 7 del enunciado.

---

## 3. Puerto de Silk a ogl

Archivo nuevo: apps/client/src/components/landing/Silk.tsx. Punto de montaje unico documentado en Landing.tsx (seccion 2.2 de este reporte).

### 3.1 Confirmacion sobre Triangle de ogl

ogl expone Renderer, Program, Mesh, Triangle, Color (clase propia de ogl, no la de three) entre otros. Triangle es el idiom estandar de ogl para shaders fullscreen (un solo triangulo sobredimensionado que cubre exactamente el viewport tras el clipping, sin necesidad de camara/matrices de proyeccion) — mas eficiente que un plano de 2 triangulos porque evita el seam central. Sus atributos son position (vec2, en espacio de clip, ya en rango que cubre -1..1 tras el recorte) y uv (vec2). La zona visible del canvas corresponde exactamente al subrango uv 0..1 del triangulo (el resto queda fuera del viewport y se recorta) — no hace falta remapeo adicional de UV para que el patron se vea continuo, es el comportamiento documentado de esta tecnica.

El implementer debe confirmar los nombres exactos de atributos/API contra el paquete ogl real una vez instalado (leer node_modules/ogl/src/extras/Triangle.js o el .d.ts si existe) antes de dar por sentado los nombres de arriba — son los nombres estandar y ampliamente documentados de la libreria, pero no los verifique contra el codigo fuente instalado (no esta instalada aun).

### 3.2 Adaptacion del shader

- Vertex shader (nuevo, simplificado respecto al original de three.js — ya no hace falta projectionMatrix/modelViewMatrix porque Triangle.position ya esta en espacio de clip): atributos de entrada uv y position (ambos vec2, provistos por Triangle); varying de salida vUv (pasa uv tal cual); gl_Position se construye a partir de position con z=0, w=1, sin multiplicar por ninguna matriz.
- Fragment shader: reutilizar literalmente el GLSL del fragment shader original provisto en el pedido (funciones noise, rotateUvs, el bloque de pattern/tOffset, uniforms uTime/uColor/uSpeed/uScale/uRotation/uNoiseIntensity) — es codigo GLSL puro, no depende de la API de three.js/R3F, se copia sin cambios.
- Uniforms: mismos 6 (uTime, uColor, uSpeed, uScale, uRotation, uNoiseIntensity), inicializados con Program({ uniforms: {...} }) de ogl (API similar a three.js ShaderMaterial, cada uniform es { value: ... }). uColor usa la clase Color de ogl (no la de three), que tambien acepta un string hex en su constructor.

### 3.3 Estructura del componente (harness, sin camara)

Pseudocodigo de referencia (el implementer escribe el .tsx final, esto es la guia de estructura, no el archivo):

```
function Silk({ color, speed, scale, noiseIntensity, rotation, prefersReducedMotion }) {
  containerRef = useRef(null)

  useEffect(() => {
    if (!containerRef.current) return

    renderer = new Renderer({ dpr: Math.min(devicePixelRatio, 2), alpha: true })
    gl = renderer.gl
    containerRef.current.appendChild(gl.canvas)

    program = new Program(gl, {
      vertex: VERTEX_SRC, fragment: FRAGMENT_SRC,
      uniforms: {
        uTime: { value: 0 },
        uColor: { value: new Color(color) },
        uSpeed: { value: speed },
        uScale: { value: scale },
        uRotation: { value: rotation },
        uNoiseIntensity: { value: noiseIntensity },
      },
    })
    mesh = new Mesh(gl, { geometry: new Triangle(gl), program })

    function resize() {
      w = containerRef.current.clientWidth
      h = containerRef.current.clientHeight
      renderer.setSize(w, h)
    }
    resizeObserver = new ResizeObserver(resize)
    resizeObserver.observe(containerRef.current)
    resize()

    rafId = null
    lastTime = performance.now()
    function loop(now) {
      if (!prefersReducedMotion) {
        delta = (now - lastTime) / 1000
        lastTime = now
        program.uniforms.uTime.value += delta * 0.1
        rafId = requestAnimationFrame(loop)
      }
      renderer.render({ scene: mesh })
    }
    if (prefersReducedMotion) {
      renderer.render({ scene: mesh })
    } else {
      rafId = requestAnimationFrame(loop)
    }

    return () => {
      if (rafId) cancelAnimationFrame(rafId)
      resizeObserver.disconnect()
      gl.getExtension("WEBGL_lose_context")?.loseContext()
      containerRef.current?.removeChild(gl.canvas)
    }
  }, [color, speed, scale, noiseIntensity, rotation, prefersReducedMotion])

  return div ref=containerRef className="w-full h-full"
}
```

Notas sobre este esqueleto:
- ResizeObserver en vez de listener de window.resize (a diferencia del ShapeGrid original): el contenedor de Silk es el section del hero, no necesariamente el viewport completo — ResizeObserver reacciona a cambios de tamano del propio contenedor (mas robusto que un resize de window).
- Cleanup explicito de contexto WebGL via WEBGL_lose_context (ogl no expone un renderer.dispose() como three.js) — critico dado el historial de bugs de timing con la pila WebGL anterior (UX-44/UX-45): probar montaje/desmontaje repetido (ej. navegar Landing -> Login -> Landing) para confirmar que no se acumulan contextos WebGL huerfanos (limite tipico del navegador ~16 contextos simultaneos).
- Reconstruir el efecto completo (useEffect con cleanup total) en cada cambio de props es aceptable dado que Silk solo se monta una vez por sesion de Landing (no hay motivo de perf para separar creacion de actualizacion de uniforms como hacia el useEffect separado del original de three.js).

### 3.4 Version de ogl

No hay ogl en pnpm-lock.yaml (confirmado via grep). Dejar que pnpm add ogl en apps/client resuelva la ultima estable — no fijar un numero de version inventado en este reporte.

---

## 4. Puerto de ShapeGrid

Archivo nuevo: apps/client/src/components/landing/ShapeGrid.tsx. Preferir estilos inline via className Tailwind (w-full h-full block) en vez de introducir un ShapeGrid.css nuevo — coherente con que el resto de components/landing/ no tiene archivos .css propios.

Recomendacion de simplificacion (ver seccion 7 de performance): portar SOLO la rama shape igual a square (la que se va a usar, ver seccion 5) mas resizeCanvas, drawGrid (rama square), updateAnimation (drift de gridOffset segun direction/speed) y el gradiente radial final de drawGrid. Omitir por completo hoveredSquare, trailCells, cellOpacities, updateCellOpacities, handleMouseMove, handleMouseLeave y sus listeners — es decorativo puro sin interaccion (justificacion completa en seccion 7). Esto reduce el puerto a menos de la mitad del codigo original y elimina toda la superficie de bugs de deteccion de celda por forma.

Props resultantes (subset de las originales, sin hoverFillColor/hoverTrailAmount/shape fijo a square):

```
interface ShapeGridProps {
  direction?: string   // right | left | up | down | diagonal
  speed?: number
  borderColor: string   // rgba() de marca, ver seccion 5
  squareSize?: number
  prefersReducedMotion: boolean
}
```

Cleanup: igual de riguroso que el original — cancelAnimationFrame + removeEventListener resize en el return del useEffect. Con prefersReducedMotion: llamar resizeCanvas() + drawGrid() una sola vez (dibujo estatico) y no llamar nunca requestAnimationFrame(updateAnimation).

---

## 5. Colores elegidos y justificacion

Tokens leidos de apps/client/src/index.css lineas 10-46 y docs/design.md seccion 2.

### 5.1 Silk (uColor)

No usar wine (#6B3444): el CTA final (linea 697 de Landing.tsx, comentario explicito "unico bloque wine solido de la pagina") ya reclama wine como el color de bloque destacado de toda la Landing (design.md 1.3: "el vino profundo... aparece una sola vez por vista"). El fragment shader de Silk sale con alfa completo (no es una textura translucida como los blobs) — usar wine ahi competiria visualmente con esa regla aunque no sea, tecnicamente, un div solido.

Recomendacion: accent-rose (#D98BA4) como uColor, envuelto en un contenedor con opacidad baja (clase Tailwind arbitraria tipo opacity-[0.14], o el valor que el implementer calibre visualmente entre 0.10-0.18) mas mixBlendMode multiply sobre el bg-bg (#FAF6F4) de fondo del hero — mismo idiom ya aprobado en design.md 13.1 (UX-39) para los blobs (formas solidas con blur/opacidad + mix-blend-mode, no cuenta como gradiente decorativo). accent-rose es el tono ya reservado para foco de input/categoria Color (design.md 2.3), no colisiona semanticamente con accent (botones primarios) ni con wine (bloque CTA), y da a Silk una identidad cromatica propia dentro de la paleta ya aprobada. Alternativa aceptable si el implementer/reviewer prefiere mas peso: accent (#B76E84) con la misma envoltura de opacidad mas blend.

Justificacion de la opacidad obligatoria: sin ella, el patron sinusoidal de Silk (variacion de brillo 0.2-1.0 del color base, alfa completo) se veria como una superficie casi solida coloreada detras del titulo/CTAs del hero, degradando el contraste de text (#3E2A33) sobre lo que hoy es bg-bg casi blanco — riesgo de accesibilidad que el implementer debe verificar visualmente (build mas captura de pantalla) antes de cerrar la tarea.

### 5.2 ShapeGrid (borderColor/hover)

Dado que se recomienda eliminar el hover (secciones 4 y 7), solo hace falta borderColor. Sugerido: rgba(107, 52, 68, 0.06), wine al 6 por ciento de opacidad: lineas de grilla casi imperceptibles, calidas (coherentes con el resto de la paleta) en vez del gris generico usado de ejemplo en la libreria, que design.md prohibe explicitamente (no introducir colores fuera de los tokens de la seccion 2). Si el implementer decide conservar el hover (contra mi recomendacion de la seccion 7), usar hoverFillColor rgba(183, 110, 132, 0.12), accent al 12 por ciento.

squareSize: 44 (multiplo de 4, coherente con la grilla base de design.md seccion 5, "multiplos de 4"). shape: square — es la unica forma coherente con la estetica de tarjetas rectangulares/rounded-card de toda la app; hexagono/triangulo/circulo no tienen precedente en design.md y se leerian como un elemento decorativo ajeno al sistema. direction: diagonal, speed: 0.4 (bien por debajo del default 1 de la demo, para que el drift sea casi imperceptible, coherente con el pedido "MUY sutil").

---

## 6. Estrategia prefers-reduced-motion

Landing.tsx ya calcula const prefersReducedMotion = useReducedMotion() una sola vez (linea 191) y lo pasa como prop explicita (no re-invocando el hook) a HeroBlob/TiltCard/Magnetic — es la convencion establecida en este archivo especifico (a diferencia de AnimatedStatIcon, que si re-invoca el hook internamente porque vive en otro archivo sin ese valor ya calculado disponible). Silk y ShapeGrid deben seguir el mismo patron: recibir prefersReducedMotion boolean como prop desde Landing.tsx, sin llamar useReducedMotion() dentro de Silk.tsx/ShapeGrid.tsx.

- Silk: con prefersReducedMotion true, crear igualmente el contexto WebGL y el Program/Mesh (para no complicar el ciclo de vida con un modo sin canvas), pero renderizar un unico frame estatico con uTime en 0 y jamas llamar requestAnimationFrame — el patron de olas congelado en su posicion inicial, sin loop.
- ShapeGrid: con prefersReducedMotion true, ejecutar resizeCanvas() mas drawGrid() una sola vez al montar (grilla estatica, sin drift) y jamas llamar requestAnimationFrame(updateAnimation).

Ambos casos son analogos al patron ya usado por HeroBlob (linea 969: animate condicionado a prefersReducedMotion, con un valor de reposo estatico via style cuando esta activo) — "reducir drasticamente" el movimiento, no eliminar el fondo por completo (design.md 13.1: "desactivar o reducir drasticamente loops/parallax/reveals").

---

## 7. Recomendacion pointer-events / performance

pointer-events-none para ambos componentes, sin excepcion — recomendacion firme.

Razones para ShapeGrid en particular (era el punto explicito de la pregunta):
1. El canvas queda detras de 5 secciones con mucho contenido real (cards de Features, stat cards, spine SVG de Como funciona, bloque CTA, footer) — el hover solo seria visible en los huecos entre elementos, valor de UX marginal.
2. Un listener de mousemove activo sobre un area de esa magnitud (potencialmente miles de px de alto si el canvas fuera absolute a la altura del contenido, o el viewport completo si es fixed como recomiendo en la seccion 2.3) ejecuta JS en cada movimiento de mouse mientras el usuario simplemente lee la pagina — costo continuo sin beneficio claro.
3. Coherente con el resto del archivo: todos los fondos decorativos existentes (HeroBlob, la textura de puntos del CTA) son pointer-events-none mas aria-hidden, sin excepcion — mantener esa uniformidad.
4. Reduce superficie de bugs: menos estado (hoveredSquare, trailCells, cellOpacities), menos listeners que limpiar, menos que un reviewer tenga que auditar — directamente alineado con la leccion post-mortem de UX-45 citada en el pedido (2 rondas de bugs de timing con la pila anterior).

Combinado con la recomendacion de fixed (viewport-sized) de la seccion 2.3 en vez de un canvas dimensionado a toda la altura de contenido, el costo de render de ShapeGrid queda acotado a aproximadamente 1 pantalla, no a la altura total de 5 secciones — la combinacion de ambas decisiones (fixed mas sin hover) es la mitigacion de performance mas efectiva disponible sin reescribir el algoritmo de dibujo.

---

## 8. Texto propuesto para docs/design.md seccion 13.1

Parrafo nuevo a agregar al final de la seccion 13.1 (mismo estilo que los bullets existentes de UX-44/UX-45):

```
* Excepcion puntual ogl para el fondo Silk del hero (UX-46, 2026-07-27): se permite
  instalar ogl (biblioteca WebGL ligera, ~30-50 kB, sin relacion con three/@react-three/*)
  como dependencia de apps/client, consumida exclusivamente desde
  components/landing/Silk.tsx para renderizar el fondo animado de olas de tela del hero de la
  Landing (reimplementacion del shader GLSL de la variante oficial Silk-JS-CSS de react-bits,
  cuya forma original requiere three + @react-three/fiber). Esta excepcion es puntual y no
  reabre en ningun grado la excepcion retirada en UX-45: three, @react-three/fiber,
  @react-three/drei, gsap y @gsap/react permanecen fuera del proyecto.
  components/landing/ShapeGrid.tsx (fondo de grilla animada del resto de la Landing —
  Funcionalidades, Stats, Como funciona, CTA final y footer) no requiere ninguna excepcion de
  dependencias: es Canvas 2D puro escrito a mano, sin librerias externas, igual que el resto del
  codigo de components/landing/. Ambos fondos son puramente decorativos
  (aria-hidden mas pointer-events-none) y respetan prefers-reduced-motion congelando su
  animacion en un frame estatico en vez de desmontarse por completo.
```

---

## 9. Riesgos/deuda a documentar

1. Decision de producto no autorizada explicitamente en el ticket (la mas importante, ver seccion 2.2): retirar o no los 6 HeroBlob existentes del hero al agregar Silk. Mi recomendacion tecnica es retirarlos (evita apilar 2 fondos animados y viola design.md 1.3), pero el pedido original solo dice "agregar" — el leader/usuario debe confirmar esto antes de que el implementer toque esas 6 lineas, o el implementer debe preguntarlo explicitamente si no hay confirmacion previa en el hilo.
2. Contraste/legibilidad de Silk sobre el hero: el shader sale con alfa completo (no es una textura translucida per se); la opacidad del wrapper (seccion 5.1) es la unica salvaguarda de contraste — requiere verificacion visual manual (build mas captura de pantalla) antes de cerrar, no solo compilacion exitosa.
3. Cleanup de contexto WebGL de ogl (seccion 3.3): a diferencia de three.js, ogl no expone un dispose() de alto nivel — el cleanup depende de WEBGL_lose_context mas remocion manual del canvas del DOM. Probar explicitamente montaje/desmontaje repetido de Landing (navegacion ida y vuelta) para descartar fuga de contextos WebGL, dado el historial de bugs de timing de la pila WebGL anterior citado en el pedido.
4. Requisito de z-10 explicito en 6 elementos (seccion 2.3, puntos 1-6): es un cambio quirurgico pero disperso (wrapper hero mas 5 secciones) — alto riesgo de que el implementer olvide alguno y el grid termine tapando contenido o, peor, tapando el hero. El reviewer debe verificar los 6 puntos uno por uno contra este reporte, no solo "que compile".
5. ShapeGrid recortado (sin hover) es una desviacion deliberada del codigo fuente verbatim provisto en el pedido original — documentado aqui como decision explicita del explorer, no un olvido; si el usuario insiste en el hover interactivo, el codigo fuente para portarlo esta integro en el pedido original (funcion handleMouseMove/handleMouseLeave, simetrica a drawGrid por shape).
6. ResizeObserver en Silk vs window.resize en ShapeGrid: son dos mecanismos de resize distintos a proposito (Silk esta confinado al section del hero, ShapeGrid es fixed a viewport) — no unificar por consistencia superficial, cada uno responde a un contenedor de tamano distinto.
