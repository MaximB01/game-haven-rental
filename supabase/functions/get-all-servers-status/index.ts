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

interface NodeStatus {
  id: number;
  name: string;
  location: string;
  status: 'operational' | 'down' | 'maintenance' | 'unknown';
  memory_used: number;
  memory_total: number;
  disk_used: number;
  disk_total: number;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    let pterodactylUrl = Deno.env.get('PTERODACTYL_URL');
    const pterodactylApiKey = Deno.env.get('PTERODACTYL_API_KEY'); // Application API key for nodes
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

    const clientHeaders = {
      'Authorization': `Bearer ${pterodactylClientApiKey}`,
      'Accept': 'application/json',
      'Content-Type': 'application/json',
    };

    // Fetch nodes using Application API key
    let nodes: NodeStatus[] = [];
    if (pterodactylApiKey) {
      try {
        const appHeaders = {
          'Authorization': `Bearer ${pterodactylApiKey}`,
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        };

        // Get all nodes
        const nodesResponse = await fetch(
          `${pterodactylUrl}/api/application/nodes`,
          { method: 'GET', headers: appHeaders }
        );

        if (nodesResponse.ok) {
          const nodesData = await nodesResponse.json();
          console.log(`Found ${nodesData.data?.length || 0} nodes`);

          // Get detailed status for each node
          nodes = await Promise.all(
            (nodesData.data || []).map(async (node: any) => {
              const nodeId = node.attributes.id;
              const nodeName = node.attributes.name;
              const locationId = node.attributes.location_id;
              
              // Get node configuration/status
              let nodeStatus: NodeStatus['status'] = 'unknown';
              let memoryUsed = 0;
              let memoryTotal = node.attributes.memory || 0;
              let diskUsed = 0;
              let diskTotal = node.attributes.disk || 0;

              try {
                // Try to get node allocation info to determine if it's online
                const nodeConfigResponse = await fetch(
                  `${pterodactylUrl}/api/application/nodes/${nodeId}/configuration`,
                  { method: 'GET', headers: appHeaders }
                );

                if (nodeConfigResponse.ok) {
                  nodeStatus = 'operational';
                } else if (nodeConfigResponse.status === 500) {
                  nodeStatus = 'down';
                }

                // Get allocations to estimate usage
                const allocationsResponse = await fetch(
                  `${pterodactylUrl}/api/application/nodes/${nodeId}/allocations`,
                  { method: 'GET', headers: appHeaders }
                );

                if (allocationsResponse.ok) {
                  const allocData = await allocationsResponse.json();
                  const assignedAllocations = (allocData.data || []).filter((a: any) => a.attributes.assigned);
                  // Rough estimate based on allocations
                  memoryUsed = Math.round((assignedAllocations.length / Math.max((allocData.data || []).length, 1)) * memoryTotal);
                  diskUsed = Math.round((assignedAllocations.length / Math.max((allocData.data || []).length, 1)) * diskTotal);
                }
              } catch (err) {
                console.error(`Error fetching node ${nodeId} details:`, err);
                nodeStatus = 'unknown';
              }

              // Check if node is in maintenance mode
              if (node.attributes.maintenance_mode) {
                nodeStatus = 'maintenance';
              }

              // Get location name
              let locationName = `Location ${locationId}`;
              try {
                const locationResponse = await fetch(
                  `${pterodactylUrl}/api/application/locations/${locationId}`,
                  { method: 'GET', headers: appHeaders }
                );
                if (locationResponse.ok) {
                  const locationData = await locationResponse.json();
                  locationName = locationData.attributes?.short || locationData.attributes?.long || locationName;
                }
              } catch (err) {
                // Use default location name
              }

              return {
                id: nodeId,
                name: nodeName,
                location: locationName,
                status: nodeStatus,
                memory_used: memoryUsed,
                memory_total: memoryTotal,
                disk_used: diskUsed,
                disk_total: diskTotal,
              };
            })
          );
        } else {
          console.error('Failed to fetch nodes:', nodesResponse.status, await nodesResponse.text());
        }
      } catch (err) {
        console.error('Error fetching Pterodactyl nodes:', err);
      }
    } else {
      console.log('No application API key available for node status');
    }

    // Fetch status for all servers (internal only)
    const serverStatuses = await Promise.all(
      (orders || []).map(async (order) => {
        try {
          const response = await fetch(
            `${pterodactylUrl}/api/client/servers/${order.pterodactyl_identifier}/resources`,
            { method: 'GET', headers: clientHeaders }
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

    // Calculate overall status (including nodes)
    const hasDownService = allServices.some(s => s.status === 'down');
    const hasDownNode = nodes.some(n => n.status === 'down');
    const hasDegradedService = allServices.some(s => s.status === 'degraded');
    const hasMaintenanceNode = nodes.some(n => n.status === 'maintenance');
    const hasPartialService = allServices.some(s => s.status === 'partial');

    let overallStatus: string;
    if (hasDownService || hasDownNode) {
      overallStatus = 'down';
    } else if (hasDegradedService || hasMaintenanceNode) {
      overallStatus = 'degraded';
    } else if (hasPartialService) {
      overallStatus = 'partial';
    } else {
      overallStatus = 'operational';
    }

    console.log('Service status check complete:', { overall: overallStatus, nodeCount: nodes.length });

    // Return simplified public response - only name and status, no counts
    return new Response(
      JSON.stringify({ 
        services: allServices, 
        nodes: nodes,
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
