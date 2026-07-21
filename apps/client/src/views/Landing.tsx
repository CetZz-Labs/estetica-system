import { useAuth } from '@clerk/react';
import { Navigate, Link } from 'react-router';
import { useState } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import type { Variants } from 'motion/react';
import {
    FiUsers, FiScissors, FiBox, FiCalendar, FiActivity, FiCheckCircle,
    FiArrowRight, FiMenu, FiX, FiClock, FiLayers, FiTrendingUp,
    FiShield, FiSmartphone, FiBarChart2
} from 'react-icons/fi';

// Variants de reveal reutilizados en Stats/Cómo funciona/CTA (§13.1).
// (Features usa su propio reveal tipo "mazo de cartas" por-card, ver sección FEATURES — UX-39.)
const fadeSlideUpShort: Variants = {
    hidden: { opacity: 0, y: 12 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: 'easeOut' } },
};

const statsContainer: Variants = {
    hidden: {},
    visible: { transition: { staggerChildren: 0.05 } },
};

// Reveal "mazo de cartas" de Features (UX-39, §13.1 aclaración): cada card entra individualmente
// con whileInView (no stagger de contenedor), partiendo rotada/escalada/con leve giro 3D como si
// se repartiera desde un mazo, con delay creciente por columna (i % 3) para que el despliegue se
// note al hacer scroll. Se reduce a un simple fade si el usuario prefiere menos movimiento.
const featureCardMotion = (i: number, prefersReducedMotion: boolean) => ({
    initial: prefersReducedMotion
        ? { opacity: 0 }
        : { opacity: 0, y: 90, scale: 0.78, rotate: i % 2 === 0 ? -10 : 10, rotateX: -30 },
    whileInView: prefersReducedMotion
        ? { opacity: 1 }
        : { opacity: 1, y: 0, scale: 1, rotate: 0, rotateX: 0 },
    transition: { duration: 0.7, ease: [0.16, 1, 0.3, 1] as const, delay: (i % 3) * 0.16 },
});

// Rotación de tinte determinística (§7.10) para íconos de Features/Stats: rose → sage → gold → wine.
const sectionTints = [
    { bg: 'bg-rose-bg', text: 'text-accent' },
    { bg: 'bg-sage-bg', text: 'text-sage' },
    { bg: 'bg-gold-bg', text: 'text-gold' },
    { bg: 'bg-wine-bg', text: 'text-wine' },
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

            {/* ── HERO ── */}
            <section className="relative pt-16 sm:pt-20 pb-16 sm:pb-24 overflow-hidden bg-bg">
                <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
                        <div className="text-center lg:text-left">
                            <motion.div
                                className="mb-6"
                                initial={{ opacity: 0, y: -8 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.5, ease: 'easeOut' }}
                            >
                                <span className="inline-flex items-center gap-2 bg-rose-bg text-accent rounded-pill px-4 py-1.5 text-xs font-semibold uppercase tracking-widest">
                                    CRM para centros de estética
                                </span>
                            </motion.div>

                            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-serif text-text leading-[1.1]">
                                El sistema que{' '}
                                <span className="relative inline-block pb-3">
                                    <span className="text-accent">simplifica</span>
                                    <svg className="absolute bottom-0 left-0 w-full h-4 text-dotted" viewBox="0 0 240 16" preserveAspectRatio="none" overflow="visible">
                                        <path d="M4 8 Q 32 2, 60 8 T 120 8 T 180 8 T 236 8" stroke="currentColor" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                                    </svg>
                                </span>{' '}
                                tu centro de estética
                            </h1>

                            <p className="mt-6 text-base sm:text-lg text-text-2 max-w-lg mx-auto lg:mx-0 leading-relaxed">
                                Gestiona clientes, servicios, inventario y turnos en un solo lugar.
                                Ahorra horas de trabajo administrativo cada semana y haz crecer tu negocio con datos claros.
                            </p>

                            <div className="flex flex-col sm:flex-row gap-3 mt-8 justify-center lg:justify-start">
                                <Link to="/registro"
                                    className="bg-accent hover:opacity-90 text-white px-6 sm:px-8 py-3.5 rounded-ctrl text-sm font-semibold flex items-center justify-center gap-2 transition-opacity no-underline"
                                >
                                    Prueba gratis
                                    <FiArrowRight size={16} />
                                </Link>
                                <a href="#funcionalidades"
                                    className="bg-surface border border-[var(--dotted)] hover:bg-hover-soft text-wine px-6 sm:px-8 py-3.5 rounded-ctrl text-sm font-semibold flex items-center justify-center gap-2 transition-colors no-underline"
                                >
                                    Ver funcionalidades
                                </a>
                            </div>

                            <div className="flex items-center gap-6 mt-8 justify-center lg:justify-start text-xs text-muted">
                                <span className="flex items-center gap-1.5"><FiShield size={14} /> Sin tarjeta</span>
                                <span className="flex items-center gap-1.5"><FiSmartphone size={14} /> Multi-dispositivo</span>
                            </div>
                        </div>

                        <div className="relative">
                            <HeroMockup prefersReducedMotion={!!prefersReducedMotion} />
                        </div>
                    </div>
                </div>
            </section>

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

                {/* Grilla de features con reveal tipo "mazo de cartas" (UX-39): cada card se
                    despliega individualmente al entrar en viewport (whileInView + viewport once),
                    partiendo rotada/escalada con leve giro 3D (rotateX) como si se repartiera de
                    un mazo, con delay creciente por columna — reemplaza el fade+slide plano de
                    UX-38. `perspective` en el contenedor habilita el giro 3D de las cards. */}
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-20 sm:pb-28">
                    <div
                        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6"
                        style={{ perspective: 1400 }}
                    >
                        {features.map((feat, i) => {
                            const tint = sectionTints[i % sectionTints.length];
                            const Icon = feat.icon;
                            const cardMotion = featureCardMotion(i, !!prefersReducedMotion);
                            return (
                                <motion.div
                                    key={feat.title}
                                    className="bg-surface border border-border rounded-card p-6 sm:p-8 flex flex-col"
                                    style={{ transformPerspective: 1400 }}
                                    initial={cardMotion.initial}
                                    whileInView={cardMotion.whileInView}
                                    viewport={{ once: true, amount: 0.35 }}
                                    transition={cardMotion.transition}
                                    whileHover={{ scale: 1.02, transition: { duration: 0.15, ease: 'easeOut' } }}
                                >
                                    <div className={`w-14 h-14 rounded-card ${tint.bg} flex items-center justify-center mb-6`}>
                                        <Icon size={26} className={tint.text} />
                                    </div>

                                    <h4 className="text-xl font-serif text-text mb-3">{feat.title}</h4>
                                    <p className="text-sm text-text-2 leading-relaxed">{feat.description}</p>

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
                            { number: 5, suffix: ' min', label: 'Setup inicial', sublabel: 'y estás operando', icon: FiClock },
                            { number: 100, suffix: '%', label: 'Datos centralizados', sublabel: 'en un solo lugar', icon: FiLayers },
                            { number: 40, suffix: '%', label: 'Más eficiencia', sublabel: 'en gestión diaria', icon: FiTrendingUp },
                            { number: 24, suffix: '/7', label: 'Disponible', sublabel: 'siempre online', icon: FiBarChart2 },
                        ].map((stat, i) => {
                            const tint = sectionTints[i % sectionTints.length];
                            return (
                                <motion.div
                                    key={stat.label}
                                    className="bg-surface border border-border rounded-card p-6 text-center"
                                    variants={fadeSlideUpShort}
                                >
                                    <div className={`w-12 h-12 rounded-card ${tint.bg} flex items-center justify-center mx-auto mb-4`}>
                                        <stat.icon size={22} className={tint.text} />
                                    </div>
                                    <p className="font-serif text-[34px] font-semibold text-text leading-none">
                                        {stat.number}<span className="text-2xl">{stat.suffix}</span>
                                    </p>
                                    <p className="text-sm font-semibold text-text mt-3">{stat.label}</p>
                                    <p className="text-xs text-muted mt-1">{stat.sublabel}</p>
                                </motion.div>
                            );
                        })}
                    </motion.div>
                </div>
            </section>

            {/* ── HOW IT WORKS ── */}
            <section id="como-funciona" className="py-24 sm:py-32 relative scroll-mt-20 bg-bg">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="text-center max-w-2xl mx-auto mb-20">
                        <span className="inline-flex items-center gap-2 bg-rose-bg text-accent rounded-pill px-4 py-1.5 text-xs font-semibold uppercase tracking-widest mb-4">
                            Cómo funciona
                        </span>
                        <h3 className="text-3xl sm:text-4xl lg:text-6xl font-serif text-wine">Empieza en minutos</h3>
                        <p className="text-sm sm:text-base text-text-2 mt-4 max-w-lg mx-auto">Tres pasos simples para transformar la gestión de tu centro de estética.</p>
                    </div>

                    {/* Steps */}
                    <div className="max-w-4xl mx-auto space-y-28 sm:space-y-40">
                        {steps.map((step, i) => {
                            const tint = sectionTints[i % sectionTints.length];
                            return (
                                <motion.div
                                    key={step.number}
                                    className={`flex flex-col sm:flex-row items-center gap-8 sm:gap-16 ${i % 2 !== 0 ? 'sm:flex-row-reverse' : ''}`}
                                    initial={{ opacity: 0, x: i % 2 !== 0 ? 24 : -24 }}
                                    whileInView={{ opacity: 1, x: 0 }}
                                    viewport={{ once: true, amount: 0.4 }}
                                    transition={{ duration: 0.5, ease: 'easeOut' }}
                                >
                                    {/* Step number - static circle */}
                                    <div className="shrink-0">
                                        <div className={`w-28 h-28 sm:w-36 sm:h-36 rounded-full ${tint.bg} flex items-center justify-center`}>
                                            <span className={`text-4xl sm:text-5xl font-serif font-bold ${tint.text}`}>{step.number}</span>
                                        </div>
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
                    <motion.div
                        className="bg-wine rounded-card p-8 sm:p-12 lg:p-16"
                        initial={{ opacity: 0 }}
                        whileInView={{ opacity: 1 }}
                        viewport={{ once: true, amount: 0.4 }}
                        transition={{ duration: 0.6, ease: 'easeOut' }}
                    >
                        <h2 className="text-3xl sm:text-4xl lg:text-5xl font-serif text-white leading-tight">
                            ¿Listo para simplificar tu gestión?
                        </h2>
                        <p className="text-base sm:text-lg mt-4 max-w-lg mx-auto" style={{ color: 'var(--color-accent-tint)' }}>
                            Únete a los centros de estética que ya confían en Shear para administrar su negocio.
                        </p>
                        <div className="flex flex-col sm:flex-row gap-3 justify-center mt-8">
                            <Link
                                to="/registro"
                                className="bg-white hover:opacity-90 text-wine px-8 py-3.5 rounded-ctrl text-sm font-semibold flex items-center justify-center gap-2 transition-opacity no-underline"
                            >
                                Crear cuenta gratis <FiArrowRight size={16} />
                            </Link>
                            <Link
                                to="/login"
                                className="border border-white/30 hover:bg-white/10 text-white px-8 py-3.5 rounded-ctrl text-sm font-semibold transition-colors no-underline"
                            >
                                Iniciar sesión
                            </Link>
                        </div>
                        <p className="text-xs mt-4" style={{ color: 'var(--color-accent-tint)' }}>Sin compromiso. Sin tarjeta de crédito.</p>
                    </motion.div>
                </div>
            </section>

            {/* ── FOOTER ── */}
            <footer className="border-t border-border bg-surface">
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
            </footer>
        </div>
    );
}

interface HeroMockupProps {
    prefersReducedMotion: boolean;
}

/* ── Hero Mockup: modern CSS-based app preview ── */
function HeroMockup({ prefersReducedMotion }: HeroMockupProps) {
    const bg = 'bg-surface';
    const innerBg = 'bg-surface-2';

    // Float sutil y permanente (§13.1); se desactiva si el usuario prefiere menos movimiento.
    const floatA = prefersReducedMotion
        ? {}
        : { animate: { y: [0, -8, 0] }, transition: { duration: 4, repeat: Infinity, ease: 'easeInOut' as const } };
    const floatB = prefersReducedMotion
        ? {}
        : { animate: { y: [0, -6, 0] }, transition: { duration: 3.2, repeat: Infinity, ease: 'easeInOut' as const, delay: 0.6 } };

    return (
        <motion.div
            className="relative mx-auto max-w-lg px-8 py-4"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
        >
            {/* Mockup frame */}
            <div className={`relative ${bg} rounded-2xl border border-border overflow-hidden z-10`}>
                {/* Window chrome */}
                <div className={`flex items-center gap-2 px-4 py-3 border-b border-border-soft ${innerBg}`}>
                    <span className="w-2.5 h-2.5 rounded-full bg-alert-text" />
                    <span className="w-2.5 h-2.5 rounded-full bg-gold" />
                    <span className="w-2.5 h-2.5 rounded-full bg-sage" />
                    <div className="flex-1 flex justify-center">
                        <span className="text-xs font-serif font-semibold text-muted">Shear</span>
                    </div>
                    <div className="w-6 h-6 rounded-full bg-rose-bg flex items-center justify-center">
                        <FiUsers size={10} className="text-accent" />
                    </div>
                </div>

                {/* Content */}
                <div className={`${innerBg} p-5 space-y-4`}>
                    {/* Stats row */}
                    <div className="grid grid-cols-2 gap-3">
                        <div className="bg-surface border border-border rounded-xl p-4">
                            <p className="text-[10px] font-semibold tracking-widest text-muted uppercase">Clientes</p>
                            <p className="text-3xl font-serif font-bold text-text mt-1">128</p>
                        </div>
                        <div className="bg-surface border border-border rounded-xl p-4">
                            <p className="text-[10px] font-semibold tracking-widest text-muted uppercase">Servicios</p>
                            <p className="text-3xl font-serif font-bold text-text mt-1">47</p>
                        </div>
                    </div>

                    {/* Retoques */}
                    <div className="bg-surface border border-border rounded-xl p-4">
                        <p className="text-sm font-serif font-semibold text-text mb-3">Próximos retoques</p>
                        <div className="space-y-2.5">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <span className="w-2 h-2 rounded-full bg-accent-rose" />
                                    <span className="text-xs text-text-2">María García — Corte</span>
                                </div>
                                <span className="text-[10px] font-medium text-accent-rose bg-rose-bg px-2 py-0.5 rounded-full">En 7 días</span>
                            </div>
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <span className="w-2 h-2 rounded-full bg-gold" />
                                    <span className="text-xs text-text-2">Carlos Ruiz — Coloración</span>
                                </div>
                                <span className="text-[10px] font-medium text-gold-text bg-gold-bg px-2 py-0.5 rounded-full">Mañana</span>
                            </div>
                        </div>
                    </div>

                    {/* Bottom row */}
                    <div className="grid grid-cols-2 gap-3">
                        <div className="bg-surface border border-border rounded-xl p-3">
                            <p className="text-xs font-serif font-semibold text-text mb-2">Agenda</p>
                            <div className="flex gap-1">
                                {['L', 'M', 'X', 'J', 'V', 'S'].map((d, i) => (
                                    <div key={d} className={`flex-1 h-1.5 rounded-full ${i < 3 ? 'bg-accent/30' : 'bg-dotted'}`} />
                                ))}
                            </div>
                            <p className="text-[10px] text-muted mt-2">3 turnos hoy</p>
                        </div>
                        <div className="bg-surface border border-border rounded-xl p-3">
                            <p className="text-xs font-serif font-semibold text-text mb-2">Movimientos</p>
                            <div className="space-y-1.5">
                                <div className="flex items-center gap-1.5">
                                    <span className="w-1.5 h-1.5 rounded-full bg-gold" />
                                    <span className="text-[10px] text-muted">Corte — Sra. García</span>
                                </div>
                                <div className="flex items-center gap-1.5">
                                    <span className="w-1.5 h-1.5 rounded-full bg-accent-rose" />
                                    <span className="text-[10px] text-muted">Manicure — Sra. López</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Floating badges — float loop sutil y permanente, desfasado entre sí (§13.1) */}
            <motion.div
                className="absolute -bottom-4 -left-4 bg-surface border border-border rounded-xl px-4 py-2.5 z-20"
                {...floatA}
            >
                <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-rose-bg flex items-center justify-center">
                        <FiTrendingUp size={14} className="text-accent-rose" />
                    </div>
                    <div>
                        <p className="text-xs font-semibold text-text">+40% eficiencia</p>
                        <p className="text-[10px] text-muted">en gestión diaria</p>
                    </div>
                </div>
            </motion.div>

            <motion.div
                className="absolute -top-2 -right-4 bg-surface border border-border rounded-xl px-4 py-2.5 z-20"
                {...floatB}
            >
                <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-gold-bg flex items-center justify-center">
                        <FiClock size={14} className="text-gold-text" />
                    </div>
                    <div>
                        <p className="text-xs font-semibold text-text">Setup en 5 min</p>
                        <p className="text-[10px] text-muted">sin complicaciones</p>
                    </div>
                </div>
            </motion.div>
        </motion.div>
    );
}
