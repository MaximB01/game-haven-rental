import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Allowed game IDs whitelist
const ALLOWED_GAME_IDS = ['minecraft', 'rust', 'ark', 'valheim'];

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
  variantId?: string;
  eggId?: number;
  nestId?: number;
  dockerImage?: string;
  startupCommand?: string;
  minecraftVersion?: string;
}

// Input validation helpers
function isValidUUID(str: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(str);
}

function isValidEmail(str: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(str) && str.length <= 255;
}

function isValidGameId(str: string): boolean {
  return ALLOWED_GAME_IDS.includes(str.toLowerCase());
}

function isValidMinecraftVersion(str: string): boolean {
  // Allow "latest" or semver-like versions (e.g., 1.20.4, 1.19)
  const versionRegex = /^(latest|[0-9]+\.[0-9]+(\.[0-9]+)?)$/;
  return versionRegex.test(str);
}

function sanitizeString(str: string, maxLength: number = 100): string {
  return str.replace(/[^a-zA-Z0-9\-_@.]/g, '').slice(0, maxLength);
}

function validateResourceLimits(ram: number, cpu: number, disk: number): boolean {
  // Reasonable limits: RAM 512MB-65536MB, CPU 10-1000%, Disk 1024MB-500000MB
  return (
    Number.isInteger(ram) && ram >= 512 && ram <= 65536 &&
    Number.isInteger(cpu) && cpu >= 10 && cpu <= 1000 &&
    Number.isInteger(disk) && disk >= 1024 && disk <= 500000
  );
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
        JSON.stringify({ success: false, error: 'Authentication required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceKey) {
      console.error('Missing Supabase configuration');
      return new Response(
        JSON.stringify({ success: false, error: 'Service temporarily unavailable' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify the user's JWT and get their user ID
    const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });

    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser();
    if (authError || !user) {
      console.error('Authentication failed:', authError?.message);
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid or expired session' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let pterodactylUrl = Deno.env.get('PTERODACTYL_URL');
    const pterodactylApiKey = Deno.env.get('PTERODACTYL_API_KEY');

    if (!pterodactylUrl || !pterodactylApiKey) {
      console.error('Missing Pterodactyl configuration');
      return new Response(
        JSON.stringify({ success: false, error: 'Service temporarily unavailable' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Ensure URL has protocol
    if (!pterodactylUrl.startsWith('http://') && !pterodactylUrl.startsWith('https://')) {
      pterodactylUrl = `https://${pterodactylUrl}`;
    }
    pterodactylUrl = pterodactylUrl.replace(/\/$/, '');

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const body: OrderRequest = await req.json();
    const { orderId, gameId, planName, ram, cpu, disk, userId, userEmail, variantId, eggId, nestId, dockerImage, startupCommand, minecraftVersion } = body;

    // Input validation
    if (!orderId || !isValidUUID(orderId)) {
      console.error('Invalid orderId format');
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid request parameters' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!userId || !isValidUUID(userId)) {
      console.error('Invalid userId format');
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid request parameters' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!userEmail || !isValidEmail(userEmail)) {
      console.error('Invalid email format');
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid request parameters' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!gameId || (!isValidGameId(gameId) && !eggId)) {
      console.error('Invalid or unsupported game');
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid request parameters' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!validateResourceLimits(ram, cpu, disk)) {
      console.error('Invalid resource limits');
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid request parameters' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (minecraftVersion && !isValidMinecraftVersion(minecraftVersion)) {
      console.error('Invalid minecraft version format');
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid request parameters' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Authorization: Verify the user owns this order
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('user_id, status')
      .eq('id', orderId)
      .single();

    if (orderError || !order) {
      console.error('Order not found');
      return new Response(
        JSON.stringify({ success: false, error: 'Order not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (order.user_id !== user.id) {
      console.error('User does not own this order');
      return new Response(
        JSON.stringify({ success: false, error: 'Access denied' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Processing order ${orderId} for user ${user.id}`);

    const gameEgg = GAME_EGGS[gameId.toLowerCase()];
    if (!gameEgg && !eggId) {
      return new Response(
        JSON.stringify({ success: false, error: 'Unsupported game type' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Step 1: Create or get Pterodactyl user
    let pterodactylUserId: number;
    const sanitizedEmail = sanitizeString(userEmail, 255);

    const userSearchResponse = await fetch(
      `${pterodactylUrl}/api/application/users?filter[email]=${encodeURIComponent(sanitizedEmail)}`,
      {
        headers: {
          'Authorization': `Bearer ${pterodactylApiKey}`,
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },
      }
    );

    const userSearchData = await userSearchResponse.json();

    if (userSearchData.data && userSearchData.data.length > 0) {
      pterodactylUserId = userSearchData.data[0].attributes.id;
      console.log(`Found existing Pterodactyl user: ${pterodactylUserId}`);
    } else {
      const username = sanitizedEmail.split('@')[0].replace(/[^a-zA-Z0-9]/g, '').slice(0, 20) + '_' + Date.now().toString(36);
      const createUserResponse = await fetch(`${pterodactylUrl}/api/application/users`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${pterodactylApiKey}`,
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: sanitizedEmail,
          username: username,
          first_name: sanitizedEmail.split('@')[0].slice(0, 50),
          last_name: 'CloudServe',
        }),
      });

      const createUserData = await createUserResponse.json();

      if (!createUserResponse.ok) {
        console.error('Failed to create Pterodactyl user');
        return new Response(
          JSON.stringify({ success: false, error: 'Failed to create server. Please try again.' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
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

    if (!nodesData.data || nodesData.data.length === 0) {
      console.error('No nodes available');
      return new Response(
        JSON.stringify({ success: false, error: 'No server capacity available. Please try again later.' }),
        { status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const nodeId = nodesData.data[0].attributes.id;

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

    if (!allocationsData.data || allocationsData.data.length === 0) {
      console.error('No free allocations available');
      return new Response(
        JSON.stringify({ success: false, error: 'No server capacity available. Please try again later.' }),
        { status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const allocationId = allocationsData.data[0].attributes.id;

    // Step 3: Create the server
    const sanitizedGameId = sanitizeString(gameId, 20);
    const sanitizedPlanName = sanitizeString(planName, 30);
    const serverName = `${sanitizedGameId}-${sanitizedPlanName}-${orderId.slice(0, 8)}`.toLowerCase();
    
    const finalEggId = eggId || gameEgg?.eggId || 1;
    const finalDockerImage = dockerImage || gameEgg?.dockerImage || 'ghcr.io/pterodactyl/yolks:java_17';
    const finalStartup = startupCommand || gameEgg?.startup || 'java -Xms128M -Xmx{{SERVER_MEMORY}}M -jar {{SERVER_JARFILE}}';
    const baseEnvironment = gameEgg?.environment || {
      SERVER_JARFILE: 'server.jar',
      VANILLA_VERSION: 'latest',
      BUILD_NUMBER: 'latest'
    };

    const finalEnvironment: Record<string, string> = { ...baseEnvironment };

    if (minecraftVersion && gameId.toLowerCase() === 'minecraft') {
      finalEnvironment.VANILLA_VERSION = minecraftVersion;
      finalEnvironment.MINECRAFT_VERSION = minecraftVersion;
    }

    const createServerPayload = {
      name: serverName,
      user: pterodactylUserId,
      egg: finalEggId,
      docker_image: finalDockerImage,
      startup: finalStartup,
      environment: finalEnvironment,
      limits: {
        memory: ram,
        swap: 0,
        disk: disk,
        io: 500,
        cpu: cpu,
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

    if (!createServerResponse.ok) {
      console.error('Failed to create server in panel');
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to create server. Please try again.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
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
      console.error('Failed to update order status');
    }

    console.log(`Server created successfully: ${serverId}`);

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
    return new Response(
      JSON.stringify({
        success: false,
        error: 'Failed to create server. Please try again.',
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
