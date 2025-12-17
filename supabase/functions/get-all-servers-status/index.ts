import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ServerStatus {
  order_id: string;
  product_name: string;
  plan_name: string;
  identifier: string;
  current_state: string;
  is_suspended: boolean;
  server_name?: string;
  uptime?: number;
  error?: string;
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
        JSON.stringify({ error: 'Pterodactyl configuration missing' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('Missing Supabase configuration');
      return new Response(
        JSON.stringify({ error: 'Supabase configuration missing' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Ensure URL has protocol
    if (!pterodactylUrl.startsWith('http://') && !pterodactylUrl.startsWith('https://')) {
      pterodactylUrl = `https://${pterodactylUrl}`;
    }

    // Create Supabase client
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get all active orders with pterodactyl_identifier
    const { data: orders, error: ordersError } = await supabase
      .from('orders')
      .select('id, product_name, plan_name, pterodactyl_identifier')
      .eq('status', 'active')
      .not('pterodactyl_identifier', 'is', null);

    if (ordersError) {
      console.error('Error fetching orders:', ordersError);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch orders' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Found ${orders?.length || 0} active servers to check`);

    const headers = {
      'Authorization': `Bearer ${pterodactylClientApiKey}`,
      'Accept': 'application/json',
      'Content-Type': 'application/json',
    };

    // Fetch status for all servers in parallel
    const statusPromises = (orders || []).map(async (order): Promise<ServerStatus> => {
      try {
        const [detailsResponse, resourcesResponse] = await Promise.all([
          fetch(`${pterodactylUrl}/api/client/servers/${order.pterodactyl_identifier}`, { method: 'GET', headers }),
          fetch(`${pterodactylUrl}/api/client/servers/${order.pterodactyl_identifier}/resources`, { method: 'GET', headers })
        ]);

        if (!resourcesResponse.ok) {
          return {
            order_id: order.id,
            product_name: order.product_name,
            plan_name: order.plan_name,
            identifier: order.pterodactyl_identifier,
            current_state: 'error',
            is_suspended: false,
            error: `API error: ${resourcesResponse.status}`
          };
        }

        const resourcesData = await resourcesResponse.json();
        let serverName = order.product_name;

        if (detailsResponse.ok) {
          const detailsData = await detailsResponse.json();
          serverName = detailsData.attributes?.name || order.product_name;
        }

        return {
          order_id: order.id,
          product_name: order.product_name,
          plan_name: order.plan_name,
          identifier: order.pterodactyl_identifier,
          current_state: resourcesData.attributes?.current_state || 'unknown',
          is_suspended: resourcesData.attributes?.is_suspended || false,
          server_name: serverName,
          uptime: resourcesData.attributes?.resources?.uptime || 0
        };
      } catch (err) {
        console.error(`Error fetching status for ${order.pterodactyl_identifier}:`, err);
        return {
          order_id: order.id,
          product_name: order.product_name,
          plan_name: order.plan_name,
          identifier: order.pterodactyl_identifier,
          current_state: 'error',
          is_suspended: false,
          error: 'Failed to connect'
        };
      }
    });

    const serverStatuses = await Promise.all(statusPromises);

    // Calculate overall stats
    const stats = {
      total: serverStatuses.length,
      running: serverStatuses.filter(s => s.current_state === 'running').length,
      offline: serverStatuses.filter(s => s.current_state === 'offline' || s.current_state === 'stopped').length,
      starting: serverStatuses.filter(s => s.current_state === 'starting').length,
      error: serverStatuses.filter(s => s.current_state === 'error').length,
    };

    console.log('Server status check complete:', stats);

    return new Response(
      JSON.stringify({ servers: serverStatuses, stats }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error in get-all-servers-status function:', errorMessage);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
