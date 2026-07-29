import { useRef } from "react";
import { FiImage } from "react-icons/fi";
import type { ModuleMedia as ModuleMediaType } from "./guideContent";

interface Props {
    media: ModuleMediaType;
    /** UX-58: cuando el medio se renderiza dentro de un paso individual (no a nivel de módulo),
     * se angosta a `max-w-md` y se reduce el margen superior, para no competir visualmente con
     * el `ModuleMedia` de nivel de módulo que ya ocupa el ancho completo. */
    inline?: boolean;
}

/**
 * Render de medio de un módulo de la guía (UX-50) según el contrato de 3 estados de
 * `guideContent.ts`. `aspect-video` fija la relación de aspecto en los 3 casos (video, imagen,
 * placeholder) para que ningún estado produzca salto de layout al cargar.
 */
export default function ModuleMedia({ media, inline = false }: Props) {
    const videoRef = useRef<HTMLVideoElement | null>(null);
    const wrapperClass = inline ? "mt-4 max-w-md" : "mt-8";

    if (media.kind === "video") {
        return (
            <div className={`${wrapperClass} overflow-hidden rounded-card border border-border bg-surface-2 aspect-video`}>
                {/* Sin autoplay (controles nativos) + `preload="none"` (UX-50): con 5 videos
                    reales distribuidos a lo largo de la página, precargar todos de entrada
                    penalizaría el peso inicial sin necesidad. Si `media.poster` no está definido,
                    el atributo simplemente no se renderiza (React omite props `undefined`) — no
                    hay ningún poster todavía para los 5 videos subidos. Volumen inicial al 50%
                    (UX-55): HTML no tiene atributo estático para volumen, se setea por JS en
                    `onLoadedMetadata` sobre el elemento propio de este render (cada módulo tiene
                    su propio `<video>` y su propio `ref`, sin listener global compartido). */}
                <video
                    ref={videoRef}
                    controls
                    preload="none"
                    playsInline
                    poster={media.poster}
                    className="h-full w-full object-cover"
                    onLoadedMetadata={() => {
                        if (videoRef.current) {
                            videoRef.current.volume = 0.5;
                        }
                    }}
                >
                    <source src={media.src} type="video/mp4" />
                </video>
            </div>
        );
    }

    if (media.kind === "image") {
        return (
            <div className={`${wrapperClass} overflow-hidden rounded-card border border-border bg-surface-2 aspect-video`}>
                <img
                    src={media.src}
                    alt={media.alt}
                    loading="lazy"
                    decoding="async"
                    className="h-full w-full object-cover"
                />
            </div>
        );
    }

    return (
        <div
            className={`${wrapperClass} flex flex-col items-center justify-center gap-2 rounded-card border-2 border-dashed border-[var(--dotted)] bg-surface-2 aspect-video text-muted`}
            role="img"
            aria-label="Captura de este módulo, próximamente"
        >
            <FiImage size={28} aria-hidden />
            <p className="text-xs font-semibold uppercase tracking-widest">Captura próximamente</p>
        </div>
    );
}
