import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const url = new URL(req.url);
  const guestId = url.pathname.split('/').pop();

  // Use SERVICE ROLE to bypass RLS in a controlled way (this function restricts by guestId)
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  )

  try {
    if (!guestId) {
      return new Response('Invalid guest id', { status: 400, headers: corsHeaders });
    }

    if (req.method === 'GET') {
      console.log('Fetching guest booking details for', guestId);

      // Get guest and episode details
      const { data: guest, error: guestError } = await supabase
        .from('episode_guests')
        .select(`
          *,
          episodes(
            *,
            profiles(first_name, last_name)
          )
        `)
        .eq('id', guestId)
        .single();

      if (guestError || !guest) {
        console.error('Guest fetch error (likely RLS or missing):', guestError);
        return new Response(createNotFoundPage(), {
          headers: { 'Content-Type': 'text/html', ...corsHeaders }
        });
      }

      const html = createBookingPage(guest);
      return new Response(html, {
        headers: { 'Content-Type': 'text/html', ...corsHeaders }
      });
    }

    if (req.method === 'POST') {
      const { selectedSlot, status, rejectionNote } = await req.json();
      console.log('Updating booking for', guestId, { selectedSlot, status, rejectionNote });

      // Update guest status and selected time slot
      const updateData: any = { 
        status: status,
        selected_time_slot: selectedSlot ?? null
      };
      
      if (status === 'declined' && rejectionNote) {
        updateData.rejection_note = rejectionNote;
      }

      const { error } = await supabase
        .from('episode_guests')
        .update(updateData)
        .eq('id', guestId);

      if (error) {
        console.error('Update booking error:', error);
        throw new Error('Failed to update booking');
      }

      return new Response(JSON.stringify({ success: true }), {
        headers: { 'Content-Type': 'application/json', ...corsHeaders }
      });
    }

    return new Response('Method not allowed', { status: 405, headers: corsHeaders });

  } catch (error: any) {
    console.error('Error in guest-booking:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...corsHeaders }
    });
  }
};

function createNotFoundPage(): string {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Invitation Not Found</title>
      <meta name="viewport" content="width=device-width, initial-scale=1">
      <style>
        body { font-family: Arial, sans-serif; max-width: 600px; margin: 50px auto; padding: 20px; text-align: center; }
        .error { color: #dc2626; }
      </style>
    </head>
    <body>
      <h1 class="error">Invitation Not Found</h1>
      <p>The invitation link you used is invalid or has expired.</p>
      <p>Please contact the podcast host for a new invitation.</p>
    </body>
    </html>
  `;
}

function createBookingPage(guest: any): string {
  const episode = guest.episodes;
  const hostName = episode.profiles?.first_name && episode.profiles?.last_name 
    ? `${episode.profiles.first_name} ${episode.profiles.last_name}`
    : "Your host";

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Podcast Booking - ${episode.title}</title>
      <meta name="viewport" content="width=device-width, initial-scale=1">
      <style>
        body { 
          font-family: Arial, sans-serif; 
          max-width: 600px; 
          margin: 20px auto; 
          padding: 20px; 
          background: #f8f9fa;
        }
        .container { 
          background: white; 
          padding: 30px; 
          border-radius: 12px; 
          box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        .header { text-align: center; margin-bottom: 30px; }
        .episode-info { 
          background: #f1f5f9; 
          padding: 20px; 
          border-radius: 8px; 
          margin: 20px 0;
        }
        .time-slot { 
          display: block; 
          width: 100%; 
          padding: 12px; 
          margin: 8px 0; 
          border: 2px solid #e2e8f0; 
          border-radius: 6px; 
          background: white; 
          cursor: pointer; 
          transition: all 0.2s;
        }
        .time-slot:hover { border-color: #2563eb; background: #eff6ff; }
        .time-slot.selected { border-color: #2563eb; background: #dbeafe; }
        .button { 
          background: #2563eb; 
          color: white; 
          padding: 12px 24px; 
          border: none; 
          border-radius: 6px; 
          cursor: pointer; 
          font-size: 16px; 
          width: 100%;
          margin: 10px 0;
        }
        .button:hover { background: #1d4ed8; }
        .button:disabled { background: #94a3b8; cursor: not-allowed; }
        .decline-btn { background: #dc2626; }
        .decline-btn:hover { background: #b91c1c; }
        .success { color: #059669; text-align: center; padding: 20px; }
        .guest-name { color: #2563eb; font-weight: bold; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>🎙️ Podcast Invitation</h1>
          <p>Hello <span class="guest-name">${guest.name}</span>!</p>
        </div>

        <div class="episode-info">
          <h2>${episode.title}</h2>
          <p><strong>Host:</strong> ${hostName}</p>
          <p><strong>Date:</strong> ${new Date(episode.date).toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
          })}</p>
          <p><strong>Description:</strong> ${episode.description}</p>
        </div>

        ${guest.status === 'confirmed' ? `
          <div class="success">
            <h3>✅ Confirmed!</h3>
            <p>You have confirmed your participation for: <strong>${guest.selected_time_slot}</strong></p>
            <p>Thank you! You'll receive more details closer to the recording date.</p>
          </div>
        ` : guest.status === 'declined' ? `
          <div class="success">
            <h3>❌ Declined</h3>
            <p>You have declined this invitation. Thank you for letting us know.</p>
            ${guest.rejection_note ? `<p><strong>Note:</strong> ${guest.rejection_note}</p>` : ''}
          </div>
        ` : `
          <div id="booking-form">
            <h3>Choose Your Preferred Time Slot:</h3>
            
            ${episode.time_slots.map((slot: string) => `
              <button class="time-slot" data-slot="${slot}">
                ${slot}
              </button>
            `).join('')}

            <div style="margin-top: 30px;">
              <button id="confirm-btn" class="button" disabled>
                Confirm Participation
              </button>
              <button id="decline-btn" class="button decline-btn">
                Decline Invitation
              </button>
            </div>
            
            <div id="decline-form" style="display: none; margin-top: 20px; padding: 20px; background: #fef2f2; border-radius: 8px; border: 1px solid #fecaca;">
              <h4>Please let us know why you can't attend (optional):</h4>
              <textarea id="rejection-note" placeholder="e.g., Scheduling conflict, not available that week..." 
                style="width: 100%; padding: 8px; margin: 10px 0; border-radius: 4px; border: 1px solid #d1d5db; min-height: 80px;"></textarea>
              <div>
                <button id="confirm-decline-btn" class="button decline-btn">
                  Confirm Decline
                </button>
                <button id="cancel-decline-btn" class="button" style="background: #6b7280; margin-left: 10px;">
                  Cancel
                </button>
              </div>
            </div>
          </div>
        `}
      </div>

      <script>
        let selectedSlot = null;
        
        document.querySelectorAll('.time-slot').forEach(button => {
          button.addEventListener('click', function() {
            document.querySelectorAll('.time-slot').forEach(b => b.classList.remove('selected'));
            this.classList.add('selected');
            selectedSlot = this.dataset.slot;
            document.getElementById('confirm-btn').disabled = false;
          });
        });

        document.getElementById('confirm-btn')?.addEventListener('click', async function() {
          if (!selectedSlot) return;
          
          this.disabled = true;
          this.textContent = 'Confirming...';
          
          try {
            const response = await fetch(window.location.href, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ selectedSlot, status: 'confirmed' })
            });
            
            if (response.ok) {
              window.location.reload();
            } else {
              alert('Failed to confirm. Please try again.');
              this.disabled = false;
              this.textContent = 'Confirm Participation';
            }
          } catch (error) {
            alert('Failed to confirm. Please try again.');
            this.disabled = false;
            this.textContent = 'Confirm Participation';
          }
        });

        document.getElementById('decline-btn')?.addEventListener('click', function() {
          document.getElementById('decline-form').style.display = 'block';
          this.style.display = 'none';
        });

        document.getElementById('cancel-decline-btn')?.addEventListener('click', function() {
          document.getElementById('decline-form').style.display = 'none';
          document.getElementById('decline-btn').style.display = 'block';
          document.getElementById('rejection-note').value = '';
        });

        document.getElementById('confirm-decline-btn')?.addEventListener('click', async function() {
          this.disabled = true;
          this.textContent = 'Declining...';
          
          const rejectionNote = document.getElementById('rejection-note').value.trim();
          
          try {
            const response = await fetch(window.location.href, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ 
                status: 'declined',
                rejectionNote: rejectionNote || null
              })
            });
            
            if (response.ok) {
              window.location.reload();
            } else {
              alert('Failed to decline. Please try again.');
              this.disabled = false;
              this.textContent = 'Confirm Decline';
            }
          } catch (error) {
            alert('Failed to decline. Please try again.');
            this.disabled = false;
            this.textContent = 'Confirm Decline';
          }
        });
      </script>
    </body>
    </html>
  `;
}

serve(handler);
