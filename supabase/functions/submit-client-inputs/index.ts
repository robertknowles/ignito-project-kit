/**
 * submit-client-inputs — a portal client submits an update to a small set of
 * their own figures (base salary, annual savings).
 *
 * Product model: the AI roadmap is a point-in-time generation and is NOT
 * auto-recomputed when a client changes their inputs. Instead we capture the
 * requested values and notify the BA so they can regenerate. This function runs
 * with the service-role key (clients can't UPDATE scenarios/clients directly
 * under RLS) and, scoped strictly to the caller's own linked scenario:
 *   1. stores the requested values under data.client_requested_inputs,
 *   2. stamps clients.pending_client_update_at + a human-readable note,
 *   3. writes an activity_log row so the change is auditable.
 * The client's visible plan is left untouched.
 */
import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface Change {
  field: string;
  label: string;
  oldValue: number;
  newValue: number;
}

interface RequestBody {
  changes: Change[];
}

interface ResponseBody {
  ok: boolean;
  error?: string;
}

const fmtAud = (n: number) =>
  `$${Math.round(n).toLocaleString('en-AU')}`;

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
    if (!Array.isArray(body.changes) || body.changes.length === 0) {
      return json({ ok: false, error: 'changes must be a non-empty array.' }, 400);
    }

    const admin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // Find the scenario linked to THIS client user. Scope strictly by
    // client_user_id so the caller can only ever reach their own row.
    const { data: scenario, error: fetchError } = await admin
      .from('scenarios')
      .select('id, data, client_id')
      .eq('client_user_id', callerId)
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (fetchError) throw fetchError;
    if (!scenario) {
      return json({ ok: false, error: 'No portal scenario found for this user.' }, 404);
    }

    const now = new Date().toISOString();

    // 1) Persist the requested values alongside the plan (does not alter the
    //    plan the client sees — the BA reads this when regenerating).
    const existingData = (scenario.data ?? {}) as Record<string, unknown>;
    const mergedData = {
      ...existingData,
      client_requested_inputs: { changes: body.changes, submittedAt: now },
    };
    const { error: updateError } = await admin
      .from('scenarios')
      .update({ data: mergedData, updated_at: now })
      .eq('id', scenario.id)
      .eq('client_user_id', callerId);
    if (updateError) throw updateError;

    // Look up the client record for company_id + to stamp the review flag.
    let companyId: string | null = null;
    if (scenario.client_id) {
      const { data: clientRow } = await admin
        .from('clients')
        .select('company_id')
        .eq('id', scenario.client_id)
        .maybeSingle();
      companyId = clientRow?.company_id ?? null;

      // 2) Stamp the "needs review" signal for the BA client list.
      const note = body.changes
        .map((c) => `${c.label} ${fmtAud(c.oldValue)} → ${fmtAud(c.newValue)}`)
        .join('; ');
      await admin
        .from('clients')
        .update({ pending_client_update_at: now, pending_client_update_note: note })
        .eq('id', scenario.client_id);
    }

    // 3) Audit log so the change is recorded in the BA activity feed.
    //    Best-effort: the scenario + review flag are already saved, so a schema
    //    constraint on event_type must not fail the whole request.
    const { error: logErr } = await admin.from('activity_log').insert({
      client_id: scenario.client_id ?? null,
      company_id: companyId,
      actor_id: callerId,
      event_type: 'client_inputs_updated',
      metadata: { changes: body.changes },
    });
    if (logErr) {
      console.warn('[submit-client-inputs] activity_log insert failed:', logErr.message);
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
