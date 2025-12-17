import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Input validation helper
function isValidIdentifier(str: string): boolean {
  // Pterodactyl identifiers are 8 character alphanumeric strings
  const identifierRegex = /^[a-zA-Z0-9]{8}$/;
  return identifierRegex.test(str);
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Authentication: Verify JWT token
    const authHeader = req.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.error('Missing or invalid authorization header');
      return new Response(
        JSON.stringify({ error: 'Authentication required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceKey) {
      console.error('Missing Supabase configuration');
      return new Response(
        JSON.stringify({ error: 'Service temporarily unavailable' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify the user's JWT and get their user ID
    const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });

    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser();
    if (authError || !user) {
      console.error('Authentication failed');
      return new Response(
        JSON.stringify({ error: 'Invalid or expired session' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { identifier } = await req.json();

    // Input validation
    if (!identifier || !isValidIdentifier(identifier)) {
      console.error('Invalid server identifier format');
      return new Response(
        JSON.stringify({ error: 'Invalid server identifier' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Authorization: Verify the user owns a server with this identifier
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('user_id')
      .eq('pterodactyl_identifier', identifier)
      .single();

    if (orderError || !order) {
      console.error('Server not found');
      return new Response(
        JSON.stringify({ error: 'Server not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (order.user_id !== user.id) {
      console.error('User does not own this server');
      return new Response(
        JSON.stringify({ error: 'Access denied' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let pterodactylUrl = Deno.env.get('PTERODACTYL_URL');
    const pterodactylClientApiKey = Deno.env.get('PTERODACTYL_CLIENT_API_KEY');

    if (!pterodactylUrl || !pterodactylClientApiKey) {
      console.error('Missing Pterodactyl configuration');
      return new Response(
        JSON.stringify({ error: 'Service temporarily unavailable' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Ensure URL has protocol
    if (!pterodactylUrl.startsWith('http://') && !pterodactylUrl.startsWith('https://')) {
      pterodactylUrl = `https://${pterodactylUrl}`;
    }

    // Pterodactyl: Client keys usually start with "ptlc_" and Application keys with "ptla_"
    if (pterodactylClientApiKey.startsWith('ptla_')) {
      console.error('Wrong API key type configured');
      return new Response(
        JSON.stringify({ error: 'Service configuration error' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Fetching server status for identifier: ${identifier}`);

    const headers = {
      'Authorization': `Bearer ${pterodactylClientApiKey}`,
      'Accept': 'application/json',
      'Content-Type': 'application/json',
    };

    // Fetch both server details (for limits) and resources (for current usage) in parallel
    const [detailsResponse, resourcesResponse] = await Promise.all([
      fetch(`${pterodactylUrl}/api/client/servers/${identifier}`, { method: 'GET', headers }),
      fetch(`${pterodactylUrl}/api/client/servers/${identifier}/resources`, { method: 'GET', headers })
    ]);

    if (!resourcesResponse.ok) {
      console.error(`Failed to fetch server status`);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch server status' }),
        { status: resourcesResponse.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const resourcesData = await resourcesResponse.json();
    let limits = { memory: 0, disk: 0, cpu: 0 };
    let serverName = '';

    if (detailsResponse.ok) {
      const detailsData = await detailsResponse.json();
      limits = detailsData.attributes?.limits || { memory: 0, disk: 0, cpu: 0 };
      serverName = detailsData.attributes?.name || '';
    }

    console.log('Server status fetched successfully');

    // Extract relevant information - convert limits from MB to bytes
    const status = {
      current_state: resourcesData.attributes?.current_state || 'unknown',
      is_suspended: resourcesData.attributes?.is_suspended || false,
      server_name: serverName,
      resources: {
        memory_bytes: resourcesData.attributes?.resources?.memory_bytes || 0,
        memory_limit_bytes: limits.memory * 1024 * 1024,
        cpu_absolute: resourcesData.attributes?.resources?.cpu_absolute || 0,
        cpu_limit: limits.cpu || 0,
        disk_bytes: resourcesData.attributes?.resources?.disk_bytes || 0,
        disk_limit_bytes: limits.disk * 1024 * 1024,
        network_rx_bytes: resourcesData.attributes?.resources?.network_rx_bytes || 0,
        network_tx_bytes: resourcesData.attributes?.resources?.network_tx_bytes || 0,
        uptime: resourcesData.attributes?.resources?.uptime || 0,
      }
    };

    return new Response(
      JSON.stringify(status),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in get-server-status function:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to fetch server status. Please try again.' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
