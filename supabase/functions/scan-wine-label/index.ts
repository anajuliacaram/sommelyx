import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// ── Simple in-memory rate limiter ──
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT = 10; // max requests
const RATE_WINDOW_MS = 60_000; // per minute

function checkRateLimit(userId: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(userId);
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(userId, { count: 1, resetAt: now + RATE_WINDOW_MS });
    return true;
  }
  if (entry.count >= RATE_LIMIT) return false;
  entry.count++;
  return true;
}

// Cleanup stale entries periodically
setInterval(() => {
  const now = Date.now();
  for (const [key, val] of rateLimitMap) {
    if (now > val.resetAt) rateLimitMap.delete(key);
  }
}, 120_000);

const MAX_IMAGE_SIZE = 10 * 1024 * 1024; // 10MB base64

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // ── JWT Authentication ──
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace("Bearer ", "");
    let claimsData;
    try {
      const result = await supabase.auth.getClaims(token);
      if (result.error || !result.data?.claims) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      claimsData = result.data;
    } catch {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = claimsData.claims.sub as string;

    // ── Rate Limiting ──
    if (!checkRateLimit(userId)) {
      return new Response(JSON.stringify({ error: "Muitas requisições. Tente novamente em 1 minuto." }), {
        status: 429,
        headers: { ...corsHeaders, "Content-Type": "application/json", "Retry-After": "60" },
      });
    }

    // ── Input Validation ──
    const { imageBase64 } = await req.json();
    if (!imageBase64 || typeof imageBase64 !== "string") {
      return new Response(JSON.stringify({ error: "Imagem não fornecida" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (imageBase64.length > MAX_IMAGE_SIZE) {
      return new Response(JSON.stringify({ error: "Imagem muito grande. Máximo 10MB." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!apiKey) {
      console.error("Missing required API key configuration");
      return new Response(JSON.stringify({ error: "Erro de configuração do serviço." }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const response = await fetch(
      "https://ai.gateway.lovable.dev/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [
            {
              role: "system",
              content: `You are an expert sommelier and wine label reader. Analyze the wine label image and extract ALL available information with maximum precision. Return a JSON object with these exact fields (use null for unknown):

{
  "name": "Full wine name exactly as on label",
  "producer": "Winery/producer name",
  "vintage": 2020,
  "style": "tinto|branco|rose|espumante|sobremesa|fortificado",
  "country": "Full country name in Portuguese (e.g. França, Itália, Argentina)",
  "region": "Wine region (e.g. Bordeaux, Mendoza, Douro)",
  "grape": "Grape variety or blend (e.g. Cabernet Sauvignon, Malbec/Merlot)",
  "food_pairing": "Suggested pairings in Portuguese (e.g. Carnes vermelhas, queijos maturados)",
  "tasting_notes": "Brief tasting profile in Portuguese based on grape/region/style",
  "cellar_location": null,
  "purchase_price": null,
  "drink_from": 2024,
  "drink_until": 2030
}

Rules:
- "style" MUST be one of: tinto, branco, rose, espumante, sobremesa, fortificado
- Country names in Portuguese: France→França, Italy→Itália, Spain→Espanha, Portugal→Portugal, Chile→Chile, Argentina→Argentina, USA→Estados Unidos, Germany→Alemanha, Australia→Austrália, South Africa→África do Sul, New Zealand→Nova Zelândia
- For "drink_from" and "drink_until": estimate based on vintage, style, region, and grape variety. If vintage is null, set both to null.
- For "tasting_notes": write 1-2 sentences in Portuguese describing expected aromas and flavors based on the wine's characteristics.
- For "food_pairing": suggest 2-3 pairings in Portuguese.
- Be as precise as possible. Read all text on the label including back label if visible.
- Return ONLY the JSON object, no markdown, no explanation.`,
            },
            {
              role: "user",
              content: [
                {
                  type: "text",
                  text: "Analyze this wine label and extract all information. Be thorough and precise.",
                },
                {
                  type: "image_url",
                  image_url: {
                    url: `data:image/jpeg;base64,${imageBase64}`,
                  },
                },
              ],
            },
          ],
          temperature: 0.1,
          max_tokens: 1000,
        }),
      }
    );

    if (!response.ok) {
      console.error("AI Gateway error:", response.status);
      return new Response(
        JSON.stringify({ error: "Serviço de análise indisponível. Tente novamente." }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      return new Response(
        JSON.stringify({ error: "Não foi possível analisar o rótulo." }),
        { status: 422, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let parsed;
    try {
      const cleaned = content.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
      parsed = JSON.parse(cleaned);
    } catch {
      console.error("Failed to parse AI response");
      return new Response(
        JSON.stringify({ error: "Não foi possível extrair dados do rótulo." }),
        { status: 422, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(JSON.stringify({ wine: parsed }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error in scan-wine-label:", error instanceof Error ? error.message : "unknown");
    return new Response(
      JSON.stringify({ error: "Falha ao analisar o rótulo. Tente novamente." }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
