import { describe, expect, it } from "vitest";

import { adaptMenuAnalysisToGeneratedWinePairing, normalizePairingResponse, type MenuAnalysis } from "@/lib/sommelier-ai";

describe("adaptMenuAnalysisToGeneratedWinePairing", () => {
  it("preserves menu dishes as pairing cards for wine-in-mind flows", () => {
    const menu: MenuAnalysis = {
      dishes: [
        {
          name: "Risoto de funghi",
          match: "perfeito",
          reason: "A textura cremosa e o umami do prato acompanham a estrutura do vinho sem apagar sua acidez.",
          compatibilityLabel: "Alta compatibilidade",
          harmony_label: "Melhor com pratos cremosos",
          dish_profile: {
            texture: "cremoso",
            highlight: "umami",
          },
        },
        {
          name: "Polvo grelhado",
          match: "bom",
          reason: "O preparo grelhado conversa com a estrutura do vinho e mantém a harmonização equilibrada.",
        },
      ],
      summary: "O cardápio favorece pratos de textura cremosa e preparos grelhados.",
      wineProfile: {
        acidity: "alta",
        tannin: "médio",
        body: "médio",
        summary: "Vinho com boa acidez e estrutura média.",
      },
      fallback: false,
      fallbackReason: null,
    };

    const adapted = adaptMenuAnalysisToGeneratedWinePairing(menu, "Chianti Classico");
    const normalized = normalizePairingResponse(adapted, "Chianti Classico");

    expect(normalized.analysis.acidity).toBe("alta");
    expect(normalized.analysis.texture).toBe("cremoso");
    expect(normalized.pairings.length).toBeGreaterThanOrEqual(2);
    expect(normalized.pairings[0]?.wine).toBe("Risoto de funghi");
    expect(normalized.pairings[0]?.why_it_works).toContain("umami");
    expect(normalized.pairings[1]?.wine).toBe("Polvo grelhado");
  });
});
