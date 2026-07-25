import { useAuth } from '@clerk/react';
import { Navigate, Link } from 'react-router';
import { useRef, useState } from 'react';
import type { ReactNode } from 'react';
import {
    motion, useReducedMotion, useScroll, useSpring,
    useMotionValue, useMotionValueEvent, animate
} from 'motion/react';
import type { Variants } from 'motion/react';
import {
    FiUsers, FiScissors, FiBox, FiCalendar, FiActivity, FiCheckCircle,
    FiArrowRight, FiMenu, FiX, FiTrendingUp,
    FiShield, FiSmartphone
} from 'react-icons/fi';
import {
    PiUsersThreeDuotone, PiTrendUpDuotone, PiClockDuotone, PiStackDuotone, PiChartBarDuotone,
} from 'react-icons/pi';
import type { IconType } from 'react-icons';
import AnimatedStatIcon from '../components/landing/StatIcons';
import type { StatIconAnimation } from '../components/landing/StatIcons';

// Variant de reveal reutilizada en Stats (§13.1) y ahora también en Features (ver
// `featureCardReveal` — UX-45-fix, punto 1). Función (no objeto fijo) para que cada card de
// `AnimatedStat` calcule su propia variante según `prefersReducedMotion` (UX-45-D: gap detectado
// en la auditoría final — el objeto original no tenía rama de reduced-motion, a diferencia de
// `heroTitleWord`/`featureCardReveal`, que sí la tienen).
const fadeSlideUpShort = (prefersReducedMotion: boolean): Variants => (
    prefersReducedMotion
        ? { hidden: { opacity: 1, y: 0 }, visible: { opacity: 1, y: 0 } }
        : {
            hidden: { opacity: 0, y: 12 },
            visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: 'easeOut' } },
        }
);

const statsContainer: Variants = {
    hidden: {},
    visible: { transition: { staggerChildren: 0.05 } },
};

// Reveal de Features (UX-45-fix, punto 1): reemplaza el reveal por `clipPath` de la ronda B
// (`inset(100% 0 0 0)` → `inset(0 0 0 0)`), que dejaba las cards permanentemente invisibles en
// producción — el `whileInView` nunca llegaba a interpolar el clip y las cards quedaban
// clippeadas a cero-altura + `opacity: 0`, ocupando su celda del grid sin pintar nada (la
// sección se veía en blanco). Se reemplaza por el mismo patrón `opacity`+`y` ya probado con
// éxito en Stats/CTA/footer/"Cómo funciona" de este archivo — fade + slide vertical con stagger
// por card (delay según posición en la fila de 3), visualmente distinto tanto del clip-path roto
// como del reveal "mazo de cartas" vetado de UX-39 (rotateX/scale/rotate + perspective): acá no
// hay rotación ni perspectiva 3D, solo desplazamiento vertical + fade. Con prefersReducedMotion,
// no se pasan props de animación: la card queda en su estado final visible sin transición.
const featureCardReveal = (i: number, prefersReducedMotion: boolean) => ({
    initial: prefersReducedMotion ? false : { opacity: 0, y: 28 },
    whileInView: prefersReducedMotion ? undefined : { opacity: 1, y: 0 },
    transition: { duration: 0.55, ease: [0.16, 1, 0.3, 1] as const, delay: (i % 3) * 0.12 },
});

// Franja de confianza tipo cinta (UX-45-B): las 6 features reales de la app (mismo copy que
// `features` abajo, en una sola palabra) con punto de color sólido rotando entre los 4 tokens
// de marca — mismo patrón de punto de color que usa la app en nav/agenda/servicios (§4/§7.1 de
// design.md), no el tinte de fondo usado para los íconos de las cards.
const marqueeWords = ['Clientes', 'Servicios', 'Inventario', 'Turnos', 'Visitas', 'Dashboard'];
const marqueeDotColors = ['bg-accent', 'bg-sage', 'bg-gold', 'bg-wine'];

// Textura de puntos del CTA final (UX-45-D): SVG de puntos repetido vía `background-image`, no
// un degradé — no cae bajo la prohibición de `linear-gradient`/`radial-gradient`/
// `conic-gradient`/`bg-gradient-*` de §13.1 (no codifica una transición de color). Puntos blancos
// a baja opacidad, superpuestos sobre el bloque `bg-wine`.
const ctaDotPatternUrl = 'url("data:image/svg+xml,%3Csvg width=\'24\' height=\'24\' viewBox=\'0 0 24 24\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Ccircle cx=\'2\' cy=\'2\' r=\'1.4\' fill=\'white\' fill-opacity=\'0.6\'/%3E%3C/svg%3E")';

// Trazo serpenteante de la línea de "Cómo funciona" (UX-45-fix2, punto 3): curva tipo "S"
// repetida verticalmente con `Q` (quadratic Bézier) en un viewBox angosto (40 de ancho, 600 de
// alto) — con `preserveAspectRatio="none"` el `<svg>` estira el path para llenar el contenedor
// real (`top-10 bottom-10` del wrapper de pasos), sin importar su alto final en píxeles. Igual
// que la línea recta que reemplaza, funciona como columna vertebral narrativa (no un conector
// literal círculo-a-círculo, ver nota junto al JSX).
const howItWorksPathD = 'M20 0 Q40 75 20 150 Q0 225 20 300 Q40 375 20 450 Q0 525 20 600';

// Rotación de tinte determinística (§7.10) para íconos de Features/Stats: rose → sage → gold → wine.
const sectionTints = [
    { bg: 'bg-rose-bg', text: 'text-accent' },
    { bg: 'bg-sage-bg', text: 'text-sage' },
    { bg: 'bg-gold-bg', text: 'text-gold' },
    { bg: 'bg-wine-bg', text: 'text-wine' },
];

// ── HERO (UX-45-A) ──
// Título con reveal por palabra: split manual en tokens (en vez de gsap SplitText, ya
// descartado con toda la pila WebGL/GSAP). "simplifica" queda como token especial para
// conservar el subrayado SVG existente como una sola unidad animada.
const heroTitleWords: { text: string; accent?: boolean }[] = [
    { text: 'El' }, { text: 'sistema' }, { text: 'que' },
    { text: 'simplifica', accent: true },
    { text: 'tu' }, { text: 'centro' }, { text: 'de' }, { text: 'estética' },
];

const heroTitleContainer = (prefersReducedMotion: boolean): Variants => (
    prefersReducedMotion
        ? { hidden: { opacity: 1 }, visible: { opacity: 1 } }
        : { hidden: {}, visible: { transition: { staggerChildren: 0.06 } } }
);

const heroTitleWord = (prefersReducedMotion: boolean): Variants => (
    prefersReducedMotion
        ? { hidden: { opacity: 1, y: 0 }, visible: { opacity: 1, y: 0 } }
        : {
            hidden: { opacity: 0, y: 20 },
            visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] as const } },
        }
);

// Mini tarjetas de estadística que reemplazan el HeroMockup (mismo copy que ya existía en
// los badges flotantes/Stats, sin inventar datos nuevos del producto).
// Íconos de `react-icons/pi` (Phosphor Duotone) con loop perpetuo (UX-45-fix2, punto 1) en vez
// de los SVG a medida de la ronda anterior — alcance acotado a estas 3 tarjetas del hero y a
// Stats/"Impacto" más abajo; Funcionalidades no se toca (sigue con react-icons/fi). Wrapper de
// animación reutilizable en `components/landing/StatIcons.tsx` (`AnimatedStatIcon`).
const heroStatCards: { icon: IconType; value: string; label: string; tint: typeof sectionTints[number]; animation: StatIconAnimation }[] = [
    { icon: PiUsersThreeDuotone, value: '128', label: 'Clientes activos', tint: sectionTints[0], animation: 'pulse' },
    { icon: PiTrendUpDuotone, value: '+40%', label: 'Más eficiencia', tint: sectionTints[1], animation: 'float' },
    { icon: PiClockDuotone, value: '5 min', label: 'Setup inicial', tint: sectionTints[2], animation: 'rotate' },
];

const features = [
    {
        icon: FiUsers,
        title: 'Gestión de Clientes',
        description: 'Registra, busca y administra tus clientes con un solo clic. Accede al historial completo de visitas, notas médicas y datos de contacto.',
        featured: true,
        stat: '128 clientes activos',
        colorKey: 'primary' as const,
    },
    {
        icon: FiScissors,
        title: 'Catálogo de Servicios',
        description: 'Define servicios con duración y retoque. El sistema calcula automáticamente las próximas citas de mantenimiento.',
        featured: false,
        colorKey: 'ring' as const,
    },
    {
        icon: FiBox,
        title: 'Control de Inventario',
        description: 'Controla tu stock con alertas visuales de productos bajos o agotados. Carga masiva desde Excel y descuento automático.',
        featured: false,
        colorKey: 'warning' as const,
    },
    {
        icon: FiCalendar,
        title: 'Agenda de Turnos',
        description: 'Calendario visual con drag & drop. Convierte turnos completados en visitas registradas con un clic.',
        featured: false,
        colorKey: 'accent' as const,
    },
    {
        icon: FiCheckCircle,
        title: 'Registro de Visitas',
        description: 'Registra servicios con consumibles en segundos. El stock se descuenta al instante y los retoques se programan solos.',
        featured: false,
        colorKey: 'ring' as const,
    },
    {
        icon: FiActivity,
        title: 'Dashboard Inteligente',
        description: 'KPIs en tiempo real, próximos retoques con indicadores de urgencia y alertas de turnos pendientes. Todo en un panel.',
        featured: true,
        stat: '30% más rápido en decisiones',
        colorKey: 'primary' as const,
    }
];

const steps = [
    {
        number: '01',
        title: 'Registra tu negocio',
        description: 'Crea tu cuenta en segundos con Google o email. Configura el nombre de tu centro y empieza a operar.'
    },
    {
        number: '02',
        title: 'Carga clientes y servicios',
        description: 'Importa tus datos o créalos desde cero. Define servicios con duración y frecuencia de retoque.'
    },
    {
        number: '03',
        title: 'Opera y haz crecer',
        description: 'Gestiona turnos, registra visitas, controla inventario y mira crecer tu negocio con reportes inteligentes.'
    }
];

export default function Landing() {
    const { isLoaded, userId } = useAuth();
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const prefersReducedMotion = useReducedMotion();

    // Blobs de fondo del hero (§13.1, UX-45): sin parallax ligado a scroll (retirado en
    // UX-45-fix2, punto 2 — confirmado explícitamente por el usuario tras pregunta directa).
    // Quedan estáticos en su posición de fondo; el único movimiento es el drift+opacidad+escala
    // infinito de `HeroBlob` (ver componente más abajo). El fondo decorativo ahora vive en un
    // `<div>` wrapper compartido que envuelve `<section>` del hero + `<TrustMarquee />` (ver
    // JSX más abajo), sin necesidad de ningún hook nuevo acá, para que el área con blur se
    // extienda también detrás del marquee en vez de cortarse en el borde inferior del hero.

    // Línea de progreso de "Cómo funciona" (UX-45-C): esta sección NO está detrás de ningún
    // `return` condicional (a diferencia del hero, que si lo tenía cuando usaba `useScroll()`
    // global para el parallax ya retirado), así que `useScroll({ target })` es seguro acá — el
    // ref se hidrata en el primer render real. Offset `['start end', 'end start']` recorre 0→1
    // mientras la sección atraviesa completamente el viewport (entra por abajo, termina de salir
    // por arriba).
    const howItWorksRef = useRef<HTMLElement>(null);
    const { scrollYProgress: howItWorksProgress } = useScroll({
        target: howItWorksRef,
        offset: ['start end', 'end start'],
    });

    if (!isLoaded) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-bg text-text font-sans">
                <div className="text-center">
                    <img src="/shear-logo.png" alt="Shear" className="h-20 w-auto mx-auto" />
                    <p className="text-sm text-muted mt-2">Cargando...</p>
                </div>
            </div>
        );
    }

    if (userId) {
        return <Navigate to="/dashboard" replace />;
    }

    const navLinks = [
        { label: 'Funcionalidades', href: '#funcionalidades' },
        { label: 'Cómo funciona', href: '#como-funciona' },
    ];

    return (
        <div className="min-h-screen bg-bg text-text font-sans">
            {/* ── NAV ── */}
            <header className="sticky top-0 z-50 bg-surface border-b border-border">
                <nav className="max-w-7xl mx-auto flex items-center justify-between h-16 px-4 sm:px-6 lg:px-8">
                    <Link to="/" className="flex items-center gap-2 no-underline shrink-0">
                        <img src="/shear-logo.png" alt="Shear" className="h-9 w-auto" />
                    </Link>

                    <div className="hidden md:flex items-center gap-1">
                        {navLinks.map(link => (
                            <a
                                key={link.href}
                                href={link.href}
                                className="px-4 py-2 text-sm font-medium text-text-3 hover:text-text hover:bg-hover-soft rounded-ctrl transition-colors no-underline"
                            >
                                {link.label}
                            </a>
                        ))}
                    </div>

                    <div className="hidden md:flex items-center gap-2">
                        <Link
                            to="/login"
                            className="px-4 py-2 text-sm font-medium text-text-3 hover:text-text hover:bg-hover-soft rounded-ctrl transition-colors no-underline"
                        >
                            Iniciar sesión
                        </Link>
                        <Link
                            to="/registro"
                            className="bg-accent hover:opacity-90 text-white px-5 py-2 rounded-ctrl text-sm font-semibold flex items-center gap-1.5 transition-opacity no-underline"
                        >
                            Comenzar gratis <FiArrowRight size={14} />
                        </Link>
                    </div>

                    <button
                        type="button"
                        onClick={() => setMobileMenuOpen(true)}
                        className="md:hidden p-2 text-text-3 hover:text-text hover:bg-hover-soft rounded-ctrl transition-colors cursor-pointer"
                        aria-label="Abrir menú"
                    >
                        <FiMenu size={20} />
                    </button>
                </nav>
            </header>

            {/* Mobile menu overlay */}
            {mobileMenuOpen && (
                <div className="fixed inset-0 z-50 md:hidden">
                    <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setMobileMenuOpen(false)} />
                    <div className="absolute top-0 right-0 bottom-0 w-72 bg-surface border-l border-border p-6 transform transition-transform">
                        <div className="flex items-center justify-between mb-8">
                            <span className="text-xl font-serif font-bold tracking-wide text-text">Shear</span>
                            <button type="button" onClick={() => setMobileMenuOpen(false)} className="p-2 text-text-3 hover:text-text cursor-pointer" aria-label="Cerrar menú">
                                <FiX size={24} />
                            </button>
                        </div>
                        <nav className="flex flex-col gap-4">
                            {navLinks.map(link => (
                                <a key={link.href} href={link.href} onClick={() => setMobileMenuOpen(false)}
                                    className="text-sm font-medium text-text-3 hover:text-text transition-colors py-2 no-underline"
                                >
                                    {link.label}
                                </a>
                            ))}
                            <hr className="border-border my-4" />
                            <Link to="/login" onClick={() => setMobileMenuOpen(false)}
                                className="text-sm font-medium text-text-3 hover:text-text py-2 no-underline"
                            >
                                Iniciar sesión
                            </Link>
                            <Link to="/registro" onClick={() => setMobileMenuOpen(false)}
                                className="bg-accent hover:opacity-90 text-white px-5 py-3 rounded-ctrl text-sm font-semibold flex items-center justify-center gap-2 transition-opacity no-underline"
                            >
                                Comenzar gratis <FiArrowRight size={16} />
                            </Link>
                        </nav>
                    </div>
                </div>
            )}

            {/* ── HERO + FRANJA DE CONFIANZA: wrapper compartido de fondo decorativo (UX-45-fix2,
                punto 2) ── */}
            {/* Antes los 6 blobs vivían dentro del `<section>` del hero, con su propio
                `overflow-hidden` recortando el blur justo en el borde inferior de esa sección.
                El usuario pidió que el área decorativa se extienda también detrás de
                `<TrustMarquee />` (la franja que sigue inmediatamente después) en vez de
                cortarse ahí. Solución elegida (la más simple/auditable de las evaluadas): un
                `<div>` contenedor que envuelve `<section>` (hero) + `<TrustMarquee />`, con el
                `relative overflow-hidden bg-bg` que antes tenía el `<section>` solo — los 6
                blobs pasan a ser hijos directos de este wrapper (mismo `position: absolute`,
                mismas clases de posición) en vez de hijos del `<section>`, así su `blur-3xl`
                alcanza visualmente el área de `TrustMarquee`. Los blobs con offsets negativos
                de "bottom" (ej. `-bottom-16`, `-bottom-24`) ahora anclan contra el borde inferior
                de este wrapper más alto (hero + marquee), por lo que su blur queda situado
                naturalmente sobre/detrás de la franja en vez de solo asomar en el borde del
                hero. `TrustMarquee` baja su opacidad de fondo (`bg-surface/90` en vez de
                `bg-surface` opaco) para que ese bleed sea visible sin sacrificar la legibilidad
                del texto de la cinta (ver componente `TrustMarquee` más abajo). */}
            <div className="relative overflow-hidden bg-bg">
                {/* Fondo decorativo: 6 formas sólidas con blur + mix-blend-mode (§13.1/UX-39).
                    UX-45-fix2 punto 2: drift de posición + variación de opacidad y escala en el
                    mismo loop infinito (antes solo posición) — bastante más dramático que la
                    ronda anterior — y SIN parallax ligado a scroll (retirado explícitamente,
                    confirmado con el usuario): los blobs quedan estáticos en su posición de
                    fondo, sin desplazarse al hacer scroll. Puramente decorativo: aria-hidden +
                    pointer-events-none. El contenido vive en contenedores `relative z-10` por
                    encima de estos blobs (`z-0`), así que su posición no compite nunca con el
                    texto. */}
                <HeroBlob
                    positionClassName="w-72 h-72 sm:w-[28rem] sm:h-[28rem] -top-24 -left-20"
                    colorClassName="bg-wine"
                    driftX={[0, 36]}
                    driftY={[0, -24]}
                    duration={5}
                    delay={0}
                    prefersReducedMotion={!!prefersReducedMotion}
                />
                <HeroBlob
                    positionClassName="w-64 h-64 sm:w-80 sm:h-80 top-6 -right-16 sm:-right-24"
                    colorClassName="bg-sage"
                    driftX={[0, -30]}
                    driftY={[0, 26]}
                    duration={6}
                    delay={1.5}
                    prefersReducedMotion={!!prefersReducedMotion}
                />
                <HeroBlob
                    positionClassName="w-56 h-56 sm:w-72 sm:h-72 -bottom-16 left-1/3"
                    colorClassName="bg-gold"
                    driftX={[0, 22]}
                    driftY={[0, 20]}
                    duration={4}
                    delay={3}
                    prefersReducedMotion={!!prefersReducedMotion}
                />
                <HeroBlob
                    positionClassName="w-40 h-40 sm:w-56 sm:h-56 top-1/3 -right-8"
                    colorClassName="bg-wine"
                    driftX={[0, -18]}
                    driftY={[0, 16]}
                    duration={7}
                    delay={0.8}
                    prefersReducedMotion={!!prefersReducedMotion}
                />
                <HeroBlob
                    positionClassName="w-48 h-48 sm:w-64 sm:h-64 -bottom-24 right-1/4"
                    colorClassName="bg-sage"
                    driftX={[0, 20]}
                    driftY={[0, -18]}
                    duration={8}
                    delay={2.2}
                    prefersReducedMotion={!!prefersReducedMotion}
                />
                <HeroBlob
                    positionClassName="w-36 h-36 sm:w-48 sm:h-48 top-1/2 -left-10"
                    colorClassName="bg-gold"
                    driftX={[0, -16]}
                    driftY={[0, 20]}
                    duration={6.5}
                    delay={1}
                    prefersReducedMotion={!!prefersReducedMotion}
                />

                {/* ── HERO ── */}
                <section className="relative z-10 pt-16 sm:pt-20 pb-16 sm:pb-24">
                <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
                        <div className="text-center lg:text-left">
                            <div className="mb-6">
                                <span className="inline-flex items-center gap-2 bg-rose-bg text-accent rounded-pill px-4 py-1.5 text-xs font-semibold uppercase tracking-widest">
                                    CRM para centros de estética
                                </span>
                            </div>

                            <motion.h1
                                className="text-4xl sm:text-5xl lg:text-6xl font-serif text-text leading-[1.1]"
                                initial="hidden"
                                animate="visible"
                                variants={heroTitleContainer(!!prefersReducedMotion)}
                            >
                                {heroTitleWords.map((word, i) => (
                                    <motion.span
                                        key={`${word.text}-${i}`}
                                        className="inline-block"
                                        variants={heroTitleWord(!!prefersReducedMotion)}
                                    >
                                        {word.accent ? (
                                            <span className="relative inline-block pb-3">
                                                <span className="text-accent">{word.text}</span>
                                                <svg className="absolute bottom-0 left-0 w-full h-4 text-dotted" viewBox="0 0 240 16" preserveAspectRatio="none" overflow="visible">
                                                    <path d="M4 8 Q 32 2, 60 8 T 120 8 T 180 8 T 236 8" stroke="currentColor" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                                                </svg>
                                            </span>
                                        ) : (
                                            word.text
                                        )}
                                        {i < heroTitleWords.length - 1 ? ' ' : ''}
                                    </motion.span>
                                ))}
                            </motion.h1>

                            <p className="mt-6 text-base sm:text-lg text-text-2 max-w-lg mx-auto lg:mx-0 leading-relaxed">
                                Gestiona clientes, servicios, inventario y turnos en un solo lugar.
                                Ahorra horas de trabajo administrativo cada semana y haz crecer tu negocio con datos claros.
                            </p>

                            <div className="flex flex-col sm:flex-row gap-3 mt-8 justify-center lg:justify-start">
                                <Magnetic prefersReducedMotion={!!prefersReducedMotion} className="block sm:inline-block w-full sm:w-auto">
                                    <Link to="/registro"
                                        className="bg-accent hover:opacity-90 text-white px-6 sm:px-8 py-3.5 rounded-ctrl text-sm font-semibold flex items-center justify-center gap-2 transition-opacity no-underline"
                                    >
                                        Prueba gratis
                                        <FiArrowRight size={16} />
                                    </Link>
                                </Magnetic>
                                <Magnetic prefersReducedMotion={!!prefersReducedMotion} className="block sm:inline-block w-full sm:w-auto">
                                    <a href="#funcionalidades"
                                        className="bg-surface border border-[var(--dotted)] hover:bg-hover-soft text-wine px-6 sm:px-8 py-3.5 rounded-ctrl text-sm font-semibold flex items-center justify-center gap-2 transition-colors no-underline"
                                    >
                                        Ver funcionalidades
                                    </a>
                                </Magnetic>
                            </div>

                            <div className="flex items-center gap-6 mt-8 justify-center lg:justify-start text-xs text-muted">
                                <span className="flex items-center gap-1.5"><FiShield size={14} /> Sin tarjeta</span>
                                <span className="flex items-center gap-1.5"><FiSmartphone size={14} /> Multi-dispositivo</span>
                            </div>
                        </div>

                        <div className="relative">
                            <div className="relative mx-auto max-w-sm space-y-5 py-4">
                                {heroStatCards.map((card, i) => (
                                    <TiltCard
                                        key={card.label}
                                        prefersReducedMotion={!!prefersReducedMotion}
                                        className={`bg-surface border border-border rounded-card p-6 sm:p-8 flex items-center gap-4 ${i === 1 ? 'ml-6 sm:ml-14' : ''} ${i === 2 ? 'mr-4 sm:mr-8' : ''}`}
                                    >
                                        <div className={`w-16 h-16 shrink-0 rounded-card ${card.tint.bg} flex items-center justify-center`}>
                                            <AnimatedStatIcon icon={card.icon} animation={card.animation} size={32} className={card.tint.text} />
                                        </div>
                                        <div>
                                            <p className="font-serif text-3xl font-semibold text-text leading-none">{card.value}</p>
                                            <p className="text-sm text-text-2 mt-1.5">{card.label}</p>
                                        </div>
                                    </TiltCard>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
                </section>

                {/* ── FRANJA DE CONFIANZA (cinta/marquee) ── */}
                <TrustMarquee prefersReducedMotion={!!prefersReducedMotion} />
            </div>

            {/* ── FEATURES ── */}
            <section id="funcionalidades" className="relative scroll-mt-20 bg-bg">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 sm:pt-28 pb-12 sm:pb-16">
                    <div className="text-center max-w-3xl mx-auto">
                        <span className="inline-flex items-center gap-2 bg-rose-bg text-accent rounded-pill px-4 py-1.5 text-xs font-semibold uppercase tracking-widest mb-4">
                            Funcionalidades
                        </span>
                        <h3 className="text-3xl sm:text-4xl lg:text-5xl font-serif text-wine">
                            Todo lo que necesitas para gestionar tu centro
                        </h3>
                        <p className="text-base sm:text-lg text-text-2 pt-6 max-w-xl mx-auto leading-relaxed">
                            Desde clientes hasta inventario, Shear centraliza cada aspecto de tu operación diaria.
                        </p>
                    </div>
                </div>

                {/* Grilla bento (UX-45-B): 1 card grande destacada (índice 0, ya marcada
                    `featured` en el copy original) + 5 chicas — variación de tamaño real vía
                    col-span/row-span de Tailwind en `lg:`, no solo cosmética. Reveal fade+slide
                    (ver `featureCardReveal`, reescrito en UX-45-fix punto 1 — el `clip-path`
                    original dejaba las cards invisibles en producción), sin rotación ni
                    perspectiva 3D. */}
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-20 sm:pb-28">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                        {features.map((feat, i) => {
                            const tint = sectionTints[i % sectionTints.length];
                            const Icon = feat.icon;
                            const cardMotion = featureCardReveal(i, !!prefersReducedMotion);
                            const isBento = i === 0;
                            return (
                                <motion.div
                                    key={feat.title}
                                    className={`bg-surface border border-border rounded-card p-6 sm:p-8 flex flex-col ${isBento ? 'sm:col-span-2 lg:col-span-2 lg:row-span-2 lg:justify-between' : ''}`}
                                    initial={cardMotion.initial}
                                    whileInView={cardMotion.whileInView}
                                    viewport={{ once: true, amount: 0.3 }}
                                    transition={cardMotion.transition}
                                    whileHover={{
                                        scale: 1.015,
                                        // Relajación UX-45, documentada formalmente en design.md por la ronda D:
                                        // única sombra de hover permitida en toda la app, exclusiva de las cards
                                        // de Features en Landing. Wine (#6B3444 → rgb(107,52,68)) al 10% opacidad.
                                        boxShadow: '0 8px 24px rgba(107, 52, 68, 0.10)',
                                        transition: { duration: 0.15, ease: 'easeOut' },
                                    }}
                                >
                                    <div className={`${isBento ? 'w-16 h-16' : 'w-14 h-14'} rounded-card ${tint.bg} flex items-center justify-center mb-6`}>
                                        <Icon size={isBento ? 30 : 26} className={tint.text} />
                                    </div>

                                    <h4 className={`${isBento ? 'text-2xl lg:text-3xl' : 'text-xl'} font-serif text-text mb-3`}>{feat.title}</h4>
                                    <p className={`text-sm text-text-2 leading-relaxed ${isBento ? 'lg:text-base lg:max-w-md' : ''}`}>{feat.description}</p>

                                    {feat.featured && feat.stat && (
                                        <div className="flex items-center gap-2 mt-6 pt-4 border-t border-border-soft text-xs font-semibold text-accent">
                                            <FiTrendingUp size={14} />
                                            <span>{feat.stat}</span>
                                        </div>
                                    )}
                                </motion.div>
                            );
                        })}
                    </div>
                </div>
            </section>

            {/* ── STATS / IMPACT ── */}
            <section className="py-16 sm:py-24 bg-bg">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="text-center mb-12 sm:mb-16">
                        <span className="inline-flex items-center gap-2 bg-rose-bg text-accent rounded-pill px-4 py-1.5 text-xs font-semibold uppercase tracking-widest mb-4">
                            Impacto
                        </span>
                        <h3 className="text-3xl sm:text-4xl font-serif text-wine">Números que hablan</h3>
                    </div>

                    <motion.div
                        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6"
                        variants={statsContainer}
                        initial="hidden"
                        whileInView="visible"
                        viewport={{ once: true, amount: 0.3 }}
                    >
                        {[
                            { number: 5, suffix: ' min', label: 'Setup inicial', sublabel: 'y estás operando', icon: PiClockDuotone, animation: 'rotate' as StatIconAnimation },
                            { number: 100, suffix: '%', label: 'Datos centralizados', sublabel: 'en un solo lugar', icon: PiStackDuotone, animation: 'float' as StatIconAnimation },
                            { number: 40, suffix: '%', label: 'Más eficiencia', sublabel: 'en gestión diaria', icon: PiTrendUpDuotone, animation: 'float' as StatIconAnimation },
                            { number: 24, suffix: '/7', label: 'Disponible', sublabel: 'siempre online', icon: PiChartBarDuotone, animation: 'pulse' as StatIconAnimation },
                        ].map((stat, i) => {
                            const tint = sectionTints[i % sectionTints.length];
                            return (
                                <AnimatedStat
                                    key={stat.label}
                                    value={stat.number}
                                    suffix={stat.suffix}
                                    label={stat.label}
                                    sublabel={stat.sublabel}
                                    icon={stat.icon}
                                    iconAnimation={stat.animation}
                                    iconBg={tint.bg}
                                    iconText={tint.text}
                                    barColor={tint.text.replace('text-', 'bg-')}
                                    prefersReducedMotion={!!prefersReducedMotion}
                                />
                            );
                        })}
                    </motion.div>
                </div>
            </section>

            {/* ── HOW IT WORKS ── */}
            <section id="como-funciona" ref={howItWorksRef} className="py-24 sm:py-32 relative scroll-mt-20 bg-bg">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="text-center max-w-2xl mx-auto mb-20">
                        <span className="inline-flex items-center gap-2 bg-rose-bg text-accent rounded-pill px-4 py-1.5 text-xs font-semibold uppercase tracking-widest mb-4">
                            Cómo funciona
                        </span>
                        <h3 className="text-3xl sm:text-4xl lg:text-6xl font-serif text-wine">Empieza en minutos</h3>
                        <p className="text-sm sm:text-base text-text-2 mt-4 max-w-lg mx-auto">Tres pasos simples para transformar la gestión de tu centro de estética.</p>
                    </div>

                    {/* Steps */}
                    <div className="max-w-4xl mx-auto space-y-28 sm:space-y-40 relative">
                        {/* Línea de progreso ligada a scroll, serpenteante (UX-45-fix2, punto 3):
                            reemplaza el `div` recto con `scaleY` por un `<svg>` con un trazo
                            ondulado (`howItWorksPathD`, curvas `Q`), "dibujado" al hacer scroll
                            vía `pathLength` de `motion.path` (0→1) ligado al mismo
                            `howItWorksProgress` ya calculado arriba — más simple que calcular
                            `strokeDashoffset` a mano. Dos `<svg>` superpuestos con el mismo
                            `path`: uno de trazo fijo (`text-dotted`, el "carril" completo) y otro
                            con el trazo animado por encima (`text-accent`, el progreso). Spine
                            vertical centrada en el wrapper de pasos: en `sm:` el layout alterna
                            el círculo de lado (flex-row-reverse por paso), por lo que la línea no
                            coincide con el centro exacto de cada círculo — decisión deliberada
                            para no reestructurar el layout alternado ya aprobado; funciona como
                            columna vertebral narrativa de la sección, no como conector literal
                            círculo-a-círculo. Oculta en mobile (`hidden sm:block`) porque ahí los
                            pasos se apilan en una sola columna centrada y el propio orden
                            vertical ya comunica la progresión sin necesidad de spine. Se
                            mantiene el `z-index` corregido en UX-45-fix punto 2 (`z-0` acá,
                            `z-10` en cada paso, ver más abajo) para que la línea siga detrás del
                            texto. Con `prefersReducedMotion`, `pathLength` queda fijo en 1 (línea
                            completa sin animar). */}
                        <div
                            aria-hidden="true"
                            className="hidden sm:block absolute z-0 left-1/2 -translate-x-1/2 top-10 bottom-10 w-10"
                        >
                            <svg className="absolute inset-0 w-full h-full text-dotted" viewBox="0 0 40 600" preserveAspectRatio="none" fill="none">
                                <path d={howItWorksPathD} stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
                            </svg>
                            <svg className="absolute inset-0 w-full h-full text-accent" viewBox="0 0 40 600" preserveAspectRatio="none" fill="none">
                                <motion.path
                                    d={howItWorksPathD}
                                    stroke="currentColor"
                                    strokeWidth="4"
                                    strokeLinecap="round"
                                    style={{ pathLength: prefersReducedMotion ? 1 : howItWorksProgress }}
                                />
                            </svg>
                        </div>

                        {steps.map((step, i) => {
                            const tint = sectionTints[i % sectionTints.length];
                            return (
                                <motion.div
                                    key={step.number}
                                    className={`relative z-10 flex flex-col sm:flex-row items-center gap-8 sm:gap-16 ${i % 2 !== 0 ? 'sm:flex-row-reverse' : ''}`}
                                    initial={prefersReducedMotion ? false : { opacity: 0, x: i % 2 !== 0 ? 24 : -24 }}
                                    whileInView={prefersReducedMotion ? undefined : { opacity: 1, x: 0 }}
                                    viewport={{ once: true, amount: 0.4 }}
                                    transition={{ duration: 0.5, ease: 'easeOut' }}
                                >
                                    {/* Step number - círculo que se ilumina al cruzar el centro
                                        del viewport (UX-45-C): `margin: '-50% 0px -50% 0px'`
                                        colapsa el área de detección a una línea horizontal en el
                                        centro exacto de la pantalla — técnica estándar de motion
                                        para "onViewportEnter en el centro", más precisa que un
                                        `amount` aproximado. */}
                                    <div className="shrink-0">
                                        <motion.div
                                            className={`w-28 h-28 sm:w-36 sm:h-36 rounded-full ${tint.bg} flex items-center justify-center`}
                                            initial={prefersReducedMotion ? false : { opacity: 0.45, scale: 0.82 }}
                                            whileInView={prefersReducedMotion ? undefined : { opacity: 1, scale: 1 }}
                                            viewport={{ once: true, margin: '-50% 0px -50% 0px' }}
                                            transition={{ duration: 0.5, ease: 'easeOut' }}
                                        >
                                            <span className={`text-4xl sm:text-5xl font-serif font-bold ${tint.text}`}>{step.number}</span>
                                        </motion.div>
                                    </div>

                                    {/* Step content */}
                                    <div className={`flex-1 ${i % 2 !== 0 ? 'sm:text-right sm:flex sm:flex-col sm:items-end' : ''}`}>
                                        <div className={`max-w-md ${i % 2 !== 0 ? 'sm:text-right' : ''}`}>
                                            <span className="inline-block text-xs font-semibold tracking-widest text-muted uppercase mb-3">Paso {step.number}</span>
                                            <h4 className="text-2xl sm:text-3xl font-serif text-text mb-4">{step.title}</h4>
                                            <p className={`text-base sm:text-lg text-text-2 leading-relaxed ${i % 2 !== 0 ? 'sm:text-right' : ''}`}>{step.description}</p>
                                        </div>
                                    </div>
                                </motion.div>
                            );
                        })}
                    </div>
                </div>
            </section>

            {/* ── CTA final — único bloque wine sólido de la página (§1.3/§7.5) ── */}
            <section className="py-20 sm:py-28 bg-bg">
                <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
                    {/* Tilt 3D al hover (UX-45-fix2, punto 4): reutiliza el mismo componente
                        `TiltCard` de las tarjetas de estadística del hero (no se reimplementa
                        `rotateX`/`rotateY` con `useSpring`). `TiltCard` envuelve el bloque
                        wine — no lleva clases propias (`className` por defecto vacío) para no
                        duplicar `overflow-hidden`/`rounded-card`/`bg-wine`, que siguen viviendo
                        únicamente en el `motion.div` interno (el mismo que ya maneja el reveal
                        de fade-in por scroll). El hover magnético del botón (`Magnetic`, más
                        abajo) sigue funcionando sin conflicto: ninguno de los dos wrappers llama
                        `stopPropagation`, así que ambos listeners de `mousemove` reciben el
                        evento por bubbling y animan en simultáneo (tilt de la card + imán del
                        botón). */}
                    <TiltCard prefersReducedMotion={!!prefersReducedMotion}>
                        <motion.div
                            className="relative overflow-hidden bg-wine rounded-card p-8 sm:p-12 lg:p-16"
                            initial={prefersReducedMotion ? false : { opacity: 0 }}
                            whileInView={prefersReducedMotion ? undefined : { opacity: 1 }}
                            viewport={{ once: true, amount: 0.4 }}
                            transition={{ duration: 0.6, ease: 'easeOut' }}
                        >
                        {/* Textura de puntos (no gradiente, UX-45-D): SVG repetido a baja opacidad. */}
                        <div
                            aria-hidden="true"
                            className="absolute inset-0 pointer-events-none opacity-[0.08]"
                            style={{ backgroundImage: ctaDotPatternUrl, backgroundSize: '24px 24px' }}
                        />

                        {/* Forma con blur "del mismo tono wine pero más clara" detrás del texto
                            (UX-45-D): reutiliza `HeroBlob` (mismo componente/técnica del hero,
                            §13.1/UX-39) con `bg-white` + blend `soft-light` — aclara localmente
                            el wine subyacente en vez de introducir un color plano nuevo. Centrado
                            con margen negativo (no `translate-x`). Sin `parallaxY` (retirado de
                            `HeroBlob` en UX-45-fix2 punto 2) — el drift+opacidad+escala infinito
                            del blob sigue intacto, solo estático respecto al scroll. */}
                        <HeroBlob
                            positionClassName="w-72 h-72 sm:w-96 sm:h-96 -top-10 left-1/2 -ml-36 sm:-ml-48"
                            colorClassName="bg-white"
                            blendMode="soft-light"
                            opacityRange={[0.28, 0.55]}
                            driftX={[0, 24]}
                            driftY={[0, 18]}
                            duration={12}
                            delay={0.5}
                            prefersReducedMotion={!!prefersReducedMotion}
                        />

                        <div className="relative z-10">
                            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-serif text-white leading-tight">
                                ¿Listo para simplificar tu gestión?
                            </h2>
                            <p className="text-base sm:text-lg mt-4 max-w-lg mx-auto" style={{ color: 'var(--color-accent-tint)' }}>
                                Únete a los centros de estética que ya confían en Shear para administrar su negocio.
                            </p>
                            <div className="flex flex-col sm:flex-row gap-3 justify-center mt-8">
                                <Magnetic prefersReducedMotion={!!prefersReducedMotion} className="block sm:inline-block w-full sm:w-auto">
                                    <Link
                                        to="/registro"
                                        className="bg-white hover:opacity-90 text-wine px-8 py-3.5 rounded-ctrl text-sm font-semibold flex items-center justify-center gap-2 transition-opacity no-underline"
                                    >
                                        Crear cuenta gratis <FiArrowRight size={16} />
                                    </Link>
                                </Magnetic>
                                <Magnetic prefersReducedMotion={!!prefersReducedMotion} className="block sm:inline-block w-full sm:w-auto">
                                    <Link
                                        to="/login"
                                        className="border border-white/30 hover:bg-white/10 text-white px-8 py-3.5 rounded-ctrl text-sm font-semibold transition-colors no-underline"
                                    >
                                        Iniciar sesión
                                    </Link>
                                </Magnetic>
                            </div>
                            <p className="text-xs mt-4" style={{ color: 'var(--color-accent-tint)' }}>Sin compromiso. Sin tarjeta de crédito.</p>
                        </div>
                        </motion.div>
                    </TiltCard>
                </div>
            </section>

            {/* ── FOOTER ── */}
            {/* Fade-in simple al entrar en viewport (UX-45-D) — sin efectos adicionales, para
                no saturar el cierre de la página. */}
            <motion.footer
                className="border-t border-border bg-surface"
                initial={prefersReducedMotion ? false : { opacity: 0 }}
                whileInView={prefersReducedMotion ? undefined : { opacity: 1 }}
                viewport={{ once: true, amount: 0.3 }}
                transition={{ duration: 0.5, ease: 'easeOut' }}
            >
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                        <div className="flex items-center gap-2">
                            <img src="/shear-logo.png" alt="Shear" className="h-11 w-auto" />
                        </div>
                        <nav className="flex items-center gap-6 text-xs font-medium text-muted">
                            <a href="#funcionalidades" className="hover:text-text transition-colors no-underline">Funcionalidades</a>
                            <a href="#como-funciona" className="hover:text-text transition-colors no-underline">Cómo funciona</a>
                            <Link to="/login" className="hover:text-text transition-colors no-underline">Iniciar sesión</Link>
                            <Link to="/registro" className="hover:text-text transition-colors no-underline">Registrarse</Link>
                        </nav>
                        <p className="text-xs text-muted">
                            &copy; {new Date().getFullYear()} Shear. Todos los derechos reservados.
                        </p>
                    </div>
                </div>
            </motion.footer>
        </div>
    );
}

interface TrustMarqueeProps {
    prefersReducedMotion: boolean;
}

/**
 * Cinta de confianza en loop infinito (UX-45-B): puramente decorativa (el contenido real ya
 * vive en Features), por eso todo el bloque lleva `aria-hidden` y no puede recibir foco. El
 * contenido se duplica (2 copias consecutivas) para que el loop de `x: -50%` empalme sin salto
 * visible. `overflow-hidden` explícito evita scroll horizontal. Con prefersReducedMotion, el
 * loop se detiene (`animate` pasa a `undefined`) y se muestra la cinta estática, recortada por
 * el propio `overflow-hidden` del contenedor.
 *
 * UX-45-fix2 punto 2: `bg-surface` opaco pasa a `bg-surface/90` — el wrapper compartido de
 * `views/Landing.tsx` ahora extiende el fondo decorativo (blobs con blur) del hero por detrás de
 * esta franja; bajar la opacidad deja ese bleed sutilmente visible sin sacrificar el contraste
 * del texto (`text-text-2` sobre un fondo que sigue siendo mayormente sólido al 90%). `relative
 * z-10` explícito para apilarse por encima de los blobs (`z-0`) del wrapper padre.
 */
function TrustMarquee({ prefersReducedMotion }: TrustMarqueeProps) {
    const renderCopy = (copyIndex: number) => (
        <div key={copyIndex} className="flex items-center shrink-0">
            {marqueeWords.map((word, i) => (
                <span key={`${copyIndex}-${word}`} className="flex items-center gap-3 px-6 sm:px-10">
                    <span className={`w-2 h-2 rounded-full shrink-0 ${marqueeDotColors[i % marqueeDotColors.length]}`} />
                    <span className="text-sm sm:text-base font-serif text-text-2 whitespace-nowrap">{word}</span>
                </span>
            ))}
        </div>
    );

    return (
        <div aria-hidden="true" className="relative z-10 py-5 sm:py-6 border-y border-border bg-surface/90 overflow-hidden">
            <motion.div
                className="flex w-max"
                animate={prefersReducedMotion ? undefined : { x: ['0%', '-50%'] }}
                transition={prefersReducedMotion ? undefined : { duration: 26, repeat: Infinity, ease: 'linear' }}
            >
                {renderCopy(0)}
                {renderCopy(1)}
            </motion.div>
        </div>
    );
}

interface AnimatedStatProps {
    value: number;
    suffix: string;
    label: string;
    sublabel: string;
    // UX-45-fix2 punto 1: Stats usa íconos ya hechos de `react-icons/pi` (Phosphor Duotone),
    // animados vía el wrapper compartido `AnimatedStatIcon` (`components/landing/StatIcons.tsx`).
    icon: IconType;
    iconAnimation: StatIconAnimation;
    iconBg: string;
    iconText: string;
    barColor: string;
    prefersReducedMotion: boolean;
}

/**
 * Cifra de Stats con conteo animado + barra de progreso (UX-45-C): un único `MotionValue`
 * (`progress`, 0→1) impulsa ambas piezas — el número (escribiendo `textContent` directo sobre
 * un ref vía `useMotionValueEvent`, sin `setState` por frame, para no forzar un re-render de
 * React en cada tick) y la barra de abajo (ligando `scaleX` al mismo valor, mismo patrón que
 * `HeroBlob` separa parallax/drift en nodos distintos). Disparado por `onViewportEnter` con
 * `viewport={{ once: true }}` para no re-animar si el usuario vuelve a scrollear sobre la
 * sección. `barColor` reutiliza el mismo token que ya usa el ícono del stat (derivado de
 * `iconText` reemplazando `text-` por `bg-`), coherente con el color sólido de punto/ícono de
 * cada card. Con `prefersReducedMotion`: se salta `animate()` — `progress` nace en 1, el texto
 * ya muestra el valor final desde el primer render y la barra ya está llena sin transición.
 */
function AnimatedStat({ value, suffix, label, sublabel, icon, iconAnimation, iconBg, iconText, barColor, prefersReducedMotion }: AnimatedStatProps) {
    const numberRef = useRef<HTMLSpanElement>(null);
    const progress = useMotionValue(prefersReducedMotion ? 1 : 0);

    useMotionValueEvent(progress, 'change', (latest) => {
        if (numberRef.current) {
            numberRef.current.textContent = String(Math.round(latest * value));
        }
    });

    const handleViewportEnter = () => {
        if (prefersReducedMotion) {
            progress.set(1);
            return;
        }
        animate(progress, 1, { duration: 1.4, ease: [0.16, 1, 0.3, 1] });
    };

    return (
        <motion.div
            className="bg-surface border border-border rounded-card p-6 text-center"
            variants={fadeSlideUpShort(prefersReducedMotion)}
            onViewportEnter={handleViewportEnter}
            viewport={{ once: true, amount: 0.5 }}
        >
            <div className={`w-16 h-16 rounded-card ${iconBg} flex items-center justify-center mx-auto mb-4`}>
                <AnimatedStatIcon icon={icon} animation={iconAnimation} size={30} className={iconText} />
            </div>
            <p className="font-serif text-[34px] font-semibold text-text leading-none">
                <span ref={numberRef}>{prefersReducedMotion ? value : 0}</span><span className="text-2xl">{suffix}</span>
            </p>
            <p className="text-sm font-semibold text-text mt-3">{label}</p>
            <p className="text-xs text-muted mt-1">{sublabel}</p>
            <div className="h-1 rounded-pill bg-dotted mt-4 overflow-hidden" aria-hidden="true">
                <motion.div
                    className={`h-full rounded-pill origin-left ${barColor}`}
                    style={{ scaleX: prefersReducedMotion ? 1 : progress }}
                />
            </div>
        </motion.div>
    );
}

interface HeroBlobProps {
    positionClassName: string;
    colorClassName: string;
    driftX: number[];
    driftY: number[];
    duration: number;
    delay: number;
    prefersReducedMotion: boolean;
    blendMode?: 'multiply' | 'soft-light' | 'overlay';
    /** Rango [min, max] de opacidad recorrido en loop (UX-45-fix2, punto 2) — reemplaza el viejo
     * `opacityClassName` fijo. El valor de reposo (`prefersReducedMotion`) es el punto medio del
     * rango, aplicado como `style.opacity` inline en vez de una clase Tailwind estática. */
    opacityRange?: [number, number];
    /** Rango [min, max] de escala recorrido en el mismo loop — nuevo en UX-45-fix2 (antes el
     * único movimiento era drift de posición). */
    scaleRange?: [number, number];
}

/**
 * Blob decorativo de fondo (§13.1/UX-39, UX-45): forma sólida con blur + mix-blend. UX-45-fix2
 * (punto 2) retira el parallax de scroll que tenía antes (`parallaxY`/`style={{ y: parallaxY }}`
 * en un wrapper separado): confirmado explícitamente con el usuario, los blobs quedan estáticos
 * en su posición de fondo, sin desplazarse al hacer scroll. A cambio, el loop infinito de drift
 * de posición (`x`/`y`) ahora se acompaña de variación de **opacidad** y de **escala** en el
 * mismo `animate`/`transition` (mismo `duration`/`delay`/`repeat: Infinity`/`repeatType:
 * 'mirror'` que ya tenía el drift), bastante más dramático que el drift-solo de la ronda
 * anterior. Al no requerir ya un wrapper separado para el parallax, el componente se simplifica
 * a un único `motion.div` (antes eran dos: un wrapper con `style.y` + un hijo con el drift).
 * Reutilizado tal cual en el hero (blend `multiply` por defecto, tokens sólidos de marca) y en
 * el CTA final (UX-45-D: `bg-white` + blend `soft-light` sobre `bg-wine`, para lograr una forma
 * "del mismo tono wine pero más clara" sin introducir un token nuevo). `blendMode`/
 * `opacityRange`/`scaleRange` son opcionales con valores por defecto equivalentes a los que ya
 * usaban los 3 blobs originales del hero.
 */
function HeroBlob({
    positionClassName, colorClassName, driftX, driftY, duration, delay,
    prefersReducedMotion, blendMode = 'multiply', opacityRange = [0.18, 0.42], scaleRange = [0.85, 1.15],
}: HeroBlobProps) {
    const restOpacity = (opacityRange[0] + opacityRange[1]) / 2;

    return (
        <div
            aria-hidden="true"
            className={`absolute z-0 pointer-events-none ${positionClassName}`}
        >
            <motion.div
                className={`w-full h-full rounded-full blur-3xl ${colorClassName}`}
                style={{ mixBlendMode: blendMode, opacity: prefersReducedMotion ? restOpacity : undefined }}
                animate={prefersReducedMotion ? undefined : {
                    x: driftX, y: driftY, opacity: opacityRange, scale: scaleRange,
                }}
                transition={prefersReducedMotion ? undefined : {
                    duration, delay, repeat: Infinity, repeatType: 'mirror', ease: 'easeInOut',
                }}
            />
        </div>
    );
}

interface TiltCardProps {
    children: ReactNode;
    prefersReducedMotion: boolean;
    className?: string;
}

/**
 * Tarjeta con inclinación 3D vía transform CSS puro (sin WebGL): sigue la posición del
 * mouse dentro de su propio bounding box con `useSpring` para el amortiguado. Sin listener
 * de mouse en touch (no requiere media query especial) y congelada con prefers-reduced-motion.
 */
function TiltCard({ children, prefersReducedMotion, className = '' }: TiltCardProps) {
    const ref = useRef<HTMLDivElement>(null);
    const rotateX = useSpring(0, { stiffness: 260, damping: 22 });
    const rotateY = useSpring(0, { stiffness: 260, damping: 22 });

    const handleMouseMove = (event: React.MouseEvent<HTMLDivElement>) => {
        if (prefersReducedMotion || !ref.current) {
            return;
        }
        const rect = ref.current.getBoundingClientRect();
        const px = (event.clientX - rect.left) / rect.width - 0.5;
        const py = (event.clientY - rect.top) / rect.height - 0.5;
        rotateY.set(px * 14);
        rotateX.set(py * -14);
    };

    const handleMouseLeave = () => {
        rotateX.set(0);
        rotateY.set(0);
    };

    return (
        <motion.div
            ref={ref}
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
            style={{ rotateX, rotateY, transformPerspective: 800 }}
            className={className}
        >
            {children}
        </motion.div>
    );
}

interface MagneticProps {
    children: ReactNode;
    prefersReducedMotion: boolean;
    className?: string;
}

/**
 * Envoltorio de hover magnético (§ explore_UX-45): el contenido se desplaza unos pocos
 * píxeles hacia el cursor dentro de su propio bounding box. Wrapper `inline-block`/`block`
 * en vez de `motion(Link)` para no acoplarse a la API de wrapping de componentes de motion.
 */
function Magnetic({ children, prefersReducedMotion, className = '' }: MagneticProps) {
    const ref = useRef<HTMLDivElement>(null);
    const x = useSpring(0, { stiffness: 300, damping: 20, mass: 0.5 });
    const y = useSpring(0, { stiffness: 300, damping: 20, mass: 0.5 });

    const handleMouseMove = (event: React.MouseEvent<HTMLDivElement>) => {
        if (prefersReducedMotion || !ref.current) {
            return;
        }
        const rect = ref.current.getBoundingClientRect();
        x.set((event.clientX - rect.left - rect.width / 2) * 0.35);
        y.set((event.clientY - rect.top - rect.height / 2) * 0.35);
    };

    const handleMouseLeave = () => {
        x.set(0);
        y.set(0);
    };

    return (
        <motion.div
            ref={ref}
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
            style={{ x, y }}
            className={className}
        >
            {children}
        </motion.div>
    );
}
