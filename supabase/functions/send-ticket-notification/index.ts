import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { Resend } from "https://esm.sh/resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));
const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

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

const handler = async (req: Request): Promise<Response> => {
  console.log("send-ticket-notification function invoked");

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { type, ticketId, ticketSubject, ticketDisplayId, assignedToUserId }: NotificationRequest = await req.json();
    console.log("Notification request:", { type, ticketId, ticketSubject, ticketDisplayId, assignedToUserId });

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

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

      const emailResponse = await resend.emails.send({
        from: "Support Notificatie <onboarding@resend.dev>",
        to: [profile.email],
        subject: `Nieuw antwoord op ticket ${ticketDisplayId || ticketId}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #333;">Nieuw antwoord op toegewezen ticket</h2>
            <p>Beste ${profile.full_name || "Medewerker"},</p>
            <p>Er is een nieuw antwoord op een ticket waar je aan toegewezen bent:</p>
            <div style="background-color: #f5f5f5; padding: 15px; border-radius: 8px; margin: 20px 0;">
              <p style="margin: 0;"><strong>Ticket ID:</strong> ${ticketDisplayId || ticketId}</p>
              <p style="margin: 10px 0 0;"><strong>Onderwerp:</strong> ${ticketSubject}</p>
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
