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
    const pterodactylClientApiKey = Deno.env.get('PTERODACTYL_CLIENT_API_KEY');

    if (!pterodactylUrl || !pterodactylClientApiKey) {
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

    // Pterodactyl: Client keys usually start with "ptlc_" and Application keys with "ptla_"
    if (pterodactylClientApiKey.startsWith('ptla_')) {
      console.error('PTERODACTYL_CLIENT_API_KEY appears to be an application key (ptla_), but /api/client requires a client key (ptlc_).');
      return new Response(
        JSON.stringify({
          error: 'Wrong Pterodactyl API key type',
          details: 'Please set PTERODACTYL_CLIENT_API_KEY to a Client API key (starts with ptlc_), not an Application key (ptla_).'
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
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
      const errorText = await resourcesResponse.text();
      console.error(`Pterodactyl API error (resources): ${resourcesResponse.status} - ${errorText}`);
      return new Response(
        JSON.stringify({ 
          error: 'Failed to fetch server status',
          details: errorText 
        }),
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
      console.log('Server details fetched:', { name: serverName, limits });
    } else {
      console.warn('Could not fetch server details for limits');
    }

    console.log('Server resources fetched successfully');

    // Extract relevant information - convert limits from MB to bytes
    const status = {
      current_state: resourcesData.attributes?.current_state || 'unknown',
      is_suspended: resourcesData.attributes?.is_suspended || false,
      server_name: serverName,
      resources: {
        memory_bytes: resourcesData.attributes?.resources?.memory_bytes || 0,
        memory_limit_bytes: limits.memory * 1024 * 1024, // Convert MB to bytes
        cpu_absolute: resourcesData.attributes?.resources?.cpu_absolute || 0,
        cpu_limit: limits.cpu || 0,
        disk_bytes: resourcesData.attributes?.resources?.disk_bytes || 0,
        disk_limit_bytes: limits.disk * 1024 * 1024, // Convert MB to bytes
        network_rx_bytes: resourcesData.attributes?.resources?.network_rx_bytes || 0,
        network_tx_bytes: resourcesData.attributes?.resources?.network_tx_bytes || 0,
        uptime: resourcesData.attributes?.resources?.uptime || 0,
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
