import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, stripe-signature",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[STRIPE-WEBHOOK] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Webhook received");

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
    
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not set");
    logStep("Stripe key verified");

    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

    const signature = req.headers.get("stripe-signature");
    const body = await req.text();

    let event: Stripe.Event;

    if (webhookSecret && signature) {
      try {
        event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
        logStep("Webhook signature verified");
      } catch (err) {
        logStep("Webhook signature verification failed", { error: err instanceof Error ? err.message : String(err) });
        return new Response(JSON.stringify({ error: "Webhook signature verification failed" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    } else {
      // For testing without webhook secret
      event = JSON.parse(body);
      logStep("Webhook received without signature verification (test mode)");
    }

    logStep("Processing event", { type: event.type, id: event.id });

    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        logStep("Checkout session completed", { sessionId: session.id });
        
        const metadata = session.metadata || {};
        const userId = metadata.supabase_user_id;
        const planId = metadata.plan_id;
        const variantId = metadata.variant_id || null;
        const productId = metadata.product_id;
        const productName = metadata.product_name;
        const planName = metadata.plan_name;
        const variantName = metadata.variant_name || null;

        if (!userId || !planId) {
          logStep("Missing metadata", { userId, planId });
          break;
        }

        // Get plan details for price
        const { data: plan } = await supabase
          .from("product_plans")
          .select("price, ram, cpu, disk, databases, backups")
          .eq("id", planId)
          .single();

        // Get subscription details
        const subscriptionId = session.subscription as string;
        let nextBillingDate: string | null = null;

        if (subscriptionId) {
          const subscription = await stripe.subscriptions.retrieve(subscriptionId);
          nextBillingDate = new Date(subscription.current_period_end * 1000).toISOString();
        }

        // Get product category
        const { data: product } = await supabase
          .from("products")
          .select("category, egg_id, nest_id, docker_image, startup_command")
          .eq("id", productId)
          .single();

        // Get user email
        const { data: profile } = await supabase
          .from("profiles")
          .select("email")
          .eq("user_id", userId)
          .single();

        // Create order
        const { data: order, error: orderError } = await supabase
          .from("orders")
          .insert({
            user_id: userId,
            product_name: productName,
            product_type: product?.category || "game",
            plan_name: planName,
            price: plan?.price || 0,
            status: "pending",
            stripe_subscription_id: subscriptionId,
            stripe_checkout_session_id: session.id,
            next_billing_date: nextBillingDate,
            variant_id: variantId,
            variant_name: variantName,
          })
          .select()
          .single();

        if (orderError) {
          logStep("Failed to create order", { error: orderError.message });
          break;
        }

        logStep("Order created", { orderId: order.id, displayId: order.display_id });

        // Trigger server creation via create-pterodactyl-server function
        if (plan && profile?.email) {
          // Get variant egg/docker settings if applicable
          let eggId = product?.egg_id;
          let nestId = product?.nest_id;
          let dockerImage = product?.docker_image;
          let startupCommand = product?.startup_command;

          if (variantId) {
            const { data: variant } = await supabase
              .from("product_variants")
              .select("egg_id, nest_id, docker_image, startup_command")
              .eq("id", variantId)
              .single();
            
            if (variant) {
              if (variant.egg_id) eggId = variant.egg_id;
              if (variant.nest_id) nestId = variant.nest_id;
              if (variant.docker_image) dockerImage = variant.docker_image;
              if (variant.startup_command) startupCommand = variant.startup_command;
            }
          }

          logStep("Triggering server creation", { orderId: order.id });

          // Call create-pterodactyl-server function
          try {
            const serverResponse = await fetch(`${supabaseUrl}/functions/v1/create-pterodactyl-server`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${supabaseServiceKey}`,
              },
              body: JSON.stringify({
                orderId: order.id,
                gameId: productName.toLowerCase().replace(/\s+/g, '-'),
                planName: planName,
                ram: plan.ram,
                cpu: plan.cpu,
                disk: plan.disk,
                userId: userId,
                userEmail: profile.email,
                variantId: variantId,
                eggId: eggId,
                nestId: nestId,
                dockerImage: dockerImage,
                startupCommand: startupCommand,
              }),
            });

            const serverResult = await serverResponse.json();
            if (serverResult.success) {
              logStep("Server created successfully", { serverId: serverResult.serverId });
            } else {
              logStep("Server creation failed", { error: serverResult.error });
            }
          } catch (serverError) {
            logStep("Error calling server creation", { error: serverError instanceof Error ? serverError.message : String(serverError) });
          }
        }

        break;
      }

      case "invoice.paid": {
        const invoice = event.data.object as Stripe.Invoice;
        logStep("Invoice paid", { invoiceId: invoice.id });

        const customerId = invoice.customer as string;
        
        // Find user by stripe_customer_id
        const { data: profile } = await supabase
          .from("profiles")
          .select("user_id")
          .eq("stripe_customer_id", customerId)
          .single();

        if (!profile) {
          logStep("Could not find user for customer", { customerId });
          break;
        }

        // Find order by stripe_subscription_id
        const subscriptionId = invoice.subscription as string;
        const { data: order } = await supabase
          .from("orders")
          .select("id")
          .eq("stripe_subscription_id", subscriptionId)
          .single();

        // Create invoice record
        const { error: invoiceError } = await supabase
          .from("invoices")
          .insert({
            user_id: profile.user_id,
            order_id: order?.id || null,
            stripe_invoice_id: invoice.id,
            stripe_payment_intent_id: invoice.payment_intent as string,
            amount: (invoice.amount_paid || 0) / 100,
            currency: invoice.currency || "eur",
            status: "paid",
            invoice_pdf_url: invoice.invoice_pdf,
            hosted_invoice_url: invoice.hosted_invoice_url,
            period_start: invoice.period_start ? new Date(invoice.period_start * 1000).toISOString() : null,
            period_end: invoice.period_end ? new Date(invoice.period_end * 1000).toISOString() : null,
            paid_at: new Date().toISOString(),
          });

        if (invoiceError) {
          logStep("Failed to create invoice record", { error: invoiceError.message });
        } else {
          logStep("Invoice record created");
        }

        // Update order with next billing date
        if (subscriptionId) {
          const subscription = await stripe.subscriptions.retrieve(subscriptionId);
          const nextBillingDate = new Date(subscription.current_period_end * 1000).toISOString();
          
          await supabase
            .from("orders")
            .update({ next_billing_date: nextBillingDate, status: "active" })
            .eq("stripe_subscription_id", subscriptionId);
          
          logStep("Updated order billing date", { nextBillingDate });
        }

        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        logStep("Invoice payment failed", { invoiceId: invoice.id });

        const subscriptionId = invoice.subscription as string;
        if (subscriptionId) {
          await supabase
            .from("orders")
            .update({ status: "payment_failed" })
            .eq("stripe_subscription_id", subscriptionId);
          
          logStep("Updated order status to payment_failed");
        }

        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        logStep("Subscription deleted", { subscriptionId: subscription.id });

        // Update order status and add cancelled_at
        const { error: updateError } = await supabase
          .from("orders")
          .update({ 
            status: "cancelled",
            cancelled_at: new Date().toISOString()
          })
          .eq("stripe_subscription_id", subscription.id);

        if (updateError) {
          logStep("Failed to update order", { error: updateError.message });
        } else {
          logStep("Order marked as cancelled");

          // Suspend server in Pterodactyl
          const { data: order } = await supabase
            .from("orders")
            .select("id, pterodactyl_server_id")
            .eq("stripe_subscription_id", subscription.id)
            .single();

          if (order?.pterodactyl_server_id) {
            try {
              await fetch(`${supabaseUrl}/functions/v1/suspend-pterodactyl-server`, {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  "Authorization": `Bearer ${supabaseServiceKey}`,
                },
                body: JSON.stringify({
                  orderId: order.id,
                  action: "suspend"
                }),
              });
              logStep("Server suspension triggered");
            } catch (suspendError) {
              logStep("Error triggering server suspension", { error: suspendError instanceof Error ? suspendError.message : String(suspendError) });
            }
          }
        }

        break;
      }

      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;
        logStep("Subscription updated", { subscriptionId: subscription.id, status: subscription.status });

        // Update order status based on subscription status
        let orderStatus = "active";
        if (subscription.status === "past_due") orderStatus = "payment_failed";
        else if (subscription.status === "canceled") orderStatus = "cancelled";
        else if (subscription.status === "unpaid") orderStatus = "suspended";

        const nextBillingDate = new Date(subscription.current_period_end * 1000).toISOString();

        await supabase
          .from("orders")
          .update({ 
            status: orderStatus,
            next_billing_date: nextBillingDate
          })
          .eq("stripe_subscription_id", subscription.id);

        logStep("Order updated", { status: orderStatus, nextBillingDate });

        break;
      }

      default:
        logStep("Unhandled event type", { type: event.type });
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR in stripe-webhook", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
