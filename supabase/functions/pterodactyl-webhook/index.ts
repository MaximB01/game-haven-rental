import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface PterodactylWebhookPayload {
  resource: string
  action: string
  server?: {
    id: number
    external_id: string | null
    uuid: string
    identifier: string
    name: string
    description: string
    suspended: boolean
    limits: {
      memory: number
      swap: number
      disk: number
      io: number
      cpu: number
    }
    user: number
    node: number
    allocation: number
    nest: number
    egg: number
  }
}

// Helper function to convert ArrayBuffer to hex string
function arrayBufferToHex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

// Verify webhook signature using HMAC-SHA256
async function verifyWebhookSignature(body: string, signature: string | null, secret: string): Promise<boolean> {
  if (!signature) {
    console.error('No signature provided in request');
    return false;
  }

  try {
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      'raw',
      encoder.encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );

    const signatureBuffer = await crypto.subtle.sign(
      'HMAC',
      key,
      encoder.encode(body)
    );

    const expectedSignature = arrayBufferToHex(signatureBuffer);
    
    // Compare signatures (case-insensitive)
    const isValid = signature.toLowerCase() === expectedSignature.toLowerCase();
    
    if (!isValid) {
      console.error('Signature mismatch');
    }
    
    return isValid;
  } catch (error) {
    console.error('Error verifying signature:', error);
    return false;
  }
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    // Get webhook secret
    const webhookSecret = Deno.env.get('PTERODACTYL_WEBHOOK_SECRET');
    if (!webhookSecret) {
      console.error('PTERODACTYL_WEBHOOK_SECRET not configured');
      return new Response(
        JSON.stringify({ success: false, error: 'Webhook not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Read the raw body for signature verification
    const body = await req.text();
    
    // Get signature from headers (Pterodactyl uses X-Signature header)
    const signature = req.headers.get('x-signature') || req.headers.get('x-pterodactyl-signature');
    
    // Verify the webhook signature
    const isValid = await verifyWebhookSignature(body, signature, webhookSecret);
    if (!isValid) {
      console.error('Invalid webhook signature - rejecting request');
      return new Response(
        JSON.stringify({ success: false, error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Webhook signature verified successfully');

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    const payload: PterodactylWebhookPayload = JSON.parse(body);
    
    console.log('Received Pterodactyl webhook:', JSON.stringify({
      resource: payload.resource,
      action: payload.action,
      server_id: payload.server?.id,
      server_identifier: payload.server?.identifier
    }));

    // Check if this is a server deletion event
    if (payload.resource !== 'server' || payload.action !== 'deleted') {
      console.log(`Ignoring event: ${payload.resource}/${payload.action}`)
      return new Response(
        JSON.stringify({ success: true, message: 'Event ignored' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (!payload.server) {
      console.error('No server data in payload')
      return new Response(
        JSON.stringify({ success: false, error: 'No server data' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const serverId = payload.server.id
    const serverIdentifier = payload.server.identifier
    const serverName = payload.server.name

    console.log(`Server deleted: ID=${serverId}, Identifier=${serverIdentifier}, Name=${serverName}`)

    // Find the order by pterodactyl_server_id or pterodactyl_identifier
    const { data: order, error: findError } = await supabase
      .from('orders')
      .select('id, display_id, status')
      .or(`pterodactyl_server_id.eq.${serverId},pterodactyl_identifier.eq.${serverIdentifier}`)
      .maybeSingle()

    if (findError) {
      console.error('Error finding order:', findError)
      return new Response(
        JSON.stringify({ success: false, error: 'Database error' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (!order) {
      console.log(`No order found for server ${serverId}/${serverIdentifier}`)
      return new Response(
        JSON.stringify({ success: true, message: 'No matching order found' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Mark the order as deleted and clear Pterodactyl linkage
    const { error: updateError } = await supabase
      .from('orders')
      .update({ 
        status: 'deleted',
        pterodactyl_server_id: null,
        pterodactyl_identifier: null
      })
      .eq('id', order.id)

    if (updateError) {
      console.error('Error marking order deleted:', updateError)
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to mark order deleted' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`Marked order ${order.display_id} (${order.id}) as deleted for deleted server ${serverName}`)

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Order ${order.display_id} deleted`,
        order_id: order.id
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Webhook error:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})