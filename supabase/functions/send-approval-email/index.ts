
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface ApprovalEmailRequest {
  email: string;
  isApproved: boolean;
  accessCode?: string;
}

const handler = async (req: Request): Promise<Response> => {
  console.log("send-approval-email function called");

  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // STEP 1: Verify authentication
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      console.log("No authorization header provided");
      return new Response(JSON.stringify({ error: "Non autorisé" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // STEP 2: Get authenticated user
    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const {
      data: { user },
      error: userError,
    } = await userClient.auth.getUser();
    if (userError || !user) {
      console.log("User authentication failed:", userError?.message);
      return new Response(JSON.stringify({ error: "Non autorisé" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // STEP 3: Verify admin role
    const { data: roleData, error: roleError } = await userClient
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .maybeSingle();

    if (roleError || !roleData) {
      console.log("Admin role check failed for user:", user.id);
      return new Response(JSON.stringify({ error: "Accès réservé aux administrateurs" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log("Admin authenticated:", user.email);

    // STEP 4: Process email request
    const { email, isApproved, accessCode }: ApprovalEmailRequest = await req.json();
    console.log(`Sending ${isApproved ? "approval" : "rejection"} email to: ${email}`);

    if (!email) {
      throw new Error("Email is required");
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      throw new Error("Invalid email format");
    }

    // Initialize Supabase admin client for logging
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    let subject: string;
    let emailType: string;
    let htmlContent: string;

    if (isApproved) {
      subject = "🏆 Votre inscription VIP Turf Coaching est validée !";
      emailType = "approval";

      const accessCodeSection = accessCode
        ? `
        <div style="background: #fef3c7; border: 2px solid #d97706; border-radius: 10px; padding: 20px; margin: 20px 0; text-align: center;">
          <p style="margin: 0 0 10px 0; font-size: 14px; color: #92400e;">Votre code d'accès personnel :</p>
          <p style="margin: 0; font-size: 28px; font-weight: bold; color: #d97706; letter-spacing: 3px; font-family: monospace;">${accessCode}</p>
          <p style="margin: 10px 0 0 0; font-size: 12px; color: #78350f;">Gardez ce code précieusement, il est nécessaire pour accéder à l'application.</p>
        </div>
      `
        : "";

      htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #10b981, #059669); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }
            .button { display: inline-block; background: #d97706; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; margin-top: 20px; }
            .footer { text-align: center; margin-top: 30px; color: #6b7280; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🏆 Bienvenue dans le VIP Turf Coaching !</h1>
            </div>
            <div class="content">
              <p>Bonjour,</p>
              <p>Excellente nouvelle ! Votre inscription a été <strong>validée par notre équipe</strong>.</p>
              ${accessCodeSection}
              <p>Vous avez maintenant accès à :</p>
              <ul>
                <li>✅ Coaching personnalisé</li>
                <li>✅ Analyses exclusives</li>
                <li>✅ Pronostics premium</li>
                <li>✅ Support prioritaire</li>
              </ul>
              <p>Nous sommes ravis de vous compter parmi nos membres VIP !</p>
              <p style="text-align: center;">
                <a href="https://analyseprdictivedescourseshippiques.lovable.app" class="button">
                  Accéder à l'application
                </a>
              </p>
            </div>
            <div class="footer">
              <p>VIP Turf Coaching - Analyses et pronostics hippiques</p>
            </div>
          </div>
        </body>
        </html>
      `;
    } else {
      subject = "Information concernant votre inscription";
      emailType = "rejection";
      htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #6b7280; color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }
            .button { display: inline-block; background: #10b981; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; margin-top: 20px; }
            .footer { text-align: center; margin-top: 30px; color: #6b7280; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Information sur votre inscription</h1>
            </div>
            <div class="content">
              <p>Bonjour,</p>
              <p>Nous avons examiné votre demande d'inscription.</p>
              <p>Malheureusement, nous ne sommes pas en mesure de valider votre inscription pour le moment.</p>
              <p>Si vous pensez qu'il s'agit d'une erreur ou si vous souhaitez plus d'informations, n'hésitez pas à nous contacter.</p>
              <p>Vous pouvez toujours vous réinscrire ultérieurement :</p>
              <p style="text-align: center;">
                <a href="https://my.moneyfusion.net/6981c32afa6969620bb09f4f" class="button">
                  Découvrir le VIP Coaching
                </a>
              </p>
            </div>
            <div class="footer">
              <p>VIP Turf Coaching - Analyses et pronostics hippiques</p>
            </div>
          </div>
        </body>
        </html>
      `;
    }

    // Send email via Resend
    const emailResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: "VIP Turf Coaching <noreply@vipturf.fr>",
        to: [email],
        subject: subject,
        html: htmlContent,
      }),
    });

    const result = await emailResponse.json();
    console.log("Resend API response:", result);

    // Determine status based on response
    const status = emailResponse.ok ? "sent" : "failed";
    const resendId = result.id || null;
    const errorMessage = emailResponse.ok ? null : result.message || result.error || "Unknown error";

    // Log email to history with admin user ID
    const { error: historyError } = await supabase.from("email_history").insert({
      recipient_email: email,
      subject: subject,
      email_type: emailType,
      status: status,
      resend_id: resendId,
      error_message: errorMessage,
      delivered_at: status === "sent" ? new Date().toISOString() : null,
      sent_by: user.id,
    });

    if (historyError) {
      console.error("Error logging email to history:", historyError);
    } else {
      console.log("Email logged to history successfully");
    }

    if (!emailResponse.ok) {
      throw new Error(errorMessage || "Failed to send email");
    }

    console.log("Email sent successfully:", result);

    return new Response(JSON.stringify({ success: true, ...result }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error sending approval email:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
};

serve(handler);

