/**
 * Targeted verification for the commercial-transition fix.
 * Reproduces the screenshot scenario (≤$1M capacity, $200k deposit, 10yr,
 * $3M equity goal) and confirms the plan now contains commercial phase-2
 * properties instead of silently falling back to all-residential.
 */

const SUPABASE_URL = 'https://gaoqzrdzihmrwipwsbwo.supabase.co';
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imdhb3F6cmR6aWhtcndpcHdzYndvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg5MTk2MDQsImV4cCI6MjA3NDQ5NTYwNH0.PcoSky4H-rC3D7FqpNHUrVGeqTx52cfmRawqm1DBxsM';
const ENDPOINT = `${SUPABASE_URL}/functions/v1/nl-parse`;

async function call(body) {
  const resp = await fetch(ENDPOINT, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${ANON_KEY}`,
      'apikey': ANON_KEY,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(45000),
  });
  const text = await resp.text();
  try { return { status: resp.status, json: JSON.parse(text) }; }
  catch { return { status: resp.status, json: null, raw: text.slice(0, 800) }; }
}

const BRIEF =
  'Sam and Alex, both earning 75k, 200k deposit, saving 3000 a month, ' +
  'borrowing capacity 1m. They want to build equity in residential first then ' +
  'transition into commercial property for income. 3m equity goal over 10 years.';

const SCENARIOS = [
  {
    name: 'A. Explicit commercial-transition preset (low capacity)',
    body: { message: BRIEF, conversationHistory: [], currentPlan: null,
            strategyPreset: 'commercial-transition', planningDefaults: null },
  },
  {
    name: 'B. Inference from company strategy text (no preset hint)',
    body: { message: BRIEF, conversationHistory: [], currentPlan: null,
            strategyPreset: 'eg-low', planningDefaults: null,
            strategyProfileText: 'We build clients into commercial assets: a few residential growth purchases early to build equity, then transition the portfolio into commercial property for yield in the second half of the plan.' },
  },
];

function summarise(props) {
  return (props ?? []).map(p =>
    `  • ${p.type} (mode=${p.mode ?? '?'}) $${(p.purchasePrice ?? 0).toLocaleString()} @ period ${p.targetPeriod ?? p.period ?? '?'} ${p.lvr ?? '?'}% LVR`
  ).join('\n');
}

const run = async () => {
  for (const s of SCENARIOS) {
    console.log(`\n=== ${s.name} ===`);
    const { status, json, raw } = await call(s.body);
    if (!json) { console.log(`  HTTP ${status} — non-JSON: ${raw}`); continue; }
    const props = json.properties ?? [];
    const commercial = props.filter(p => (p.type ?? '').includes('commercial'));
    console.log(`  HTTP ${status} | type=${json.type} | strategyPreset=${json.strategyPreset}`);
    console.log(`  properties (${props.length}):\n${summarise(props)}`);
    const presetOK = json.strategyPreset === 'commercial-transition';
    const commercialOK = commercial.length >= 1;
    console.log(`  → preset == commercial-transition? ${presetOK ? 'PASS' : 'FAIL'}`);
    console.log(`  → has >=1 commercial phase-2 property? ${commercialOK ? 'PASS' : 'FAIL'} (${commercial.length} commercial)`);
    if (json.missingInputs?.length) console.log(`  missingInputs: ${json.missingInputs.join(', ')}`);
  }
};

run().catch(e => { console.error(e); process.exit(1); });
