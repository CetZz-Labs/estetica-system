import { useAuth } from '@clerk/react';
import { Navigate, Link } from 'react-router';
import { useState, useEffect, useRef } from 'react';
import { motion, type Variants, useScroll, useTransform } from 'motion/react';
import {
    FiUsers, FiScissors, FiBox, FiCalendar, FiActivity, FiCheckCircle,
    FiArrowRight, FiMenu, FiX, FiClock, FiLayers, FiTrendingUp,
    FiShield, FiSmartphone, FiBarChart2
} from 'react-icons/fi';
import useIsDark from '../hooks/useIsDark';
import ThemeToggle from '../components/ui/ThemeToggle';
import Aurora from '../components/react-bits/Aurora/Aurora';
import TextType from '../components/react-bits/TextType/TextType';
import CountUp from '../components/react-bits/CountUp/CountUp';
import ShinyText from '../components/react-bits/ShinyText/ShinyText';
import GradientText from '../components/react-bits/GradientText/GradientText';
import ClickSpark from '../components/react-bits/ClickSpark/ClickSpark';
import StarBorder from '../components/react-bits/StarBorder/StarBorder';
import SpotlightCard from '../components/react-bits/SpotlightCard/SpotlightCard';

const fadeUp: Variants = {
    hidden: { opacity: 0, y: 24 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: 'easeOut' } }
};

const fadeIn: Variants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { duration: 0.5 } }
};

const stagger: Variants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.1, delayChildren: 0.15 } }
};

const featureColors = {
    primary: { bg: 'bg-primary/5', border: 'border-primary/20', icon: 'text-primary', accent: '#c97580' },
    ring: { bg: 'bg-ring/5', border: 'border-ring/20', icon: 'text-ring', accent: '#80a890' },
    warning: { bg: 'bg-warning/5', border: 'border-warning/20', icon: 'text-warning', accent: '#E5A059' },
    accent: { bg: 'bg-accent/10', border: 'border-accent/30', icon: 'text-accent-foreground', accent: '#c4656a' },
};

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
    const [scrolled, setScrolled] = useState(false);
    const isDark = useIsDark();

    useEffect(() => {
        const handleScroll = () => {
            setScrolled(window.scrollY > 40);
        };
        window.addEventListener('scroll', handleScroll, { passive: true });
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    if (!isLoaded) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background text-foreground font-sans">
                <div className="text-center">
                    <img src={isDark ? '/shear-logo-dark.png' : '/shear-logo.png'} alt="Shear" className="h-20 w-auto mx-auto" />
                    <p className="text-sm text-gray-400 mt-2">Cargando...</p>
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
        <div className="min-h-screen bg-background text-foreground font-sans">
            {/* ── NAV: Floating pill ── */}
            <motion.header
                initial="hidden"
                animate="visible"
                variants={fadeIn}
                className="fixed top-4 left-1/2 -translate-x-1/2 z-50 w-full max-w-5xl px-4"
            >
                <nav
                    className={`flex items-center justify-between h-14 px-4 rounded-full transition-all duration-300 ${scrolled
                        ? 'bg-white/80 dark:bg-card/80 backdrop-blur-xl shadow-lg shadow-black/5 border border-border/50'
                        : 'bg-white/60 dark:bg-card/60 backdrop-blur-md border border-border/30'
                        }`}
                >
                    <Link to="/" className="flex items-center gap-2 no-underline shrink-0">
                        <img src={isDark ? '/shear-logo-dark.png' : '/shear-logo.png'} alt="Shear" className="h-9 w-auto" />
                    </Link>

                    <div className="hidden md:flex items-center gap-1">
                        {navLinks.map(link => (
                            <a
                                key={link.href}
                                href={link.href}
                                className="px-4 py-2 text-sm font-medium text-gray-500 hover:text-foreground hover:bg-muted/50 rounded-full transition-all duration-200 no-underline"
                            >
                                {link.label}
                            </a>
                        ))}
                    </div>

                    <div className="hidden md:flex items-center gap-2">
                        <Link
                            to="/login"
                            className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-foreground hover:bg-muted/50 rounded-full transition-all duration-200 no-underline"
                        >
                            Iniciar sesión
                        </Link>
                        <Link
                            to="/registro"
                            className="bg-primary hover:bg-primary/90 text-white px-5 py-2 rounded-full text-sm font-medium flex items-center gap-1.5 transition-all duration-200 shadow-sm hover:shadow-md no-underline"
                        >
                            Comenzar gratis <FiArrowRight size={14} />
                        </Link>
                    </div>

                    <button
                        onClick={() => setMobileMenuOpen(true)}
                        className="md:hidden p-2 text-gray-600 hover:text-foreground hover:bg-muted/50 rounded-full transition-all cursor-pointer"
                        aria-label="Abrir menú"
                    >
                        <FiMenu size={20} />
                    </button>
                </nav>
            </motion.header>

            {/* Mobile menu overlay */}
            {mobileMenuOpen && (
                <div className="fixed inset-0 z-50 md:hidden">
                    <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setMobileMenuOpen(false)} />
                    <div className="absolute top-0 right-0 bottom-0 w-72 bg-card shadow-xl border-l border-border p-6 transform transition-transform">
                        <div className="flex items-center justify-between mb-8">
                            <span className="text-xl font-serif font-bold tracking-wide">Shear</span>
                            <button onClick={() => setMobileMenuOpen(false)} className="p-2 text-gray-400 hover:text-gray-700 cursor-pointer" aria-label="Cerrar menú">
                                <FiX size={24} />
                            </button>
                        </div>
                        <nav className="flex flex-col gap-4">
                            {navLinks.map(link => (
                                <a key={link.href} href={link.href} onClick={() => setMobileMenuOpen(false)}
                                    className="text-sm font-medium text-gray-600 hover:text-foreground transition-colors py-2 no-underline"
                                >
                                    {link.label}
                                </a>
                            ))}
                            <hr className="border-border my-4" />
                            <Link to="/login" onClick={() => setMobileMenuOpen(false)}
                                className="text-sm font-medium text-gray-600 hover:text-foreground py-2 no-underline"
                            >
                                Iniciar sesión
                            </Link>
                            <Link to="/registro" onClick={() => setMobileMenuOpen(false)}
                                className="bg-primary hover:bg-primary/90 text-white px-5 py-3 rounded-full text-sm font-medium flex items-center justify-center gap-2 transition-all shadow-sm no-underline"
                            >
                                Comenzar gratis <FiArrowRight size={16} />
                            </Link>
                        </nav>
                    </div>
                </div>
            )}

            {/* ── HERO ── */}
            <ClickSpark sparkColor="#c97580" sparkSize={12} sparkRadius={20} sparkCount={10} duration={500}>
                <section className="relative pt-28 sm:pt-36 pb-16 sm:pb-24 overflow-hidden">
                    {/* Aurora background */}
                    <div className="absolute inset-0 opacity-25 pointer-events-none">
                        <Aurora colorStops={['#c97580', '#80a890', '#f5d5cc']} amplitude={1.2} blend={0.6} speed={0.8} />
                    </div>

                    {/* Decorative blobs */}
                    <div className="absolute top-20 left-10 w-72 h-72 bg-primary/5 rounded-full blur-3xl pointer-events-none" />
                    <div className="absolute bottom-10 right-10 w-96 h-96 bg-ring/5 rounded-full blur-3xl pointer-events-none" />

                    <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                        <motion.div
                            initial="hidden"
                            animate="visible"
                            variants={stagger}
                            className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center"
                        >
                            <motion.div variants={stagger} className="text-center lg:text-left">
                                <motion.div variants={fadeUp} className="mb-6">
                                    <ShinyText
                                        text="CRM para centros de estética"
                                        className="inline-flex items-center gap-2 bg-white/80 border border-border/60 rounded-full px-4 py-1.5 text-xs font-semibold uppercase tracking-widest shadow-sm backdrop-blur-sm"
                                        color="#9CA3AF"
                                        shineColor="#c97580"
                                        speed={3}
                                    />
                                </motion.div>

                                <motion.h1 variants={fadeUp} className="text-4xl sm:text-5xl lg:text-6xl font-serif text-foreground leading-[1.1]">
                                    El sistema que{' '}
                                    <span className="relative inline-block pb-3 min-w-[200px] sm:min-w-[280px]">
                                        <TextType
                                            text={['simplifica', 'organiza', 'automatiza']}
                                            typingSpeed={80}
                                            deletingSpeed={40}
                                            pauseDuration={2000}
                                            className="text-primary"
                                            as="span"
                                            showCursor={true}
                                            cursorCharacter="|"
                                            cursorClassName="text-primary"
                                        />
                                        <svg className="absolute bottom-0 left-0 w-full h-4 text-ring/40" viewBox="0 0 240 16" preserveAspectRatio="none" overflow="visible">
                                            <path d="M4 8 Q 32 2, 60 8 T 120 8 T 180 8 T 236 8" stroke="currentColor" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                                        </svg>
                                    </span>{' '}
                                    tu centro de estética
                                </motion.h1>

                                <motion.p variants={fadeUp} className="mt-6 text-base sm:text-lg text-gray-500 max-w-lg mx-auto lg:mx-0 leading-relaxed">
                                    Gestiona clientes, servicios, inventario y turnos en un solo lugar.
                                    Ahorra horas de trabajo administrativo cada semana y haz crecer tu negocio con datos claros.
                                </motion.p>

                                <motion.div variants={fadeUp} className="flex flex-col sm:flex-row gap-3 mt-8 justify-center lg:justify-start">
                                    <Link to="/registro"
                                        className="bg-primary hover:bg-primary/90 text-white px-6 sm:px-8 py-3.5 rounded-full text-sm font-medium flex items-center justify-center gap-2 transition-all duration-200 shadow-md hover:shadow-lg no-underline group"
                                    >
                                        Prueba gratis
                                        <FiArrowRight size={16} className="group-hover:translate-x-0.5 transition-transform" />
                                    </Link>
                                    <a href="#funcionalidades"
                                        className="bg-white/80 backdrop-blur-sm border border-border/60 hover:border-border hover:bg-white text-gray-600 px-6 sm:px-8 py-3.5 rounded-full text-sm font-medium flex items-center justify-center gap-2 transition-all duration-200 shadow-sm no-underline"
                                    >
                                        Ver funcionalidades
                                    </a>
                                </motion.div>

                                <motion.div variants={fadeUp} className="flex items-center gap-6 mt-8 justify-center lg:justify-start text-xs text-gray-400">
                                    <span className="flex items-center gap-1.5"><FiShield size={14} /> Sin tarjeta</span>
                                    <span className="flex items-center gap-1.5"><FiSmartphone size={14} /> Multi-dispositivo</span>
                                </motion.div>
                            </motion.div>

                            <motion.div
                                variants={fadeUp}
                                transition={{ duration: 0.7, ease: 'easeOut' }}
                                className="relative"
                            >
                                <HeroMockup isDark={isDark} />
                            </motion.div>
                        </motion.div>
                    </div>
                </section>
            </ClickSpark>

            {/* ── FEATURES: Horizontal scroll on vertical scroll ── */}
            <section id="funcionalidades" className="relative scroll-mt-20">
                <div className="absolute inset-0 bg-gradient-to-b from-background via-card/50 to-background pointer-events-none" />

                {/* Header - stays in normal flow */}
                <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 sm:pt-28 pb-12 sm:pb-16">
                    <motion.div
                        initial={{ opacity: 0, y: 24 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true, margin: '-80px' }}
                        transition={{ duration: 0.6, ease: 'easeOut' }}
                        className="text-center max-w-3xl mx-auto"
                    >
                        <span className="inline-block text-xs font-semibold tracking-widest text-primary/70 uppercase mb-4 bg-primary/5 px-3 py-1 rounded-full">Funcionalidades</span>
                        <GradientText
                            colors={['#c97580', '#80a890', '#f5d5cc', '#c97580']}
                            animationSpeed={6}
                            className="text-4xl sm:text-5xl lg:text-9xl font-serif"
                        >
                            Todo lo que necesitas para gestionar tu centro
                        </GradientText>
                        <p className="text-base sm:text-lg text-gray-500 pt-10 max-w-xl mx-auto leading-relaxed">Desde clientes hasta inventario, Shear centraliza cada aspecto de tu operación diaria.</p>
                    </motion.div>
                </div>

                {/* Horizontal scroll wrapper */}
                <HorizontalScrollFeatures features={features} />
            </section>

            {/* ── STATS / IMPACT ── */}
            <section className="py-12 sm:py-32 relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-b from-card/30 to-background pointer-events-none" />

                {/* Large decorative blobs */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary/[0.03] rounded-full blur-3xl pointer-events-none" />

                <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <motion.div
                        initial={{ opacity: 0, y: 24 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true, margin: '-80px' }}
                        transition={{ duration: 0.6, ease: 'easeOut' }}
                        className="text-center mb-16 sm:mb-20"
                    >
                        <span className="inline-block text-xs font-semibold tracking-widest text-primary/70 uppercase mb-4 bg-primary/5 px-3 py-1 rounded-full">Impacto</span>
                        <h3 className="text-3xl sm:text-4xl lg:text-5xl font-serif text-foreground">Números que hablan</h3>
                    </motion.div>

                    <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
                        {[
                            { number: 5, suffix: ' min', label: 'Setup inicial', sublabel: 'y estás operando', icon: FiClock, color: 'primary' },
                            { number: 100, suffix: '%', label: 'Datos centralizados', sublabel: 'en un solo lugar', icon: FiLayers, color: 'ring' },
                            { number: 40, suffix: '%', label: 'Más eficiencia', sublabel: 'en gestión diaria', icon: FiTrendingUp, color: 'warning' },
                            { number: 24, suffix: '/7', label: 'Disponible', sublabel: 'siempre online', icon: FiBarChart2, color: 'accent' },
                        ].map((stat, i) => {
                            const colors = featureColors[stat.color as keyof typeof featureColors];
                            return (
                                <motion.div
                                    key={i}
                                    initial={{ opacity: 0, y: 40, scale: 0.95 }}
                                    whileInView={{ opacity: 1, y: 0, scale: 1 }}
                                    viewport={{ once: true, margin: '-50px' }}
                                    transition={{ duration: 0.5, delay: i * 0.12, ease: 'easeOut' }}
                                    whileHover={{ y: -6, transition: { duration: 0.2 } }}
                                    className="bg-card border border-border/60 rounded-3xl p-8 text-center shadow-sm hover:shadow-xl transition-all duration-300 relative overflow-hidden group"
                                >
                                    {/* Glow on hover */}
                                    <div className={`absolute -top-10 -right-10 w-40 h-40 ${colors.bg} rounded-full blur-2xl opacity-0 group-hover:opacity-60 transition-opacity duration-700`} />

                                    {/* Icon */}
                                    <div className={`relative w-14 h-14 ${colors.bg} ${colors.border} border-2 rounded-2xl flex items-center justify-center mx-auto mb-6 transition-transform duration-300 group-hover:scale-110`}>
                                        <stat.icon size={26} className={colors.icon} />
                                    </div>

                                    {/* Number - BIG */}
                                    <p className="text-5xl sm:text-6xl font-serif font-bold text-foreground mb-2">
                                        <CountUp to={stat.number} duration={2} delay={0.2 + i * 0.15} />
                                        <span className="text-3xl sm:text-4xl">{stat.suffix}</span>
                                    </p>

                                    <p className="text-sm font-semibold text-foreground/80 mb-1">{stat.label}</p>
                                    <p className="text-xs text-gray-400">{stat.sublabel}</p>
                                </motion.div>
                            );
                        })}
                    </div>
                </div>
            </section>

            {/* ── HOW IT WORKS: Steps appear on scroll ── */}
            <section id="como-funciona" className="py-24 sm:py-32 relative scroll-mt-20 overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-b from-background via-card/30 to-background pointer-events-none" />

                <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <motion.div
                        initial={{ opacity: 0, y: 24 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true, margin: '-80px' }}
                        transition={{ duration: 0.6, ease: 'easeOut' }}
                        className="text-center max-w-2xl mx-auto mb-20"
                    >
                        <span className="inline-block text-xs font-semibold tracking-widest text-primary/70 uppercase mb-4 bg-primary/5 px-3 py-1 rounded-full">Cómo funciona</span>
                        <h3 className="text-3xl sm:text-4xl lg:text-6xl font-serif text-foreground">Empieza en minutos</h3>
                        <p className="text-sm sm:text-base text-gray-500 mt-4 max-w-lg mx-auto">Tres pasos simples para transformar la gestión de tu centro de estética.</p>
                    </motion.div>

                    {/* Steps - each appears on scroll */}
                    <div className="max-w-4xl mx-auto space-y-28 sm:space-y-40">
                        {steps.map((step, i) => (
                            <motion.div
                                key={i}
                                initial={{ opacity: 0, y: 50, x: i % 2 === 0 ? -30 : 30 }}
                                whileInView={{ opacity: 1, y: 0, x: 0 }}
                                viewport={{ once: true, margin: '-100px' }}
                                transition={{ duration: 0.6, delay: 0.1, ease: 'easeOut' }}
                                className={`flex flex-col sm:flex-row items-center gap-8 sm:gap-16 ${i % 2 !== 0 ? 'sm:flex-row-reverse' : ''}`}
                            >
                                {/* Step number - BIG circle */}
                                <div className="shrink-0 relative">
                                    <motion.div
                                        whileInView={{ scale: [0.8, 1.05, 1] }}
                                        viewport={{ once: true }}
                                        transition={{ duration: 0.5, delay: 0.2 }}
                                        className="w-28 h-28 sm:w-36 sm:h-36 rounded-full bg-gradient-to-br from-primary via-primary/90 to-primary/70 text-white flex items-center justify-center shadow-2xl shadow-primary/30 relative"
                                    >
                                        <ShinyText
                                            text={step.number}
                                            color="#ffffff"
                                            shineColor="#f5d5cc"
                                            speed={2}
                                            className="text-4xl sm:text-5xl font-serif font-bold"
                                        />
                                        {/* Pulsing ring */}
                                        <div className="absolute inset-0 rounded-full border-2 border-primary/20 animate-ping" style={{ animationDuration: '3s' }} />
                                    </motion.div>
                                </div>

                                {/* Step content */}
                                <div className={`flex-1 ${i % 2 !== 0 ? 'sm:text-right sm:flex sm:flex-col sm:items-end' : ''}`}>
                                    <motion.div
                                        initial={{ opacity: 0, x: i % 2 === 0 ? -20 : 20 }}
                                        whileInView={{ opacity: 1, x: 0 }}
                                        viewport={{ once: true }}
                                        transition={{ duration: 0.5, delay: 0.3 }}
                                        className={`max-w-md ${i % 2 !== 0 ? 'sm:text-right' : ''}`}
                                    >
                                        <span className="inline-block text-xs font-semibold tracking-widest text-primary/60 uppercase mb-3">Paso {step.number}</span>
                                        <h4 className="text-2xl sm:text-3xl font-serif text-foreground mb-4">{step.title}</h4>
                                        <p className={`text-base sm:text-lg text-gray-500 leading-relaxed ${i % 2 !== 0 ? 'sm:text-right' : ''}`}>{step.description}</p>
                                    </motion.div>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ── CTA ── */}
            <motion.section
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, margin: '-80px' }}
                variants={stagger}
                className="py-20 sm:py-28"
            >
                <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
                    <motion.div
                        variants={fadeUp}
                        className="bg-card border border-border/60 rounded-3xl p-8 sm:p-12 lg:p-16 shadow-sm relative overflow-hidden"
                    >
                        {/* Decorative blobs */}
                        <div className="absolute -top-24 -right-24 w-72 h-72 bg-primary/5 rounded-full blur-3xl pointer-events-none" />
                        <div className="absolute -bottom-24 -left-24 w-72 h-72 bg-ring/5 rounded-full blur-3xl pointer-events-none" />
                        <div className="absolute inset-0 opacity-10 pointer-events-none">
                            <Aurora colorStops={['#c97580', '#80a890', '#f5d5cc']} amplitude={0.8} blend={0.4} speed={0.5} />
                        </div>

                        <motion.div variants={fadeUp} className="relative">
                            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-serif text-foreground leading-tight">
                                ¿Listo para simplificar tu gestión?
                            </h2>
                            <p className="text-base sm:text-lg text-gray-500 mt-4 max-w-lg mx-auto">
                                Únete a los centros de estética que ya confían en Shear para administrar su negocio.
                            </p>
                            <div className="flex flex-col sm:flex-row gap-3 justify-center mt-8">
                                <StarBorder
                                    as={Link}
                                    to="/registro"
                                    color="#c97580"
                                    speed="4s"
                                    thickness={2}
                                    className="no-underline"
                                >
                                    <span className="flex items-center gap-2 text-sm font-medium">
                                        Crear cuenta gratis <FiArrowRight size={16} />
                                    </span>
                                </StarBorder>
                                <Link
                                    to="/login"
                                    className="bg-white border border-gray-200 hover:border-gray-300 text-gray-600 px-8 py-3.5 rounded-full text-sm font-medium transition-all shadow-sm no-underline"
                                >
                                    Iniciar sesión
                                </Link>
                            </div>
                            <p className="text-xs text-gray-400 mt-4">Sin compromiso. Sin tarjeta de crédito.</p>
                        </motion.div>
                    </motion.div>
                </div>
            </motion.section>

            {/* ── FOOTER ── */}
            <motion.footer
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                variants={fadeIn}
                className="border-t border-border/60 bg-card/50"
            >
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                        <div className="flex items-center gap-2">
                            <img src={isDark ? '/shear-logo-dark.png' : '/shear-logo.png'} alt="Shear" className="h-11 w-auto" />
                        </div>
                        <nav className="flex items-center gap-6 text-xs font-medium text-gray-400">
                            <a href="#funcionalidades" className="hover:text-foreground transition-colors no-underline">Funcionalidades</a>
                            <a href="#como-funciona" className="hover:text-foreground transition-colors no-underline">Cómo funciona</a>
                            <Link to="/login" className="hover:text-foreground transition-colors no-underline">Iniciar sesión</Link>
                            <Link to="/registro" className="hover:text-foreground transition-colors no-underline">Registrarse</Link>
                        </nav>
                        <p className="text-xs text-gray-400">
                            &copy; {new Date().getFullYear()} Shear. Todos los derechos reservados.
                        </p>
                    </div>
                </div>
            </motion.footer>

            <ThemeToggle />
        </div>
    );
}

/* ── Horizontal Scroll Features (Lando Norris style) ── */
function HorizontalScrollFeatures({ features: feats }: { features: typeof features }) {
    const targetRef = useRef<HTMLDivElement>(null);
    const { scrollYProgress } = useScroll({
        target: targetRef,
    });

    const x = useTransform(scrollYProgress, [0, 1], ['0%', '-70%']);

    const featureDetails: Record<string, { highlight: string; subtext: string }> = {
        primary: { highlight: '128', subtext: 'clientes activos confían en Shear' },
        ring: { highlight: '47', subtext: 'servicios configurados en promedio' },
        warning: { highlight: '0', subtext: 'desperdicios con control de stock' },
        accent: { highlight: '∞', subtext: 'turnos organizados sin esfuerzo' },
    };

    return (
        <div ref={targetRef} className="relative h-[300vh]">
            <div className="sticky top-0 flex h-screen items-center overflow-hidden">
                <motion.div style={{ x }} className="flex gap-8 px-8 sm:px-16 lg:px-24">
                    {feats.map((feat, i) => {
                        const colors = featureColors[feat.colorKey];
                        const Icon = feat.icon;
                        const detail = featureDetails[feat.colorKey];
                        return (
                            <div
                                key={i}
                                className="shrink-0 w-[85vw] sm:w-[70vw] lg:w-[40vw] max-w-xl h-[75vh] max-h-[600px]"
                            >
                                <SpotlightCard
                                    className="h-full group relative overflow-hidden flex flex-col"
                                    spotlightColor={`${colors.accent}22`}
                                >
                                    {/* Accent top bar */}
                                    <div className={`absolute top-0 left-0 right-0 h-2 rounded-t-2xl bg-gradient-to-r ${feat.colorKey === 'primary' ? 'from-primary/60 to-primary/10' : feat.colorKey === 'ring' ? 'from-ring/60 to-ring/10' : feat.colorKey === 'warning' ? 'from-warning/60 to-warning/10' : 'from-accent/60 to-accent/10'}`} />

                                    {/* Background glow */}
                                    <div className={`absolute -top-24 -right-24 w-72 h-72 ${colors.bg} rounded-full blur-3xl opacity-40 pointer-events-none`} />

                                    <div className="relative pt-8 pb-6 px-8 flex-1 flex flex-col">
                                        {/* Icon */}
                                        <div className={`w-20 h-20 rounded-3xl ${colors.bg} ${colors.border} border-2 flex items-center justify-center mb-8 transition-all duration-300 group-hover:scale-110 group-hover:shadow-xl`}>
                                            <Icon size={36} className={colors.icon} />
                                        </div>

                                        {/* Title - BIG */}
                                        <h4 className="text-3xl sm:text-4xl font-serif text-foreground mb-5 leading-tight">{feat.title}</h4>

                                        {/* Description - bigger */}
                                        <p className="text-lg sm:text-xl text-gray-500 leading-relaxed mb-6">{feat.description}</p>

                                        {/* Spacer */}
                                        <div className="flex-1" />

                                        {/* Big stat number */}
                                        <div className="mt-auto pt-6 border-t border-border/40">
                                            <p className="text-5xl sm:text-6xl font-serif font-bold" style={{ color: colors.accent }}>
                                                {detail.highlight}
                                            </p>
                                            <p className="text-sm text-gray-400 mt-2">{detail.subtext}</p>
                                        </div>

                                        {/* Original stat badge */}
                                        {feat.featured && feat.stat && (
                                            <div className="flex items-center gap-3 mt-4">
                                                <div className="w-7 h-7 rounded-full bg-ring/10 flex items-center justify-center">
                                                    <FiTrendingUp size={14} className="text-ring" />
                                                </div>
                                                <span className="text-sm font-medium text-ring">{feat.stat}</span>
                                            </div>
                                        )}
                                    </div>
                                </SpotlightCard>
                            </div>
                        );
                    })}
                </motion.div>
            </div>
        </div>
    );
}

/* ── Hero Mockup: modern CSS-based app preview ── */
function HeroMockup({ isDark }: { isDark: boolean }) {
    const bg = isDark ? 'bg-card' : 'bg-white';
    const innerBg = isDark ? 'bg-background' : 'bg-[#fff9f6]';
    return (
        <div className="relative mx-auto max-w-lg px-8 py-4">
            {/* Mockup frame */}
            <div className={`relative ${bg} rounded-2xl border border-border/60 shadow-2xl shadow-black/5 overflow-hidden z-10`}>
                {/* Window chrome */}
                <div className={`flex items-center gap-2 px-4 py-3 border-b border-border/40 ${innerBg}`}>
                    <span className="w-2.5 h-2.5 rounded-full bg-[#e5484d]" />
                    <span className="w-2.5 h-2.5 rounded-full bg-[#E5A059]" />
                    <span className="w-2.5 h-2.5 rounded-full bg-[#6b8e7b]" />
                    <div className="flex-1 flex justify-center">
                        <span className="text-xs font-serif font-semibold text-foreground/60">Shear</span>
                    </div>
                    <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center">
                        <FiUsers size={10} className="text-primary" />
                    </div>
                </div>

                {/* Content */}
                <div className={`${innerBg} p-5 space-y-4`}>
                    {/* Stats row */}
                    <div className="grid grid-cols-2 gap-3">
                        <div className="bg-white border border-border/40 rounded-xl p-4">
                            <p className="text-[10px] font-semibold tracking-widest text-gray-400 uppercase">Clientes</p>
                            <p className="text-3xl font-serif font-bold text-foreground mt-1">128</p>
                        </div>
                        <div className="bg-white border border-border/40 rounded-xl p-4">
                            <p className="text-[10px] font-semibold tracking-widest text-gray-400 uppercase">Servicios</p>
                            <p className="text-3xl font-serif font-bold text-foreground mt-1">47</p>
                        </div>
                    </div>

                    {/* Retoques */}
                    <div className="bg-white border border-border/40 rounded-xl p-4">
                        <p className="text-sm font-serif font-semibold text-foreground mb-3">Próximos retoques</p>
                        <div className="space-y-2.5">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <span className="w-2 h-2 rounded-full bg-ring" />
                                    <span className="text-xs text-foreground/70">María García — Corte</span>
                                </div>
                                <span className="text-[10px] font-medium text-ring bg-ring/10 px-2 py-0.5 rounded-full">En 7 días</span>
                            </div>
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <span className="w-2 h-2 rounded-full bg-warning" />
                                    <span className="text-xs text-foreground/70">Carlos Ruiz — Coloración</span>
                                </div>
                                <span className="text-[10px] font-medium text-warning bg-warning/10 px-2 py-0.5 rounded-full">Mañana</span>
                            </div>
                        </div>
                    </div>

                    {/* Bottom row */}
                    <div className="grid grid-cols-2 gap-3">
                        <div className="bg-white border border-border/40 rounded-xl p-3">
                            <p className="text-xs font-serif font-semibold text-foreground mb-2">Agenda</p>
                            <div className="flex gap-1">
                                {['L', 'M', 'X', 'J', 'V', 'S'].map((d, i) => (
                                    <div key={d} className={`flex-1 h-1.5 rounded-full ${i < 3 ? 'bg-primary/30' : 'bg-gray-100'}`} />
                                ))}
                            </div>
                            <p className="text-[10px] text-gray-400 mt-2">3 turnos hoy</p>
                        </div>
                        <div className="bg-white border border-border/40 rounded-xl p-3">
                            <p className="text-xs font-serif font-semibold text-foreground mb-2">Movimientos</p>
                            <div className="space-y-1.5">
                                <div className="flex items-center gap-1.5">
                                    <span className="w-1.5 h-1.5 rounded-full bg-warning" />
                                    <span className="text-[10px] text-gray-400">Corte — Sra. García</span>
                                </div>
                                <div className="flex items-center gap-1.5">
                                    <span className="w-1.5 h-1.5 rounded-full bg-ring" />
                                    <span className="text-[10px] text-gray-400">Manicure — Sra. López</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Floating badges */}
            <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 1, duration: 0.5 }}
                className="absolute -bottom-4 -left-4 bg-white border border-border/60 rounded-xl px-4 py-2.5 shadow-lg shadow-black/5 backdrop-blur-sm z-20"
            >
                <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-ring/10 flex items-center justify-center">
                        <FiTrendingUp size={14} className="text-ring" />
                    </div>
                    <div>
                        <p className="text-xs font-semibold text-foreground">+40% eficiencia</p>
                        <p className="text-[10px] text-gray-400">en gestión diaria</p>
                    </div>
                </div>
            </motion.div>

            <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 1.2, duration: 0.5 }}
                className="absolute -top-2 -right-4 bg-white border border-border/60 rounded-xl px-4 py-2.5 shadow-lg shadow-black/5 backdrop-blur-sm z-20"
            >
                <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-warning/10 flex items-center justify-center">
                        <FiClock size={14} className="text-warning" />
                    </div>
                    <div>
                        <p className="text-xs font-semibold text-foreground">Setup en 5 min</p>
                        <p className="text-[10px] text-gray-400">sin complicaciones</p>
                    </div>
                </div>
            </motion.div>
        </div>
    );
}
