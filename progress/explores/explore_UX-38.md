# Reporte de Exploracion — UX-38 (Landing publica, capa de animacion vistosa)

**Pregunta:** Mapear cada seccion de Landing.tsx con un plan concreto de animacion motion (o "ninguna"), validar compatibilidad tecnica (React Compiler/ESLint) y confirmar que checkpoints/patrones aplican.
**Contexto:** UX-38 (in_progress en feature_list.json), excepcion documentada en docs/design.md parrafo 13.1.
**Timestamp:** 2026-07-21

## Hallazgos

1. apps/client/src/views/Landing.tsx:1-417 (vista) + :419-529 (HeroMockup): archivo de 529 lineas (no 759, esa cifra corresponde a la version pre-UX-37 descripta en feature_list.json:617). Secciones identificadas por bloque de comentario:
   - :110-152 Header/nav sticky.
   - :155-187 Mobile menu overlay (drawer).
   - :190-241 Hero (headline + CTAs + HeroMockup).
   - :244-288 Features (grid estatico de 6 cards, :260-287).
   - :291-323 Stats/Impact (4 cards con numero).
   - :326-365 Como funciona (3 steps con circulo de numero, alternando lado).
   - :367-394 CTA final, unico bloque bg-wine solido de la pagina (comentario explicito en :367 referencia 1.3/7.5).
   - :397-414 Footer.
   - :420-529 HeroMockup (mockup CSS del hero, con 2 badges flotantes ya posicionados absolute en :504 y :516).

2. docs/design.md:459-496 (parrafo 13/13.1): tabla de transiciones minimas (hover opacity, sin translateY/box-shadow) rige el resto de la app; 13.1 abre la excepcion solo para views/Landing.tsx y sus componentes propios (incluye HeroMockup, definido en el mismo archivo). Permite: loop continuo en hero (float/parallax liviano/formas decorativas lentas), whileInView con fade+slide corto y stagger en Features, micro-hover con scale/translate leve limitado a Landing. Sigue prohibido: gradientes, box-shadow de card, mas de un bloque wine solido (la CTA final en :370 ya es ese unico bloque, no debe agregarse otro fondo wine solido en ninguna otra seccion), modo oscuro, colores/fuentes fuera de 2/14. Mandato de accesibilidad: respetar prefers-reduced-motion: reduce.

3. docs/design.md:1-42 (parrafo 1, filosofia): puntos 1 (limpio y respirado, sin gradientes/bordes gruesos) y 3 (maximo 1-2 fondos por vista, wine una sola vez) aplican como limite superior incluso con la excepcion, la Landing debe seguir leyendose como Shear, solo mas viva (texto literal de 13.1).

4. apps/client/vite.config.ts:1-14: React Compiler NO esta activo. El plugin babel-plugin-react-compiler figura en package.json:42 como devDependency, pero en vite.config.ts:3-4,11 el import de reactCompilerPreset/@rolldown/plugin-babel y la linea que lo activa estan comentados. Solo corre @vitejs/plugin-react sin preset de compiler. Esto reduce el riesgo de conflicto (no hay memoizacion automatica que pueda congelar MotionValues de motion o refs mutables de useScroll/useTransform), pero tambien significa que si el implementer asumiera que el compiler esta activo se equivocaria, debe tratar el componente como React clasico (sin auto-memo).

5. apps/client/eslint.config.js:1-22: usa reactHooks.configs.flat.recommended (eslint-plugin-react-hooks 7.1.1). Desde la v6+, este preset recommended empaqueta tambien reglas de auditoria de React Compiler (deteccion de patrones inseguros para compilacion, aunque el compiler este apagado). Riesgo conocido: si motion se usa con useScroll/useTransform/useSpring y se mutan/reasignan MotionValues fuera del ciclo de render esperado, o si se guardan en variables let en vez de useRef, el linter puede marcar violaciones de reglas de hooks o de las reglas de compiler-safety. Mitigacion: mantener los hooks de motion (useScroll, useTransform) en el nivel superior del componente, sin condicionales, y no asignar sus retornos a variables mutables fuera de refs, patron estandar de la libreria, no requiere codigo especial.

6. CHECKPOINTS.md:57-58 (Transversal): "Sin Contaminacion de Dependencias: No hay modificaciones a package.json raiz sin aprobacion" — esto es sobre el package.json de la raiz del monorepo, no sobre apps/client/package.json. Agregar motion a apps/client/package.json esta expresamente aprobado por feature_list.json:635 y docs/design.md 13.1, no viola este checkpoint.

7. docs/patterns-frontend.md: no tiene ningun patron especifico de animacion/Landing/motion (unica mencion de "animate" es animate-pulse de skeletons, :147-152, no relacionada). No hay patron previo que reutilizar para esta feature, es terreno nuevo, gobernado unicamente por design.md 13.1.

8. feature_list.json:617 (historia de UX-37, contexto): confirma que motion, gsap+@gsap/react y ogl fueron desinstaladas en UX-37 junto con components/react-bits/. UX-38 reinstala solo motion (no gsap/ogl), el acceptance criteria de feature_list.json:635 es explicito: "unica nueva dependencia, sin gsap/ogl/react-bits".

## Diagnostico

El archivo tiene 8 zonas claras; el riesgo de romper Shear esta concentrado en no exceder el unico bloque wine (CTA final, :370) y en no reintroducir sombras/gradientes al animar. Tecnicamente no hay conflicto real con React Compiler porque esta inactivo en este proyecto (vite.config.ts lo tiene comentado); el unico riesgo latente es de lint (eslint-plugin-react-hooks recommended incluye reglas de compiler-safety) si los hooks de motion (useScroll/useTransform) se usan fuera del patron estandar de nivel superior sin condicionales. No existe patron previo en patterns-frontend.md para animacion, es una excepcion puntual y acotada a Landing.tsx.

## Plan de puntos de animacion por seccion (para el implementer)

- Header/nav (:110-152): NINGUNA animacion vistosa nueva. Mantener transicion de color existente (transition-colors). Es parte de la capa persistente de la app, no del contenido de marketing.
- Mobile menu overlay (:155-187): NINGUNA animacion vistosa nueva (fuera de alcance explicito del punto 6 de la tarea del leader). Puede quedar con transicion minima ya existente (transform transition-transform en :158), sin tocar.
- Hero (:190-241): aplica excepcion de movimiento continuo/loop: envolver HeroMockup (o su contenedor :236-238) en motion.div con animate={{ y: [0, -10, 0] }} + transition={{ duration: X, repeat: Infinity, ease: easeInOut }} (float sutil). Opcional: motion.span en el badge superior (:195-197) con fade-in de entrada (initial/animate una sola vez, no loop). Nada de parallax atado a mouse (no mencionado en criterios, evitar sobre-alcance).
- HeroMockup (:420-529): los 2 badges flotantes (:504-514 y :516-526) son candidatos ideales para el float loop (animate={{ y: [0,-6,0] }}, offsets de duracion/retraso distintos entre ambos para que no se muevan en sincronia, ej. transition={{ duration: 3, repeat: Infinity }} vs duration 4 con delay 0.5).
- Features (:244-288): reveal progresivo obligatorio: motion.div por card (:266-283) con initial={{ opacity:0, y: 20 }}, whileInView={{ opacity:1, y:0 }}, viewport={{ once:true, amount:0.3 }}, stagger via variants+staggerChildren en el contenedor grid (:261) o transition={{ delay: i * 0.08 }} por indice. Micro-hover opcional: whileHover={{ scale: 1.02 }} (permitido explicitamente por 13.1, leve).
- Stats (:291-323): reveal similar a Features pero mas sutil (fade+slide corto, sin stagger tan marcado, o stagger mas rapido). Opcional: animacion de conteo del numero (useMotionValue/animate incremental) para el stat.number en :313-315, coherente con "mas dinamismo en general", no mencionado explicitamente en acceptance criteria pero cabe dentro del punto de animaciones adicionales coherentes.
- Como funciona (:326-365): whileInView fade+slide por step (:341-360), alternando direccion de entrada segun el flex-row-reverse ya existente (i % 2) para reforzar el zig-zag (entra desde la izquierda o derecha segun el lado).
- CTA final (:367-394): animacion sutil de entrada (whileInView fade+slide) al bloque wine completo, sin animar el color/fondo en si (no tocar el wine, solo su aparicion). No agregar un segundo bloque wine en ninguna otra seccion para compensar dinamismo, violaria el punto 3 de la filosofia (1) y 13.1.
- Footer (:397-414): NINGUNA animacion vistosa. Confirmado como fuera de alcance por el leader (punto 6).

## Recomendacion

El implementer debe: (1) agregar motion unicamente a apps/client/package.json, (2) aplicar los puntos de animacion listados arriba exclusivamente dentro de Landing.tsx (incluye HeroMockup), (3) envolver todo uso de loops/parallax con una comprobacion de prefers-reduced-motion (ej. hook useReducedMotion de motion/react para condicionar animate/transition a estatico cuando el usuario lo prefiere), y (4) NO tocar header/nav/mobile-menu/footer ni ningun archivo fuera de Landing.tsx/package.json. Verificar al cierre que sigue existiendo un unico bloque bg-wine solido en toda la pagina (CTA final) y correr pnpm --filter @estetica/client build + lint (riesgo bajo dado que React Compiler esta inactivo, pero el preset eslint-plugin-react-hooks recommended puede senalar mal uso de useScroll/useTransform si no se siguen las reglas estandar de hooks).
