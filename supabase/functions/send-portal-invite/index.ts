/**
 * send-portal-invite - emails a client a one-click sign-in link to their
 * PropPath client portal via Resend.
 *
 * The client account itself is provisioned by `create-client-user`; this
 * function only generates a magic sign-in link (so the client lands straight
 * in their portal, no password typing) and emails it. A temporary password is
 * included as a fallback for future logins when the account was freshly made.
 *
 * Auth: caller must be an authenticated owner/agent (verified via JWT). The
 * service-role key stays server-side and is used for generateLink.
 */
import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface RequestBody {
  email: string;
  clientName?: string;
  clientId?: number;
  scenarioId?: number;
  appOrigin: string;
  tempPassword?: string | null;
}

interface ResponseBody {
  ok: boolean;
  error?: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
    const resendKey = Deno.env.get('RESEND_API_KEY');
    if (!supabaseUrl || !serviceRoleKey || !anonKey) {
      return json({ ok: false, error: 'Server misconfigured (missing Supabase env vars).' }, 500);
    }
    if (!resendKey) {
      return json({ ok: false, error: 'Email service not configured.' }, 500);
    }

    // Verify the caller is an authenticated owner/agent.
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return json({ ok: false, error: 'Missing Authorization header.' }, 401);
    }
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: callerData, error: callerError } = await userClient.auth.getUser();
    if (callerError || !callerData?.user) {
      return json({ ok: false, error: 'Could not verify caller identity.' }, 401);
    }
    const { data: callerProfile } = await userClient
      .from('profiles')
      .select('role')
      .eq('id', callerData.user.id)
      .maybeSingle();
    if (!callerProfile || (callerProfile.role !== 'owner' && callerProfile.role !== 'agent')) {
      return json({ ok: false, error: 'Only owners or agents can invite clients.' }, 403);
    }

    const body = (await req.json()) as RequestBody;
    if (!body.email || !body.appOrigin) {
      return json({ ok: false, error: 'email and appOrigin are required.' }, 400);
    }

    const admin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // Generate a magic sign-in link that drops the client straight into their
    // portal. generateLink only *creates* the link (no Supabase SMTP needed) -
    // we deliver it ourselves via Resend below.
    const redirectTo = `${body.appOrigin}/portal`;
    let magicLink = `${body.appOrigin}/login`;
    const { data: linkData, error: linkError } = await admin.auth.admin.generateLink({
      type: 'magiclink',
      email: body.email,
      options: { redirectTo },
    });
    if (!linkError && linkData?.properties?.action_link) {
      magicLink = linkData.properties.action_link;
    }

    const companyName = 'PropPath';
    const primaryColor = '#7C3AED';
    const loginUrl = `${body.appOrigin}/login`;

    const html = buildPortalInviteHtml({
      companyName,
      primaryColor,
      displayName: body.clientName || 'there',
      magicLink,
      loginUrl,
      email: body.email,
      tempPassword: body.tempPassword ?? null,
    });

    const emailRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: `${companyName} <noreply@proppath.app>`,
        to: [body.email],
        subject: `${companyName} - your investment plan is ready to view`,
        html,
      }),
    });

    if (!emailRes.ok) {
      const errText = await emailRes.text();
      console.warn('[send-portal-invite] send failed:', errText);
      return json({ ok: false, error: 'Failed to send email.' }, 500);
    }

    return json({ ok: true });
  } catch (err) {
    return json({ ok: false, error: err instanceof Error ? err.message : 'Unknown error.' }, 500);
  }
});

function json(body: ResponseBody, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

function buildPortalInviteHtml(opts: {
  companyName: string;
  primaryColor: string;
  displayName: string;
  magicLink: string;
  loginUrl: string;
  email: string;
  tempPassword: string | null;
}) {
  const { companyName, primaryColor, displayName, magicLink, loginUrl, email, tempPassword } = opts;
  const credsBlock = tempPassword
    ? `<p style="margin:0 0 6px;font-size:13px;color:#6b7280;">If you're asked to sign in again later, use:</p>
       <p style="margin:0;font-size:14px;color:#111827;"><strong>Email:</strong> ${email}<br/>
       <strong>Temporary password:</strong> <span style="font-family:monospace;">${tempPassword}</span></p>`
    : `<p style="margin:0;font-size:13px;color:#6b7280;">If you're asked to sign in again later, go to
       <a href="${loginUrl}" style="color:${primaryColor};">${loginUrl}</a> and use your email
       (${email}). You can reset your password with "Forgot password".</p>`;

  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#f7f7f8;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f7f7f8;padding:40px 20px;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;">
        <tr><td style="background:${primaryColor};padding:28px 40px;text-align:center;">
          <span style="color:#ffffff;font-size:20px;font-weight:700;">${companyName}</span>
        </td></tr>
        <tr><td style="padding:36px 40px;">
          <h1 style="margin:0 0 12px;font-size:22px;color:#111827;">Your investment plan is ready</h1>
          <p style="margin:0 0 20px;font-size:15px;line-height:1.55;color:#374151;">
            Hi ${displayName}, your buyers agent has prepared a personalised property investment plan for you.
            Open your secure portal to explore your roadmap, projections and portfolio.
          </p>
          <table cellpadding="0" cellspacing="0" style="margin:0 0 24px;"><tr><td>
            <a href="${magicLink}" style="display:inline-block;background:${primaryColor};color:#ffffff;text-decoration:none;font-size:15px;font-weight:600;padding:12px 26px;border-radius:8px;">
              Open my portal
            </a>
          </td></tr></table>
          <div style="border-top:1px solid #eef0f2;padding-top:18px;">
            ${credsBlock}
          </div>
        </td></tr>
        <tr><td style="padding:0 40px 32px;">
          <p style="margin:0;font-size:12px;color:#9ca3af;">
            This is an automated message from ${companyName}. If you weren't expecting it, you can safely ignore it.
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}
