import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Pterodactyl egg IDs - these need to match your panel's configuration
const GAME_EGGS: Record<string, { nestId: number; eggId: number; defaultStartup?: string }> = {
  minecraft: { nestId: 1, eggId: 1 },
  rust: { nestId: 4, eggId: 15 },
  ark: { nestId: 2, eggId: 3 },
  valheim: { nestId: 5, eggId: 20 },
};

interface OrderRequest {
  orderId: string;
  gameId: string;
  planName: string;
  ram: number;
  slots: number;
  storage: number;
  userId: string;
  userEmail: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const pterodactylUrl = Deno.env.get('PTERODACTYL_URL');
    const pterodactylApiKey = Deno.env.get('PTERODACTYL_API_KEY');
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!pterodactylUrl || !pterodactylApiKey) {
      console.error('Missing Pterodactyl configuration');
      throw new Error('Pterodactyl configuration missing');
    }

    const supabase = createClient(supabaseUrl!, supabaseServiceKey!);

    const { orderId, gameId, planName, ram, slots, storage, userId, userEmail }: OrderRequest = await req.json();

    console.log(`Processing order ${orderId} for game ${gameId}, plan ${planName}`);

    const gameEgg = GAME_EGGS[gameId];
    if (!gameEgg) {
      throw new Error(`Unsupported game: ${gameId}`);
    }

    // Step 1: Create or get Pterodactyl user
    let pterodactylUserId: number;

    // Check if user exists by email
    const userSearchResponse = await fetch(
      `${pterodactylUrl}/api/application/users?filter[email]=${encodeURIComponent(userEmail)}`,
      {
        headers: {
          'Authorization': `Bearer ${pterodactylApiKey}`,
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },
      }
    );

    const userSearchData = await userSearchResponse.json();
    console.log('User search result:', JSON.stringify(userSearchData));

    if (userSearchData.data && userSearchData.data.length > 0) {
      pterodactylUserId = userSearchData.data[0].attributes.id;
      console.log(`Found existing Pterodactyl user: ${pterodactylUserId}`);
    } else {
      // Create new user
      const username = userEmail.split('@')[0].replace(/[^a-zA-Z0-9]/g, '') + '_' + Date.now().toString(36);
      const createUserResponse = await fetch(`${pterodactylUrl}/api/application/users`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${pterodactylApiKey}`,
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: userEmail,
          username: username,
          first_name: userEmail.split('@')[0],
          last_name: 'CloudServe',
        }),
      });

      const createUserData = await createUserResponse.json();
      console.log('Create user result:', JSON.stringify(createUserData));

      if (!createUserResponse.ok) {
        throw new Error(`Failed to create Pterodactyl user: ${JSON.stringify(createUserData)}`);
      }

      pterodactylUserId = createUserData.attributes.id;
      console.log(`Created new Pterodactyl user: ${pterodactylUserId}`);
    }

    // Step 2: Get available node with allocation
    const nodesResponse = await fetch(`${pterodactylUrl}/api/application/nodes`, {
      headers: {
        'Authorization': `Bearer ${pterodactylApiKey}`,
        'Accept': 'application/json',
      },
    });

    const nodesData = await nodesResponse.json();
    console.log('Nodes data:', JSON.stringify(nodesData));

    if (!nodesData.data || nodesData.data.length === 0) {
      throw new Error('No nodes available');
    }

    const nodeId = nodesData.data[0].attributes.id;

    // Get allocations for the node
    const allocationsResponse = await fetch(
      `${pterodactylUrl}/api/application/nodes/${nodeId}/allocations?filter[server_id]=null`,
      {
        headers: {
          'Authorization': `Bearer ${pterodactylApiKey}`,
          'Accept': 'application/json',
        },
      }
    );

    const allocationsData = await allocationsResponse.json();
    console.log('Allocations data:', JSON.stringify(allocationsData));

    if (!allocationsData.data || allocationsData.data.length === 0) {
      throw new Error('No free allocations available');
    }

    const allocationId = allocationsData.data[0].attributes.id;

    // Step 3: Create the server
    const serverName = `${gameId}-${planName}-${orderId.slice(0, 8)}`.toLowerCase();
    const ramInMB = ram * 1024;
    const storageInMB = storage * 1024;

    const createServerPayload = {
      name: serverName,
      user: pterodactylUserId,
      egg: gameEgg.eggId,
      docker_image: 'ghcr.io/pterodactyl/yolks:java_17', // Default, will be overridden by egg
      startup: gameEgg.defaultStartup || '',
      environment: {},
      limits: {
        memory: ramInMB,
        swap: 0,
        disk: storageInMB,
        io: 500,
        cpu: 0, // Unlimited
      },
      feature_limits: {
        databases: 1,
        backups: 3,
        allocations: 1,
      },
      allocation: {
        default: allocationId,
      },
    };

    console.log('Creating server with payload:', JSON.stringify(createServerPayload));

    const createServerResponse = await fetch(`${pterodactylUrl}/api/application/servers`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${pterodactylApiKey}`,
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(createServerPayload),
    });

    const createServerData = await createServerResponse.json();
    console.log('Create server result:', JSON.stringify(createServerData));

    if (!createServerResponse.ok) {
      throw new Error(`Failed to create server: ${JSON.stringify(createServerData)}`);
    }

    const serverId = createServerData.attributes.id;
    const serverIdentifier = createServerData.attributes.identifier;

    // Step 4: Update order status in database
    const { error: updateError } = await supabase
      .from('orders')
      .update({ 
        status: 'active',
        updated_at: new Date().toISOString()
      })
      .eq('id', orderId);

    if (updateError) {
      console.error('Failed to update order status:', updateError);
    }

    console.log(`Server created successfully: ${serverId} (${serverIdentifier})`);

    return new Response(
      JSON.stringify({
        success: true,
        serverId: serverId,
        serverIdentifier: serverIdentifier,
        message: 'Server created successfully',
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error creating server:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to create server';
    return new Response(
      JSON.stringify({
        success: false,
        error: errorMessage,
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
