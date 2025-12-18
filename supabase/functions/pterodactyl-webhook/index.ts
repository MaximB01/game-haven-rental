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

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    const payload: PterodactylWebhookPayload = await req.json()
    
    console.log('Received Pterodactyl webhook:', JSON.stringify(payload, null, 2))

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

    // Archive the order
    const { error: updateError } = await supabase
      .from('orders')
      .update({ status: 'archived' })
      .eq('id', order.id)

    if (updateError) {
      console.error('Error archiving order:', updateError)
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to archive order' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`Archived order ${order.display_id} (${order.id}) for deleted server ${serverName}`)

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Order ${order.display_id} archived`,
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
