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

export type PairingMode = "wine-to-food" | "food-to-wine" | "cellar";

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
  decision_support?: Record<string, unknown> | null;
  source?: "deterministic";
};

export type RankedCellarWine = {
  wine: WineLike;
  score: number;
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

const FALLBACK_STYLE_SEQUENCE = ["red", "white", "rose", "sparkling", "fortified"] as const;

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

function styleFlavorCue(style?: string | null) {
  const normalizedStyle = normalizeText(style);
  if (/\b(cabernet sauvignon|merlot|malbec|syrah|shiraz|tempranillo|sangiovese|nebbiolo|tannat|pinot noir|carmen[eé]re|tinto|red)\b/i.test(normalizedStyle)) {
    return "fruta madura, especiarias secas e estrutura tânica";
  }
  if (/\b(chardonnay|sauvignon blanc|riesling|albari?o|alvarinho|pinot grigio|pinot gris|verdicchio|verdelho|moscato|branco|white)\b/i.test(normalizedStyle)) {
    return "cítricos, fruta branca e acidez precisa";
  }
  if (/\b(ros[eé]|rose|grenache|garnacha)\b/i.test(normalizedStyle)) {
    return "fruta vermelha fresca, textura leve e frescor";
  }
  if (/\b(champagne|prosecco|cava|franciacorta|cr[eé]mant|brut|espumante|sparkling)\b/i.test(normalizedStyle)) {
    return "borbulha, maçã verde, tensão e limpeza de palato";
  }
  if (/\b(port|porto|sherry|madeira|marsala|fortificado|fortified)\b/i.test(normalizedStyle)) {
    return "fruta seca, nozes, álcool integrado e doçura";
  }
  return "frescor, equilíbrio e leitura estrutural";
}

function styleDisplayName(style?: string | null) {
  const normalizedStyle = normalizeText(style);
  if (/\b(cabernet sauvignon|merlot|malbec|syrah|shiraz|tempranillo|sangiovese|nebbiolo|tannat|pinot noir|carmen[eé]re|tinto|red)\b/i.test(normalizedStyle)) return "Tinto estruturado";
  if (/\b(chardonnay|sauvignon blanc|riesling|albari?o|alvarinho|pinot grigio|pinot gris|verdicchio|verdelho|moscato|branco|white)\b/i.test(normalizedStyle)) return "Branco fresco";
  if (/\b(ros[eé]|rose|grenache|garnacha)\b/i.test(normalizedStyle)) return "Rosé vibrante";
  if (/\b(champagne|prosecco|cava|franciacorta|cr[eé]mant|brut|espumante|sparkling)\b/i.test(normalizedStyle)) return "Espumante incisivo";
  if (/\b(port|porto|sherry|madeira|marsala|fortificado|fortified)\b/i.test(normalizedStyle)) return "Fortificado intenso";
  return "Opção técnica";
}

function pairingStructureForStyle(style?: string | null, dish?: string | null) {
  const normalizedStyle = normalizeText(style);
  const normalizedDish = normalizeText(dish);
  const hasFattyDish = /gordura|creme|queijo|manteiga|costela|picanha|cordeiro|salm[aã]o|salmão/i.test(normalizedDish);
  const hasDelicateDish = /salada|sushi|peixe|camar[aã]o|frango|frutos do mar|legumes/i.test(normalizedDish);

  if (/\b(cabernet sauvignon|merlot|malbec|syrah|shiraz|tempranillo|sangiovese|nebbiolo|tannat|pinot noir|carmen[eé]re|tinto|red)\b/i.test(normalizedStyle)) {
    return {
      acidity: hasFattyDish ? "média a alta" : "média",
      tannin: "médio a alto",
      body: hasFattyDish ? "médio a encorpado" : "médio",
    };
  }

  if (/\b(chardonnay|sauvignon blanc|riesling|albari?o|alvarinho|pinot grigio|pinot gris|verdicchio|verdelho|moscato|branco|white)\b/i.test(normalizedStyle)) {
    return {
      acidity: "alta",
      tannin: "baixo",
      body: hasDelicateDish ? "leve a médio" : "médio",
    };
  }

  if (/\b(ros[eé]|rose|grenache|garnacha)\b/i.test(normalizedStyle)) {
    return {
      acidity: "média a alta",
      tannin: "baixo",
      body: "leve a médio",
    };
  }

  if (/\b(champagne|prosecco|cava|franciacorta|cr[eé]mant|brut|espumante|sparkling)\b/i.test(normalizedStyle)) {
    return {
      acidity: "alta",
      tannin: "baixo",
      body: "leve",
    };
  }

  if (/\b(port|porto|sherry|madeira|marsala|fortificado|fortified)\b/i.test(normalizedStyle)) {
    return {
      acidity: "média",
      tannin: "baixo",
      body: "encorpado",
    };
  }

  return {
    acidity: hasFattyDish ? "média" : "média a alta",
    tannin: "médio",
    body: hasDelicateDish ? "leve a médio" : "médio",
  };
}

export function buildDishSpecificSuggestion(
  dish: string,
  style: string,
  index: number,
  wine?: WineLike | null,
  noStrongMatch = false,
): SuggestionResult {
  const rule = pickDishRule(dish);
  const displayName = wine?.name?.trim() || `${styleDisplayName(style)} ${index + 1}`;
  const wineStyle = styleDisplayName(style);
  const flavorCue = styleFlavorCue(style);
  const originParts = [wine?.producer, wine?.region, wine?.country, wine?.vintage != null ? `safra ${wine.vintage}` : null]
    .map((part) => normalizeText(part))
    .filter((part) => part.length > 0);
  const originText = originParts.length > 0
    ? `O rótulo traz ${originParts.join(" · ")}, o que dá um recorte mais preciso que uma leitura genérica. `
    : "";
  const harmony = rule?.harmony_type || (normalizeText(style) === "sparkling" || normalizeText(style) === "fortified" ? "contraste" : "equilíbrio");
  const structure = pairingStructureForStyle(style, dish);
  const dishAnchor = rule?.explanation || "a estrutura do prato";
  const explicitPrefix = noStrongMatch
    ? `Não há correspondência forte com a adega; esta é a melhor opção disponível para "${dish}". `
    : "";

  return {
    wineName: displayName,
    style: wineStyle,
    grape: wine?.grape || (normalizeText(style) === "red" ? "Blend" : normalizeText(style) === "white" ? "Blend" : wineStyle),
    vintage: Number.isFinite(Number(wine?.vintage)) ? Number(wine!.vintage) : 0,
    region: wine?.region || "",
    country: wine?.country || "",
    reason: `${explicitPrefix}${displayName} funciona com "${dish}" porque ${dishAnchor.toLowerCase()}. ${originText}Perfil aromático esperado: ${flavorCue}. A lógica é de ${harmony === "contraste" ? "contraste" : "complemento"}: corpo ${structure.body}, acidez ${structure.acidity} e tanino ${structure.tannin}.`,
    fromCellar: Boolean(wine),
    match: noStrongMatch ? "sem correspondência forte" : index === 0 ? "perfeito" : index === 1 ? "muito bom" : "bom",
    harmony_type: harmony,
    harmony_label: rule?.harmony_label || (noStrongMatch ? "melhor opção disponível" : "harmonia técnica"),
    compatibilityLabel: noStrongMatch ? "Melhor opção disponível" : index === 0 ? "Excelente escolha" : index === 1 ? "Alta compatibilidade" : "Boa opção",
    wineProfile: makeWineProfile(wine || { name: displayName }, normalizeText(style) in STYLE_ALIASES ? STYLE_ALIASES[normalizeText(style)] : "red"),
    decision_support: {
      sensory_profile: {
        aroma: flavorCue,
        palate: `Ataque ${structure.body === "encorpado" ? "amplo" : structure.body === "leve" ? "preciso" : "equilibrado"}, meio de boca ${structure.acidity.includes("alta") ? "vivo" : "redondo"} e final ${structure.tannin.includes("alto") ? "firme" : "polido"}.`,
        structure: `Corpo ${structure.body}, acidez ${structure.acidity} e tanino ${structure.tannin}.`,
      },
      pairing_logic: {
        fat_vs_acidity: `${structure.acidity} corta a gordura e refresca a boca.`,
        protein_vs_tannin: `${structure.tannin} segura a proteína e evita aspereza.`,
        intensity_balance: `${structure.body} acompanha a intensidade do prato sem achatar os sabores.`,
      },
      when_to_choose: {
        ideal_scenario: `Escolha ideal quando "${dish}" vier na forma mais intensa ou clássica da receita.`,
        alternative_use: `Alternativa segura para manter a lógica técnica sem depender de um rótulo específico.`,
      },
      confidence_explanation: noStrongMatch
        ? "Confiança média porque a leitura estrutural é consistente, mas não há correspondência forte na adega."
        : "Confiança alta ou média porque o estilo do vinho conversa diretamente com o prato.",
      confidence: noStrongMatch ? "média" : "alta",
    },
    source: "deterministic",
  };
}

export function shouldUseDeterministicPairing(wine: WineLike, dish?: string | null) {
  const category = detectStyleCategory(wine);
  const dishRule = dish ? pickDishRule(dish) : null;
  return Boolean(category !== "unknown" || dishRule);
}

export function parseSommelierPairingInput(body: Record<string, unknown>) {
  const rawMode = typeof body.mode === "string" ? body.mode.trim() : "";
  const mode = rawMode === "wine-to-food" || rawMode === "cellar"
    ? rawMode
    : "food-to-wine";
  const wineName = typeof body.wineName === "string" ? body.wineName.trim() : "";
  const wineStyle = typeof body.wineStyle === "string" ? body.wineStyle.trim() : "";
  const wineGrape = typeof body.wineGrape === "string" ? body.wineGrape.trim() : "";
  const wineRegion = typeof body.wineRegion === "string" ? body.wineRegion.trim() : "";
  const wineProducer = typeof body.wineProducer === "string" ? body.wineProducer.trim() : "";
  const wineCountry = typeof body.wineCountry === "string" ? body.wineCountry.trim() : "";
  const wineVintage = Number.isFinite(Number(body.wineVintage)) ? Number(body.wineVintage) : null;
  const dish = typeof body.dish === "string" ? body.dish.trim() : "";
  const intent = typeof body.intent === "string" ? body.intent.trim() : "";
  const userWines = Array.isArray(body.userWines)
    ? body.userWines
    : Array.isArray(body.cellarWines)
      ? body.cellarWines
      : [];
  return {
    mode,
    wineName,
    wineStyle,
    wineGrape,
    wineRegion,
    wineProducer,
    wineCountry,
    wineVintage,
    dish,
    intent,
    userWines,
  };
}

export function normalizeSommelierPairingInput(input: ReturnType<typeof parseSommelierPairingInput>) {
  return {
    ...input,
    wine: {
      name: input.wineName,
      style: input.wineStyle || null,
      grape: input.wineGrape || null,
      region: input.wineRegion || null,
      producer: input.wineProducer || null,
      country: input.wineCountry || null,
      vintage: input.wineVintage,
    },
    cellar: input.userWines.slice(0, 20).map((wine: any) => ({
      id: wine?.id || null,
      name: wine?.name || "",
      producer: wine?.producer || "",
      region: wine?.region || "",
      country: wine?.country || "",
      grape: wine?.grape || "",
      style: wine?.style || "",
      vintage: wine?.vintage || null,
      purchase_price: wine?.purchase_price ?? null,
      current_value: wine?.current_value ?? null,
    })),
  };
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

export function buildBasicSafePairingsForWine(wine: WineLike) {
  return {
    source: "fallback" as const,
    pairings: buildDeterministicPairingsForWine(wine).pairings,
    pairingLogic: `${wine.name || "Este vinho"} pede pratos que respeitem corpo, acidez e taninos em equilíbrio.`,
    wineProfile: makeWineProfile(wine, detectStyleCategory(wine) === "unknown" ? "red" : detectStyleCategory(wine)),
  };
}

function analyzeDish(dish: string) {
  const lower = dish.toLowerCase();
  const result = {
    intensity: "média",
    fat: "moderada",
    protein: "",
    cooking: "",
    flavors: [] as string[],
  };

  if (lower.match(/grelhad|brasa|churras|assad|frit[oa]/)) {
    result.cooking = "grelhado/assado";
    result.intensity = "alta";
  } else if (lower.match(/cozid|vapor|refogad/)) {
    result.cooking = "cozido";
  } else if (lower.match(/cru|tartare|ceviche/)) {
    result.cooking = "cru";
    result.intensity = "leve";
  }

  if (lower.match(/carne|picanha|costela|bife|cordeiro/)) {
    result.protein = "vermelha";
    result.fat = "alta";
  } else if (lower.match(/frango|ave|peru/)) {
    result.protein = "branca";
    result.fat = "moderada";
  } else if (lower.match(/peixe|salmão|atum|camarão|bacalhau/)) {
    result.protein = "peixe";
    result.fat = "leve";
  } else if (lower.match(/ovo|omelete/)) {
    result.protein = "ovo";
    result.fat = "moderada";
  } else if (lower.match(/queijo|fondue/)) {
    result.protein = "laticínio";
    result.fat = "alta";
  }

  if (lower.match(/molho|creme/)) result.flavors.push("molho cremoso");
  if (lower.match(/tomate/)) result.flavors.push("acidez do tomate");
  if (lower.match(/limão|cítric|vinagre/)) result.flavors.push("acidez cítrica");
  if (lower.match(/pimenta|picante|apimentad/)) result.flavors.push("picância");

  return result;
}

function scoreCellarWineForDish(wine: Record<string, unknown>, dish: string) {
  const analysis = analyzeDish(dish);
  const lowerDish = dish.toLowerCase();
  const style = String(wine.style || "").toLowerCase();
  const grape = String(wine.grape || "").toLowerCase();
  const region = String(wine.region || "").toLowerCase();
  const country = String(wine.country || "").toLowerCase();
  let score = 0;

  if (style === "tinto" && (analysis.protein === "vermelha" || analysis.fat === "alta")) score += 18;
  if ((style === "branco" || style === "espumante" || style === "rosé") && (analysis.protein === "peixe" || analysis.fat === "leve")) score += 18;
  if (style === "tinto" && analysis.intensity === "alta") score += 8;
  if ((style === "branco" || style === "rosé" || style === "espumante") && analysis.intensity === "leve") score += 8;
  if (grape && lowerDish.includes(grape)) score += 5;
  if (region && lowerDish.includes(region)) score += 3;
  if (country && lowerDish.includes(country)) score += 2;
  if (analysis.flavors.some((flavor) => lowerDish.includes(flavor.split(" ")[0]))) score += 4;
  if (String(wine.tannin || "").toLowerCase().includes("firm")) score += analysis.protein === "vermelha" ? 4 : 0;
  if (String(wine.acidity || "").toLowerCase().includes("alta")) score += analysis.fat === "alta" ? 4 : 2;

  return score;
}

function getWinePrice(wine: Record<string, unknown>): number | null {
  const p = (wine as any).purchase_price ?? (wine as any).current_value;
  if (p == null) return null;
  const n = Number(p);
  return Number.isFinite(n) && n > 0 ? n : null;
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

export function rankCellarWinesByIntent(
  dish: string,
  wines: WineLike[],
  intent: "everyday" | "value" | "special",
): RankedCellarWine[] {
  const scored = wines.map((wine) => ({ wine, score: scoreCellarWineForDish(wine as Record<string, unknown>, dish) }));
  const compatible = scored.filter((entry) => entry.score >= 8);
  const pool = compatible.length >= 3 ? compatible : scored;

  const withPrices = pool.map((entry) => ({ ...entry, price: getWinePrice(entry.wine as Record<string, unknown>) }));
  const pricedOnly = withPrices.filter((entry) => entry.price != null) as Array<RankedCellarWine & { price: number }>;

  if (intent === "value") {
    const sorted = [...pricedOnly].sort((a, b) => {
      if (a.score < 8 && b.score >= 8) return 1;
      if (b.score < 8 && a.score >= 8) return -1;
      return a.price - b.price;
    });
    const noPrice = withPrices.filter((entry) => entry.price == null).sort((a, b) => b.score - a.score);
    return [...sorted, ...noPrice].map((entry) => ({ wine: entry.wine, score: entry.score }));
  }

  if (intent === "special") {
    const lowerDish = dish.toLowerCase();
    const simpleDish = /pizza|macarr[aã]o|massa simples|ovo|arroz|strogon|sandu|hamb[uú]rguer|feij[aã]o|lasanha caseira|frango grelhado|salada/.test(lowerDish);
    const median = pricedOnly.length > 0
      ? [...pricedOnly].sort((a, b) => a.price - b.price)[Math.floor(pricedOnly.length / 2)].price
      : 0;
    const ceiling = simpleDish && median > 0 ? median * 2.5 : Infinity;

    const sorted = [...pricedOnly].sort((a, b) => {
      const aOver = a.price > ceiling ? 1 : 0;
      const bOver = b.price > ceiling ? 1 : 0;
      if (aOver !== bOver) return aOver - bOver;
      return b.price - a.price;
    });
    const noPrice = withPrices.filter((entry) => entry.price == null).sort((a, b) => b.score - a.score);
    return [...sorted, ...noPrice].map((entry) => ({ wine: entry.wine, score: entry.score }));
  }

  if (pricedOnly.length === 0) {
    return pool.sort((a, b) => b.score - a.score).map((entry) => ({ wine: entry.wine, score: entry.score }));
  }

  const sortedByPrice = [...pricedOnly].sort((a, b) => a.price - b.price);
  const median = sortedByPrice[Math.floor(sortedByPrice.length / 2)].price;
  const sorted = [...pricedOnly].sort((a, b) => {
    const da = Math.abs(a.price - median);
    const db = Math.abs(b.price - median);
    if (da !== db) return da - db;
    return b.score - a.score;
  });
  const noPrice = withPrices.filter((entry) => entry.price == null).sort((a, b) => b.score - a.score);
  return [...sorted, ...noPrice].map((entry) => ({ wine: entry.wine, score: entry.score }));
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

  if (ranked.length === 0) {
    const fallbackWines = userWines
      .filter((wine) => wine?.name?.trim())
      .slice(0, 5);

    if (fallbackWines.length === 0) return null;

    const suggestions: SuggestionResult[] = fallbackWines.map((wine, index) => {
      const category = detectStyleCategory(wine);
      const style = toPortugueseStyle(category === "unknown" ? "red" : category);
      return buildDishSpecificSuggestion(dish, style, index, wine, true);
    });

    return {
      source: "deterministic" as const,
      suggestions,
      dishProfile: {
        intensity: rule.category === "carne" ? "alta" : rule.category === "mar" ? "leve" : "média",
        fat: rule.category === "queijo" ? "alta" : "moderada",
        category: rule.category,
        explanation: `Não há correspondência forte na adega; mostramos as melhores opções disponíveis. ${rule.explanation}`,
      },
    };
  }

  const suggestions: SuggestionResult[] = ranked.map(({ wine, category }, index) => {
    const style = toPortugueseStyle(category === "unknown" ? "red" : category);
    return buildDishSpecificSuggestion(dish, style, index, wine, false);
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

export function buildBasicSafeSuggestionsForDish(dish: string, userWines: WineLike[]) {
  const base = buildDeterministicSuggestionsForDish(dish, userWines);
  if (base) return base;
  const rule = pickDishRule(dish);
  const sourceWines = userWines.length > 0 ? userWines : FALLBACK_STYLE_SEQUENCE.map((style, index) => ({
    name: `${styleDisplayName(style)} ${index + 1}`,
    style,
    grape: style === "red" ? "Blend" : style === "white" ? "Blend" : styleDisplayName(style),
    country: null,
    region: null,
    producer: null,
    vintage: null,
  }));
  const fallbackSuggestions = sourceWines.slice(0, 5).map((wine, index) => {
    const category = detectStyleCategory(wine);
    const style = toPortugueseStyle(category === "unknown" ? normalizeText((wine as any).style) === "white" ? "white" : "red" : category);
    return buildDishSpecificSuggestion(
      dish,
      style,
      index,
      wine,
      userWines.length === 0 || Boolean(rule) === false,
    );
  });

  return {
    source: "fallback" as const,
    suggestions: fallbackSuggestions.slice(0, 5),
    dishProfile: {
      intensity: "média",
      fat: "moderada",
      category: "geral",
      explanation: rule
        ? `Não há correspondência forte; mostramos as melhores opções disponíveis. ${rule.explanation}`
        : "Não há correspondência forte; mostramos as melhores opções disponíveis com base em corpo, acidez e intensidade.",
    },
  };
}
