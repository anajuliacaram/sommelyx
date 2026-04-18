export interface WineImageContext {
  name: string;
  producer?: string | null;
  vintage?: number | null;
  style?: string | null;
  country?: string | null;
  region?: string | null;
  grape?: string | null;
}

function normalizeText(value?: string | null) {
  return value?.trim().replace(/\s+/g, " ") || "";
}

function escapeXml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function getTone(style?: string | null) {
  const s = normalizeText(style).toLowerCase();
  if (s.includes("branco")) {
    return {
      main: "#E7D8A5",
      accent: "#B89445",
      glow: "rgba(247, 235, 194, 0.82)",
    };
  }
  if (s.includes("espum")) {
    return {
      main: "#EFE0B8",
      accent: "#C6A768",
      glow: "rgba(251, 240, 210, 0.82)",
    };
  }
  if (s.includes("rose") || s.includes("rosé")) {
    return {
      main: "#D98DA1",
      accent: "#A54A67",
      glow: "rgba(245, 213, 221, 0.82)",
    };
  }
  if (s.includes("fort")) {
    return {
      main: "#B87A3C",
      accent: "#7A4A21",
      glow: "rgba(241, 214, 184, 0.82)",
    };
  }
  return {
    main: "#7B1E2B",
    accent: "#4A101A",
    glow: "rgba(241, 206, 211, 0.82)",
  };
}

export function buildWineImageSearchQuery(context: WineImageContext) {
  const parts = [
    normalizeText(context.name),
    normalizeText(context.producer),
    context.vintage ? String(context.vintage) : "",
    normalizeText(context.style),
    normalizeText(context.region),
    normalizeText(context.country),
    normalizeText(context.grape),
  ].filter(Boolean);

  return parts.join(" ");
}

export function buildGeneratedWinePlaceholder(context: WineImageContext) {
  const tone = getTone(context.style);
  const name = escapeXml(normalizeText(context.name) || "Wine");
  const producer = escapeXml(normalizeText(context.producer) || "Sommelyx");
  const vintage = context.vintage ? String(context.vintage) : "Safra n/i";
  const grape = escapeXml(normalizeText(context.grape) || "Rótulo ilustrativo");
  const region = escapeXml([normalizeText(context.region), normalizeText(context.country)].filter(Boolean).join(" · ") || "Cellar view");

  const svg = `
    <svg width="900" height="1200" viewBox="0 0 900 1200" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="bg" x1="120" y1="70" x2="780" y2="1130" gradientUnits="userSpaceOnUse">
          <stop stop-color="${tone.main}" />
          <stop offset="0.48" stop-color="#F7F1E7" />
          <stop offset="1" stop-color="${tone.accent}" />
        </linearGradient>
        <radialGradient id="glow" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(450 270) rotate(90) scale(350 280)">
          <stop stop-color="${tone.glow}" />
          <stop offset="1" stop-color="rgba(255,255,255,0)" />
        </radialGradient>
      </defs>
      <rect width="900" height="1200" rx="56" fill="url(#bg)" />
      <rect x="70" y="70" width="760" height="1060" rx="44" fill="rgba(255,255,255,0.18)" stroke="rgba(255,255,255,0.22)" />
      <rect x="118" y="120" width="664" height="960" rx="34" fill="rgba(255,255,255,0.34)" />
      <circle cx="450" cy="286" r="192" fill="url(#glow)" />
      <circle cx="450" cy="286" r="122" fill="rgba(255,255,255,0.28)" />
      <circle cx="450" cy="286" r="80" fill="rgba(255,255,255,0.48)" />
      <path d="M450 224c-16 0-30 14-30 30v52c0 20 13 38 33 45v88h-6c-8 0-14 6-14 14v12h34v-12c0-8-6-14-14-14h-6v-88c20-7 33-25 33-45v-52c0-16-14-30-30-30Z" fill="${tone.accent}" fill-opacity="0.82" />
      <text x="450" y="545" text-anchor="middle" font-size="28" font-family="Inter, Arial, sans-serif" letter-spacing="0.28em" fill="rgba(64,40,45,0.58)">SOMMELYX</text>
      <text x="450" y="630" text-anchor="middle" font-size="52" font-weight="700" font-family="Georgia, 'Times New Roman', serif" fill="#1B1417">${name}</text>
      <text x="450" y="704" text-anchor="middle" font-size="30" font-family="Inter, Arial, sans-serif" fill="rgba(27,20,23,0.74)">${producer}</text>
      <text x="450" y="772" text-anchor="middle" font-size="32" font-family="Inter, Arial, sans-serif" font-weight="600" fill="rgba(27,20,23,0.66)">${vintage}</text>
      <text x="450" y="843" text-anchor="middle" font-size="28" font-family="Inter, Arial, sans-serif" fill="rgba(27,20,23,0.62)">${grape}</text>
      <text x="450" y="908" text-anchor="middle" font-size="26" font-family="Inter, Arial, sans-serif" fill="rgba(27,20,23,0.58)">${region}</text>
      <rect x="264" y="970" width="372" height="58" rx="29" fill="rgba(255,255,255,0.60)" />
      <text x="450" y="1007" text-anchor="middle" font-size="20" font-family="Inter, Arial, sans-serif" font-weight="700" fill="rgba(27,20,23,0.66)">Imagem ilustrativa</text>
    </svg>
  `.trim();

  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}
