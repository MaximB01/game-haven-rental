import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Allowed actions whitelist
const ALLOWED_ACTIONS = ['suspend', 'unsuspend'] as const;
type AllowedAction = typeof ALLOWED_ACTIONS[number];

interface SuspendRequest {
  orderId: string;
  action: AllowedAction;
}

// Input validation helpers
function isValidUUID(str: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(str);
}

function isValidAction(str: string): str is AllowedAction {
  return ALLOWED_ACTIONS.includes(str as AllowedAction);
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
      console.error('Authentication failed');
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

    const body: SuspendRequest = await req.json();
    const { orderId, action } = body;

    // Input validation
    if (!orderId || !isValidUUID(orderId)) {
      console.error('Invalid orderId format');
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid request parameters' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!action || !isValidAction(action)) {
      console.error('Invalid action');
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid request parameters' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get order with Pterodactyl server ID and verify ownership
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('user_id, pterodactyl_server_id')
      .eq('id', orderId)
      .single();

    if (orderError || !order) {
      console.error('Order not found');
      return new Response(
        JSON.stringify({ success: false, error: 'Order not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Authorization: Check if user is admin or owns the order
    const { data: isAdmin } = await supabase.rpc('has_role', {
      _user_id: user.id,
      _role: 'admin'
    });

    if (order.user_id !== user.id && !isAdmin) {
      console.error('User does not have permission for this order');
      return new Response(
        JSON.stringify({ success: false, error: 'Access denied' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const serverId = order.pterodactyl_server_id;
    
    if (!serverId) {
      console.error('No server ID found for order');
      return new Response(
        JSON.stringify({ success: false, error: 'Server not found for this order' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`${action === 'suspend' ? 'Suspending' : 'Unsuspending'} server for order ${orderId}`);

    // Call Pterodactyl API to suspend/unsuspend
    const suspendResponse = await fetch(
      `${pterodactylUrl}/api/application/servers/${serverId}/${action}`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${pterodactylApiKey}`,
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },
      }
    );

    if (!suspendResponse.ok) {
      const responseText = await suspendResponse.text();
      console.error(`Failed to ${action} server. Status: ${suspendResponse.status}, Response: ${responseText}`);
      
      // Check if server doesn't exist (404)
      if (suspendResponse.status === 404) {
        return new Response(
          JSON.stringify({ success: false, error: 'Server does not exist in Pterodactyl. It may have been deleted.' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      return new Response(
        JSON.stringify({ success: false, error: `Failed to ${action} server. Please try again.` }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Server ${action}ed successfully`);

    // Update order status
    const newStatus = action === 'suspend' ? 'suspended' : 'active';
    const { error: updateError } = await supabase
      .from('orders')
      .update({ 
        status: newStatus,
        updated_at: new Date().toISOString()
      })
      .eq('id', orderId);

    if (updateError) {
      console.error('Failed to update order status');
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Server ${action}ed successfully`,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error processing request:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: 'Failed to process request. Please try again.',
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
