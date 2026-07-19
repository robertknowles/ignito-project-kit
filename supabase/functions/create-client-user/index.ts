/**
 * create-client-user — admin-confirmed user creation for the
 * dashboard-share invite flow.
 *
 * Background: agents share read-only dashboard access with their clients
 * by creating a Supabase auth user on the client's behalf and handing
 * them temp credentials. We can't use `supabase.auth.signUp` from the
 * browser because it sends a confirmation email and leaves the user
 * un-confirmed — the client logs in with the temp password and hits
 * "Email not confirmed". The agent has already vouched for the client
 * by manually creating the account, so confirmation should be implicit.
 *
 * This function uses the service-role key (server-side only) and
 * `auth.admin.createUser({ email_confirm: true })` so the account is
 * usable immediately. It also writes the matching row in `users` and
 * links the client to the scenario via `client_user_id`.
 *
 * Auth: requires the caller to be an authenticated owner/agent (verified
 * via the user's JWT). Service-role key never leaves the server.
 */
import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface RequestBody {
  email: string;
  password: string;
  clientId: number;
  companyId: string | null;
  scenarioId?: number;
}

interface ResponseBody {
  ok: boolean;
  userId?: string;
  alreadyExisted?: boolean;
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
    if (!supabaseUrl || !serviceRoleKey || !anonKey) {
      return json({ ok: false, error: 'Server misconfigured (missing Supabase env vars).' }, 500);
    }

    // Verify the caller is an authenticated agent/owner using their JWT.
    // We don't grant the function to client users — only owners/agents
    // can invite clients to view dashboards.
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
    if (!body.email || !body.password || !body.clientId) {
      return json({ ok: false, error: 'email, password and clientId are required.' }, 400);
    }

    // Service-role client for admin operations.
    const admin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // Try to create the user with auto-confirmation.
    let userId: string | undefined;
    let alreadyExisted = false;
    const { data: created, error: createError } = await admin.auth.admin.createUser({
      email: body.email,
      password: body.password,
      email_confirm: true,
      user_metadata: {
        role: 'client',
        client_id: body.clientId,
        // company_id must be present here: the handle_new_user DB trigger reads
        // it from raw_user_meta_data to populate profiles.company_id. Without it
        // the client's profile has a NULL company, BrandingContext never loads
        // the firm's name/logo/colour, and the portal shows the default
        // "My Company" branding (2026-07-19).
        company_id: body.companyId,
      },
    });

    if (createError) {
      // Common case: the email is already in use. We don't know the existing
      // user's password, so we can't return a usable temp password — we just
      // surface the situation back to the caller so the UI can adapt.
      const msg = createError.message?.toLowerCase() ?? '';
      if (msg.includes('already') && (msg.includes('registered') || msg.includes('exists'))) {
        // Look up the existing user id by email so we can still link them
        // to the scenario (the agent can use 'forgot password' to reset).
        const { data: list } = await admin.auth.admin.listUsers();
        const existing = list?.users?.find((u) => u.email?.toLowerCase() === body.email.toLowerCase());
        if (existing) {
          // Guard: only reuse the account if it is actually a CLIENT login.
          // An owner/agent (or legacy account with no profile row) must never
          // be wired up as a portal client — that emails a staff magic link
          // and would link the scenario to a staff user id. This is exactly
          // what happened when an owner entered their own email (2026-07-18).
          const { data: existingProfile } = await admin
            .from('profiles')
            .select('role')
            .eq('id', existing.id)
            .maybeSingle();
          if (existingProfile?.role !== 'client') {
            return json({
              ok: false,
              error: 'That email belongs to a PropPath owner/agent login. Enter the client\'s own email address instead.',
            }, 400);
          }
          userId = existing.id;
          alreadyExisted = true;
          // Re-invited existing client: their profile may predate the
          // company_id-in-metadata fix and have a NULL company. Link it now so
          // branding resolves. Only fills a null - never overwrites an existing
          // company link.
          if (body.companyId) {
            const { error: profileLinkErr } = await admin
              .from('profiles')
              .update({ company_id: body.companyId })
              .eq('id', existing.id)
              .is('company_id', null);
            if (profileLinkErr) {
              console.warn('[create-client-user] profile company link failed:', profileLinkErr.message);
            }
          }
        } else {
          return json({ ok: false, error: 'Email already registered but user record not found.' }, 500);
        }
      } else {
        return json({ ok: false, error: createError.message }, 500);
      }
    } else {
      userId = created?.user?.id;
    }

    if (!userId) {
      return json({ ok: false, error: 'Failed to obtain a user id.' }, 500);
    }

    // Mirror into the public `users` table (RLS-readable record).
    if (!alreadyExisted) {
      const { error: usersErr } = await admin
        .from('users')
        .insert({
          id: userId,
          email: body.email,
          role: 'client',
          company_id: body.companyId,
        });
      if (usersErr) {
        // Not fatal — the auth user exists; just log it back to the caller.
        console.warn('[create-client-user] users insert failed:', usersErr.message);
      }
    }

    // Link the client_user_id on the scenario row, if one was supplied.
    // Null-guard so a concurrent invite can't overwrite an existing link
    // with a different user.
    if (body.scenarioId) {
      const { error: linkErr } = await admin
        .from('scenarios')
        .update({ client_user_id: userId })
        .eq('id', body.scenarioId)
        .is('client_user_id', null);
      if (linkErr) {
        console.warn('[create-client-user] scenario link failed:', linkErr.message);
      }
    }

    return json({ ok: true, userId, alreadyExisted } satisfies ResponseBody);
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
