import { useEffect, useRef, useState } from "react";
import type { GuideModule } from "./guideContent";

interface Props {
    modules: GuideModule[];
}

/**
 * Índice de módulos de la guía (UX-50): sticky vertical en desktop, barra horizontal
 * scrolleable en mobile (misma lista, sin duplicar contenido). Un `IntersectionObserver` sobre
 * las `<section id={slug}>` de `views/Guia.tsx` marca el módulo activo — `rootMargin` con un
 * margen inferior grande (`-60%`) colapsa el área de detección hacia el tercio superior del
 * viewport, para que el módulo activo cambie apenas su encabezado cruza esa franja, en vez de
 * esperar a que ocupe la mitad de la pantalla.
 */
export default function GuideIndex({ modules }: Props) {
    const [activeSlug, setActiveSlug] = useState<string>(modules[0]?.slug ?? "");
    const observerRef = useRef<IntersectionObserver | null>(null);

    useEffect(() => {
        const sections = modules
            .map((module) => document.getElementById(module.slug))
            .filter((el): el is HTMLElement => el !== null);

        if (!sections.length) {
            return;
        }

        observerRef.current = new IntersectionObserver(
            (entries) => {
                const visible = entries
                    .filter((entry) => entry.isIntersecting)
                    .sort((a, b) => b.intersectionRatio - a.intersectionRatio);
                if (visible.length > 0) {
                    setActiveSlug(visible[0].target.id);
                }
            },
            { rootMargin: "-96px 0px -60% 0px", threshold: [0, 0.25, 0.5, 0.75, 1] }
        );

        sections.forEach((section) => observerRef.current?.observe(section));

        return () => {
            observerRef.current?.disconnect();
        };
    }, [modules]);

    return (
        <nav aria-label="Índice de módulos de la guía" className="lg:h-full">
            {/* Desktop: columna sticky */}
            <ul className="hidden lg:flex lg:flex-col lg:gap-1 lg:sticky lg:top-24">
                {modules.map((module) => (
                    <li key={module.slug}>
                        <a
                            href={`#${module.slug}`}
                            aria-current={activeSlug === module.slug ? "true" : undefined}
                            className={`flex items-baseline gap-2 rounded-ctrl px-4 py-2.5 text-sm no-underline transition-colors ${
                                activeSlug === module.slug
                                    ? "bg-rose-bg font-semibold text-accent"
                                    : "text-text-3 hover:bg-hover-soft hover:text-text"
                            }`}
                        >
                            <span className="text-xs text-muted">{module.number}</span>
                            {module.title}
                        </a>
                    </li>
                ))}
            </ul>

            {/* Mobile/tablet: barra horizontal scrolleable, sin producir scroll horizontal de
                página completa (el overflow queda contenido en este `<div>`, no en el body). */}
            <div className="-mx-4 overflow-x-auto px-4 pb-1 lg:hidden">
                <ul className="flex w-max gap-2">
                    {modules.map((module) => (
                        <li key={module.slug}>
                            <a
                                href={`#${module.slug}`}
                                aria-current={activeSlug === module.slug ? "true" : undefined}
                                className={`block whitespace-nowrap rounded-pill px-3.5 py-2 text-xs font-semibold no-underline transition-colors ${
                                    activeSlug === module.slug
                                        ? "bg-accent text-white"
                                        : "border border-border bg-surface text-text-3"
                                }`}
                            >
                                {module.title}
                            </a>
                        </li>
                    ))}
                </ul>
            </div>
        </nav>
    );
}
