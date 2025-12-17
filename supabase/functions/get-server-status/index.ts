import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { identifier } = await req.json();

    if (!identifier) {
      console.error('Missing server identifier');
      return new Response(
        JSON.stringify({ error: 'Server identifier is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let pterodactylUrl = Deno.env.get('PTERODACTYL_URL');
    const pterodactylApiKey = Deno.env.get('PTERODACTYL_API_KEY');

    if (!pterodactylUrl || !pterodactylApiKey) {
      console.error('Missing Pterodactyl configuration');
      return new Response(
        JSON.stringify({ error: 'Pterodactyl configuration missing' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Ensure URL has protocol
    if (!pterodactylUrl.startsWith('http://') && !pterodactylUrl.startsWith('https://')) {
      pterodactylUrl = `https://${pterodactylUrl}`;
    }

    console.log(`Fetching server status for identifier: ${identifier}`);

    // Get server resources/status from Pterodactyl Client API
    const response = await fetch(
      `${pterodactylUrl}/api/client/servers/${identifier}/resources`,
      {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${pterodactylApiKey}`,
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Pterodactyl API error: ${response.status} - ${errorText}`);
      return new Response(
        JSON.stringify({ 
          error: 'Failed to fetch server status',
          details: errorText 
        }),
        { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const data = await response.json();
    console.log('Server status fetched successfully:', data);

    // Extract relevant information
    const status = {
      current_state: data.attributes?.current_state || 'unknown',
      is_suspended: data.attributes?.is_suspended || false,
      resources: {
        memory_bytes: data.attributes?.resources?.memory_bytes || 0,
        memory_limit_bytes: data.attributes?.resources?.memory_limit_bytes || 0,
        cpu_absolute: data.attributes?.resources?.cpu_absolute || 0,
        disk_bytes: data.attributes?.resources?.disk_bytes || 0,
        network_rx_bytes: data.attributes?.resources?.network_rx_bytes || 0,
        network_tx_bytes: data.attributes?.resources?.network_tx_bytes || 0,
        uptime: data.attributes?.resources?.uptime || 0,
      }
    };

    return new Response(
      JSON.stringify(status),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error in get-server-status function:', errorMessage);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});