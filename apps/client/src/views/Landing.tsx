import { useAuth } from '@clerk/react';
import { Navigate, Link } from 'react-router';
import { useState, useEffect } from 'react';
import { motion, type Variants } from 'motion/react';
import {
    FiUsers, FiScissors, FiBox, FiCalendar, FiActivity, FiCheckCircle,
    FiArrowRight, FiMenu, FiX, FiStar, FiClock, FiLayers, FiTrendingUp,
    FiShield, FiSmartphone, FiBarChart2, FiChevronRight
} from 'react-icons/fi';

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

function HeroIllustration() {
    return (
        <svg viewBox="0 0 520 420" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-auto max-w-lg mx-auto">
            {/* Device frame */}
            <rect x="60" y="20" width="400" height="380" rx="20" fill="white" stroke="#EAE6DF" strokeWidth="1.5" />
            <rect x="68" y="28" width="384" height="364" rx="14" fill="#FDFBF7" />

            {/* ── Top bar ── */}
            {/* Traffic light dots */}
            <circle cx="88" cy="48" r="4.5" fill="#E06B5E" />
            <circle cx="106" cy="48" r="4.5" fill="#E5A059" />
            <circle cx="124" cy="48" r="4.5" fill="#54A885" />

            {/* Logo block */}
            <rect x="148" y="38" width="24" height="20" rx="5" fill="#1A1A1A" />
            <text x="160" y="52" textAnchor="middle" fontSize="11" fontWeight="700" fontFamily="Playfair Display, serif" fill="white">S</text>

            {/* Title */}
            <text x="286" y="52" textAnchor="middle" fontSize="13" fontWeight="700" fontFamily="Playfair Display, serif" fill="#2C2A29">Shaer</text>

            {/* Avatar */}
            <circle cx="420" cy="48" r="10" fill="#FDFBF7" stroke="#EAE6DF" strokeWidth="1" />
            <circle cx="420" cy="44" r="4" fill="#D1CEC7" />
            <ellipse cx="420" cy="56" rx="6" ry="4" fill="#D1CEC7" />

            {/* ── Row 1: Stats cards ── */}
            {/* Card: Clientes */}
            <rect x="80" y="82" width="174" height="82" rx="14" fill="white" stroke="#EAE6DF" strokeWidth="1" />
            <text x="94" y="112" fontSize="10" fontWeight="600" fill="#9CA3AF" fontFamily="Inter, sans-serif" letterSpacing="1.5">CLIENTES</text>
            <text x="94" y="148" fontSize="28" fontWeight="700" fill="#2C2A29" fontFamily="Playfair Display, serif">128</text>

            {/* Card: Servicios */}
            <rect x="266" y="82" width="174" height="82" rx="14" fill="white" stroke="#EAE6DF" strokeWidth="1" />
            <text x="280" y="112" fontSize="10" fontWeight="600" fill="#9CA3AF" fontFamily="Inter, sans-serif" letterSpacing="1.5">SERVICIOS</text>
            <text x="280" y="148" fontSize="28" fontWeight="700" fill="#2C2A29" fontFamily="Playfair Display, serif">47</text>

            {/* ── Row 2: Timeline card ── */}
            <rect x="80" y="180" width="360" height="96" rx="14" fill="white" stroke="#EAE6DF" strokeWidth="1" />
            <text x="96" y="206" fontSize="12" fontWeight="700" fill="#2C2A29" fontFamily="Playfair Display, serif">Próximos retoques</text>

            {/* Timeline item 1 */}
            <circle cx="104" cy="228" r="5" fill="#54A885" stroke="white" strokeWidth="2" />
            <text x="120" y="233" fontSize="11" fill="#2C2A29" fontFamily="Inter, sans-serif">María García — Corte</text>
            <rect x="356" y="222" width="64" height="18" rx="9" fill="#54A885" fillOpacity="0.1" />
            <text x="388" y="234" fontSize="10" fontWeight="600" fill="#54A885" textAnchor="middle" fontFamily="Inter, sans-serif">En 7 días</text>

            {/* Timeline item 2 */}
            <circle cx="104" cy="254" r="5" fill="#E5A059" stroke="white" strokeWidth="2" />
            <text x="120" y="259" fontSize="11" fill="#2C2A29" fontFamily="Inter, sans-serif">Carlos Ruiz — Coloración</text>
            <rect x="356" y="248" width="64" height="18" rx="9" fill="#E5A059" fillOpacity="0.1" />
            <text x="388" y="260" fontSize="10" fontWeight="600" fill="#E5A059" textAnchor="middle" fontFamily="Inter, sans-serif">Mañana</text>

            {/* Timeline left vertical line */}
            <line x1="108" y1="216" x2="108" y2="266" stroke="#EAE6DF" strokeWidth="1.5" strokeDasharray="3 3" />

            {/* ── Row 3: Bottom cards ── */}
            {/* Card: Agenda */}
            <rect x="80" y="294" width="172" height="74" rx="14" fill="white" stroke="#EAE6DF" strokeWidth="1" />
            <text x="96" y="316" fontSize="12" fontWeight="700" fill="#2C2A29" fontFamily="Playfair Display, serif">Agenda</text>
            <rect x="92" y="328" width="148" height="14" rx="4" fill="#FDFBF7" stroke="#EAE6DF" strokeWidth="0.5" />
            <text x="98" y="339" fontSize="8" fill="#6B7280" fontFamily="Inter, sans-serif">Lun  Mar  Mié  Jue  Vie  Sáb</text>
            <rect x="92" y="346" width="148" height="14" rx="4" fill="#54A885" fillOpacity="0.12" stroke="#54A885" strokeWidth="0.3" />
            <text x="98" y="357" fontSize="9" fontWeight="600" fill="#54A885" fontFamily="Inter, sans-serif">● 3 turnos programados hoy</text>

            {/* Card: Movimientos */}
            <rect x="268" y="294" width="172" height="74" rx="14" fill="white" stroke="#EAE6DF" strokeWidth="1" />
            <text x="284" y="316" fontSize="12" fontWeight="700" fill="#2C2A29" fontFamily="Playfair Display, serif">Movimientos</text>
            <line x1="284" y1="326" x2="420" y2="326" stroke="#EAE6DF" strokeWidth="1" />
            {/* Activity 1 */}
            <circle cx="292" cy="340" r="3" fill="#E5A059" />
            <text x="302" y="344" fontSize="9" fill="#6B7280" fontFamily="Inter, sans-serif">Corte — Sra. García</text>
            {/* Activity 2 */}
            <circle cx="292" cy="356" r="3" fill="#54A885" />
            <text x="302" y="360" fontSize="9" fill="#6B7280" fontFamily="Inter, sans-serif">Manicure — Sra. López</text>

            {/* ── Decorative elements outside device ── */}
            <motion.circle cx="24" cy="100" r="14" fill="#54A885" fillOpacity="0.08"
                animate={{ scale: [1, 1.15, 1], opacity: [0.08, 0.15, 0.08] }}
                transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
            />
            <motion.circle cx="502" cy="280" r="18" fill="#E5A059" fillOpacity="0.08"
                animate={{ scale: [1, 1.12, 1], opacity: [0.08, 0.14, 0.08] }}
                transition={{ duration: 3.5, repeat: Infinity, ease: 'easeInOut', delay: 1 }}
            />
            <motion.circle cx="488" cy="60" r="10" fill="#E06B5E" fillOpacity="0.06"
                animate={{ scale: [1, 1.2, 1], opacity: [0.06, 0.12, 0.06] }}
                transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut', delay: 0.5 }}
            />
        </svg>
    );
}

function FeatureIcon({ icon: Icon, color }: { icon: React.ElementType; color: string }) {
    return (
        <svg width="56" height="56" viewBox="0 0 56 56" fill="none" className="shrink-0">
            <rect x="2" y="2" width="52" height="52" rx="14" fill="#FDFBF7" stroke="#EAE6DF" strokeWidth="1.5" />
            <g transform="translate(16, 16)">
                <Icon size={24} color={color} />
            </g>
        </svg>
    );
}

const features = [
    {
        icon: FiUsers,
        title: 'Gestión de Clientes',
        description: 'Registra, busca y administra tus clientes con un solo clic. Accede al historial completo de visitas, notas médicas y datos de contacto.',
        featured: true,
        stat: '128 clientes activos',
        bentoClass: 'lg:col-span-2'
    },
    {
        icon: FiScissors,
        title: 'Catálogo de Servicios',
        description: 'Define servicios con duración y retoque. El sistema calcula automáticamente las próximas citas de mantenimiento.',
        featured: false,
        bentoClass: ''
    },
    {
        icon: FiBox,
        title: 'Control de Inventario',
        description: 'Controla tu stock con alertas visuales de productos bajos o agotados. Carga masiva desde Excel y descuento automático.',
        featured: false,
        bentoClass: ''
    },
    {
        icon: FiCalendar,
        title: 'Agenda de Turnos',
        description: 'Calendario visual con drag & drop. Convierte turnos completados en visitas registradas con un clic.',
        featured: false,
        bentoClass: ''
    },
    {
        icon: FiCheckCircle,
        title: 'Registro de Visitas',
        description: 'Registra servicios con consumibles en segundos. El stock se descuenta al instante y los retoques se programan solos.',
        featured: false,
        bentoClass: ''
    },
    {
        icon: FiActivity,
        title: 'Dashboard Inteligente',
        description: 'KPIs en tiempo real, próximos retoques con indicadores de urgencia y alertas de turnos pendientes. Todo en un panel.',
        featured: true,
        stat: '30% más rápido en decisiones',
        bentoClass: 'lg:col-span-3'
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

    useEffect(() => {
        const handleScroll = () => {
            setScrolled(window.scrollY > 40);
        };
        window.addEventListener('scroll', handleScroll, { passive: true });
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    if (!isLoaded) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-maison-bg text-maison-text font-sans">
                <div className="text-center">
                    <h1 className="text-3xl font-serif font-bold tracking-wide">Shaer</h1>
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
        <div className="min-h-screen bg-maison-bg text-maison-text font-sans">
            {/* ── NAV ── */}
            <motion.header
                initial="hidden"
                animate="visible"
                variants={fadeIn}
                className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${scrolled ? 'bg-white/90 backdrop-blur-md shadow-sm border-b border-maison-border' : 'bg-transparent'}`}>
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex items-center justify-between h-16 sm:h-20">
                        <Link to="/" className="flex items-center gap-2 no-underline">
                            <div className="w-8 h-8 rounded-lg bg-maison-primary flex items-center justify-center">
                                <span className="text-white font-serif font-bold text-sm">S</span>
                            </div>
                            <span className="text-xl font-serif font-bold tracking-wide text-maison-text">Shaer</span>
                        </Link>

                        {/* Desktop nav */}
                        <nav className="hidden md:flex items-center gap-8">
                            {navLinks.map(link => (
                                <a key={link.href} href={link.href}
                                    className="text-sm font-medium text-gray-500 hover:text-maison-text transition-colors no-underline"
                                >
                                    {link.label}
                                </a>
                            ))}
                        </nav>

                        {/* Desktop CTA */}
                        <div className="hidden md:flex items-center gap-3">
                            <Link to="/login"
                                className="px-4 py-2.5 text-sm font-medium text-gray-600 hover:text-maison-text transition-colors rounded-full no-underline"
                            >
                                Iniciar sesión
                            </Link>
                            <Link to="/registro"
                                className="bg-maison-primary hover:bg-black text-white px-5 py-2.5 rounded-full text-sm font-medium flex items-center gap-2 transition-all shadow-sm no-underline"
                            >
                                Comenzar gratis <FiArrowRight size={16} />
                            </Link>
                        </div>

                        {/* Mobile hamburger */}
                        <button
                            onClick={() => setMobileMenuOpen(true)}
                            className="md:hidden p-2 text-gray-600 hover:text-black transition-colors cursor-pointer"
                            aria-label="Abrir menú"
                        >
                            <FiMenu size={24} />
                        </button>
                    </div>
                </div>
            </motion.header>

            {/* Mobile menu overlay */}
            {mobileMenuOpen && (
                <div className="fixed inset-0 z-50 md:hidden">
                    <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setMobileMenuOpen(false)} />
                    <div className="absolute top-0 right-0 bottom-0 w-72 bg-maison-card shadow-xl border-l border-maison-border p-6 transform transition-transform">
                        <div className="flex items-center justify-between mb-8">
                            <span className="text-xl font-serif font-bold tracking-wide">Shaer</span>
                            <button onClick={() => setMobileMenuOpen(false)} className="p-2 text-gray-400 hover:text-gray-700 cursor-pointer" aria-label="Cerrar menú">
                                <FiX size={24} />
                            </button>
                        </div>
                        <nav className="flex flex-col gap-4">
                            {navLinks.map(link => (
                                <a key={link.href} href={link.href} onClick={() => setMobileMenuOpen(false)}
                                    className="text-sm font-medium text-gray-600 hover:text-maison-text transition-colors py-2 no-underline"
                                >
                                    {link.label}
                                </a>
                            ))}
                            <hr className="border-maison-border my-4" />
                            <Link to="/login" onClick={() => setMobileMenuOpen(false)}
                                className="text-sm font-medium text-gray-600 hover:text-maison-text py-2 no-underline"
                            >
                                Iniciar sesión
                            </Link>
                            <Link to="/registro" onClick={() => setMobileMenuOpen(false)}
                                className="bg-maison-primary hover:bg-black text-white px-5 py-3 rounded-full text-sm font-medium flex items-center justify-center gap-2 transition-all shadow-sm no-underline"
                            >
                                Comenzar gratis <FiArrowRight size={16} />
                            </Link>
                        </nav>
                    </div>
                </div>
            )}

            {/* ── HERO ── */}
            <section className="relative pt-28 sm:pt-36 pb-16 sm:pb-24 overflow-hidden">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <motion.div
                        initial="hidden"
                        animate="visible"
                        variants={stagger}
                        className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center"
                    >
                        <motion.div variants={stagger} className="text-center lg:text-left">
                            <motion.div variants={fadeUp} className="inline-flex items-center gap-2 bg-white border border-maison-border rounded-full px-4 py-1.5 text-xs font-semibold text-gray-500 uppercase tracking-widest mb-6 shadow-sm">
                                <FiStar size={14} className="text-maison-green" />
                                CRM para centros de estética
                            </motion.div>
                            <motion.h1 variants={fadeUp} className="text-4xl sm:text-5xl lg:text-6xl font-serif text-maison-text leading-tight">
                                El sistema que{' '}
                                <span className="relative inline-block pb-3">
                                    simplifica
                                    <svg className="absolute bottom-0 left-0 w-full h-4 text-maison-green/40" viewBox="0 0 240 16" preserveAspectRatio="none" overflow="visible">
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
                                    className="bg-maison-primary hover:bg-black text-white px-6 sm:px-8 py-3 rounded-full text-sm font-medium flex items-center justify-center gap-2 transition-all shadow-sm no-underline group"
                                >
                                    Prueba gratis{' '}
                                    <FiArrowRight size={16} className="group-hover:translate-x-0.5 transition-transform" />
                                </Link>
                                <a href="#funcionalidades"
                                    className="bg-white border border-gray-200 hover:border-gray-300 text-gray-600 px-6 sm:px-8 py-3 rounded-full text-sm font-medium flex items-center justify-center gap-2 transition-all shadow-sm no-underline"
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
                            <HeroIllustration />
                            {/* Floating badges */}
                            <div className="hidden sm:block absolute -left-4 bottom-12 bg-white border border-maison-border rounded-xl px-4 py-2.5 shadow-sm">
                                <div className="flex items-center gap-2">
                                    <div className="w-8 h-8 rounded-full bg-maison-bg border border-maison-border flex items-center justify-center">
                                        <FiTrendingUp size={16} className="text-maison-green" />
                                    </div>
                                    <div>
                                        <p className="text-xs font-semibold text-maison-text">+40% eficiencia</p>
                                        <p className="text-[10px] text-gray-400">en gestión diaria</p>
                                    </div>
                                </div>
                            </div>
                            <div className="hidden sm:block absolute -right-2 top-16 bg-white border border-maison-border rounded-xl px-4 py-2.5 shadow-sm">
                                <div className="flex items-center gap-2">
                                    <div className="w-8 h-8 rounded-full bg-maison-bg border border-maison-border flex items-center justify-center">
                                        <FiClock size={16} className="text-maison-orange" />
                                    </div>
                                    <div>
                                        <p className="text-xs font-semibold text-maison-text">Setup en 5 min</p>
                                        <p className="text-[10px] text-gray-400">sin complicaciones</p>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    </motion.div>
                </div>
            </section>

            {/* ── FEATURES ── */}
            <motion.section
                id="funcionalidades"
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, margin: '-80px' }}
                variants={stagger}
                className="relative py-16 sm:py-24 bg-maison-card border-t border-maison-border overflow-hidden scroll-mt-20"
            >
                {/* Decorative background circles */}
                <div className="absolute -top-40 -right-40 w-96 h-96 rounded-full bg-maison-primary/[0.015] pointer-events-none" />
                <div className="absolute -bottom-40 -left-40 w-96 h-96 rounded-full bg-maison-green/[0.015] pointer-events-none" />

                <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <motion.div variants={fadeUp} className="text-center max-w-2xl mx-auto mb-12 sm:mb-16">
                        <h2 className="text-xs font-semibold tracking-widest text-gray-400 uppercase mb-3">Funcionalidades</h2>
                        <h3 className="text-3xl sm:text-4xl font-serif text-maison-text">Todo lo que necesitas para gestionar tu centro</h3>
                        <div className="flex items-center justify-center gap-2 mt-4">
                            <span className="w-8 h-px bg-maison-border" />
                            <span className="w-1.5 h-1.5 rounded-full bg-maison-text" />
                            <span className="w-8 h-px bg-maison-border" />
                        </div>
                        <p className="text-sm text-gray-500 mt-4">Desde clientes hasta inventario, Shaer centraliza cada aspecto de tu operación diaria.</p>
                    </motion.div>

                    {/* Bento grid: all cards in a single grid */}
                    <motion.div variants={stagger} className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
                        {features.map((feat, i) => (
                            <motion.div
                                key={i}
                                variants={fadeUp}
                                whileHover={{ y: -4 }}
                                transition={{ duration: 0.25, ease: 'easeOut' }}
                                className={`relative bg-white border border-maison-border rounded-2xl p-6 sm:p-8 group ${feat.bentoClass}`}
                            >
                                {/* Featured accent bar */}
                                {feat.featured && (
                                    <div className="absolute left-0 top-3 bottom-3 w-0.5 bg-maison-primary rounded-full" />
                                )}
                                {/* Corner decorative dots */}
                                <svg className="absolute top-3 right-3 w-4 h-4 text-maison-border" viewBox="0 0 16 16" fill="currentColor">
                                    <circle cx="12" cy="4" r="1.5" />
                                </svg>
                                <svg className="absolute bottom-3 left-3 w-4 h-4 text-maison-border rotate-180" viewBox="0 0 16 16" fill="currentColor">
                                    <circle cx="12" cy="4" r="1.5" />
                                </svg>

                                {/* Subtle background icon on full-width cards */}
                                {feat.bentoClass === 'lg:col-span-3' && (
                                    <div className="absolute -bottom-6 -right-6 opacity-[0.03] pointer-events-none">
                                        <feat.icon size={120} />
                                    </div>
                                )}

                                <div className={`flex ${feat.featured ? 'flex-col lg:flex-row items-start gap-6 h-full' : 'flex-col sm:flex-row items-start gap-5'}`}>
                                    <div className={`${feat.featured ? 'w-14 h-14 shrink-0' : 'shrink-0'}`}>
                                        <FeatureIcon icon={feat.icon} color="#2C2A29" />
                                    </div>
                                    <div className={`flex flex-col ${feat.featured ? 'justify-between h-full' : ''}`}>
                                        <div>
                                            <h4 className="text-lg sm:text-xl font-serif text-maison-text mb-2">{feat.title}</h4>
                                            <p className="text-sm text-gray-500 leading-relaxed">{feat.description}</p>
                                        </div>
                                        {feat.featured && feat.stat && (
                                            <div className="flex items-center gap-2 mt-4 pt-4 border-t border-maison-border">
                                                <FiTrendingUp size={14} className="text-maison-green" />
                                                <span className="text-xs font-medium text-maison-green">{feat.stat}</span>
                                            </div>
                                        )}
                                        {feat.bentoClass === 'lg:col-span-3' && (
                                            <div className="hidden lg:flex items-center gap-2 mt-4">
                                                <span className="w-12 h-px bg-maison-border" />
                                                <span className="text-xs font-medium text-gray-400">Esencial</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </motion.div>
                        ))}

                        {/* Decorative filler card — full width */}
                        <motion.div
                            variants={fadeUp}
                            className="relative bg-maison-bg/60 border border-maison-border/60 rounded-2xl p-6 sm:p-8 hidden lg:flex flex-row items-center justify-center gap-4 text-center overflow-hidden lg:col-span-3"
                        >
                            <div className="w-12 h-px bg-maison-border/60" />
                            <FiStar size={14} className="text-gray-300 shrink-0" />
                            <p className="text-sm text-gray-400 font-medium">
                                Todo lo que tu centro necesita en un solo lugar
                            </p>
                            <FiStar size={14} className="text-gray-300 shrink-0" />
                            <div className="w-12 h-px bg-maison-border/60" />
                            <div className="absolute -bottom-8 -right-8 w-32 h-32 rounded-full bg-maison-primary/[0.02] pointer-events-none" />
                            <div className="absolute -top-8 -left-8 w-24 h-24 rounded-full bg-maison-green/[0.02] pointer-events-none" />
                        </motion.div>
                    </motion.div>
                </div>
            </motion.section>

            {/* ── STATS / IMPACT ── */}
            <motion.section
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, margin: '-80px' }}
                variants={stagger}
                className="py-16 sm:py-24 bg-maison-bg"
            >
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <motion.div variants={stagger} className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
                        {[
                            { number: '5 min', label: 'Setup inicial', icon: FiClock },
                            { number: '100%', label: 'Datos centralizados', icon: FiLayers },
                            { number: '40%', label: 'Más eficiencia', icon: FiTrendingUp },
                            { number: '24/7', label: 'Disponible siempre', icon: FiBarChart2 },
                        ].map((stat, i) => (
                            <motion.div
                                key={i}
                                variants={fadeUp}
                                whileHover={{ y: -3 }}
                                transition={{ duration: 0.25, ease: 'easeOut' }}
                                className="bg-maison-card border border-maison-border rounded-2xl p-6 text-center shadow-sm"
                            >
                                <div className="w-12 h-12 bg-maison-bg border border-maison-border rounded-xl flex items-center justify-center mx-auto mb-4">
                                    <stat.icon size={22} className="text-maison-text" />
                                </div>
                                <motion.p
                                    initial={{ scale: 0.6, opacity: 0 }}
                                    whileInView={{ scale: 1, opacity: 1 }}
                                    viewport={{ once: true }}
                                    transition={{ duration: 0.5, delay: 0.2 + i * 0.1, ease: 'easeOut' }}
                                    className="text-3xl font-serif text-maison-text"
                                >
                                    {stat.number}
                                </motion.p>
                                <p className="text-xs font-semibold tracking-widest text-gray-400 uppercase mt-1">{stat.label}</p>
                            </motion.div>
                        ))}
                    </motion.div>
                </div>
            </motion.section>

            {/* ── HOW IT WORKS ── */}
            <motion.section
                id="como-funciona"
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, margin: '-80px' }}
                variants={stagger}
                className="py-16 sm:py-24 bg-maison-card border-t border-maison-border scroll-mt-20"
            >
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <motion.div variants={fadeUp} className="text-center max-w-2xl mx-auto mb-12 sm:mb-16">
                        <h2 className="text-xs font-semibold tracking-widest text-gray-400 uppercase mb-3">Cómo funciona</h2>
                        <h3 className="text-3xl sm:text-4xl font-serif text-maison-text">Empieza en minutos</h3>
                        <p className="text-sm text-gray-500 mt-3">Tres pasos simples para transformar la gestión de tu centro de estética.</p>
                    </motion.div>

                    <motion.div variants={stagger} className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
                        {steps.map((step, i) => (
                            <motion.div key={i} variants={fadeUp} className="relative text-center">
                                {/* Connector line */}
                                {i < steps.length - 1 && (
                                    <div className="hidden md:block absolute top-8 left-[60%] right-[-40%] h-px bg-maison-border">
                                        <FiChevronRight size={16} className="absolute right-0 top-1/2 -translate-y-1/2 text-gray-300" />
                                    </div>
                                )}
                                <motion.div
                                    whileInView={{ scale: [1, 1.08, 1] }}
                                    viewport={{ once: true }}
                                    transition={{ duration: 0.5, delay: 0.2 + i * 0.15 }}
                                    className="w-16 h-16 rounded-full bg-maison-primary text-white flex items-center justify-center mx-auto mb-6 shadow-sm"
                                >
                                    <span className="text-lg font-serif font-bold">{step.number}</span>
                                </motion.div>
                                <h4 className="text-xl font-serif text-maison-text mb-3">{step.title}</h4>
                                <p className="text-sm text-gray-500 leading-relaxed max-w-xs mx-auto">{step.description}</p>
                            </motion.div>
                        ))}
                    </motion.div>
                </div>
            </motion.section>

            {/* ── CTA ── */}
            <motion.section
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, margin: '-80px' }}
                variants={stagger}
                className="py-16 sm:py-24 bg-maison-bg"
            >
                <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
                    <motion.div
                        variants={fadeUp}
                        className="bg-maison-card border border-maison-border rounded-3xl p-8 sm:p-12 lg:p-16 shadow-sm relative overflow-hidden"
                    >
                        {/* Abstract decoration */}
                        <div className="absolute -top-20 -right-20 w-60 h-60 rounded-full bg-maison-green/5" />
                        <div className="absolute -bottom-20 -left-20 w-60 h-60 rounded-full bg-maison-primary/3" />

                        <motion.div
                            variants={fadeUp}
                            className="relative"
                        >
                            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-serif text-maison-text leading-tight">
                                ¿Listo para simplificar tu gestión?
                            </h2>
                            <p className="text-base sm:text-lg text-gray-500 mt-4 max-w-lg mx-auto">
                                Únete a los centros de estética que ya confían en Shaer para administrar su negocio.
                            </p>
                            <div className="flex flex-col sm:flex-row gap-3 justify-center mt-8">
                                <Link to="/registro"
                                    className="bg-maison-primary hover:bg-black text-white px-8 py-3.5 rounded-full text-sm font-medium flex items-center justify-center gap-2 transition-all shadow-sm no-underline group"
                                >
                                    Crear cuenta gratis{' '}
                                    <FiArrowRight size={16} className="group-hover:translate-x-0.5 transition-transform" />
                                </Link>
                                <Link to="/login"
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
                className="border-t border-maison-border bg-maison-card"
            >
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                        <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-lg bg-maison-primary flex items-center justify-center">
                                <span className="text-white font-serif font-bold text-xs">S</span>
                            </div>
                            <span className="text-lg font-serif font-bold tracking-wide text-maison-text">Shaer</span>
                        </div>
                        <nav className="flex items-center gap-6 text-xs font-medium text-gray-400">
                            <a href="#funcionalidades" className="hover:text-maison-text transition-colors no-underline">Funcionalidades</a>
                            <a href="#como-funciona" className="hover:text-maison-text transition-colors no-underline">Cómo funciona</a>
                            <Link to="/login" className="hover:text-maison-text transition-colors no-underline">Iniciar sesión</Link>
                            <Link to="/registro" className="hover:text-maison-text transition-colors no-underline">Registrarse</Link>
                        </nav>
                        <p className="text-xs text-gray-400">
                            &copy; {new Date().getFullYear()} Shaer. Todos los derechos reservados.
                        </p>
                    </div>
                </div>
            </motion.footer>
        </div>
    );
}
