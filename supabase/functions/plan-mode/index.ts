import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders } from "../_shared/cors.ts";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const selfHosted = (Deno.env.get("SELF_HOSTED_MODE") ?? "").toLowerCase() === "true";
  const trialDays = Number(Deno.env.get("HOSTED_TRIAL_DAYS") ?? "30");

  const body = {
    selfHosted,
    trialDays,
    pricingStatus: "coming_soon",
    message: selfHosted
      ? "Self-hosted mode: unlimited usage, no hosted billing."
      : "Hosted alpha: 30-day trial free; pricing coming soon.",
  };

  return new Response(JSON.stringify(body), {
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
    },
  });
});
