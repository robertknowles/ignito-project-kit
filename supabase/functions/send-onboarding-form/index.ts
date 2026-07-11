/**
 * send-onboarding-form - emails a client the link to fill out their
 * financial details questionnaire via Resend.
 *
 * Also supports a "completion" mode: when the client finishes the form,
 * the frontend calls this with `notifyAgent: true` to email the BA.
 */
import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface RequestBody {
  clientEmail?: string;
  clientName?: string;
  companyId?: string | null;
  onboardingUrl?: string;
  formType?: 'input_form' | 'profile_update';
  // When true, looks up the agent from the onboarding_id and emails them
  notifyAgent?: boolean;
  onboardingId?: string;
  formData?: {
    depositPool?: number;
    borrowingCapacity?: number;
    annualSavings?: number;
    portfolioValue?: number;
    currentDebt?: number;
    timelineYears?: number;
    equityGoal?: number;
    cashflowGoal?: number;
  };
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
      return json({ ok: false, error: 'Server misconfigured.' }, 500);
    }
    if (!resendKey) {
      return json({ ok: false, error: 'Email service not configured.' }, 500);
    }

    const body = (await req.json()) as RequestBody;

    // For the completion notification we skip auth - the client isn't logged in
    if (!body.notifyAgent) {
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
        return json({ ok: false, error: 'Only owners or agents can send forms.' }, 403);
      }
    }

    const admin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // Always send as PropPath - not the white-label company name
    const companyName = 'PropPath';
    const logoUrl: string | null = null;
    // Neutral charcoal for the header band, button and links (matches the
    // app's dark title colour) instead of the old orange brand accent.
    const primaryColor = '#1a1a1a';

    let to: string;
    let subject: string;
    let html: string;

    if (body.notifyAgent) {
      // --- Agent notification: client completed the form ---
      // Look up everything server-side (the client page has no auth context)
      if (!body.onboardingId) {
        return json({ ok: false, error: 'onboardingId is required for agent notification.' }, 400);
      }

      const { data: scenario } = await admin
        .from('scenarios')
        .select('client_id, company_id')
        .eq('onboarding_id', body.onboardingId)
        .single();

      if (!scenario?.client_id) {
        return json({ ok: false, error: 'Scenario not found.' }, 404);
      }

      const { data: clientRow } = await admin
        .from('clients')
        .select('user_id, name, email')
        .eq('id', scenario.client_id)
        .single();

      if (!clientRow?.user_id) {
        return json({ ok: false, error: 'Client or agent not found.' }, 404);
      }

      const { data: { user: agentUser }, error: agentError } = await admin.auth.admin.getUserById(clientRow.user_id);

      if (agentError || !agentUser?.email) {
        return json({ ok: false, error: 'Agent email not found.' }, 404);
      }

      to = agentUser.email;
      subject = `${clientRow.name || 'A client'} has completed their details form`;
      html = buildAgentNotificationHtml({
        companyName,
        logoUrl,
        primaryColor,
        clientName: clientRow.name || 'Your client',
        clientEmail: clientRow.email || '',
        isUpdate: false,
        formData: body.formData,
      });
    } else {
      // --- Client email: send the onboarding link ---
      if (!body.clientEmail) {
        return json({ ok: false, error: 'clientEmail is required.' }, 400);
      }

      const displayName = body.clientName || 'there';
      const isUpdate = body.formType === 'profile_update';

      to = body.clientEmail;
      subject = isUpdate
        ? `${companyName} - please update your financial details`
        : `${companyName} - let's get your investment details`;
      html = buildClientFormHtml({
        companyName,
        logoUrl,
        primaryColor,
        displayName,
        onboardingUrl: body.onboardingUrl || '',
        isUpdate,
      });
    }

    const emailRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: `${companyName} <noreply@proppath.app>`,
        to: [to],
        subject,
        html,
      }),
    });

    if (!emailRes.ok) {
      const errText = await emailRes.text();
      console.warn('[send-onboarding-form] send failed:', errText);
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

// --- HTML builders ---

function buildClientFormHtml(opts: {
  companyName: string;
  logoUrl: string | null;
  primaryColor: string;
  displayName: string;
  onboardingUrl: string;
  isUpdate: boolean;
}) {
  const { companyName, logoUrl, primaryColor, displayName, onboardingUrl, isUpdate } = opts;
  const heading = isUpdate
    ? 'Time to update your details'
    : "Welcome, let's get started";
  const body = isUpdate
    ? `Hi ${displayName}, your adviser has requested updated financial details to keep your investment roadmap accurate.`
    : `Hi ${displayName}, your property investment adviser has invited you to share your financial details so they can build a personalised investment roadmap for you.`;
  const buttonText = isUpdate ? 'Update my details' : 'Fill out my details';

  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#f7f7f8;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f7f7f8;padding:40px 20px;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;">
        <tr><td style="background:${primaryColor};padding:32px 40px;text-align:center;">
          ${logoUrl
            ? `<img src="${logoUrl}" alt="${companyName}" style="max-height:48px;max-width:200px;" />`
            : `<span style="font-size:24px;font-weight:700;color:#ffffff;">${companyName}</span>`
          }
        </td></tr>
        <tr><td style="padding:40px;">
          <h1 style="margin:0 0 8px;font-size:22px;color:#1a1a1a;">${heading}</h1>
          <p style="margin:0 0 28px;font-size:15px;color:#535862;line-height:1.6;">${body}</p>
          <p style="margin:0 0 28px;font-size:15px;color:#535862;line-height:1.6;">
            It only takes a few minutes. Your information is kept private and secure.
          </p>
          <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:16px;">
            <tr><td align="center">
              <a href="${onboardingUrl}" style="display:inline-block;background:${primaryColor};color:#ffffff;font-size:15px;font-weight:600;text-decoration:none;padding:14px 32px;border-radius:8px;">
                ${buttonText}
              </a>
            </td></tr>
          </table>
          <p style="margin:0;font-size:13px;color:#9b9da2;line-height:1.5;text-align:center;">
            If the button doesn't work, copy and paste this link into your browser:<br/>
            <a href="${onboardingUrl}" style="color:${primaryColor};word-break:break-all;">${onboardingUrl}</a>
          </p>
        </td></tr>
        <tr><td style="padding:20px 40px;border-top:1px solid #e9eaeb;text-align:center;">
          <p style="margin:0;font-size:12px;color:#9b9da2;">Sent by ${companyName} via PropPath</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

function buildAgentNotificationHtml(opts: {
  companyName: string;
  logoUrl: string | null;
  primaryColor: string;
  clientName: string;
  clientEmail: string;
  isUpdate: boolean;
  formData?: RequestBody['formData'];
}) {
  const { companyName, logoUrl, primaryColor, clientName, clientEmail, isUpdate, formData } = opts;
  const formLabel = isUpdate ? 'Client Details Update' : 'Client Details Form';

  const fmt = (v?: number) => v != null
    ? new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD', maximumFractionDigits: 0 }).format(v)
    : '-';

  const row = (label: string, value: string) =>
    `<tr><td style="padding:6px 0;color:#717680;font-size:14px;">${label}</td><td style="padding:6px 0;text-align:right;font-weight:600;font-size:14px;">${value}</td></tr>`;

  const detailsTable = formData ? `
          <table width="100%" cellpadding="0" cellspacing="0" style="background:#f9fafb;border:1px solid #e9eaeb;border-radius:8px;margin-bottom:28px;">
            <tr><td style="padding:20px;">
              <table width="100%" cellpadding="0" cellspacing="0">
                ${row('Available Deposit', fmt(formData.depositPool))}
                ${row('Borrowing Capacity', fmt(formData.borrowingCapacity))}
                ${row('Annual Savings', fmt(formData.annualSavings))}
                ${row('Existing Portfolio Value', fmt(formData.portfolioValue))}
                ${row('Current Debt', fmt(formData.currentDebt))}
                ${row('Timeline', `${formData.timelineYears ?? '-'} years`)}
                ${row('Equity Goal', fmt(formData.equityGoal))}
                ${row('Cashflow Goal', fmt(formData.cashflowGoal))}
              </table>
            </td></tr>
          </table>` : '';

  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#f7f7f8;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f7f7f8;padding:40px 20px;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;">
        <tr><td style="background:${primaryColor};padding:32px 40px;text-align:center;">
          ${logoUrl
            ? `<img src="${logoUrl}" alt="${companyName}" style="max-height:48px;max-width:200px;" />`
            : `<span style="font-size:24px;font-weight:700;color:#ffffff;">${companyName}</span>`
          }
        </td></tr>
        <tr><td style="padding:40px;">
          <h1 style="margin:0 0 8px;font-size:22px;color:#1a1a1a;">Client details received</h1>
          <p style="margin:0 0 28px;font-size:15px;color:#535862;line-height:1.6;">
            <strong>${clientName}</strong> (${clientEmail}) has completed their <strong>${formLabel}</strong>. Here are the details they submitted:
          </p>
          ${detailsTable}
          <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:16px;">
            <tr><td align="center">
              <a href="https://www.proppath.app/clients" style="display:inline-block;background:${primaryColor};color:#ffffff;font-size:15px;font-weight:600;text-decoration:none;padding:14px 32px;border-radius:8px;">
                View in PropPath
              </a>
            </td></tr>
          </table>
        </td></tr>
        <tr><td style="padding:20px 40px;border-top:1px solid #e9eaeb;text-align:center;">
          <p style="margin:0;font-size:12px;color:#9b9da2;">Sent by ${companyName}</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}
