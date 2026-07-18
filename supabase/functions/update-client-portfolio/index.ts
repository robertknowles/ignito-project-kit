/**
 * update-client-portfolio - lets a signed-in client user update ONLY the
 * `existingProperties` slice of the scenario they're linked to.
 *
 * Clients get a read-only copy of their agent's plan; the one thing they may
 * change is their own current portfolio. RLS lets a client SELECT their linked
 * scenario but not UPDATE it (that would let them rewrite the whole plan). This
 * function runs with the service-role key and writes back only the
 * existingProperties key, scoped to the scenario where
 * client_user_id = the caller's own id - so a client can never touch another
 * client's data or any other part of the plan.
 */
import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface RequestBody {
  existingProperties: unknown[];
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
    if (!supabaseUrl || !serviceRoleKey || !anonKey) {
      return json({ ok: false, error: 'Server misconfigured (missing Supabase env vars).' }, 500);
    }

    // Identify the caller from their JWT.
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
    const callerId = callerData.user.id;

    const body = (await req.json()) as RequestBody;
    if (!Array.isArray(body.existingProperties)) {
      return json({ ok: false, error: 'existingProperties must be an array.' }, 400);
    }

    const admin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // Find the scenario linked to THIS client user. Scope strictly by
    // client_user_id so the caller can only ever reach their own row.
    const { data: scenario, error: fetchError } = await admin
      .from('scenarios')
      .select('id, data, version')
      .eq('client_user_id', callerId)
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (fetchError) throw fetchError;
    if (!scenario) {
      return json({ ok: false, error: 'No portal scenario found for this user.' }, 404);
    }

    // Merge only the existingProperties key; every other part of the plan is
    // preserved exactly as the agent left it.
    const existingData = (scenario.data ?? {}) as Record<string, unknown>;
    const mergedData = { ...existingData, existingProperties: body.existingProperties };

    const { error: updateError } = await admin
      .from('scenarios')
      .update({ data: mergedData, updated_at: new Date().toISOString() })
      .eq('id', scenario.id)
      .eq('client_user_id', callerId);
    if (updateError) throw updateError;

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
