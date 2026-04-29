type WineLike = {
  name?: string | null;
  style?: string | null;
  grape?: string | null;
  country?: string | null;
  region?: string | null;
  producer?: string | null;
  vintage?: number | null;
  quantity?: number | null;
};

type PairingResult = {
  dish: string;
  category: string;
  reason: string;
  match: string;
  harmony_type: "contraste" | "semelhança" | "complemento" | "equilíbrio" | "limpeza";
  harmony_label: string;
  dish_profile: Record<string, unknown> | null;
  recipe: Record<string, unknown> | null;
  source?: "deterministic";
};

type SuggestionResult = {
  wineName: string;
  style: string;
  grape: string;
  vintage: number;
  region: string;
  country: string;
  reason: string;
  fromCellar: boolean;
  match: string;
  harmony_type: "contraste" | "semelhança" | "complemento" | "equilíbrio" | "limpeza";
  harmony_label: string;
  compatibilityLabel: string;
  wineProfile: Record<string, unknown>;
  source?: "deterministic";
};

type CompatibilityResult = {
  compatibility: number;
  label: string;
  reason: string;
  source?: "deterministic";
};

const STYLE_ALIASES: Record<string, string> = {
  tinto: "red",
  red: "red",
  branco: "white",
  white: "white",
  rose: "rose",
  rosé: "rose",
  espumante: "sparkling",
  sparkling: "sparkling",
  champagne: "sparkling",
  prosecco: "sparkling",
  cava: "sparkling",
  sobremesa: "dessert",
  dessert: "dessert",
  fortificado: "fortified",
  fortified: "fortified",
  porto: "fortified",
  sherry: "fortified",
};

const GRAPE_STYLE_HINTS: Array<[RegExp, string]> = [
  [/\b(cabernet sauvignon|merlot|malbec|syrah|shiraz|tempranillo|sangiovese|nebbiolo|tannat|pinot noir|carmen[eé]re)\b/i, "red"],
  [/\b(chardonnay|sauvignon blanc|riesling|albari?o|alvarinho|pinot grigio|pinot gris|verdicchio|verdelho|moscato)\b/i, "white"],
  [/\b(ros[eé]|grenache|garnacha)\b/i, "rose"],
  [/\b(champagne|prosecco|cava|franciacorta|cr[eé]mant|brut)\b/i, "sparkling"],
  [/\b(port|porto|sherry|madeira|marsala)\b/i, "fortified"],
];

const DISH_RULES: Array<{
  keywords: RegExp;
  dishes: string[];
  styles: string[];
  category: string;
  explanation: string;
  harmony_type: PairingResult["harmony_type"];
  harmony_label: string;
}> = [
  {
    keywords: /carne|picanha|costela|bife|cordeiro|assado|hamb[úu]rguer|churrasco/i,
    dishes: ["Picanha grelhada", "Cordeiro assado", "Carne de panela", "Hambúrguer artesanal", "Costela suculenta"],
    styles: ["red"],
    category: "carne",
    explanation: "Taninos e estrutura equilibram gordura e proteína da carne.",
    harmony_type: "contraste",
    harmony_label: "taninos e gordura",
  },
  {
    keywords: /peixe|salm[aã]o|atum|bacalhau|camar[aã]o|frutos do mar|marisco|lula|lagosta|polvo/i,
    dishes: ["Peixe grelhado", "Frutos do mar", "Camarão salteado", "Bacalhau", "Polvo na brasa"],
    styles: ["white", "sparkling", "rose"],
    category: "mar",
    explanation: "Acidez e frescor mantêm a delicadeza dos peixes e frutos do mar.",
    harmony_type: "limpeza",
    harmony_label: "frescor e salinidade",
  },
  {
    keywords: /massa|pasta|risoto|lasanha|nhoque|espaguete/i,
    dishes: ["Risoto de cogumelos", "Massa ao molho vermelho", "Lasanha", "Nhoque", "Espaguete"],
    styles: ["red", "white"],
    category: "massa",
    explanation: "Corpo e acidez acompanham a textura e o molho sem pesar.",
    harmony_type: "equilíbrio",
    harmony_label: "corpo e molho",
  },
  {
    keywords: /pizza/i,
    dishes: ["Pizza margherita", "Pizza de calabresa", "Pizza de funghi", "Pizza napolitana", "Pizza de queijo"],
    styles: ["red", "rose", "sparkling"],
    category: "pizza",
    explanation: "Tomate, queijo e massa pedem frescor e fruta para equilibrar a mordida.",
    harmony_type: "complemento",
    harmony_label: "frescor e tomate",
  },
  {
    keywords: /salada|legume|vegetar|verdura|vegetal/i,
    dishes: ["Salada verde", "Legumes assados", "Vegetais grelhados", "Salada com frutas", "Horta e ervas"],
    styles: ["white", "rose", "sparkling"],
    category: "vegetal",
    explanation: "Vinhos leves e vibrantes respeitam o perfil vegetal sem dominar.",
    harmony_type: "semelhança",
    harmony_label: "leveza e frescor",
  },
  {
    keywords: /queijo|fondue|t[aá]bua/i,
    dishes: ["Queijo curado", "Fondue", "Tábua de frios", "Queijo de cabra", "Queijo azul"],
    styles: ["red", "white", "sparkling", "fortified"],
    category: "queijo",
    explanation: "Sal e gordura pedem vinho com acidez ou tanino para limpar o paladar.",
    harmony_type: "contraste",
    harmony_label: "sal e acidez",
  },
  {
    keywords: /sobremesa|chocolate|doce|torta|bolo|pudim|brigadeiro/i,
    dishes: ["Torta de chocolate", "Brigadeiro", "Pudim", "Cheesecake", "Sobremesa cremosa"],
    styles: ["dessert", "fortified", "sparkling"],
    category: "doce",
    explanation: "A doçura do prato pede vinho com doçura, acidez ou álcool bem calibrados.",
    harmony_type: "semelhança",
    harmony_label: "doçura e equilíbrio",
  },
  {
    keywords: /frango|ave|peru|pato/i,
    dishes: ["Frango grelhado", "Ave assada", "Peru", "Pato", "Galeto"],
    styles: ["white", "rose", "red"],
    category: "ave",
    explanation: "Aves pedem vinhos versáteis, com frescor e corpo suficiente para a textura.",
    harmony_type: "equilíbrio",
    harmony_label: "versatilidade",
  },
  {
    keywords: /sushi|japonesa|oriental|tailandesa/i,
    dishes: ["Sushi", "Sashimi", "Temaki", "Culinária oriental", "Pad thai"],
    styles: ["white", "sparkling", "rose"],
    category: "oriental",
    explanation: "Acidez e delicadeza acompanham a sutileza dos temperos e do peixe cru.",
    harmony_type: "limpeza",
    harmony_label: "delicadeza e precisão",
  },
  {
    keywords: /ovo|omelete|fritada/i,
    dishes: ["Omelete", "Fritada", "Ovo pochê", "Torta de ovo", "Huevos"],
    styles: ["white", "rose", "sparkling"],
    category: "ovo",
    explanation: "Textura cremosa pede acidez suficiente para limpar e dar definição.",
    harmony_type: "contraste",
    harmony_label: "cremosidade e acidez",
  },
];

const COUNTRY_STYLE_HINTS: Record<string, string[]> = {
  argentina: ["red", "white"],
  chile: ["red", "white"],
  brasil: ["sparkling", "white", "rose"],
  brazil: ["sparkling", "white", "rose"],
  frança: ["sparkling", "white", "red"],
  franca: ["sparkling", "white", "red"],
  italia: ["red", "white", "sparkling"],
  itália: ["red", "white", "sparkling"],
  espanha: ["red", "white", "sparkling"],
  portugal: ["red", "fortified", "white"],
  alemanha: ["white"],
  alemanha: ["white"],
  nova_zelandia: ["white"],
  "nova zelândia": ["white"],
  australia: ["red", "white"],
  austrália: ["red", "white"],
  uruguay: ["red", "white"],
  uruguai: ["red", "white"],
};

function normalizeText(value?: string | null) {
  return String(value ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function detectStyleCategory(wine: WineLike) {
  const direct = normalizeText(wine.style);
  if (direct in STYLE_ALIASES) return STYLE_ALIASES[direct];
  const fromGrape = normalizeText(wine.grape);
  for (const [regex, category] of GRAPE_STYLE_HINTS) {
    if (regex.test(fromGrape) || regex.test(direct)) return category;
  }
  return "unknown";
}

function toPortugueseStyle(category: string) {
  switch (category) {
    case "red": return "tinto";
    case "white": return "branco";
    case "rose": return "rosé";
    case "sparkling": return "espumante";
    case "dessert": return "sobremesa";
    case "fortified": return "fortificado";
    default: return "tinto";
  }
}

function pickDishRule(text: string) {
  const normalized = normalizeText(text);
  return DISH_RULES.find((rule) => rule.keywords.test(normalized)) ?? null;
}

function makeWineProfile(wine: WineLike, category: string) {
  const style = toPortugueseStyle(category);
  const grape = wine.grape || (category === "red" ? "Blend" : category === "white" ? "Blend" : style);
  const body = category === "red" ? "médio" : category === "white" ? "leve-médio" : category === "sparkling" ? "leve" : "médio";
  const acidity = category === "red" ? "média" : "alta";
  const tannin = category === "red" ? "médio" : category === "white" ? "n/a" : "baixo";
  return {
    body,
    acidity,
    tannin,
    style,
    complexity: category === "sparkling" ? "moderado" : "médio",
    country: wine.country || null,
    region: wine.region || null,
    grape,
  };
}

export function shouldUseDeterministicPairing(wine: WineLike, dish?: string | null) {
  const category = detectStyleCategory(wine);
  const dishRule = dish ? pickDishRule(dish) : null;
  return Boolean(category !== "unknown" || dishRule);
}

export function buildDeterministicPairingsForWine(wine: WineLike) {
  const category = detectStyleCategory(wine);
  const rule = category === "unknown"
    ? null
    : DISH_RULES.find((item) => item.styles.includes(category)) ?? null;

  const dishes = rule?.dishes ?? ["Tábua de frios", "Peixe grelhado", "Massa leve", "Queijos suaves", "Legumes assados"];
  const explanations = rule?.explanation ?? "O conjunto pede equilíbrio entre corpo, acidez, taninos e intensidade do prato.";
  const harmonyType = rule?.harmony_type ?? "equilíbrio";
  const harmonyLabel = rule?.harmony_label ?? "equilíbrio e frescor";
  const wineProfile = makeWineProfile(wine, category === "unknown" ? "red" : category);
  const baseName = wine.name || "Este vinho";
  const baseReason = `${baseName} tende a funcionar melhor com pratos que respeitam seu perfil de ${wineProfile.body} e ${wineProfile.acidity} acidez.`;

  const pairings: PairingResult[] = dishes.slice(0, 5).map((dish, index) => {
    const dishRule = pickDishRule(dish);
    return {
      dish,
      category: dishRule?.category || "classico",
      reason: index === 0
        ? `${baseName} pede ${dishRule?.explanation || explanations}`
        : `${baseName} mantém boa leitura com "${dish}" porque ${dishRule?.explanation || explanations.toLowerCase()}`,
      match: index === 0 ? "perfeito" : index === 1 ? "muito bom" : "bom",
      harmony_type: dishRule?.harmony_type || harmonyType,
      harmony_label: dishRule?.harmony_label || harmonyLabel,
      dish_profile: dishRule
        ? {
            intensity: dishRule.category === "carne" ? "alta" : "média",
            texture: dishRule.category === "queijo" ? "gordurosa" : "equilibrada",
            technique: dishRule.category,
          }
        : null,
      recipe: {
        summary: dish,
      },
      source: "deterministic",
    };
  });

  return {
    source: "deterministic" as const,
    pairings,
    pairingLogic: `${baseName} combina melhor quando a mesa acompanha seu perfil de ${wineProfile.body} e ${wineProfile.acidity} acidez; priorize pratos que respeitem essa estrutura.`,
    wineProfile,
  };
}

function scoreCompatibility(target: WineLike, cellarWine: WineLike) {
  const targetCategory = detectStyleCategory(target);
  const cellarCategory = detectStyleCategory(cellarWine);
  let score = 0;
  if (targetCategory !== "unknown" && targetCategory === cellarCategory) score += 40;
  const targetCountry = normalizeText(target.country);
  const cellarCountry = normalizeText(cellarWine.country);
  if (targetCountry && cellarCountry && targetCountry === cellarCountry) score += 20;
  const targetRegion = normalizeText(target.region);
  const cellarRegion = normalizeText(cellarWine.region);
  if (targetRegion && cellarRegion && targetRegion === cellarRegion) score += 15;
  const targetGrape = normalizeText(target.grape);
  const cellarGrape = normalizeText(cellarWine.grape);
  if (targetGrape && cellarGrape && targetGrape === cellarGrape) score += 15;

  const countryHints = COUNTRY_STYLE_HINTS[targetCountry] || [];
  if (countryHints.includes(cellarCategory)) score += 8;
  if (targetCategory === "sparkling" && cellarCategory === "white") score += 5;
  if (targetCategory === "red" && cellarCategory === "red") score += 5;

  return Math.min(100, score);
}

export function buildDeterministicTasteCompatibility(targetWine: WineLike, userCellar: WineLike[]): CompatibilityResult | null {
  if (!targetWine?.name || !Array.isArray(userCellar) || userCellar.length === 0) return null;

  const scored = userCellar
    .map((wine) => ({ wine, score: scoreCompatibility(targetWine, wine) }))
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score);

  if (scored.length === 0) return null;

  const top = scored[0];
  if (top.score < 55) return null;

  const label =
    top.score >= 85 ? "Alta chance de gostar" :
    top.score >= 70 ? "Combina com seu perfil" :
    top.score >= 50 ? "Pode surpreender" :
    top.score >= 30 ? "Fora do seu perfil habitual" :
    "Estilo bem diferente do seu";

  const targetCategory = detectStyleCategory(targetWine);
  const topCategory = detectStyleCategory(top.wine);
  const reason = `${targetWine.name} tende a agradar porque seu perfil ${toPortugueseStyle(targetCategory)} conversa com ${top.wine.name}${topCategory !== "unknown" ? `, um ${toPortugueseStyle(topCategory)} da sua adega` : ""}.`;

  return {
    compatibility: top.score,
    label,
    reason,
    source: "deterministic",
  };
}

export function buildDeterministicSuggestionsForDish(dish: string, userWines: WineLike[]) {
  const rule = pickDishRule(dish);
  if (!rule) return null;

  const recommendedStyles = new Set(rule.styles);
  const ranked = userWines
    .map((wine, index) => {
      const category = detectStyleCategory(wine);
      let score = 0;
      if (category !== "unknown" && recommendedStyles.has(category)) score += 40;
      if (rule.category === "carne" && category === "red") score += 10;
      if (rule.category === "mar" && (category === "white" || category === "sparkling")) score += 10;
      if (rule.category === "queijo" && category === "sparkling") score += 8;
      if (rule.category === "doce" && (category === "dessert" || category === "fortified")) score += 12;
      if (wine.region && normalizeText(wine.region).length > 0) score += 2;
      return { wine, score, index, category };
    })
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 5);

  if (ranked.length === 0) return null;

  const suggestions: SuggestionResult[] = ranked.map(({ wine, category }, index) => {
    const style = toPortugueseStyle(category === "unknown" ? "red" : category);
    const wineName = wine.name || `Vinho ${index + 1}`;
    const reason = `${wineName} funciona com "${dish}" porque ${rule.explanation.toLowerCase()}`;
    return {
      wineName,
      style,
      grape: wine.grape || "Blend",
      vintage: Number.isFinite(Number(wine.vintage)) ? Number(wine.vintage) : 0,
      region: wine.region || "",
      country: wine.country || "",
      reason,
      fromCellar: true,
      match: index === 0 ? "perfeito" : index === 1 ? "muito bom" : "bom",
      harmony_type: rule.harmony_type,
      harmony_label: rule.harmony_label,
      compatibilityLabel: index === 0 ? "Excelente escolha" : index === 1 ? "Alta compatibilidade" : "Boa opção",
      wineProfile: makeWineProfile(wine, category === "unknown" ? "red" : category),
      source: "deterministic",
    };
  });

  return {
    source: "deterministic" as const,
    suggestions,
    dishProfile: {
      intensity: rule.category === "carne" ? "alta" : rule.category === "mar" ? "leve" : "média",
      fat: rule.category === "queijo" ? "alta" : "moderada",
      category: rule.category,
      explanation: rule.explanation,
    },
  };
}
