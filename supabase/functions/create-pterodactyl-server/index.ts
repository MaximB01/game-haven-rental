import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Pterodactyl egg IDs and startup commands - adjust these to match your panel
const GAME_EGGS: Record<string, { nestId: number; eggId: number; startup: string; dockerImage: string; environment: Record<string, string> }> = {
  minecraft: { 
    nestId: 1, 
    eggId: 1,
    startup: 'java -Xms128M -Xmx{{SERVER_MEMORY}}M -jar {{SERVER_JARFILE}}',
    dockerImage: 'ghcr.io/pterodactyl/yolks:java_17',
    environment: {
      SERVER_JARFILE: 'server.jar',
      VANILLA_VERSION: 'latest',
      BUILD_NUMBER: 'latest'
    }
  },
  rust: { 
    nestId: 4, 
    eggId: 15,
    startup: './RustDedicated -batchmode +server.port {{SERVER_PORT}} +server.identity "rust" +rcon.port {{RCON_PORT}} +rcon.web true +server.hostname "{{HOSTNAME}}" +server.maxplayers {{MAX_PLAYERS}} +server.worldsize {{WORLD_SIZE}} +server.saveinterval {{SAVE_INTERVAL}}',
    dockerImage: 'ghcr.io/pterodactyl/games:rust',
    environment: {
      HOSTNAME: 'Rust Server',
      MAX_PLAYERS: '50',
      WORLD_SIZE: '3000',
      SAVE_INTERVAL: '60'
    }
  },
  ark: { 
    nestId: 2, 
    eggId: 3,
    startup: './ShooterGame/Binaries/Linux/ShooterGameServer {{SERVER_MAP}}?listen?SessionName={{SESSION_NAME}}?ServerPassword={{SERVER_PASSWORD}}?ServerAdminPassword={{ADMIN_PASSWORD}}?Port={{SERVER_PORT}}?QueryPort={{QUERY_PORT}}?MaxPlayers={{MAX_PLAYERS}} -server -log',
    dockerImage: 'ghcr.io/pterodactyl/games:source',
    environment: {
      SERVER_MAP: 'TheIsland',
      SESSION_NAME: 'ARK Server',
      SERVER_PASSWORD: '',
      ADMIN_PASSWORD: 'changeme',
      MAX_PLAYERS: '70'
    }
  },
  valheim: { 
    nestId: 5, 
    eggId: 20,
    startup: './valheim_server.x86_64 -name "{{SERVER_NAME}}" -port {{SERVER_PORT}} -world "{{WORLD_NAME}}" -password "{{SERVER_PASSWORD}}" -public 1',
    dockerImage: 'ghcr.io/pterodactyl/games:source',
    environment: {
      SERVER_NAME: 'Valheim Server',
      WORLD_NAME: 'Dedicated',
      SERVER_PASSWORD: 'changeme'
    }
  },
};

interface OrderRequest {
  orderId: string;
  gameId: string;
  planName: string;
  ram: number;
  cpu: number;
  disk: number;
  userId: string;
  userEmail: string;
  // Optional variant fields
  variantId?: string;
  eggId?: number;
  nestId?: number;
  dockerImage?: string;
  startupCommand?: string;
  // Optional game-specific config
  minecraftVersion?: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    let pterodactylUrl = Deno.env.get('PTERODACTYL_URL');
    const pterodactylApiKey = Deno.env.get('PTERODACTYL_API_KEY');
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!pterodactylUrl || !pterodactylApiKey) {
      console.error('Missing Pterodactyl configuration');
      throw new Error('Pterodactyl configuration missing');
    }

    // Ensure URL has protocol
    if (!pterodactylUrl.startsWith('http://') && !pterodactylUrl.startsWith('https://')) {
      pterodactylUrl = `https://${pterodactylUrl}`;
    }
    // Remove trailing slash if present
    pterodactylUrl = pterodactylUrl.replace(/\/$/, '');

    console.log(`Using Pterodactyl URL: ${pterodactylUrl}`);

    const supabase = createClient(supabaseUrl!, supabaseServiceKey!);

    const { orderId, gameId, planName, ram, cpu, disk, userId, userEmail, variantId, eggId, nestId, dockerImage, startupCommand, minecraftVersion }: OrderRequest = await req.json();

    console.log(`Processing order ${orderId} for game ${gameId}, plan ${planName}`);
    console.log(`Resources - RAM: ${ram}MB, CPU: ${cpu}%, Disk: ${disk}MB`);

    const gameEgg = GAME_EGGS[gameId];
    if (!gameEgg && !eggId) {
      throw new Error(`Unsupported game: ${gameId} and no variant egg provided`);
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
    
    // Use variant settings if provided, otherwise fall back to game egg defaults
    const finalEggId = eggId || gameEgg?.eggId || 1;
    const finalDockerImage = dockerImage || gameEgg?.dockerImage || 'ghcr.io/pterodactyl/yolks:java_17';
    const finalStartup = startupCommand || gameEgg?.startup || 'java -Xms128M -Xmx{{SERVER_MEMORY}}M -jar {{SERVER_JARFILE}}';
    const baseEnvironment = gameEgg?.environment || {
      SERVER_JARFILE: 'server.jar',
      VANILLA_VERSION: 'latest',
      BUILD_NUMBER: 'latest'
    };

    // Clone to avoid mutating shared constants
    const finalEnvironment: Record<string, string> = { ...baseEnvironment };

    // Apply optional Minecraft version (supports common env var names)
    if (minecraftVersion && gameId === 'minecraft') {
      finalEnvironment.VANILLA_VERSION = minecraftVersion;
      finalEnvironment.MINECRAFT_VERSION = minecraftVersion;
    }

    // Values from database are already in MB, no conversion needed
    const createServerPayload = {
      name: serverName,
      user: pterodactylUserId,
      egg: finalEggId,
      docker_image: finalDockerImage,
      startup: finalStartup,
      environment: finalEnvironment,
      limits: {
        memory: ram,  // Already in MB from database
        swap: 0,
        disk: disk,   // Already in MB from database
        io: 500,
        cpu: cpu,     // CPU percentage
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

    // Step 4: Update order status in database with server IDs
    const { error: updateError } = await supabase
      .from('orders')
      .update({ 
        status: 'active',
        pterodactyl_server_id: serverId,
        pterodactyl_identifier: serverIdentifier,
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
