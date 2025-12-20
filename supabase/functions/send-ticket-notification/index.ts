import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { Resend } from "https://esm.sh/resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));
const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface NotificationRequest {
  type: "new_ticket" | "ticket_reply";
  ticketId: string;
  ticketSubject: string;
  ticketDisplayId?: string;
  assignedToUserId?: string;
}

// HTML escape function to prevent XSS in emails
function escapeHtml(text: string): string {
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  };
  return text.replace(/[&<>"']/g, m => map[m]);
}

const handler = async (req: Request): Promise<Response> => {
  console.log("send-ticket-notification function invoked");

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Authentication check - verify JWT token
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      console.log("No authorization header provided");
      return new Response(
        JSON.stringify({ error: 'Authentication required' }),
        { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Create auth client to verify user
    const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });

    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser();
    if (authError || !user) {
      console.log("Invalid session:", authError?.message);
      return new Response(
        JSON.stringify({ error: 'Invalid session' }),
        { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    console.log("Authenticated user:", user.id);

    const { type, ticketId, ticketSubject, ticketDisplayId, assignedToUserId }: NotificationRequest = await req.json();
    console.log("Notification request:", { type, ticketId, ticketSubject, ticketDisplayId, assignedToUserId });

    // Validate required fields
    if (!ticketId || !type || !ticketSubject) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: ticketId, type, ticketSubject' }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Service role client for database operations
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verify user has access to this ticket (owner or assigned staff)
    const { data: ticket, error: ticketError } = await supabase
      .from("tickets")
      .select("user_id, assigned_to")
      .eq("id", ticketId)
      .single();

    if (ticketError || !ticket) {
      console.log("Ticket not found:", ticketId);
      return new Response(
        JSON.stringify({ error: 'Ticket not found' }),
        { status: 404, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Check if user has permission (ticket owner, assigned staff, or admin/moderator)
    const { data: userRole } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .maybeSingle();

    const isStaff = userRole?.role === 'admin' || userRole?.role === 'moderator';
    const isOwner = ticket.user_id === user.id;
    const isAssigned = ticket.assigned_to === user.id;

    if (!isOwner && !isAssigned && !isStaff) {
      console.log("Access denied for user:", user.id);
      return new Response(
        JSON.stringify({ error: 'Access denied' }),
        { status: 403, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    if (type === "ticket_reply" && assignedToUserId) {
      // Get the assigned staff member's email from profiles
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("email, full_name")
        .eq("user_id", assignedToUserId)
        .maybeSingle();

      if (profileError) {
        console.error("Error fetching profile:", profileError);
        throw profileError;
      }

      if (!profile?.email) {
        console.log("No email found for assigned user:", assignedToUserId);
        return new Response(
          JSON.stringify({ success: false, message: "No email found for assigned user" }),
          { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }

      console.log("Sending email to:", profile.email);

      // Escape all user-controlled values to prevent XSS
      const safeFullName = escapeHtml(profile.full_name || "Medewerker");
      const safeTicketId = escapeHtml(ticketDisplayId || ticketId);
      const safeSubject = escapeHtml(ticketSubject);

      const emailResponse = await resend.emails.send({
        from: "Support Notificatie <onboarding@resend.dev>",
        to: [profile.email],
        subject: `Nieuw antwoord op ticket ${safeTicketId}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #333;">Nieuw antwoord op toegewezen ticket</h2>
            <p>Beste ${safeFullName},</p>
            <p>Er is een nieuw antwoord op een ticket waar je aan toegewezen bent:</p>
            <div style="background-color: #f5f5f5; padding: 15px; border-radius: 8px; margin: 20px 0;">
              <p style="margin: 0;"><strong>Ticket ID:</strong> ${safeTicketId}</p>
              <p style="margin: 10px 0 0;"><strong>Onderwerp:</strong> ${safeSubject}</p>
            </div>
            <p>Log in op het dashboard om het ticket te bekijken en te reageren.</p>
            <p style="color: #666; font-size: 12px; margin-top: 30px;">
              Dit is een automatisch gegenereerde email.
            </p>
          </div>
        `,
      });

      console.log("Email sent successfully:", emailResponse);

      return new Response(
        JSON.stringify({ success: true, message: "Email notification sent" }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    return new Response(
      JSON.stringify({ success: true, message: "No action needed" }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: any) {
    console.error("Error in send-ticket-notification:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
