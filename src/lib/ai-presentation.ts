type StatusKind = "menu" | "label" | "pairing";

const OMIT_PATTERNS = [
  /^(n\/a|na|null|undefined|unknown|unidentified)$/i,
  /^(não identificado|nao identificado)$/i,
  /^(revisar|revis[aã]o necess[aá]ria)$/i,
  /^(imagem enviada)$/i,
];

const SENTENCE_BLOCKLIST = [
  /\bocr\b/i,
  /\bfallback\b/i,
  /\bmodel\b/i,
  /\bmodelo\b/i,
  /\bsystem\b/i,
  /\bsistema\b/i,
  /\bpars/i,
  /\bconfian[çc]a\b/i,
  /\bcorrespond[êe]ncia\b/i,
  /\bdetect/i,
  /\bidentific/i,
  /\bcampos?\b.*\bincomplet/i,
  /\bdados limitados\b/i,
  /\brevis[aã]o manual\b/i,
  /\bsugest[aã]o gen[ée]rica\b/i,
];

const DIRECT_REPLACEMENTS: Array<[RegExp, string]> = [
  [/\bleitura estrutural do prato\b/gi, "perfil equilibrado"],
  [/\bmelhor op[cç][aã]o dispon[ií]vel\b/gi, "versátil à mesa"],
  [/\bharmoniza[cç][aã]o sugerida\b/gi, "curadoria da casa"],
  [/\bboa rela[cç][aã]o custo-benef[ií]cio\b/gi, "best value"],
  [/\bmelhor escolha do card[aá]pio\b/gi, "destaque da casa"],
  [/\bservi[cç]o premium\b/gi, "serviço especial"],
  [/\bboa compra\b/gi, "best value"],
  [/\bservi[cç]o [àa] mesa\b/gi, "à mesa"],
  [/\bajustar manualmente\b/gi, ""],
];

function trimPunctuation(value: string) {
  return value.replace(/^[\s,.;:–-]+|[\s,.;:–-]+$/g, "").trim();
}

export function cleanAiPresentationText(
  value: unknown,
  options?: { maxLength?: number; fallback?: string },
) {
  if (typeof value !== "string") return options?.fallback || "";

  let text = value
    .replace(/\s+/g, " ")
    .replace(/[“”]/g, "\"")
    .trim();

  if (!text) return options?.fallback || "";

  for (const [pattern, replacement] of DIRECT_REPLACEMENTS) {
    text = text.replace(pattern, replacement);
  }

  const sentences = text
    .split(/(?<=[.!?])\s+/)
    .map((sentence) => trimPunctuation(sentence))
    .filter(Boolean)
    .filter((sentence) => !SENTENCE_BLOCKLIST.some((pattern) => pattern.test(sentence)));

  text = sentences.join(" ").replace(/\s+/g, " ").trim();

  if (OMIT_PATTERNS.some((pattern) => pattern.test(text))) return options?.fallback || "";

  if (!text) return options?.fallback || "";

  if (options?.maxLength && text.length > options.maxLength) {
    text = `${text.slice(0, Math.max(0, options.maxLength - 1)).trimEnd()}…`;
  }

  return trimPunctuation(text) || options?.fallback || "";
}

export function hasAiPresentationValue(value: unknown) {
  return cleanAiPresentationText(value).length > 0;
}

export function getAiPresentationStatus(kind: StatusKind, partial: boolean) {
  if (kind === "label") {
    return partial
      ? {
          title: "Rótulo em foco",
          description: "Os traços centrais já estão organizados para cadastro.",
        }
      : {
          title: "Rótulo pronto",
          description: "A ficha principal já está pronta para seguir.",
        };
  }

  if (kind === "pairing") {
    return partial
      ? {
          title: "Seleção inicial",
          description: "Os caminhos mais promissores já estão à mesa.",
        }
      : {
          title: "Curadoria pronta",
          description: "A combinação já está organizada para decidir.",
        };
  }

  return partial
    ? {
        title: "Seleção inicial",
        description: "Os principais rótulos já estão reunidos para revisar.",
      }
    : {
        title: "Curadoria pronta",
        description: "Os destaques da carta já estão organizados para decidir.",
      };
}

export function buildPresentationStructureLine(values: Array<string | null | undefined>) {
  const cleaned = values
    .map((value) => cleanAiPresentationText(value))
    .filter(Boolean);
  return cleaned.length > 0 ? cleaned.join(" • ") : null;
}
