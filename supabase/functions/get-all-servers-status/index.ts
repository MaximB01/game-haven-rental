import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Simplified public status response - no server counts or detailed metrics
interface PublicServiceStatus {
  name: string;
  status: 'operational' | 'degraded' | 'partial' | 'down' | 'unknown';
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    let pterodactylUrl = Deno.env.get('PTERODACTYL_URL');
    const pterodactylClientApiKey = Deno.env.get('PTERODACTYL_CLIENT_API_KEY');
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!pterodactylUrl || !pterodactylClientApiKey) {
      console.error('Missing Pterodactyl configuration');
      return new Response(
        JSON.stringify({ error: 'Service configuration missing' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('Missing Supabase configuration');
      return new Response(
        JSON.stringify({ error: 'Service configuration missing' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Ensure URL has protocol
    if (!pterodactylUrl.startsWith('http://') && !pterodactylUrl.startsWith('https://')) {
      pterodactylUrl = `https://${pterodactylUrl}`;
    }

    // Create Supabase client
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get all active products
    const { data: products, error: productsError } = await supabase
      .from('products')
      .select('id, name, slug, category')
      .eq('is_active', true);

    if (productsError) {
      console.error('Error fetching products:', productsError);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch service status' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get all active orders with pterodactyl_identifier grouped by product
    const { data: orders, error: ordersError } = await supabase
      .from('orders')
      .select('id, product_name, pterodactyl_identifier')
      .eq('status', 'active')
      .not('pterodactyl_identifier', 'is', null);

    if (ordersError) {
      console.error('Error fetching orders:', ordersError);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch service status' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Checking status for ${products?.length || 0} services`);

    const headers = {
      'Authorization': `Bearer ${pterodactylClientApiKey}`,
      'Accept': 'application/json',
      'Content-Type': 'application/json',
    };

    // Fetch status for all servers (internal only)
    const serverStatuses = await Promise.all(
      (orders || []).map(async (order) => {
        try {
          const response = await fetch(
            `${pterodactylUrl}/api/client/servers/${order.pterodactyl_identifier}/resources`,
            { method: 'GET', headers }
          );

          if (!response.ok) {
            return { product_name: order.product_name, state: 'error' };
          }

          const data = await response.json();
          return {
            product_name: order.product_name,
            state: data.attributes?.current_state || 'unknown'
          };
        } catch (err) {
          console.error(`Error fetching status for server:`, err);
          return { product_name: order.product_name, state: 'error' };
        }
      })
    );

    // Calculate status per product (without exposing counts)
    const serviceStatuses: PublicServiceStatus[] = (products || []).map((product) => {
      const productServers = serverStatuses.filter(s => s.product_name === product.name);
      const total = productServers.length;
      const running = productServers.filter(s => s.state === 'running').length;
      const offline = productServers.filter(s => s.state === 'offline' || s.state === 'stopped').length;
      const errors = productServers.filter(s => s.state === 'error').length;

      // Determine overall status for this service (without revealing counts)
      let status: PublicServiceStatus['status'] = 'operational';
      if (total === 0) {
        status = 'operational'; // No servers = assume operational
      } else if (errors > 0 && errors === total) {
        status = 'down';
      } else if (errors > 0 || (offline > 0 && running === 0)) {
        status = 'degraded';
      } else if (offline > 0 && running > 0) {
        status = 'partial';
      } else if (running === total) {
        status = 'operational';
      }

      // Return only name and status - no counts or detailed metrics
      return {
        name: product.name,
        status
      };
    });

    // Add static services (VPS, Web Hosting, Bot Hosting) that don't have Pterodactyl servers
    const staticServices: PublicServiceStatus[] = [
      { name: 'VPS Hosting', status: 'operational' },
      { name: 'Web Hosting', status: 'operational' },
      { name: 'Bot Hosting', status: 'operational' },
    ];

    // Only add static services if they don't exist in products
    const existingNames = serviceStatuses.map(s => s.name);
    const additionalServices = staticServices.filter(s => !existingNames.includes(s.name));

    const allServices = [...serviceStatuses, ...additionalServices];

    // Calculate overall status
    const hasDown = allServices.some(s => s.status === 'down');
    const hasDegraded = allServices.some(s => s.status === 'degraded');
    const hasPartial = allServices.some(s => s.status === 'partial');

    let overallStatus: string;
    if (hasDown) {
      overallStatus = 'down';
    } else if (hasDegraded) {
      overallStatus = 'degraded';
    } else if (hasPartial) {
      overallStatus = 'partial';
    } else {
      overallStatus = 'operational';
    }

    console.log('Service status check complete:', { overall: overallStatus });

    // Return simplified public response - only name and status, no counts
    return new Response(
      JSON.stringify({ 
        services: allServices, 
        overall_status: overallStatus,
        last_updated: new Date().toISOString()
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error in get-all-servers-status function:', errorMessage);
    return new Response(
      JSON.stringify({ error: 'Failed to fetch service status' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});