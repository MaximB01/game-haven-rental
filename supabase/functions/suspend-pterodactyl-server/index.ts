import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SuspendRequest {
  orderId: string;
  action: 'suspend' | 'unsuspend';
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

    const { orderId, action }: SuspendRequest = await req.json();

    console.log(`Processing ${action} for order ${orderId}`);

    // Get order with Pterodactyl server ID
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('*')
      .eq('id', orderId)
      .single();

    if (orderError || !order) {
      throw new Error(`Order not found: ${orderId}`);
    }

    const serverId = order.pterodactyl_server_id;
    
    if (!serverId) {
      console.error('No Pterodactyl server ID found for order');
      throw new Error('No server ID found for this order');
    }

    console.log(`${action === 'suspend' ? 'Suspending' : 'Unsuspending'} Pterodactyl server ${serverId}`);

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
      const errorData = await suspendResponse.text();
      console.error(`Pterodactyl ${action} failed:`, errorData);
      throw new Error(`Failed to ${action} server in Pterodactyl: ${errorData}`);
    }

    console.log(`Server ${serverId} ${action}ed successfully`);

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
      console.error('Failed to update order status:', updateError);
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
    console.error('Error suspending server:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to suspend server';
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
