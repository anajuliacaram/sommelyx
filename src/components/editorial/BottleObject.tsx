/**
 * BottleObject — Phase 3
 *
 * A garrafa-protagonista. Renderiza uma garrafa de vinho como objeto
 * colecionável, com iluminação quente, sombra dramática e linha de
 * vitrine opcional embaixo. Substitui qualquer "card de vinho" sempre
 * que o contexto for editorial (Home hero, Adega shelf, Alertas
 * sommelier, Wishlist dream cellar, ficha do vinho).
 *
 * Fallback: quando o vinho não tem foto real, usamos um dos 5 arquétipos
 * premium gerados (tinto/branco/rosé/espumante/sobremesa) — nunca um
 * placeholder cinza.
 */

import { cn } from "@/lib/utils";
import { getStyleFamily } from "@/components/editorial/EditorialPrimitives";

import bottleTinto from "@/assets/bottles/bottle-tinto.png.asset.json";
import bottleBranco from "@/assets/bottles/bottle-branco.png.asset.json";
import bottleRose from "@/assets/bottles/bottle-rose.png.asset.json";
import bottleEspumante from "@/assets/bottles/bottle-espumante.png.asset.json";
import bottleSobremesa from "@/assets/bottles/bottle-sobremesa.png.asset.json";

const ARCHETYPE: Record<string, { url: string }> = {
  tinto: bottleTinto,
  branco: bottleBranco,
  "rosé": bottleRose,
  espumante: bottleEspumante,
  sobremesa: bottleSobremesa,
};

export type BottleSize = "xs" | "sm" | "md" | "lg" | "xl" | "hero";

const SIZE_PX: Record<BottleSize, { w: number; h: number }> = {
  xs: { w: 36, h: 110 },
  sm: { w: 56, h: 170 },
  md: { w: 88, h: 270 },
  lg: { w: 140, h: 420 },
  xl: { w: 200, h: 600 },
  hero: { w: 280, h: 820 },
};

export interface BottleObjectProps {
  /** URL da foto real da garrafa. Se ausente, cai no arquétipo por estilo. */
  imageUrl?: string | null;
  /** Estilo do vinho (tinto, branco, rosé, espumante, sobremesa…). Usado para o fallback. */
  style?: string | null;
  /** Nome para alt-text (acessibilidade). */
  alt?: string;
  /** Tamanho do objeto. */
  size?: BottleSize;
  /** Mostrar a linha de vitrine sob a garrafa (cellar shelf baseline). */
  withShelf?: boolean;
  /** Mostrar o halo quente de spotlight em volta da garrafa. */
  withSpotlight?: boolean;
  /** Animar entrada (fade + scale). Default true. */
  animated?: boolean;
  /** Quando a foto real falhar, cair no arquétipo silenciosamente. */
  fallbackOnError?: boolean;
  className?: string;
  /** Hero = LCP, evita lazy. */
  priority?: boolean;
}

export function BottleObject({
  imageUrl,
  style,
  alt = "Garrafa de vinho",
  size = "md",
  withShelf = false,
  withSpotlight = true,
  animated = true,
  fallbackOnError = true,
  className,
  priority = false,
}: BottleObjectProps) {
  const family = getStyleFamily(style);
  const archetype = ARCHETYPE[family] ?? ARCHETYPE.tinto;
  const dims = SIZE_PX[size];

  const handleError = (e: React.SyntheticEvent<HTMLImageElement>) => {
    if (!fallbackOnError) return;
    const img = e.currentTarget;
    if (img.dataset.fallback === "1") return;
    img.dataset.fallback = "1";
    img.src = archetype.url;
  };

  const src = imageUrl || archetype.url;

  return (
    <figure
      className={cn(
        "relative inline-flex flex-col items-center justify-end",
        withSpotlight && "ed-bottle-spotlight",
        className,
      )}
      style={{ width: dims.w }}
    >
      <img
        src={src}
        alt={alt}
        width={dims.w}
        height={dims.h}
        loading={priority ? "eager" : "lazy"}
        decoding="async"
        onError={handleError}
        className={cn(
          "block object-contain select-none pointer-events-none",
          animated && "ed-anim-bottle",
        )}
        style={{
          width: dims.w,
          height: dims.h,
          filter:
            size === "hero" || size === "xl"
              ? "var(--ed-bottle-shadow)"
              : "var(--ed-bottle-shadow-soft)",
        }}
        draggable={false}
      />
      {withShelf && (
        <div
          className="ed-shelf-line mt-1"
          style={{ width: dims.w * 1.4, marginLeft: -dims.w * 0.2 }}
          aria-hidden
        />
      )}
    </figure>
  );
}
