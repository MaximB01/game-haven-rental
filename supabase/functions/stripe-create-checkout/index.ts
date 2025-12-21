import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[STRIPE-CREATE-CHECKOUT] ${step}${detailsStr}`);
};

interface CheckoutRequest {
  planId: string;
  variantId?: string;
  successUrl?: string;
  cancelUrl?: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not set");
    logStep("Stripe key verified");

    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

    const supabaseClient = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false }
    });

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header provided");
    logStep("Authorization header found");

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError) throw new Error(`Authentication error: ${userError.message}`);
    const user = userData.user;
    if (!user?.email) throw new Error("User not authenticated or email not available");
    logStep("User authenticated", { userId: user.id, email: user.email });

    const body: CheckoutRequest = await req.json();
    const { planId, variantId, successUrl, cancelUrl } = body;

    if (!planId) throw new Error("planId is required");
    logStep("Request body parsed", { planId, variantId });

    // Get plan details with product info
    const { data: plan, error: planError } = await supabaseClient
      .from("product_plans")
      .select(`
        *,
        products (
          id,
          name,
          slug,
          stripe_product_id
        )
      `)
      .eq("id", planId)
      .single();

    if (planError || !plan) {
      throw new Error(`Plan not found: ${planError?.message || "Unknown error"}`);
    }
    logStep("Plan found", { planName: plan.name, price: plan.price, productName: plan.products?.name });

    // Check if plan has stripe_price_id, if not we need to sync first
    if (!plan.stripe_price_id) {
      throw new Error("This plan has not been synced to Stripe yet. Please sync products first in the admin panel.");
    }
    logStep("Stripe price ID found", { stripePriceId: plan.stripe_price_id });

    // Get or create stripe customer
    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });
    
    // Check if user already has stripe_customer_id in profile
    const { data: profile } = await supabaseClient
      .from("profiles")
      .select("stripe_customer_id")
      .eq("user_id", user.id)
      .single();

    let customerId = profile?.stripe_customer_id;

    if (!customerId) {
      // Search for existing customer by email
      const customers = await stripe.customers.list({ email: user.email, limit: 1 });
      
      if (customers.data.length > 0) {
        customerId = customers.data[0].id;
        logStep("Found existing Stripe customer", { customerId });
      } else {
        // Create new customer
        const customer = await stripe.customers.create({
          email: user.email,
          metadata: {
            supabase_user_id: user.id,
          },
        });
        customerId = customer.id;
        logStep("Created new Stripe customer", { customerId });
      }

      // Update profile with stripe_customer_id
      await supabaseClient
        .from("profiles")
        .update({ stripe_customer_id: customerId })
        .eq("user_id", user.id);
      logStep("Updated profile with Stripe customer ID");
    } else {
      logStep("Using existing Stripe customer from profile", { customerId });
    }

    // Get variant info if provided
    let variantName: string | null = null;
    if (variantId) {
      const { data: variant } = await supabaseClient
        .from("product_variants")
        .select("name")
        .eq("id", variantId)
        .single();
      variantName = variant?.name || null;
    }

    const origin = req.headers.get("origin") || "http://localhost:5173";
    const finalSuccessUrl = successUrl || `${origin}/checkout/success?session_id={CHECKOUT_SESSION_ID}`;
    const finalCancelUrl = cancelUrl || `${origin}/checkout/cancel`;

    // Create checkout session
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      line_items: [
        {
          price: plan.stripe_price_id,
          quantity: 1,
        },
      ],
      mode: "subscription",
      success_url: finalSuccessUrl,
      cancel_url: finalCancelUrl,
      metadata: {
        supabase_user_id: user.id,
        plan_id: planId,
        variant_id: variantId || "",
        product_id: plan.products?.id || "",
        product_name: plan.products?.name || "",
        plan_name: plan.name,
        variant_name: variantName || "",
      },
      subscription_data: {
        metadata: {
          supabase_user_id: user.id,
          plan_id: planId,
          variant_id: variantId || "",
          product_id: plan.products?.id || "",
          product_name: plan.products?.name || "",
          plan_name: plan.name,
          variant_name: variantName || "",
        },
      },
    });

    logStep("Checkout session created", { sessionId: session.id, url: session.url });

    return new Response(JSON.stringify({ url: session.url, sessionId: session.id }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR in stripe-create-checkout", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
