import { Link } from "react-router";
import { motion, useReducedMotion } from "motion/react";
import type { Variants } from "motion/react";
import { FiArrowRight, FiInfo } from "react-icons/fi";
import DotField from "../components/landing/DotField";
import GuideIndex from "../components/landing/guide/GuideIndex";
import ModuleMedia from "../components/landing/guide/ModuleMedia";
import { guideModules } from "../components/landing/guide/guideContent";

// Fondo DotField (UX-50) con los mismos valores de color que `DOTFIELD_DOT_COLOR`/
// `DOTFIELD_GLOW_COLOR` de `views/Landing.tsx` (wine al 18% de opacidad + glow accent-rose
// sólido) — duplicados acá en vez de importados porque esas constantes son locales al módulo
// Landing.tsx, no exportadas; reestructurar Landing.tsx solo para exportar 2 literales de color
// habría ampliado el diff de un archivo que esta feature debe tocar lo mínimo posible.
const DOTFIELD_DOT_COLOR = "rgba(107, 52, 68, 0.18)";
const DOTFIELD_GLOW_COLOR = "#D98BA4";

// Reveal de entrada de cada módulo (UX-50): mismo patrón fade + slide corto que
// `fadeSlideUpShort` de `views/Landing.tsx` (docs/patterns-frontend.md § P14) — duplicado acá por
// el mismo motivo que los colores de arriba (función local no exportada en Landing.tsx).
const fadeSlideUp = (prefersReducedMotion: boolean): Variants =>
    prefersReducedMotion
        ? { hidden: { opacity: 1, y: 0 }, visible: { opacity: 1, y: 0 } }
        : {
              hidden: { opacity: 0, y: 20 },
              visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" } },
          };

export default function Guia() {
    const prefersReducedMotion = useReducedMotion();

    return (
        <div className="min-h-screen bg-bg text-text font-sans">
            {/* Header simplificado (UX-50): a diferencia de `views/Landing.tsx`, /guia no tiene
                anclas de una sola página que naveguen dentro de sí misma (el índice de módulos ya
                cumple ese rol, ver `GuideIndex`), así que no se replica el menú mobile a pantalla
                completa de Landing (`mobileMenuOpen` + overlay) — solo logo + 2 CTAs, siempre
                visibles, sin necesidad de colapsar a un burger menu. */}
            <header className="sticky top-0 z-50 h-16 border-b border-border/60 bg-surface/70 backdrop-blur-md">
                <nav className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
                    <Link to="/" className="flex shrink-0 items-center gap-2 no-underline">
                        <img src="/shear-logo.png" alt="Shear" className="h-9 w-auto" />
                    </Link>
                    <div className="flex items-center gap-2 sm:gap-3">
                        <Link
                            to="/login"
                            className="hidden rounded-ctrl px-4 py-2 text-sm font-medium text-text-3 no-underline transition-colors hover:bg-hover-soft hover:text-text sm:block"
                        >
                            Iniciar sesión
                        </Link>
                        <Link
                            to="/registro"
                            className="flex items-center gap-1.5 rounded-ctrl bg-accent px-4 py-2 text-sm font-semibold text-white no-underline transition-opacity hover:opacity-90 sm:px-5"
                        >
                            Comenzar gratis <FiArrowRight size={14} />
                        </Link>
                    </div>
                </nav>
            </header>

            {/* Fondo DotField (UX-50): montado una sola vez para toda la página /guia — único
                fondo animado (docs/design.md §13.1: máximo 1-2 fondos por vista, acá es 1). */}
            <div aria-hidden="true" className="fixed inset-0 z-0 pointer-events-none">
                <DotField
                    dotRadius={2.8}
                    dotSpacing={20}
                    cursorRadius={300}
                    cursorForce={0.5}
                    bulgeOnly
                    bulgeStrength={40}
                    glowRadius={60}
                    sparkle={false}
                    waveAmplitude={0}
                    gradientFrom={DOTFIELD_DOT_COLOR}
                    gradientTo={DOTFIELD_DOT_COLOR}
                    glowColor={DOTFIELD_GLOW_COLOR}
                    prefersReducedMotion={!!prefersReducedMotion}
                />
            </div>

            {/* HERO */}
            <section className="relative z-10 pb-12 pt-16 sm:pb-16 sm:pt-20">
                <div className="mx-auto max-w-3xl px-4 text-center sm:px-6 lg:px-8">
                    <span className="mb-6 inline-flex items-center gap-2 rounded-pill bg-rose-bg px-4 py-1.5 text-xs font-semibold uppercase tracking-widest text-accent">
                        Guía paso a paso
                    </span>
                    <h1 className="font-serif text-4xl leading-[1.1] text-wine sm:text-5xl">
                        Todo lo que necesitás para usar Shear
                    </h1>
                    <p className="mx-auto mt-6 max-w-2xl text-base leading-relaxed text-text-2 sm:text-lg">
                        Un recorrido completo por cada módulo del sistema: clientes, servicios,
                        inventario, turnos y mucho más. Paso a paso, con capturas reales de la
                        aplicación.
                    </p>
                </div>
            </section>

            {/* CONTENIDO: índice + módulos */}
            <div className="relative z-10 mx-auto max-w-7xl px-4 pb-20 sm:px-6 sm:pb-28 lg:px-8">
                <div className="grid grid-cols-1 gap-8 lg:grid-cols-[240px_minmax(0,1fr)] lg:gap-16">
                    <div className="order-1">
                        <GuideIndex modules={guideModules} />
                    </div>

                    <div className="order-2 min-w-0">
                        {guideModules.map((guideModule) => (
                            <motion.section
                                key={guideModule.slug}
                                id={guideModule.slug}
                                className="scroll-mt-24 border-b border-border-soft pb-16 last:border-0 last:pb-0 sm:pb-20"
                                initial={prefersReducedMotion ? false : "hidden"}
                                whileInView={prefersReducedMotion ? undefined : "visible"}
                                viewport={{ once: true, amount: 0.15 }}
                                variants={fadeSlideUp(!!prefersReducedMotion)}
                            >
                                <span className="text-xs font-semibold uppercase tracking-widest text-muted">
                                    Módulo {guideModule.number}
                                </span>
                                <h2 className="mt-3 font-serif text-3xl text-text sm:text-4xl">
                                    {guideModule.title}
                                </h2>
                                <p className="mt-4 max-w-2xl text-base leading-relaxed text-text-2">
                                    {guideModule.intro}
                                </p>

                                <ModuleMedia media={guideModule.media} />

                                <div className="mt-10 space-y-10">
                                    {guideModule.steps.map((step) => (
                                        <div key={step.number} className="flex flex-col gap-3 sm:flex-row sm:gap-6">
                                            <span className="shrink-0 text-xs font-semibold uppercase tracking-widest text-muted sm:w-16">
                                                Paso {step.number}
                                            </span>
                                            <div>
                                                <h3 className="font-serif text-xl text-text">{step.title}</h3>
                                                <p className="mt-2 text-sm leading-relaxed text-text-2 sm:text-[15px]">
                                                    {step.description}
                                                </p>
                                                {step.list && (
                                                    <ul className="mt-3 list-disc space-y-1.5 pl-5">
                                                        {step.list.map((item) => (
                                                            <li key={item} className="text-sm text-text-2">
                                                                {item}
                                                            </li>
                                                        ))}
                                                    </ul>
                                                )}
                                                {step.soft && (
                                                    <p className="mt-3 text-sm text-muted">{step.soft}</p>
                                                )}
                                                {step.media && (
                                                    <ModuleMedia media={step.media} inline />
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                {guideModule.callout && (
                                    <div className="mt-10 flex items-start gap-3 rounded-card border-l-4 border-accent bg-rose-bg/60 p-5">
                                        <FiInfo className="mt-0.5 shrink-0 text-accent" aria-hidden />
                                        <div>
                                            <p className="mb-1.5 text-xs font-semibold uppercase tracking-widest text-muted">
                                                {guideModule.callout.label}
                                            </p>
                                            <p className="text-sm leading-relaxed text-text-2">
                                                {guideModule.callout.text}
                                            </p>
                                        </div>
                                    </div>
                                )}
                            </motion.section>
                        ))}
                    </div>
                </div>
            </div>

            {/* FOOTER */}
            <footer className="relative z-10 border-t border-border bg-surface/90">
                <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-12 lg:px-8">
                    <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
                        <Link to="/" className="flex items-center gap-2 no-underline">
                            <img src="/shear-logo.png" alt="Shear" className="h-11 w-auto" />
                        </Link>
                        <nav className="flex items-center gap-6 text-xs font-medium text-muted">
                            <Link to="/" className="no-underline transition-colors hover:text-text">
                                Inicio
                            </Link>
                            <Link to="/login" className="no-underline transition-colors hover:text-text">
                                Iniciar sesión
                            </Link>
                            <Link to="/registro" className="no-underline transition-colors hover:text-text">
                                Registrarse
                            </Link>
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
