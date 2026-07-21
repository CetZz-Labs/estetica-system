# Reporte de Exploracion - UX-37 (Landing publica -> Shear, Fase 2)

**Pregunta:** Inventariar Landing.tsx (secciones, react-bits/animacion por seccion, tokens legacy vigentes), mapear consumidores reales de los 11 componentes react-bits, confirmar aislamiento de motion/gsap/@gsap-react/ogl, y proponer fragmentado en sub-lotes con reemplazos de diseno.
**Contexto:** UX-37 - Rediseno Shear, Fase 2 (Landing publica), in_progress en feature_list.json.
**Timestamp:** 2026-07-21

## Hallazgos

### 1. Inventario de secciones - apps/client/src/views/Landing.tsx (759 lineas)

| Seccion | Lineas | react-bits / animacion | Tokens legacy |
|---|---|---|---|
| Imports + datos estaticos (featureColors, features, steps) | 1-104 | -- | -- |
| Guard de auth (useAuth, redirect a /dashboard si userId) -- logica no visual, no tocar | 106-132 | -- | bg-background text-foreground (loading state, linea 121) |
| Nav flotante (pill, scroll listener scrolled) + botones login/registro | 139-193 | motion.header, fadeIn variant | border-border/50, hover:bg-muted/50, hover:text-foreground, bg-primary |
| Menu mobile (overlay + drawer) | 196-228 | -- (solo transiciones CSS) | bg-card, border-border, bg-primary |
| HERO (badge, H1 con palabra animada, CTA, mockup) | 230-316 | ClickSpark (wrapper de seccion), Aurora (fondo, via ogl), ShinyText (badge), TextType (palabra rotativa simplifica/organiza/automatiza), motion.div/motion.h1 stagger | text-foreground, border-border/60, bg-primary |
| FEATURES header + HorizontalScrollFeatures (funcion aparte, 558-637) | 319-345 (header) + 558-637 (scroll horizontal con useScroll/useTransform) | GradientText (titulo), SpotlightCard (cada card de feature), motion.div (parallax horizontal atado a scroll vertical, h-300vh + sticky) | bg-gradient-to-b from-background via-card/50 to-background, text-foreground, border-border/40 |
| STATS/IMPACT (4 KPIs con contador) | 347-405 | CountUp (por cada stat), motion.div (whileInView + whileHover y:-6, lift prohibido) | bg-card, border-border/60, text-foreground, shadow-sm hover:shadow-xl |
| HOW IT WORKS (3 pasos, numero circular) | 407-473 | ShinyText (numero del paso), motion.div (whileInView, animate-ping en el ring pulsante) | text-foreground, bg-gradient-to-br from-primary, shadow-2xl shadow-primary/30 |
| CTA final | 475-526 | Aurora (fondo del bloque), StarBorder (boton Crear cuenta gratis), motion.section/motion.div stagger | bg-card, border-border/60, text-foreground, shadow-sm |
| FOOTER | 528-553 | motion.footer (fadeIn) | border-border/60, bg-card/50, hover:text-foreground |
| HorizontalScrollFeatures() (funcion separada, ver Features arriba) | 558-637 | GradientText, SpotlightCard | text-foreground, border-border/40 |
| HeroMockup() (mockup estatico de la app, sin motion propio, se monta dentro de un motion.div del padre) | 639-759 | Ninguno directo (2 motion.div para badges flotantes con delay) | text-foreground, border-border/60 y /40, shadow-lg/shadow-2xl, bg-primary/10, bg-warning/10 |

**Confirmacion de conteos vs. plan (plan_shear-redesign.md, seccion Hallazgos clave):** los numeros alli (bg-background 19, text-foreground 29, bg-card 7, bg-primary 12, text-primary 8, shadow- 15) estan desactualizados en un punto clave: bg-background real hoy es 2 (linea 121 y 140), no 19 -- probablemente el conteo viejo agrupaba bg-background/from-background/to-background (gradientes decorativos) bajo el mismo grep. text-foreground (29), bg-primary (12), text-primary (8) y shadow- (15) si coinciden con el archivo actual. No hay ningun uso de dark: en Landing.tsx hoy (grep de dark: da 0 resultados) -- el hallazgo del plan original (2 usos de dark: en Landing) quedo obsoleto: UX-32 ya los quito junto con ThemeToggle (confirmado tambien por ausencia de imports de ThemeToggle/useIsDark en el archivo).

**P13 (bg-muted + text-muted-foreground):** Landing.tsx usa bg-muted/50 tres veces (lineas 163, 173, 187, todas en hover de links de nav) pero nunca junto a text-muted-foreground (ese token no aparece ni una vez en el archivo) -- el gotcha P13 no aplica a Landing.tsx tal como esta hoy.

### 2. Mapa de dependencias react-bits -> consumidor

| Componente | Consumidor(es) real(es) |
|---|---|
| Aurora | Landing.tsx lineas 235 (fondo hero) y 492 (fondo CTA) |
| ClickSpark | Landing.tsx linea 231 (wrapper de toda la seccion hero) |
| CountUp | Landing.tsx linea 394 (cifra de cada stat card) |
| ShinyText | Landing.tsx lineas 251 (badge hero) y 443 (numero de paso How it works) |
| GradientText | Landing.tsx linea 332 (titulo de seccion Features) |
| StarBorder | Landing.tsx linea 503 (boton CTA final Crear cuenta gratis) |
| SpotlightCard | Landing.tsx linea 586 (dentro de HorizontalScrollFeatures, una por feature) |
| TextType | Landing.tsx linea 263 (palabra animada del H1) |
| GlareHover | Huerfano -- confirmado, cero imports en apps/client/src fuera de su propia carpeta |
| GlassIcons | Huerfano -- confirmado, cero imports en apps/client/src fuera de su propia carpeta |
| SplitText | Huerfano -- hallazgo nuevo, no mencionado como tal en el plan original (que solo listaba GlareHover/GlassIcons como huerfanos). Confirmado con grep dirigido: cero imports fuera de su propia carpeta. Usa gsap + gsap/ScrollTrigger + @gsap/react (useGSAP) -- es el unico consumidor de @gsap/react en todo el repo |

**Correccion al plan:** son 3 componentes huerfanos (no 2): GlareHover, GlassIcons, SplitText. Los 8 restantes son consumidos activamente por Landing.tsx, ninguno por otra vista.

### 3. Aislamiento de dependencias de animacion

Grep de imports de motion, gsap, @gsap/react, ogl en todo apps/client/src -- unicos hits:
- motion/react: Landing.tsx (linea 4), CountUp.tsx, ShinyText.tsx, GradientText.tsx -- todos dentro de Landing.tsx+react-bits/.
- gsap: TextType.tsx (consumido por Landing) y SplitText.tsx (huerfano).
- @gsap/react: solo SplitText.tsx (huerfano).
- ogl: solo Aurora.tsx (consumido por Landing).

Confirmado: cero consumidores fuera de Landing.tsx + components/react-bits/. Las 4 dependencias (motion, gsap, @gsap/react, ogl) quedan seguras para pnpm remove en el sub-lote de cierre, una vez eliminado react-bits/ completo (incluidos los 3 huerfanos, que tambien deben borrarse aunque no bloqueen el build -- son codigo muerto y siguen usando las libs a eliminar).

Versiones en apps/client/package.json: motion ^12.40.0, gsap ^3.15.0, @gsap/react ^2.1.2, ogl ^1.0.11 (coincide con el plan).

### 4. Propuesta de fragmentado en sub-lotes (menos de 400 lineas c/u, matriz de escalado CLAUDE.md, transversal)

Landing.tsx tiene 759 lineas + 8 componentes react-bits activos a retirar; un solo diff seria inmanejable. Propongo 4 sub-lotes secuenciales, cada uno con su propio implementer -> build verde antes de avanzar al siguiente (Landing.tsx solo puede tener un dueno a la vez, asi que son secuenciales, no paralelos):

**Sub-lote A -- Nav + Hero (lineas 106-316 + HeroMockup 639-759)**
- Quitar ClickSpark (era decorativo, sin equivalente semantico -- se retira sin reemplazo).
- Aurora (fondo hero, ogl) -> fondo estatico bg-bg plano, o a lo sumo un tinte muy sutil bg-rose-bg/bg-surface sin gradiente ni animacion (design.md 1.1 y la lista Que NO hacer prohiben gradientes decorativos).
- ShinyText (badge CRM para centros de estetica) -> badge estatico con texto text-wine/text-accent sobre bg-rose-bg, pill radio 99px (7.9, patron de chip).
- TextType (palabra rotativa simplifica/organiza/automatiza) -> decision de diseno: reemplazar por una sola palabra fija (ej. simplifica) en text-accent con tipografia serif -- design.md no define micro-interacciones de texto tipeado y el catalogo de animaciones permitidas (13) es taxativo (fade/opacity, nada de efectos de maquina de escribir).
- Nav flotante (pill con backdrop-blur + shadow-lg al hacer scroll) -> simplificar a topbar fijo sin blur/sombra: bg-surface solido, borde inferior border-border (mismo lenguaje que el topbar de la app autenticada, 6.2), sin transicion de pill -- la logica scrolled/useEffect de scroll puede conservarse si se decide mantener un borde/fondo que aparece al hacer scroll, pero sin sombra.
- HeroMockup: remapeo directo de tokens (bg-card a bg-surface, border-border/* a border-border, text-foreground a text-text, shadow-2xl/shadow-lg sin sombra o con borde), sin logica a preservar (JSX puramente decorativo).
- Botones CTA (Prueba gratis, Ver funcionalidades) -> patron 7.2 (primario bg-accent, secundario borde dotted texto wine), sin hover:shadow ni translate-x en el icono de flecha (quitar group-hover:translate-x-0.5, es un micro-lift).

**Sub-lote B -- Features + Stats (lineas 318-473, incluye HorizontalScrollFeatures 558-637)**
- GradientText (titulo Todo lo que necesitas) -> titulo serif estatico en text-wine o text-text, sin animacion de gradiente (prohibido por 1.1 y la lista Que NO hacer).
- SpotlightCard (cards de feature con spotlight que sigue el mouse) -> tarjeta generica 7.3 (bg-surface, border-border, radio 14px, sin sombra, sin spotlight/glow).
- El patron de scroll horizontal atado a scroll vertical (useScroll/useTransform, h-300vh, sticky) es la pieza mas compleja de migrar -- es una dependencia dura de motion/react. Reemplazo recomendado: grid estatico repeat(auto-fit, minmax(280px,1fr)) (mismo patron de grillas de card que design.md 6.3 usa para el resto de la app), sin scroll-jacking. Esto es un cambio de estructura, no solo de estilos -- documentarlo explicitamente en el impl_*.md para que el reviewer no lo interprete como scope creep.
- CountUp (contador animado de KPIs) -> cifra estatica en Cormorant 34px (mismo patron que KPI card 7.4), sin animacion de conteo (design.md no define counters animados; 13 es taxativo).
- whileHover con y:-6 en las stat cards -> eliminar (lift explicitamente prohibido 5/13).

**Sub-lote C -- How it works + CTA + Footer (lineas 407-553)**
- ShinyText (numero de paso) -> numero estatico serif grande en text-wine/text-accent, sin shine.
- animate-ping (ring pulsante alrededor del numero de paso) -> eliminar (no esta en el catalogo de animaciones permitidas 13; es un efecto decorativo tipo elevacion/pulso).
- Aurora (fondo CTA) -> igual que sub-lote A, fondo wine solido (aprovechando que el CTA final es un buen candidato para el unico bloque wine por vista, 1.3/7.5, coherente con el resto de la app) en vez de gradiente/aurora animada.
- StarBorder (borde animado del boton CTA) -> boton primario estandar 7.2 (bg-accent o blanco sobre fondo wine, sin borde animado).
- Footer: solo remapeo de tokens, sin componentes react-bits ni motion.
- motion.section/motion.div/motion.footer (fadeIn/stagger al hacer scroll) en estas 3 secciones -> si se preserva algun fade-in, usar CSS puro (transition de opacity + IntersectionObserver liviano) en vez de Framer Motion -- pero dado que design.md 13 solo permite fade/opacity sutil y no exige animaciones de entrada por scroll, la opcion mas simple y alineada es eliminarlas sin reemplazo.

**Sub-lote D -- Limpieza final (deps + react-bits/ + verificacion)**
- Borrar apps/client/src/components/react-bits/ completo (11 carpetas, incluidos los 3 huerfanos GlareHover/GlassIcons/SplitText).
- pnpm remove motion gsap @gsap/react ogl en apps/client/ (una vez confirmado con grep que sub-lotes A-C ya no importan nada de react-bits/ ni de esas libs).
- Grep de cierre: grep de react-bits en apps/client/src debe dar 0, grep de imports motion/gsap/ogl en apps/client/src debe dar 0.
- pnpm --filter @estetica/client build + lint -> exit 0.
- Repaso rapido (no migracion completa) de AceptarInvitacion.tsx -- ver Riesgos abajo.

## Diagnostico

Landing.tsx es una landing efectista (parallax de scroll, contadores, texto tipeado, auroras, spotlight, glow-on-hover) construida sobre 8 de los 11 componentes react-bits y consumo directo de Framer Motion; todo eso choca frontalmente con la filosofia Shear (1, 13, la lista Que NO hacer: sin gradientes, sin lift, sin sombras de card, animaciones solo fade/opacity sutil). El hallazgo mas relevante para el implementer es que 3 componentes react-bits son huerfanos (no 2 como decia el plan original: se suma SplitText, unico consumidor restante de @gsap/react), y que bg-background real en Landing.tsx es 2 usos, no 19 -- el resto de conteos del plan siguen vigentes. El gotcha P13 no aplica a Landing.tsx (no hay combinacion bg-muted+text-muted-foreground), y dark:/ThemeToggle ya fueron removidos en UX-32, asi que ese punto del plan original quedo obsoleto y no requiere trabajo adicional. La pieza tecnicamente mas riesgosa es el scroll horizontal atado a scroll vertical de HorizontalScrollFeatures (depende de useScroll/useTransform de Framer Motion) -- su reemplazo por un grid estatico es un cambio estructural, no solo de tokens, y debe documentarse explicitamente para evitar friccion con el reviewer.

## Recomendacion

Ejecutar los 4 sub-lotes en orden estrictamente secuencial (A, B, C, D), cada uno como impl_UX-37-A.md hasta impl_UX-37-D.md con su propio ciclo build-reviewer antes de avanzar al siguiente, priorizando en el sub-lote A la decision de reemplazo del hero (fondo estatico + palabra fija) porque fija el tono visual del resto de la migracion.

## Riesgos / decisiones a documentar para el implementer

1. Logica no-visual a preservar intacta, sin tocar: el guard de auth (useAuth, chequeo de isLoaded, redirect a /dashboard si hay userId, lineas 106-132) y todos los Link/href de navegacion (rutas /login, /registro, anchors #funcionalidades y #como-funciona). El estado mobileMenuOpen (drawer mobile) y su logica de apertura/cierre tambien se preserva funcionalmente, solo cambia el styling.
2. AceptarInvitacion.tsx NO esta en el alcance formal de UX-37 -- los acceptance_criteria de feature_list.json solo nombran views/Landing.tsx, components/react-bits/ y las 4 deps. El archivo sigue usando tokens legacy via el bridge de UX-31 (bg-background, text-foreground, bg-card, border-border, bg-primary, text-destructive) y compila sin problema porque el bridge sigue activo hasta UX-35. No comparte componentes react-bits ni motion con Landing (ya se le quito ThemeToggle en UX-32). Su migracion completa a Shear queda en UX-34 (ya listada ahi explicitamente). Recomendacion: no tocarlo en UX-37 salvo que el usuario lo pida explicitamente.
3. El bridge de tokens legacy (color-primary, color-card, etc.) sigue vivo hasta UX-35 -- Landing.tsx puede compilar con clases viejas o nuevas indistintamente durante la migracion; no hay urgencia de romper nada, pero el acceptance criteria de UX-37 exige cero uso de bg-background/bg-card/text-foreground/text-muted-foreground/bg-primary/bg-muted al cerrar -- el reviewer debe grepear Landing.tsx especificamente (no todo src/, que ya esta migrado salvo Landing).
4. Scroll horizontal de Features es la pieza de mayor riesgo de regresion de contenido: al aplanar a grid estatico se pierde el efecto sticky con scroll-jack, pero se preserva el contenido (6 features con icono, titulo, descripcion, stat). Confirmar con el usuario si el copy/orden de las 6 features debe preservarse tal cual (recomendado, ya que no es parte del rediseno visual sino del contenido funcional).
5. ClickSpark, animate-ping, whileHover con y:-6, StarBorder no tienen ningun equivalente semantico obligatorio -- se eliminan sin reemplazo funcional, solo decorativo, consistente con design.md 13 (cualquier transicion no listada debe proponerse antes de implementarse, y la lista permitida es acotada a fade/opacity/background-color/color).
6. El boton Comenzar gratis / Prueba gratis usa rounded-full (pill) en vez del radio 10px de botones 7.2 -- decision de diseno a tomar: mantener pill (coherente con estetica moderna pero fuera de spec) vs. migrar a radio 10px estandar de design.md (recomendado para consistencia estricta con el resto de la app, ya que design.md no define una excepcion de boton pill para CTAs de marketing).
