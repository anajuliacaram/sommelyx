import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const FUNCTION_NAME = "wishlist-wine-assistant";
const MAX_IMAGE_SIZE = 10 * 1024 * 1024;

type AssistantResult = {
  wine_name: string | null;
  producer: string | null;
  vintage: number | null;
  style: string | null;
  country: string | null;
  region: string | null;
  grape: string | null;
  target_price: number | null;
  ai_summary: string | null;
  notes: string | null;
  image_url: string | null;
};

async function logAudit(
  userId: string,
  statusCode: number,
  outcome: string,
  durationMs: number,
  metadata?: Record<string, unknown>,
) {
  try {
    const adminClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    await adminClient.from("edge_function_logs").insert({
      user_id: userId,
      function_name: FUNCTION_NAME,
      status_code: statusCode,
      outcome,
      duration_ms: durationMs,
      metadata: metadata ?? {},
    });
  } catch (error) {
    console.error("Audit log failed:", error instanceof Error ? error.message : "unknown");
  }
}

function normalizeValue(value: unknown) {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

function normalizeNumber(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const cleaned = value.replace(/[^\d.,-]/g, "").replace(",", ".");
    const parsed = Number(cleaned);
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
}

async function getImageFromOpenFoodFacts(query: string) {
  const url = `https://world.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(query)}&search_simple=1&action=process&json=1&page_size=12&fields=product_name,brands,image_url,image_front_url,categories_tags`;

  const response = await fetch(url);
  if (!response.ok) return null;

  const data = await response.json();
  const products = Array.isArray(data?.products) ? data.products : [];
  const tokens = query.toLowerCase().split(/\s+/).filter(Boolean);

  const best = products
    .map((product: Record<string, unknown>) => {
      const productName = String(product.product_name ?? "").toLowerCase();
      const brands = String(product.brands ?? "").toLowerCase();
      const categories = Array.isArray(product.categories_tags) ? product.categories_tags.join(" ").toLowerCase() : "";
      const imageUrl = String(product.image_url ?? product.image_front_url ?? "");
      const score = tokens.reduce((sum, token) => sum + (productName.includes(token) ? 3 : 0) + (brands.includes(token) ? 2 : 0), 0)
        + (/wine|vin|champagne|espumante/.test(categories) ? 2 : 0)
        + (imageUrl ? 2 : 0);

      return { imageUrl, score };
    })
    .filter((product: { imageUrl: string; score: number }) => product.imageUrl && product.score > 0)
    .sort((a: { score: number }, b: { score: number }) => b.score - a.score)[0];

  return best?.imageUrl ?? null;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const startTime = Date.now();
  let userId = "anonymous";

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      await logAudit("anonymous", 401, "unauthorized", Date.now() - startTime);
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      await logAudit("anonymous", 401, "unauthorized", Date.now() - startTime);
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    userId = user.id;

    const { query, imageBase64 } = await req.json();
    const safeQuery = typeof query === "string" ? query.trim() : "";

    if (!safeQuery && (!imageBase64 || typeof imageBase64 !== "string")) {
      await logAudit(userId, 400, "validation_error", Date.now() - startTime, { reason: "missing_input" });
      return new Response(JSON.stringify({ error: "Informe um texto ou imagem." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (typeof imageBase64 === "string" && imageBase64.length > MAX_IMAGE_SIZE) {
      await logAudit(userId, 400, "validation_error", Date.now() - startTime, { reason: "image_too_large" });
      return new Response(JSON.stringify({ error: "Imagem muito grande. Máximo 10MB." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!apiKey) {
      await logAudit(userId, 500, "internal_error", Date.now() - startTime, { reason: "missing_api_key" });
      return new Response(JSON.stringify({ error: "Erro de configuração do serviço." }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const messages: Array<Record<string, unknown>> = [
      {
        role: "system",
        content: `Voce e um especialista em vinhos e assistente de wishlist premium. Receba um texto livre do cliente, e opcionalmente uma foto do rótulo, e devolva um JSON com os campos abaixo. Use null quando nao souber com boa confianca.

{
  "wine_name": "Nome principal do vinho",
  "producer": "Vinicola/produtor",
  "vintage": 2020,
  "style": "tinto|branco|rose|espumante|sobremesa|fortificado",
  "country": "Pais em portugues",
  "region": "Regiao",
  "grape": "Uva ou corte",
  "target_price": 199.9,
  "ai_summary": "Resumo curto em portugues explicando por que este vinho e interessante para wishlist",
  "notes": "Frase curta para pre-preencher observacoes do usuario"
}

Regras:
- Responda apenas JSON puro.
- Se o texto vier incompleto, infira apenas o que for razoavelmente confiavel.
- Em ai_summary, escreva no maximo 2 frases curtas e elegantes.
- Em notes, escreva algo curto como oportunidade de compra, ocasiao de consumo ou diferencial do rótulo.
- Se houver foto, priorize a foto sobre o texto.`,
      },
    ];

    const userContent: Array<Record<string, unknown>> = [];
    if (safeQuery) {
      userContent.push({
        type: "text",
        text: `Texto informado pelo cliente: ${safeQuery}`,
      });
    }
    if (typeof imageBase64 === "string" && imageBase64.trim().length > 0) {
      userContent.push({
        type: "image_url",
        image_url: {
          url: `data:image/jpeg;base64,${imageBase64}`,
        },
      });
    }

    messages.push({
      role: "user",
      content: userContent,
    });

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages,
        temperature: 0.2,
        max_tokens: 700,
      }),
    });

    if (!aiResponse.ok) {
      await logAudit(userId, 502, "ai_error", Date.now() - startTime, { ai_status: aiResponse.status });
      return new Response(JSON.stringify({ error: "Servico de IA indisponivel." }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiData = await aiResponse.json();
    const content = aiData.choices?.[0]?.message?.content;
    if (!content) {
      await logAudit(userId, 422, "ai_error", Date.now() - startTime, { reason: "empty_response" });
      return new Response(JSON.stringify({ error: "Nao foi possivel gerar sugestoes." }), {
        status: 422,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const cleaned = String(content).replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    const parsed = JSON.parse(cleaned) as Record<string, unknown>;

    const searchBasis = [normalizeValue(parsed.wine_name), normalizeValue(parsed.producer), normalizeValue(parsed.vintage)]
      .filter(Boolean)
      .join(" ")
      || safeQuery;

    const imageUrl = await getImageFromOpenFoodFacts(searchBasis);

    const result: AssistantResult = {
      wine_name: normalizeValue(parsed.wine_name),
      producer: normalizeValue(parsed.producer),
      vintage: normalizeNumber(parsed.vintage),
      style: normalizeValue(parsed.style),
      country: normalizeValue(parsed.country),
      region: normalizeValue(parsed.region),
      grape: normalizeValue(parsed.grape),
      target_price: normalizeNumber(parsed.target_price),
      ai_summary: normalizeValue(parsed.ai_summary),
      notes: normalizeValue(parsed.notes),
      image_url: imageUrl,
    };

    await logAudit(userId, 200, "success", Date.now() - startTime, {
      query: safeQuery || "image_only",
      found_image: !!imageUrl,
      wine_name: result.wine_name,
    });

    return new Response(JSON.stringify({ suggestion: result }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro interno";
    await logAudit(userId, 500, "internal_error", Date.now() - startTime, { message });
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
