import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface InvitationRequest {
  episodeId: string;
  guestName: string;
  guestEmail: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { episodeId, guestName, guestEmail }: InvitationRequest = await req.json();

    console.log("Sending invitation:", { episodeId, guestName, guestEmail });

    // Get episode details
    const { data: episode, error: episodeError } = await supabase
      .from('episodes')
      .select('*')
      .eq('id', episodeId)
      .single();

    if (episodeError || !episode) {
      console.error("Episode not found:", episodeError);
      throw new Error("Episode not found");
    }

    // Get episode creator profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('first_name, last_name')
      .eq('user_id', episode.user_id)
      .single();

    // Create guest record
    const { data: guest, error: guestError } = await supabase
      .from('episode_guests')
      .insert({
        episode_id: episodeId,
        name: guestName,
        email: guestEmail,
        status: 'pending'
      })
      .select()
      .single();

    if (guestError) {
      console.error("Failed to create guest:", guestError);
      throw new Error("Failed to create guest record");
    }

    const hostName = profile?.first_name && profile?.last_name 
      ? `${profile.first_name} ${profile.last_name}`
      : "Your host";

    const bookingUrl = `https://szqxqcqgpbhalhxwbryn.supabase.co/functions/v1/guest-booking/${guest.id}`;

    const emailResponse = await resend.emails.send({
      from: "Podcast Booking <hello@lovable.dev>",
      to: [guestEmail],
      subject: `🎙️ You're invited to "${episode.title}" Podcast`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h1 style="color: #333; text-align: center;">🎙️ Podcast Invitation</h1>
          
          <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h2 style="color: #333; margin-top: 0;">You're Invited!</h2>
            <p>Hi ${guestName},</p>
            <p>${hostName} has invited you to be a guest on their podcast:</p>
            
            <div style="background: white; padding: 15px; border-radius: 6px; margin: 15px 0;">
              <h3 style="margin-top: 0; color: #2563eb;">${episode.title}</h3>
              <p style="color: #666; margin-bottom: 10px;">${episode.description}</p>
              <p><strong>Date:</strong> ${new Date(episode.date).toLocaleDateString('en-US', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              })}</p>
            </div>

            <div style="text-align: center; margin: 30px 0;">
              <a href="${bookingUrl}" 
                 style="background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
                Choose Your Time Slot
              </a>
            </div>

            <p style="color: #666; font-size: 14px;">
              Click the button above to view available time slots and confirm your participation.
              If you have any questions, feel free to reply to this email.
            </p>
          </div>

          <div style="text-align: center; color: #999; font-size: 12px; margin-top: 30px;">
            <p>This invitation was sent via Podcast Booking System</p>
          </div>
        </div>
      `,
    });

    console.log("Email sent successfully:", emailResponse);

    return new Response(JSON.stringify({ 
      success: true, 
      guestId: guest.id,
      message: "Invitation sent successfully" 
    }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error("Error in send-invitation function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);