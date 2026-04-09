import { invokeEdgeFunction, EdgeFunctionError } from "@/lib/edge-invoke";
import type { AiAnalysisAttachmentPayload } from "@/lib/ai-attachments";

// ── Types ──

export interface WineProfile {
  body?: string | null;
  acidity?: string | null;
  tannin?: string | null;
  style?: string | null;
  complexity?: string | null;
  summary?: string | null;
}

export interface DishProfile {
  protein?: string | null;
  cooking?: string | null;
  fat?: string | null;
  intensity?: string | null;
}

export interface DishItemProfile {
  intensity?: string | null;
  texture?: string | null;
  highlight?: string | null;
}

export interface Recipe {
  description: string;
  ingredients: string[];
  steps: string[];
  wine_reason: string;
}

export interface PairingResult {
  dish: string;
  reason: string;
  match: "perfeito" | "muito bom" | "bom";
  harmony_type?: "contraste" | "semelhança" | "complemento" | "equilíbrio" | "limpeza";
  harmony_label?: string;
  category?: "classico" | "afinidade" | "contraste";
  dish_profile?: DishItemProfile | null;
  recipe?: Recipe | null;
}

export interface PairingResponse {
  pairings: PairingResult[];
  wineProfile?: WineProfile | null;
}

export interface WineSuggestion {
  wineName: string;
  style: string;
  reason: string;
  fromCellar: boolean;
  match: "perfeito" | "muito bom" | "bom";
  harmony_type?: "contraste" | "semelhança" | "complemento" | "equilíbrio" | "limpeza";
  harmony_label?: string;
  grape?: string;
  vintage?: number;
  region?: string;
  country?: string;
  compatibilityLabel?: string;
}

export interface SuggestionResponse {
  suggestions: WineSuggestion[];
  dishProfile?: DishProfile | null;
}

export interface WineListPairing {
  dish: string;
  why: string;
}

export interface WineListItem {
  name: string;
  producer?: string;
  vintage?: number;
  style?: string;
  grape?: string;
  region?: string;
  price?: number | null;
  rating: number;
  description?: string;
  pairings?: WineListPairing[];
  verdict: string;
  compatibilityLabel: string;
  highlight?: "best-value" | "top-pick" | "adventurous" | "lightest" | "boldest" | "most-complex" | "easiest" | null;
  body?: string | null;
  acidity?: string | null;
  tannin?: string | null;
  occasion?: string | null;
  comparativeLabels?: string[];
}

export interface WineListAnalysis {
  wines: WineListItem[];
  topPick: string | null;
  bestValue: string | null;
}

export interface MenuDishItem {
  name: string;
  price?: number | null;
  match: "perfeito" | "muito bom" | "bom";
  reason: string;
  highlight?: "top-pick" | "best-value" | null;
  compatibilityLabel?: string | null;
  harmony_type?: "contraste" | "semelhança" | "complemento" | "equilíbrio" | "limpeza";
  harmony_label?: string | null;
  dish_profile?: DishItemProfile | null;
  recipe?: Recipe | null;
}

export interface MenuAnalysis {
  dishes: MenuDishItem[];
  summary: string;
  wineProfile?: WineProfile | null;
}

export interface TasteCompatibility {
  compatibility: number | null;
  label: string;
  reason: string;
}

export interface WineInsight {
  insight: string;
  recommendation: string;
}

// ── Error Classification ──

export type AiErrorType = "network" | "timeout" | "auth" | "ai_fail" | "empty" | "unknown";

export interface ClassifiedError {
  type: AiErrorType;
  message: string;
  usedFallback?: boolean;
}

function classifyError(err: unknown): ClassifiedError {
  const msg = err instanceof Error ? err.message : String(err);
  const lower = msg.toLowerCase();

  if (err instanceof EdgeFunctionError && err.status === 401) {
    return { type: "auth", message: "Sessão expirada. Faça login novamente." };
  }
  if (err instanceof EdgeFunctionError && err.code === "AUTH_REQUIRED") {
    return { type: "auth", message: "Sessão expirada. Faça login novamente." };
  }
  if (lower.includes("tempo limite") || lower.includes("timeout") || lower.includes("demorou mais")) {
    return { type: "timeout", message: "A busca demorou mais que o esperado. Tente novamente." };
  }
  if (lower.includes("failed to fetch") || lower.includes("networkerror") || lower.includes("load failed") || lower.includes("sem conexão")) {
    return { type: "network", message: "Sem conexão. Verifique sua internet." };
  }
  if (lower.includes("failed to send")) {
    return { type: "ai_fail", message: "A solicitação não pôde ser enviada. Tente novamente." };
  }
  if (lower.includes("créditos") || lower.includes("esgotados") || lower.includes("ai gateway error") || lower.includes("não conseguimos")) {
    return { type: "ai_fail", message: "Não conseguimos gerar a sugestão agora. Tente novamente em instantes." };
  }
  return { type: "unknown", message: "Não conseguimos gerar a sugestão agora." };
}

// ── Local Fallback Rules ──

interface WineSummary {
  name: string;
  style?: string | null;
  grape?: string | null;
  country?: string | null;
  region?: string | null;
  producer?: string | null;
  quantity?: number;
  vintage?: number | null;
}

const PAIRING_RULES: { keywords: string[]; styles: string[]; explanation: string }[] = [
  { keywords: ["carne", "churrasco", "picanha", "costela", "bife", "cordeiro", "assado", "hambúrguer", "burger"], styles: ["tinto"], explanation: "Taninos estruturados equilibram a gordura e a proteína de carnes vermelhas" },
  { keywords: ["peixe", "salmão", "atum", "bacalhau", "camarão", "frutos do mar", "marisco", "lula", "lagosta", "polvo"], styles: ["branco", "espumante", "rosé"], explanation: "A acidez mineral de brancos realça a delicadeza de peixes e frutos do mar" },
  { keywords: ["massa", "pasta", "risoto", "lasanha", "nhoque", "macarrão", "espaguete"], styles: ["tinto", "branco"], explanation: "Massas e risotos pedem vinhos com corpo médio que acompanhem o molho" },
  { keywords: ["pizza"], styles: ["tinto", "rosé"], explanation: "Pizzas pedem tintos jovens e frutados ou rosés refrescantes" },
  { keywords: ["salada", "legume", "vegetal", "vegetariano", "verdura"], styles: ["branco", "rosé", "espumante"], explanation: "Vegetais e saladas combinam com vinhos de acidez viva e corpo leve" },
  { keywords: ["queijo", "fondue", "tábua"], styles: ["tinto", "branco", "espumante"], explanation: "Queijos harmonizam com tintos maduros ou espumantes pela gordura e sal" },
  { keywords: ["sobremesa", "chocolate", "doce", "torta", "bolo", "pudim", "brigadeiro"], styles: ["sobremesa", "tinto"], explanation: "A doçura residual do vinho equilibra sobremesas" },
  { keywords: ["frango", "ave", "peru", "pato"], styles: ["branco", "rosé", "tinto"], explanation: "Aves são versáteis e aceitam brancos encorpados ou tintos leves" },
  { keywords: ["sushi", "japonesa", "oriental", "tailandesa"], styles: ["branco", "espumante", "rosé"], explanation: "Culinária oriental combina com brancos minerais e espumantes secos" },
  { keywords: ["ovo", "omelete", "fritada", "torta de ovo"], styles: ["branco", "rosé", "espumante"], explanation: "A textura cremosa do ovo pede vinhos com boa acidez que limpem o paladar" },
  { keywords: ["arroz", "paella", "pilaf", "biryani"], styles: ["branco", "rosé", "tinto"], explanation: "Arroz é neutro e versátil — o vinho deve complementar o acompanhamento" },
  { keywords: ["feijoada", "feijão", "bean"], styles: ["tinto"], explanation: "Pratos com feijão pedem tintos com corpo e acidez para equilibrar a densidade" },
  { keywords: ["porco", "leitão", "lombo", "pernil", "bacon", "linguiça", "salsicha"], styles: ["tinto", "branco", "rosé"], explanation: "A gordura suculenta do porco harmoniza com tintos médios ou brancos encorpados" },
  { keywords: ["curry", "picante", "apimentado", "pimenta"], styles: ["branco", "rosé", "espumante"], explanation: "Pratos picantes pedem vinhos com açúcar residual ou baixo álcool para não amplificar a ardência" },
  { keywords: ["sopa", "caldo", "creme"], styles: ["branco", "espumante"], explanation: "Sopas cremosas pedem brancos com textura que espelhem a untuosidade" },
  { keywords: ["empadão", "empanada", "torta salgada", "quiche"], styles: ["branco", "rosé", "tinto"], explanation: "Tortas salgadas combinam com vinhos de acidez moderada que equilibrem a massa amanteigada" },
  { keywords: ["strogonoff", "stroganoff"], styles: ["tinto", "branco"], explanation: "O molho cremoso do strogonoff pede tintos de acidez alta ou brancos encorpados" },
  { keywords: ["moqueca", "bobó", "acarajé", "baiana"], styles: ["branco", "rosé"], explanation: "Pratos com leite de coco pedem brancos aromáticos que complementem a tropicalidade" },
];

function analyzeDish(dish: string): { intensity: string; fat: string; protein: string; cooking: string; flavors: string[] } {
  const lower = dish.toLowerCase();
  const result = { intensity: "média", fat: "moderada", protein: "", cooking: "", flavors: [] as string[] };
  
  if (lower.match(/grelhad|brasa|churras|assad|frit[oa]/)) { result.cooking = "grelhado/assado"; result.intensity = "alta"; }
  else if (lower.match(/cozid|vapor|refogad/)) { result.cooking = "cozido"; result.intensity = "média"; }
  else if (lower.match(/cru|tartare|ceviche/)) { result.cooking = "cru"; result.intensity = "leve"; }
  
  if (lower.match(/carne|picanha|costela|bife|cordeiro/)) { result.protein = "vermelha"; result.fat = "alta"; }
  else if (lower.match(/frango|ave|peru/)) { result.protein = "branca"; result.fat = "moderada"; }
  else if (lower.match(/peixe|salmão|atum|camarão/)) { result.protein = "peixe"; result.fat = "leve"; }
  else if (lower.match(/ovo|omelete/)) { result.protein = "ovo"; result.fat = "moderada"; result.flavors.push("cremosidade"); }
  else if (lower.match(/queijo|fondue/)) { result.protein = "laticínio"; result.fat = "alta"; }
  
  if (lower.match(/arroz/)) result.flavors.push("neutralidade do arroz");
  if (lower.match(/molho|creme/)) result.flavors.push("untuosidade do molho");
  if (lower.match(/erva|tempero|alho|cebola/)) result.flavors.push("aromaticidade");
  if (lower.match(/limão|cítric|vinagre/)) result.flavors.push("acidez cítrica");
  if (lower.match(/tomate/)) result.flavors.push("acidez do tomate");
  
  return result;
}

function buildCellarReason(w: WineSummary, dish: string, harmonyType: string): string {
  const analysis = analyzeDish(dish);
  const style = (w.style || "").toLowerCase();
  const grape = w.grape || "";
  const region = w.region || "";
  const parts: string[] = [];

  if (grape && region) {
    parts.push(`${w.name}, um ${style} de ${grape} da região de ${region}, traz um perfil sensorial distinto para esta harmonização.`);
  } else if (grape) {
    parts.push(`A uva ${grape} confere a este ${style} características que interagem de forma específica com "${dish}".`);
  } else {
    parts.push(`Este ${style || "vinho"} possui estrutura que dialoga com os componentes de "${dish}".`);
  }

  if (harmonyType === "contraste") {
    if (analysis.fat === "alta" || analysis.fat === "moderada") {
      parts.push(`A acidez do vinho funciona em contraste com a ${analysis.fat === "alta" ? "gordura pronunciada" : "textura untuosa"} do prato, limpando o paladar entre cada garfada.`);
    } else {
      parts.push(`O corpo do vinho cria um contraste de texturas com a leveza do prato, adicionando camadas de complexidade.`);
    }
  } else if (harmonyType === "semelhança") {
    if (style === "branco" && analysis.intensity === "leve") {
      parts.push(`A delicadeza deste branco espelha a leveza do prato — ambos se encontram na mesma faixa de intensidade.`);
    } else {
      parts.push(`O peso e a intensidade do vinho espelham a robustez do prato, criando uma experiência onde nenhum elemento domina.`);
    }
  } else if (harmonyType === "complemento") {
    if (analysis.flavors.length > 0) {
      parts.push(`Os aromas do vinho complementam ${analysis.flavors[0]}, criando uma experiência mais completa e integrada.`);
    } else {
      parts.push(`As notas aromáticas do vinho adicionam uma dimensão extra aos sabores do prato.`);
    }
  } else if (harmonyType === "equilíbrio") {
    parts.push(`O corpo ${style === "tinto" ? "encorpado" : "médio"} do vinho mantém proporção equilibrada com a intensidade de "${dish}".`);
  } else {
    parts.push(`A acidez natural do vinho reseta o paladar entre cada mordida, renovando a percepção dos sabores.`);
  }

  if (w.vintage) {
    const age = new Date().getFullYear() - w.vintage;
    if (age > 5) parts.push(`Com ${age} anos de evolução, seus taninos estão mais integrados e suaves.`);
    else if (age <= 2) parts.push(`Sendo um vinho jovem, preserva frescor e vivacidade que complementam o prato.`);
  }

  return parts.join(" ");
}

function fallbackPairingsForDish(dish: string, cellarWines?: WineSummary[]): WineSuggestion[] {
  const lower = dish.toLowerCase();
  const matchedRules = PAIRING_RULES.filter((r) => r.keywords.some((k) => lower.includes(k)));
  const rules = matchedRules.length > 0 ? matchedRules : [
    { keywords: [], styles: ["branco", "rosé", "tinto"], explanation: "Para pratos do dia a dia, vinhos versáteis de corpo leve a médio são seguros" },
  ];

  const matchedStyles = new Set(rules.flatMap((r) => r.styles));
  const harmonyTypes = ["equilíbrio", "complemento", "contraste", "semelhança", "limpeza"] as const;
  const harmonyLabels = ["peso proporcional", "aromas complementares", "opostos que equilibram", "texturas semelhantes", "paladar renovado"];
  const compatLabels = ["Excelente escolha", "Alta compatibilidade", "Boa opção", "Funciona bem", "Funciona bem"];

  if (cellarWines?.length) {
    const cellarMatches = cellarWines.filter(
      (w) => w.style && matchedStyles.has(w.style.toLowerCase()),
    );

    if (cellarMatches.length > 0) {
      const seen = new Set<string>();
      const unique = cellarMatches.filter(w => {
        if (seen.has(w.name)) return false;
        seen.add(w.name);
        return true;
      });
      return unique.slice(0, 5).map((w, i) => ({
        wineName: w.name,
        style: w.style || "tinto",
        grape: w.grape || undefined,
        vintage: w.vintage || undefined,
        region: w.region || undefined,
        country: w.country || undefined,
        reason: buildCellarReason(w, dish, harmonyTypes[i % 5]),
        fromCellar: true,
        match: i === 0 ? "muito bom" : "bom",
        harmony_type: harmonyTypes[i % 5],
        harmony_label: harmonyLabels[i % 5],
        compatibilityLabel: compatLabels[i],
      }));
    }
  }

  const analysis = analyzeDish(dish);
  const genericSuggestions: WineSuggestion[] = [];
  const styleDetails: Record<string, { name: string; reason: string }> = {
    tinto: { name: "Vinho tinto de corpo médio", reason: `Para "${dish}" (intensidade ${analysis.intensity}), um tinto de corpo médio oferece taninos suaves que ${analysis.protein === "ovo" ? "contrastam com a cremosidade do ovo" : analysis.fat === "alta" ? "equilibram a gordura da proteína" : "complementam os sabores sem dominar"}.` },
    branco: { name: "Vinho branco seco", reason: `A acidez cítrica de um branco seco ${analysis.protein === "peixe" ? "realça a frescura do peixe sem competir" : `traz frescor e contraste para "${dish}"`}.` },
    rosé: { name: "Vinho rosé seco", reason: `Um rosé seco oferece o equilíbrio ideal para "${dish}" — ${analysis.intensity === "leve" ? "sua delicadeza espelha a leveza do prato" : "corpo suficiente para acompanhar sem dominar"}.` },
    espumante: { name: "Espumante brut", reason: `A perlage fina funciona como limpador natural do paladar entre cada garfada de "${dish}".` },
    sobremesa: { name: "Vinho de sobremesa", reason: `A doçura residual equilibra e complementa os sabores de "${dish}".` },
  };

  for (const style of matchedStyles) {
    const detail = styleDetails[style] || { name: `Vinho ${style}`, reason: `Sugestão clássica para "${dish}".` };
    genericSuggestions.push({
      wineName: detail.name,
      style,
      reason: detail.reason,
      fromCellar: false,
      match: genericSuggestions.length === 0 ? "muito bom" : "bom",
      harmony_type: harmonyTypes[genericSuggestions.length % 5],
      harmony_label: harmonyLabels[genericSuggestions.length % 5],
      compatibilityLabel: compatLabels[genericSuggestions.length],
    });
    if (genericSuggestions.length >= 3) break;
  }

  while (genericSuggestions.length < 3) {
    const idx = genericSuggestions.length;
    const fallbacks = [
      { name: "Vinho branco aromático", style: "branco", reason: `Para "${dish}", um branco aromático traz frescor e notas frutadas que complementam sem competir.` },
      { name: "Rosé seco e fresco", style: "rosé", reason: `A versatilidade de um rosé seco se adapta naturalmente a "${dish}".` },
      { name: "Espumante brut", style: "espumante", reason: `As bolhas finas limpam o paladar e adicionam frescor a qualquer refeição.` },
    ];
    const fb = fallbacks[idx] || fallbacks[0];
    genericSuggestions.push({
      wineName: fb.name,
      style: fb.style,
      reason: fb.reason,
      fromCellar: false,
      match: "bom",
      harmony_type: harmonyTypes[idx % 5],
      harmony_label: harmonyLabels[idx % 5],
      compatibilityLabel: compatLabels[Math.min(idx, 3)],
    });
  }

  return genericSuggestions;
}

function fallbackPairingsForWine(wine: { style?: string | null }): PairingResult[] {
  const style = (wine.style || "tinto").toLowerCase();
  const pairingMap: Record<string, PairingResult[]> = {
    tinto: [
      { dish: "Picanha na brasa com sal grosso", reason: "A gordura intramuscular da picanha suaviza os taninos do tinto, enquanto a crosta de sal amplifica os aromas frutados. O resultado é uma textura aveludada no paladar.", match: "perfeito", category: "classico", harmony_type: "equilíbrio", harmony_label: "gordura que suaviza taninos" },
      { dish: "Risoto de cogumelos porcini", reason: "As notas terrosas dos cogumelos espelham os aromas de solo e folhas secas típicos de tintos maduros. A manteiga do risoto adiciona cremosidade que envolve o vinho.", match: "perfeito", category: "afinidade", harmony_type: "semelhança", harmony_label: "notas terrosas em sintonia" },
      { dish: "Cordeiro assado com ervas e alho", reason: "A intensidade aromática do cordeiro pede um tinto com corpo e personalidade. Os taninos firmes cortam a gordura natural da carne, limpando o paladar.", match: "muito bom", category: "classico", harmony_type: "limpeza", harmony_label: "taninos que cortam gordura" },
      { dish: "Ragu de carne com pappardelle", reason: "O cozimento longo do ragu concentra umami e gordura, que encontram nos taninos do tinto um contraponto que renova o paladar a cada garfada.", match: "muito bom", category: "classico", harmony_type: "contraste", harmony_label: "acidez vs untuosidade do molho" },
      { dish: "Tábua de queijos maturados", reason: "A gordura e o sal dos queijos maturados neutralizam a adstringência dos taninos, revelando notas frutadas e especiadas que estavam mascaradas.", match: "bom", category: "contraste", harmony_type: "complemento", harmony_label: "sal que revela fruta" },
      { dish: "Berinjela à parmegiana gratinada", reason: "A textura macia da berinjela e a acidez do molho de tomate criam uma base versátil que aceita tintos de corpo médio sem competir.", match: "bom", category: "afinidade", harmony_type: "equilíbrio", harmony_label: "peso proporcional" },
    ],
    branco: [
      { dish: "Salmão grelhado com molho de limão siciliano", reason: "A acidez cítrica do branco espelha o limão do molho, enquanto a mineralidade realça a textura delicada do salmão sem mascará-la.", match: "perfeito", category: "afinidade", harmony_type: "semelhança", harmony_label: "citricidade em sintonia" },
      { dish: "Camarão ao alho e óleo com ervas frescas", reason: "O alho dourado e o azeite criam uma gordura sutil que a acidez do branco corta com precisão, renovando o paladar entre cada camarão.", match: "perfeito", category: "classico", harmony_type: "limpeza", harmony_label: "acidez que limpa o azeite" },
      { dish: "Ceviche de peixe branco com coentro", reason: "A frescura ácida do ceviche encontra no branco mineral um espelho perfeito — ambos trabalham na mesma frequência de leveza e vivacidade.", match: "muito bom", category: "afinidade", harmony_type: "semelhança", harmony_label: "frescor que se espelha" },
      { dish: "Risoto de limão e ervas finas", reason: "A manteiga do risoto pede a acidez do branco para não pesar, enquanto as ervas encontram nos aromas herbáceos do vinho um complemento natural.", match: "muito bom", category: "contraste", harmony_type: "complemento", harmony_label: "ervas que se completam" },
      { dish: "Frango ao molho de mostarda e estragão", reason: "A cremosidade do molho de mostarda encontra na acidez do branco um contraponto que equilibra a riqueza, sem que nenhum elemento domine.", match: "bom", category: "contraste", harmony_type: "contraste", harmony_label: "acidez vs cremosidade" },
      { dish: "Salada de folhas com queijo de cabra e nozes", reason: "A acidez mineral do branco liga os elementos: a leve amargura das folhas, a tanginess do queijo de cabra e a oleosidade das nozes.", match: "bom", category: "classico", harmony_type: "equilíbrio", harmony_label: "peso equilibrado" },
    ],
    rosé: [
      { dish: "Salada mediterrânea com azeite e orégano", reason: "A leveza frutada do rosé espelha a frescura dos vegetais, enquanto sua sutil acidez corta o azeite extra-virgem sem competir com as ervas.", match: "perfeito", category: "classico", harmony_type: "semelhança", harmony_label: "frescor mediterrâneo" },
      { dish: "Sushi variado com sashimi", reason: "A versatilidade do rosé — nem tão ácido quanto um branco, nem tão tânico quanto um tinto — acompanha a variedade de texturas do sushi sem dominar.", match: "muito bom", category: "afinidade", harmony_type: "equilíbrio", harmony_label: "versatilidade textural" },
      { dish: "Bruschetta de tomate fresco com manjericão", reason: "A acidez natural do tomate encontra no rosé um parceiro de mesma intensidade, criando uma harmonia de verão despretensiosa e precisa.", match: "muito bom", category: "afinidade", harmony_type: "semelhança", harmony_label: "acidez em sintonia" },
      { dish: "Frango grelhado com limão e alcaparras", reason: "A proteína branca leve e o toque ácido das alcaparras pedem um rosé com corpo suficiente para acompanhar, mas sem peso excessivo.", match: "bom", category: "classico", harmony_type: "complemento", harmony_label: "leveza que complementa" },
      { dish: "Pizza margherita com mozzarella fresca", reason: "A gordura da mozzarella e a acidez do tomate da pizza encontram no rosé seco o equilíbrio ideal entre frescor e substância.", match: "bom", category: "contraste", harmony_type: "limpeza", harmony_label: "frescor que limpa gordura" },
    ],
    espumante: [
      { dish: "Ostras frescas com limão", reason: "A salinidade mineral das ostras amplifica a perlage do espumante, criando uma explosão de frescor. A acidez alta corta a textura cremosa do molusco.", match: "perfeito", category: "classico", harmony_type: "contraste", harmony_label: "bolhas que amplificam salinidade" },
      { dish: "Salmão defumado com cream cheese e alcaparras", reason: "As bolhas agem como micro-limpadores entre a gordura do salmão e a untuosidade do cream cheese, renovando o paladar a cada garfada.", match: "perfeito", category: "classico", harmony_type: "limpeza", harmony_label: "perlage que renova o paladar" },
      { dish: "Canapés de patê de foie gras", reason: "A riqueza concentrada do foie gras precisa da acidez vibrante e das bolhas do espumante para não saturar o paladar. Um clássico incontestável.", match: "muito bom", category: "classico", harmony_type: "contraste", harmony_label: "acidez vs riqueza" },
      { dish: "Tempura de legumes com molho ponzu", reason: "A crocância da tempura e a leveza do ponzu encontram nas bolhas finas um parceiro que adiciona textura sem peso.", match: "muito bom", category: "afinidade", harmony_type: "complemento", harmony_label: "texturas que se complementam" },
      { dish: "Frutas frescas com calda de maracujá", reason: "A acidez tropical do maracujá espelha a vivacidade do espumante, criando uma sobremesa leve onde ambos se elevam mutuamente.", match: "bom", category: "afinidade", harmony_type: "semelhança", harmony_label: "acidez tropical em sintonia" },
      { dish: "Risoto de açafrão com parmesão", reason: "O umami do parmesão e a elegância do açafrão pedem um espumante com corpo para acompanhar sem ser ofuscado pela complexidade do prato.", match: "bom", category: "contraste", harmony_type: "equilíbrio", harmony_label: "peso proporcional ao umami" },
    ],
  };

  return pairingMap[style] || pairingMap["tinto"]!;
}

// ── Validation helpers ──

function isValidPairings(data: unknown): data is PairingResponse {
  if (!data || typeof data !== "object") return false;
  const d = data as Record<string, unknown>;
  if (!Array.isArray(d.pairings) || d.pairings.length === 0) return false;
  return d.pairings.every((p: any) => typeof p.dish === "string" && p.dish.length > 0);
}

function isValidSuggestions(data: unknown): data is SuggestionResponse {
  if (!data || typeof data !== "object") return false;
  const d = data as Record<string, unknown>;
  if (!Array.isArray(d.suggestions) || d.suggestions.length === 0) return false;
  return d.suggestions.every((s: any) => typeof s.wineName === "string" && s.wineName.length > 0);
}

// ── API Functions with Fallback ──

export async function getWinePairings(wine: {
  name: string;
  style?: string | null;
  grape?: string | null;
  region?: string | null;
}): Promise<PairingResponse> {
  try {
    const data = await invokeEdgeFunction<PairingResponse>(
      "wine-pairings",
      {
        mode: "wine-to-food",
        wineName: wine.name,
        wineStyle: wine.style,
        wineGrape: wine.grape,
        wineRegion: wine.region,
      },
      { timeoutMs: 30_000, retries: 1 },
    );

    if (isValidPairings(data)) {
      return { pairings: data.pairings, wineProfile: (data as any).wineProfile || null };
    }

    console.warn("[sommelier-ai] Invalid AI pairing response, using fallback");
    return { pairings: fallbackPairingsForWine(wine), wineProfile: null };
  } catch (err) {
    const classified = classifyError(err);
    console.warn("[sommelier-ai] getWinePairings error:", classified.type, classified.message);
    if (classified.type === "auth") throw new Error(classified.message);
    return { pairings: fallbackPairingsForWine(wine), wineProfile: null };
  }
}

export async function getDishWineSuggestions(
  dish: string,
  userWines?: WineSummary[],
): Promise<SuggestionResponse> {
  try {
    const data = await invokeEdgeFunction<SuggestionResponse>(
      "wine-pairings",
      {
        mode: "food-to-wine",
        dish,
        userWines: userWines?.slice(0, 30)?.map((w) => ({
          name: w.name,
          style: w.style,
          grape: w.grape,
          region: w.region,
          country: w.country,
          vintage: w.vintage,
          producer: w.producer,
        })),
      },
      { timeoutMs: 30_000, retries: 1 },
    );

    if (isValidSuggestions(data)) {
      return { suggestions: data.suggestions, dishProfile: (data as any).dishProfile || null };
    }

    console.warn("[sommelier-ai] Invalid AI suggestion response, using fallback");
    return { suggestions: fallbackPairingsForDish(dish, userWines), dishProfile: null };
  } catch (err) {
    const classified = classifyError(err);
    console.warn("[sommelier-ai] getDishWineSuggestions error:", classified.type, classified.message);
    if (classified.type === "auth") throw new Error(classified.message);
    return { suggestions: fallbackPairingsForDish(dish, userWines), dishProfile: null };
  }
}

export async function analyzeWineList(
  attachment: AiAnalysisAttachmentPayload,
  userProfile?: {
    topStyles?: string[];
    topGrapes?: string[];
    topCountries?: string[];
    avgPrice?: number;
  },
): Promise<WineListAnalysis> {
  try {
    const data = await invokeEdgeFunction<WineListAnalysis>(
      "analyze-wine-list",
      { ...attachment, userProfile },
      { timeoutMs: 45_000, retries: 1 },
    );
    if (data && Array.isArray(data.wines) && data.wines.length > 0) {
      return data;
    }
    throw new Error("Resposta vazia da análise");
  } catch (err) {
    const classified = classifyError(err);
    if (classified.type === "auth") throw new Error(classified.message);
    throw new Error(classified.message);
  }
}

export async function analyzeMenuForWine(
  attachment: AiAnalysisAttachmentPayload,
  wineName: string,
): Promise<MenuAnalysis> {
  try {
    const data = await invokeEdgeFunction<MenuAnalysis>(
      "analyze-wine-list",
      { ...attachment, mode: "menu-for-wine", wineName },
      { timeoutMs: 45_000, retries: 1 },
    );
    if (data && Array.isArray(data.dishes) && data.dishes.length > 0) {
      return { dishes: data.dishes, summary: data.summary || "", wineProfile: (data as any).wineProfile || null };
    }
    throw new Error("Nenhum prato encontrado no cardápio");
  } catch (err) {
    const classified = classifyError(err);
    if (classified.type === "auth") throw new Error(classified.message);
    throw new Error(classified.message);
  }
}

export async function getTasteCompatibility(
  targetWine: WineSummary,
  userCellar: WineSummary[],
): Promise<TasteCompatibility> {
  try {
    const data = await invokeEdgeFunction<TasteCompatibility>(
      "taste-compatibility",
      {
        targetWine: {
          name: targetWine.name,
          style: targetWine.style,
          grape: targetWine.grape,
          country: targetWine.country,
          region: targetWine.region,
          producer: targetWine.producer,
        },
        userCellar: userCellar.slice(0, 40).map((w) => ({
          name: w.name,
          style: w.style,
          grape: w.grape,
          country: w.country,
          region: w.region,
          quantity: w.quantity,
        })),
      },
      { timeoutMs: 8_000, retries: 1 },
    );
    if (data && typeof data.compatibility === "number") {
      return data;
    }
    return { compatibility: null, label: "Não disponível", reason: "Não foi possível calcular a compatibilidade" };
  } catch (err) {
    const classified = classifyError(err);
    if (classified.type === "auth") throw new Error(classified.message);
    return { compatibility: null, label: "Não disponível", reason: classified.message };
  }
}

export async function getWineInsight(wine: {
  name: string;
  alertType: "drink_now" | "past_peak";
  style?: string | null;
  grape?: string | null;
  region?: string | null;
  country?: string | null;
  vintage?: number | null;
  drinkFrom?: number | null;
  drinkUntil?: number | null;
}): Promise<WineInsight> {
  try {
    const data = await invokeEdgeFunction<WineInsight>(
      "wine-insight",
      {
        alertType: wine.alertType,
        wineName: wine.name,
        style: wine.style,
        grape: wine.grape,
        region: wine.region,
        country: wine.country,
        vintage: wine.vintage,
        drinkFrom: wine.drinkFrom,
        drinkUntil: wine.drinkUntil,
      },
      { timeoutMs: 8_000, retries: 1 },
    );
    if (data && (data.insight || data.recommendation)) {
      return data;
    }
    return {
      insight: wine.alertType === "drink_now"
        ? "Este vinho está em sua janela ideal de consumo."
        : "Este vinho pode ter passado do seu período ideal.",
      recommendation: "Considere abri-lo em breve para aproveitar melhor.",
    };
  } catch (err) {
    const classified = classifyError(err);
    if (classified.type === "auth") throw new Error(classified.message);
    return {
      insight: wine.alertType === "drink_now"
        ? "Este vinho está em sua janela ideal de consumo."
        : "Este vinho pode ter passado do seu período ideal.",
      recommendation: "Considere abri-lo em breve para aproveitar melhor.",
    };
  }
}

// ── Helpers ──

export function buildUserProfile(wines: WineSummary[]) {
  const styleCount: Record<string, number> = {};
  const grapeCount: Record<string, number> = {};
  const countryCount: Record<string, number> = {};

  wines.forEach((w) => {
    if (w.style) styleCount[w.style] = (styleCount[w.style] || 0) + (w.quantity || 1);
    if (w.grape) grapeCount[w.grape] = (grapeCount[w.grape] || 0) + (w.quantity || 1);
    if (w.country) countryCount[w.country] = (countryCount[w.country] || 0) + (w.quantity || 1);
  });

  const topN = (obj: Record<string, number>, n: number) =>
    Object.entries(obj)
      .sort(([, a], [, b]) => b - a)
      .slice(0, n)
      .map(([k]) => k);

  return {
    topStyles: topN(styleCount, 3),
    topGrapes: topN(grapeCount, 5),
    topCountries: topN(countryCount, 3),
  };
}

export function compatibilityColor(score: number | null): string {
  if (score === null) return "text-muted-foreground";
  if (score >= 85) return "text-green-600";
  if (score >= 70) return "text-emerald-500";
  if (score >= 50) return "text-amber-500";
  return "text-muted-foreground";
}

export function compatibilityBg(score: number | null): string {
  if (score === null) return "bg-muted/30";
  if (score >= 85) return "bg-green-500/8";
  if (score >= 70) return "bg-emerald-500/8";
  if (score >= 50) return "bg-amber-500/8";
  return "bg-muted/30";
}
