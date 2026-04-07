import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// AbacatePay public HMAC key for webhook signature verification
const ABACATEPAY_PUBLIC_KEY =
  "t9dXRhHHo3yDEj5pVDYz0frf7q6bMKyMRmxxCPIPp3RCplBfXRxqlC6ZpiWmOqj4L63qEaeUOtrCI8P0VMUgo6iIga2ri9ogaHFs0WIIywSMg0q7RmBfybe1E5XJcfC4IW3alNqym0tXoAKkzvfEjZxV6bE0oG2zJrNNYmUCKZyV0KZ3JS8Votf9EAWWYdiDkMkpbMdPggfh1EqHlVkMiTady6jOR3hyzGEHrIz2Ret0xHKMbiqkr9HS1JhNHDX9";

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function verifyHmacSignature(rawBody: string, signatureFromHeader: string): Promise<boolean> {
  try {
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      "raw",
      encoder.encode(ABACATEPAY_PUBLIC_KEY),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"],
    );

    const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(rawBody));
    const expectedSig = btoa(String.fromCharCode(...new Uint8Array(signature)));

    // Constant-time comparison
    if (expectedSig.length !== signatureFromHeader.length) return false;
    let result = 0;
    for (let i = 0; i < expectedSig.length; i++) {
      result |= expectedSig.charCodeAt(i) ^ signatureFromHeader.charCodeAt(i);
    }
    return result === 0;
  } catch (e) {
    console.error("HMAC verification error:", e);
    return false;
  }
}

function mapEventToStatus(event: string): string | null {
  switch (event) {
    case "checkout.completed":
      return "paid";
    case "checkout.refunded":
      return "refunded";
    case "checkout.disputed":
      return "disputed";
    default:
      return null;
  }
}

function mapStatusToPlan(status: string): string | null {
  if (status === "paid") return "active";
  if (status === "refunded" || status === "disputed") return "free";
  return null;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const startTime = Date.now();
  let outcome = "success";
  let statusCode = 200;

  try {
    // ── Validate webhook secret from query string ──
    const url = new URL(req.url);
    const webhookSecret = url.searchParams.get("webhookSecret");
    const expectedSecret = Deno.env.get("ABACATEPAY_WEBHOOK_SECRET");

    if (!expectedSecret || !webhookSecret || webhookSecret !== expectedSecret) {
      statusCode = 401;
      outcome = "unauthorized";
      console.error("Webhook secret mismatch");
      return jsonResponse({ error: "Unauthorized" }, 401);
    }

    // ── Read raw body ──
    const rawBody = await req.text();
    if (!rawBody) {
      statusCode = 400;
      outcome = "validation_error";
      return jsonResponse({ error: "Empty body" }, 400);
    }

    // ── Verify HMAC signature ──
    const hmacSignature = req.headers.get("X-Webhook-Signature");
    if (hmacSignature) {
      const valid = await verifyHmacSignature(rawBody, hmacSignature);
      if (!valid) {
        statusCode = 401;
        outcome = "invalid_signature";
        console.error("HMAC signature verification failed");
        return jsonResponse({ error: "Invalid signature" }, 401);
      }
    }

    // ── Parse payload ──
    const payload = JSON.parse(rawBody);
    const event = payload?.event;
    const checkoutData = payload?.data?.checkout;

    if (!event || !checkoutData) {
      statusCode = 400;
      outcome = "validation_error";
      return jsonResponse({ error: "Invalid payload" }, 400);
    }

    const newStatus = mapEventToStatus(event);
    if (!newStatus) {
      // Unsupported event - acknowledge silently
      return jsonResponse({ received: true, skipped: true });
    }

    const providerId = checkoutData.id;
    const externalId = checkoutData.externalId;

    if (!providerId && !externalId) {
      statusCode = 400;
      outcome = "validation_error";
      return jsonResponse({ error: "Missing checkout identifiers" }, 400);
    }

    // ── Find payment in DB ──
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    let query = supabaseAdmin.from("payments").select("*");
    if (externalId) {
      query = query.eq("external_id", externalId);
    } else {
      query = query.eq("provider_id", providerId);
    }

    const { data: payment, error: findError } = await query.maybeSingle();

    if (findError || !payment) {
      console.error("Payment not found:", externalId || providerId, findError);
      statusCode = 404;
      outcome = "not_found";
      return jsonResponse({ error: "Payment not found" }, 404);
    }

    // ── Idempotency: skip if already in target status ──
    if (payment.status === newStatus) {
      return jsonResponse({ received: true, idempotent: true });
    }

    // ── Update payment status ──
    const { error: updateError } = await supabaseAdmin
      .from("payments")
      .update({
        status: newStatus,
        provider_id: providerId || payment.provider_id,
        metadata: {
          ...((payment.metadata as Record<string, unknown>) || {}),
          lastWebhookEvent: event,
          paidAmount: checkoutData.paidAmount,
          webhookReceivedAt: new Date().toISOString(),
          devMode: payload.devMode,
        },
      })
      .eq("id", payment.id);

    if (updateError) {
      console.error("Update payment error:", updateError);
      statusCode = 500;
      outcome = "internal_error";
      return jsonResponse({ error: "Failed to update payment" }, 500);
    }

    // ── Update subscription if payment confirmed ──
    const subscriptionStatus = mapStatusToPlan(newStatus);
    if (subscriptionStatus) {
      const newPlan = subscriptionStatus === "active" ? payment.plan : "free";

      const { error: subError } = await supabaseAdmin
        .from("subscriptions")
        .update({
          plan: newPlan,
          status: subscriptionStatus === "active" ? "active" : "cancelled",
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", payment.user_id);

      if (subError) {
        console.error("Update subscription error:", subError);
        // Don't fail the webhook - payment is already recorded
      }
    }

    console.log(`Webhook processed: ${event} for payment ${payment.id} -> ${newStatus}`);
    return jsonResponse({ received: true, status: newStatus });
  } catch (e) {
    console.error("abacatepay-webhook error:", e);
    if (statusCode === 200) statusCode = 500;
    if (outcome === "success") outcome = "internal_error";
    return jsonResponse({ error: "Internal error" }, statusCode);
  } finally {
    try {
      const supabaseAdmin = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      );
      await supabaseAdmin.from("edge_function_logs").insert({
        function_name: "abacatepay-webhook",
        user_id: "webhook",
        status_code: statusCode,
        outcome,
        duration_ms: Date.now() - startTime,
        metadata: {},
      });
    } catch { /* ignore */ }
  }
});
