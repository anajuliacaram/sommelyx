/**
 * BottleObject — Phase 3
 *
 * A garrafa-protagonista. Renderiza uma garrafa de vinho como objeto
 * colecionável, com iluminação quente, sombra dramática e linha de
 * vitrine opcional embaixo. Substitui qualquer "card de vinho" sempre
 * que o contexto for editorial (Home hero, Adega shelf, Alertas
 * sommelier, Wishlist dream cellar, ficha do vinho).
 *
 * Fallback: quando o vinho não tem foto real, renderizamos uma garrafa
 * vetorial premium por arquétipo (tinto/branco/rosé/espumante/sobremesa)
 * — nunca um placeholder cinza nem um ícone de imagem quebrada.
 */

import { useState } from "react";
import { cn } from "@/lib/utils";
import { getStyleFamily } from "@/components/editorial/EditorialPrimitives";

export type BottleSize = "xs" | "sm" | "md" | "lg" | "xl" | "hero";

const SIZE_PX: Record<BottleSize, { w: number; h: number }> = {
  xs: { w: 36, h: 110 },
  sm: { w: 56, h: 170 },
  md: { w: 88, h: 270 },
  lg: { w: 140, h: 420 },
  xl: { w: 200, h: 600 },
  hero: { w: 280, h: 820 },
};

interface BottlePalette {
  glass: string;
  glassDeep: string;
  highlight: string;
  capsule: string;
  capsuleDeep: string;
  label: string;
  labelBand: string;
}

const PALETTES: Record<string, BottlePalette> = {
  tinto: {
    glass: "#3a0d18",
    glassDeep: "#22060d",
    highlight: "rgba(255, 240, 228, 0.32)",
    capsule: "#7a1224",
    capsuleDeep: "#4c0a16",
    label: "#f7f0e4",
    labelBand: "#7a1224",
  },
  branco: {
    glass: "#5c5a2a",
    glassDeep: "#3c3a18",
    highlight: "rgba(255, 250, 235, 0.4)",
    capsule: "#b8943c",
    capsuleDeep: "#8d673a",
    label: "#fbf5e8",
    labelBand: "#b8943c",
  },
  "rosé": {
    glass: "#b06a76",
    glassDeep: "#8a4a56",
    highlight: "rgba(255, 245, 240, 0.45)",
    capsule: "#c98a94",
    capsuleDeep: "#9c5a64",
    label: "#fdf6f0",
    labelBand: "#c05a68",
  },
  espumante: {
    glass: "#26361f",
    glassDeep: "#141f10",
    highlight: "rgba(250, 255, 240, 0.34)",
    capsule: "#c9a84c",
    capsuleDeep: "#93701e",
    label: "#f8f2e2",
    labelBand: "#3d4f35",
  },
  sobremesa: {
    glass: "#7a4a14",
    glassDeep: "#54300a",
    highlight: "rgba(255, 246, 228, 0.4)",
    capsule: "#c67a36",
    capsuleDeep: "#8a5220",
    label: "#faf3e4",
    labelBand: "#c67a36",
  },
};

let gradientSeq = 0;

/** Garrafa vetorial premium — silhueta bordalesa, cápsula, rótulo. */
function ArchetypeBottle({
  family,
  width,
  height,
  animated,
  filter,
}: {
  family: string;
  width: number;
  height: number;
  animated: boolean;
  filter: string;
}) {
  const p = PALETTES[family] ?? PALETTES.tinto;
  // ids únicos por instância para não colidir gradientes de SVGs irmãos
  const [uid] = useState(() => `bo-${family}-${++gradientSeq}`);
  const sparkling = family === "espumante";

  return (
    <svg
      viewBox="0 0 200 600"
      width={width}
      height={height}
      role="presentation"
      aria-hidden
      className={cn("block select-none pointer-events-none", animated && "ed-anim-bottle")}
      style={{ filter }}
    >
      <defs>
        <linearGradient id={`${uid}-glass`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor={p.glassDeep} />
          <stop offset="0.32" stopColor={p.glass} />
          <stop offset="0.55" stopColor={p.glass} />
          <stop offset="1" stopColor={p.glassDeep} />
        </linearGradient>
        <linearGradient id={`${uid}-capsule`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor={p.capsuleDeep} />
          <stop offset="0.4" stopColor={p.capsule} />
          <stop offset="1" stopColor={p.capsuleDeep} />
        </linearGradient>
        <linearGradient id={`${uid}-shine`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={p.highlight} />
          <stop offset="1" stopColor="rgba(255,255,255,0)" />
        </linearGradient>
      </defs>

      {/* corpo — silhueta bordalesa */}
      <path
        d={
          sparkling
            ? // espumante: ombros mais suaves, corpo mais largo
              "M84 46 L84 150 C84 196 58 208 52 250 C48 278 46 300 46 340 L46 552 C46 570 60 580 100 580 C140 580 154 570 154 552 L154 340 C154 300 152 278 148 250 C142 208 116 196 116 150 L116 46 Z"
            : // bordalesa clássica
              "M86 42 L86 160 C86 200 64 210 60 246 C57 272 56 292 56 330 L56 554 C56 572 70 580 100 580 C130 580 144 572 144 554 L144 330 C144 292 143 272 140 246 C136 210 114 200 114 160 L114 42 Z"
        }
        fill={`url(#${uid}-glass)`}
      />

      {/* cápsula */}
      <rect x={sparkling ? 80 : 82} y="18" width={sparkling ? 40 : 36} height="70" rx="8" fill={`url(#${uid}-capsule)`} />
      <rect x={sparkling ? 80 : 82} y="60" width={sparkling ? 40 : 36} height="4" fill="rgba(0,0,0,0.18)" />

      {/* brilho vertical do vidro */}
      <path
        d="M70 120 C66 200 62 260 62 330 L62 540 C62 552 66 558 74 561 L74 210 C74 170 76 140 78 116 Z"
        fill={`url(#${uid}-shine)`}
        opacity="0.8"
      />

      {/* rótulo */}
      <g>
        <rect x="60" y="368" width="80" height="118" rx="7" fill={p.label} />
        <rect x="60" y="368" width="80" height="118" rx="7" fill="none" stroke="rgba(29,21,15,0.08)" />
        <rect x="72" y="388" width="56" height="3.5" rx="1.75" fill={p.labelBand} opacity="0.85" />
        <rect x="80" y="400" width="40" height="2.5" rx="1.25" fill="rgba(29,21,15,0.3)" />
        {/* medalhão */}
        <circle cx="100" cy="432" r="14" fill="none" stroke={p.labelBand} strokeWidth="1.6" opacity="0.75" />
        <circle cx="100" cy="432" r="9" fill={p.labelBand} opacity="0.16" />
        <rect x="76" y="458" width="48" height="2.5" rx="1.25" fill="rgba(29,21,15,0.32)" />
        <rect x="84" y="466" width="32" height="2.5" rx="1.25" fill="rgba(29,21,15,0.2)" />
      </g>
    </svg>
  );
}

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
  const dims = SIZE_PX[size];
  const [failed, setFailed] = useState(false);

  const filter =
    size === "hero" || size === "xl"
      ? "var(--ed-bottle-shadow)"
      : "var(--ed-bottle-shadow-soft)";

  const useArchetype = !imageUrl || (failed && fallbackOnError);

  return (
    <figure
      className={cn(
        "relative inline-flex flex-col items-center justify-end",
        withSpotlight && "ed-bottle-spotlight",
        className,
      )}
      style={{ width: dims.w }}
    >
      {useArchetype ? (
        <ArchetypeBottle family={family} width={dims.w} height={dims.h} animated={animated} filter={filter} />
      ) : (
        <img
          src={imageUrl as string}
          alt={alt}
          width={dims.w}
          height={dims.h}
          loading={priority ? "eager" : "lazy"}
          decoding="async"
          onError={() => setFailed(true)}
          className={cn(
            "block object-contain select-none pointer-events-none",
            animated && "ed-anim-bottle",
          )}
          style={{ width: dims.w, height: dims.h, filter }}
          draggable={false}
        />
      )}
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
