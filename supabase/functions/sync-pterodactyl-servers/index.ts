import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface PterodactylServer {
  attributes: {
    id: number;
    identifier: string;
    name: string;
    limits: {
      memory: number;
      cpu: number;
      disk: number;
    };
    user: number;
  };
}

interface PterodactylUser {
  attributes: {
    id: number;
    email: string;
    first_name: string;
    last_name: string;
  };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Authentication: Verify JWT token
    const authHeader = req.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ success: false, error: 'Authentication required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    // Verify the user's JWT and check admin role
    const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });

    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser();
    if (authError || !user) {
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid session' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Check admin role
    const { data: isAdmin } = await supabase.rpc('has_role', {
      _user_id: user.id,
      _role: 'admin'
    });

    if (!isAdmin) {
      return new Response(
        JSON.stringify({ success: false, error: 'Admin access required' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let pterodactylUrl = Deno.env.get('PTERODACTYL_URL');
    const pterodactylApiKey = Deno.env.get('PTERODACTYL_API_KEY');

    if (!pterodactylUrl || !pterodactylApiKey) {
      return new Response(
        JSON.stringify({ success: false, error: 'Pterodactyl not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Ensure URL has protocol
    if (!pterodactylUrl.startsWith('http://') && !pterodactylUrl.startsWith('https://')) {
      pterodactylUrl = `https://${pterodactylUrl}`;
    }
    pterodactylUrl = pterodactylUrl.replace(/\/$/, '');

    console.log('Starting Pterodactyl sync...');

    // Step 1: Fetch all servers from Pterodactyl
    const serversResponse = await fetch(`${pterodactylUrl}/api/application/servers?per_page=500`, {
      headers: {
        'Authorization': `Bearer ${pterodactylApiKey}`,
        'Accept': 'application/json',
      },
    });

    if (!serversResponse.ok) {
      console.error('Failed to fetch servers from Pterodactyl');
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to fetch servers from Pterodactyl' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const serversData = await serversResponse.json();
    const servers: PterodactylServer[] = serversData.data || [];
    console.log(`Found ${servers.length} servers in Pterodactyl`);

    // Step 2: Fetch all Pterodactyl users
    const usersResponse = await fetch(`${pterodactylUrl}/api/application/users?per_page=500`, {
      headers: {
        'Authorization': `Bearer ${pterodactylApiKey}`,
        'Accept': 'application/json',
      },
    });

    const usersData = await usersResponse.json();
    const pterodactylUsers: PterodactylUser[] = usersData.data || [];
    
    // Create lookup map: pterodactyl user id -> email
    const pterodactylUserMap = new Map<number, string>();
    for (const u of pterodactylUsers) {
      pterodactylUserMap.set(u.attributes.id, u.attributes.email.toLowerCase());
    }

    // Step 3: Fetch product plans to match RAM
    const { data: plans } = await supabase
      .from('product_plans')
      .select('id, name, product_id, ram, price')
      .eq('is_active', true)
      .order('ram', { ascending: true });

    // Step 4: Fetch products to get names
    const { data: products } = await supabase
      .from('products')
      .select('id, name, category')
      .eq('is_active', true);

    const productMap = new Map<string, { name: string; category: string }>();
    for (const p of products || []) {
      productMap.set(p.id, { name: p.name, category: p.category });
    }

    // Step 5: Fetch existing orders with pterodactyl_server_id
    const { data: existingOrders } = await supabase
      .from('orders')
      .select('pterodactyl_server_id');

    const existingServerIds = new Set(
      (existingOrders || [])
        .map(o => o.pterodactyl_server_id)
        .filter(Boolean)
    );

    // Step 6: Fetch Supabase users by email (using auth.users via service role)
    // We'll match against profiles which has email
    const { data: profiles } = await supabase
      .from('profiles')
      .select('user_id, email');

    const emailToUserId = new Map<string, string>();
    for (const p of profiles || []) {
      if (p.email) {
        emailToUserId.set(p.email.toLowerCase(), p.user_id);
      }
    }

    // Helper function to find best matching plan based on RAM
    const findPlanByRam = (ramMb: number) => {
      if (!plans || plans.length === 0) return null;
      
      // Find the plan with exact or closest RAM match
      let bestPlan = null;
      let smallestDiff = Infinity;
      
      for (const plan of plans) {
        const diff = Math.abs(plan.ram - ramMb);
        if (diff < smallestDiff) {
          smallestDiff = diff;
          bestPlan = plan;
        }
      }
      
      return bestPlan;
    };

    // Step 7: Process servers and create orders
    const results = {
      imported: 0,
      skipped: 0,
      noUser: 0,
      noPlan: 0,
      errors: [] as string[],
    };

    for (const server of servers) {
      const serverId = server.attributes.id;
      const serverIdentifier = server.attributes.identifier;
      const serverName = server.attributes.name;
      const ram = server.attributes.limits.memory;
      const pterodactylUserId = server.attributes.user;

      // Skip if already exists
      if (existingServerIds.has(serverId)) {
        results.skipped++;
        continue;
      }

      // Get Pterodactyl user email
      const userEmail = pterodactylUserMap.get(pterodactylUserId);
      if (!userEmail) {
        console.log(`Server ${serverId}: No email found for Pterodactyl user ${pterodactylUserId}`);
        results.noUser++;
        continue;
      }

      // Find Supabase user by email
      const supabaseUserId = emailToUserId.get(userEmail);
      if (!supabaseUserId) {
        console.log(`Server ${serverId}: No Supabase user found for email ${userEmail}`);
        results.noUser++;
        continue;
      }

      // Find matching plan by RAM
      const matchingPlan = findPlanByRam(ram);
      if (!matchingPlan) {
        console.log(`Server ${serverId}: No matching plan for ${ram}MB RAM`);
        results.noPlan++;
        continue;
      }

      const productInfo = productMap.get(matchingPlan.product_id);
      const productName = productInfo?.name || 'Unknown Product';
      const productType = productInfo?.category || 'game';

      // Create order
      const { error: insertError } = await supabase
        .from('orders')
        .insert({
          user_id: supabaseUserId,
          product_name: productName,
          product_type: productType,
          plan_name: matchingPlan.name,
          price: matchingPlan.price,
          status: 'active',
          pterodactyl_server_id: serverId,
          pterodactyl_identifier: serverIdentifier,
        });

      if (insertError) {
        console.error(`Failed to create order for server ${serverId}:`, insertError.message);
        results.errors.push(`Server ${serverName}: ${insertError.message}`);
      } else {
        console.log(`Created order for server ${serverId} (${serverName})`);
        results.imported++;
      }
    }

    console.log('Sync completed:', results);

    return new Response(
      JSON.stringify({
        success: true,
        results,
        message: `Imported ${results.imported} servers, skipped ${results.skipped} existing, ${results.noUser} without matching user, ${results.noPlan} without matching plan`,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error('Sync error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
