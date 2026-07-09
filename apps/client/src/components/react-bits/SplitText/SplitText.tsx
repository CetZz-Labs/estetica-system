import { useRef, useEffect, useState } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useGSAP } from '@gsap/react';

gsap.registerPlugin(ScrollTrigger);

interface SplitTextProps {
    text: string;
    className?: string;
    delay?: number;
    duration?: number;
    ease?: string;
    splitType?: string;
    from?: Record<string, number>;
    to?: Record<string, number>;
    threshold?: number;
    rootMargin?: string;
    textAlign?: string;
    tag?: string;
    onLetterAnimationComplete?: () => void;
}

export default function SplitText({
    text,
    className = '',
    delay = 50,
    duration = 1.25,
    ease = 'power3.out',
    from = { opacity: 0, y: 40 },
    to = { opacity: 1, y: 0 },
    threshold = 0.1,
    rootMargin = '-100px',
    textAlign = 'center',
    tag = 'p',
    onLetterAnimationComplete,
}: SplitTextProps) {
    const ref = useRef<HTMLElement>(null);
    const animationCompletedRef = useRef(false);
    const onCompleteRef = useRef(onLetterAnimationComplete);
    const [fontsLoaded, setFontsLoaded] = useState(false);

    useEffect(() => {
        onCompleteRef.current = onLetterAnimationComplete;
    }, [onLetterAnimationComplete]);

    useEffect(() => {
        if (document.fonts.status === 'loaded') {
            setFontsLoaded(true);
        } else {
            document.fonts.ready.then(() => {
                setFontsLoaded(true);
            });
        }
    }, []);

    useGSAP(
        () => {
            if (!ref.current || !text || !fontsLoaded) return;
            if (animationCompletedRef.current) return;
            const el = ref.current;

            const startPct = (1 - threshold) * 100;
            const marginMatch = /^(-?\d+(?:\.\d+)?)(px|em|rem|%)?$/.exec(rootMargin);
            const marginValue = marginMatch ? parseFloat(marginMatch[1]) : 0;
            const marginUnit = marginMatch ? marginMatch[2] || 'px' : 'px';
            const sign =
                marginValue === 0
                    ? ''
                    : marginValue < 0
                        ? `-=${Math.abs(marginValue)}${marginUnit}`
                        : `+=${marginValue}${marginUnit}`;
            const start = `top ${startPct}%${sign}`;

            const chars = el.querySelectorAll('.split-char');
            if (chars.length === 0) {
                const textContent = el.textContent || '';
                el.innerHTML = '';
                textContent.split('').forEach(char => {
                    const span = document.createElement('span');
                    span.className = 'split-char';
                    span.style.display = 'inline-block';
                    span.textContent = char === ' ' ? '\u00A0' : char;
                    el.appendChild(span);
                });
            }

            const targets = el.querySelectorAll('.split-char');

            gsap.fromTo(
                targets,
                { ...from },
                {
                    ...to,
                    duration,
                    ease,
                    stagger: delay / 1000,
                    scrollTrigger: {
                        trigger: el,
                        start,
                        once: true,
                        fastScrollEnd: true,
                        anticipatePin: 0.4,
                    },
                    onComplete: () => {
                        animationCompletedRef.current = true;
                        onCompleteRef.current?.();
                    },
                    willChange: 'transform, opacity',
                    force3D: true,
                }
            );

            return () => {
                ScrollTrigger.getAll().forEach(st => {
                    if (st.trigger === el) st.kill();
                });
            };
        },
        {
            dependencies: [text, delay, duration, ease, threshold, rootMargin, fontsLoaded],
            scope: ref,
        }
    );

    const Tag = tag as React.ElementType;

    return (
        <Tag
            ref={ref}
            style={{
                textAlign: textAlign as React.CSSProperties['textAlign'],
                overflow: 'hidden',
                display: 'inline-block',
                whiteSpace: 'normal',
                wordWrap: 'break-word',
                willChange: 'transform, opacity',
            }}
            className={`split-parent ${className}`}
        >
            {text}
        </Tag>
    );
}
