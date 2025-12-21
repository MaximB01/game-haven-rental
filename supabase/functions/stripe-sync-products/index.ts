import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[STRIPE-SYNC-PRODUCTS] ${step}${detailsStr}`);
};

interface SyncRequest {
  productIds?: string[];  // Specific product IDs to sync, if empty sync all
  planIds?: string[];     // Specific plan IDs to sync, if empty sync all
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
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verify admin access
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header provided");

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabase.auth.getUser(token);
    if (userError) throw new Error(`Authentication error: ${userError.message}`);
    const user = userData.user;
    if (!user) throw new Error("User not authenticated");

    // Check admin role
    const { data: isAdmin } = await supabase.rpc("has_role", {
      _user_id: user.id,
      _role: "admin"
    });

    if (!isAdmin) {
      throw new Error("Admin access required");
    }
    logStep("Admin access verified");

    const body: SyncRequest = await req.json().catch(() => ({}));
    const { productIds, planIds } = body;

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

    // Get products to sync
    let productsQuery = supabase
      .from("products")
      .select("id, name, description, slug, is_active")
      .eq("is_active", true);

    if (productIds && productIds.length > 0) {
      productsQuery = productsQuery.in("id", productIds);
    }

    const { data: products, error: productsError } = await productsQuery;
    if (productsError) throw new Error(`Failed to fetch products: ${productsError.message}`);
    logStep("Products fetched", { count: products?.length || 0 });

    const results = {
      products: { synced: 0, failed: 0, errors: [] as string[] },
      plans: { synced: 0, failed: 0, errors: [] as string[] },
    };

    // Sync products to Stripe
    for (const product of products || []) {
      try {
        let stripeProductId: string;

        // Check if product already has stripe_product_id
        const { data: existingProduct } = await supabase
          .from("products")
          .select("stripe_product_id")
          .eq("id", product.id)
          .single();

        if (existingProduct?.stripe_product_id) {
          // Update existing Stripe product
          await stripe.products.update(existingProduct.stripe_product_id, {
            name: product.name,
            description: product.description || undefined,
            active: product.is_active,
          });
          stripeProductId = existingProduct.stripe_product_id;
          logStep("Updated Stripe product", { id: product.id, stripeId: stripeProductId });
        } else {
          // Create new Stripe product
          const stripeProduct = await stripe.products.create({
            name: product.name,
            description: product.description || undefined,
            active: product.is_active,
            metadata: {
              supabase_product_id: product.id,
              slug: product.slug,
            },
          });
          stripeProductId = stripeProduct.id;

          // Update product with stripe_product_id
          await supabase
            .from("products")
            .update({ stripe_product_id: stripeProductId })
            .eq("id", product.id);

          logStep("Created Stripe product", { id: product.id, stripeId: stripeProductId });
        }

        results.products.synced++;

        // Now sync plans for this product
        let plansQuery = supabase
          .from("product_plans")
          .select("id, name, price, billing_period, is_active")
          .eq("product_id", product.id)
          .eq("is_active", true);

        if (planIds && planIds.length > 0) {
          plansQuery = plansQuery.in("id", planIds);
        }

        const { data: plans, error: plansError } = await plansQuery;
        if (plansError) {
          results.plans.errors.push(`Failed to fetch plans for ${product.name}: ${plansError.message}`);
          continue;
        }

        for (const plan of plans || []) {
          try {
            // Check if plan already has stripe_price_id
            const { data: existingPlan } = await supabase
              .from("product_plans")
              .select("stripe_price_id")
              .eq("id", plan.id)
              .single();

            if (existingPlan?.stripe_price_id) {
              // Can't update Stripe prices, just log
              logStep("Plan already synced", { id: plan.id, stripeId: existingPlan.stripe_price_id });
              results.plans.synced++;
              continue;
            }

            // Create new Stripe price
            const billingPeriod = plan.billing_period || "monthly";
            const interval = billingPeriod === "yearly" ? "year" : "month";

            const stripePrice = await stripe.prices.create({
              product: stripeProductId,
              unit_amount: Math.round(plan.price * 100), // Convert to cents
              currency: "eur",
              recurring: {
                interval: interval,
              },
              metadata: {
                supabase_plan_id: plan.id,
                plan_name: plan.name,
              },
            });

            // Update plan with stripe_price_id
            await supabase
              .from("product_plans")
              .update({ stripe_price_id: stripePrice.id })
              .eq("id", plan.id);

            logStep("Created Stripe price", { id: plan.id, stripeId: stripePrice.id, price: plan.price });
            results.plans.synced++;
          } catch (planError) {
            const errorMsg = planError instanceof Error ? planError.message : String(planError);
            results.plans.errors.push(`Failed to sync plan ${plan.name}: ${errorMsg}`);
            results.plans.failed++;
            logStep("Failed to sync plan", { id: plan.id, error: errorMsg });
          }
        }
      } catch (productError) {
        const errorMsg = productError instanceof Error ? productError.message : String(productError);
        results.products.errors.push(`Failed to sync product ${product.name}: ${errorMsg}`);
        results.products.failed++;
        logStep("Failed to sync product", { id: product.id, error: errorMsg });
      }
    }

    logStep("Sync completed", results);

    return new Response(JSON.stringify({ 
      success: true, 
      results,
      message: `Synced ${results.products.synced} products and ${results.plans.synced} plans`
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR in stripe-sync-products", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
