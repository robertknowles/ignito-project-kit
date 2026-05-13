import { useMemo } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  ReferenceLine, CartesianGrid,
} from 'recharts';
import { CompanyWithContacts, isContactActive } from '@/lib/crmHelpers';

interface Props {
  companies: CompanyWithContacts[];
}

// Get the Monday of the week for a given date
function getWeekStart(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function weekLabel(date: Date): string {
  const month = date.toLocaleDateString('en-AU', { month: 'short' });
  const weekOfMonth = Math.ceil(date.getDate() / 7);
  return `W${weekOfMonth} ${month}`;
}

// Generate all weeks from a start date to now
function generateWeeks(startDate: Date): Date[] {
  const weeks: Date[] = [];
  const now = new Date();
  let current = getWeekStart(startDate);
  while (current <= now) {
    weeks.push(new Date(current));
    current.setDate(current.getDate() + 7);
  }
  return weeks;
}

function bucketByWeek(timestamps: (string | null)[], weeks: Date[]): Map<string, number> {
  const counts = new Map<string, number>();
  for (const w of weeks) counts.set(weekLabel(w), 0);

  for (const ts of timestamps) {
    if (!ts) continue;
    const d = new Date(ts);
    const ws = getWeekStart(d);
    const label = weekLabel(ws);
    if (counts.has(label)) {
      counts.set(label, (counts.get(label) ?? 0) + 1);
    }
  }
  return counts;
}

export function CrmMetrics({ companies }: Props) {
  const data = useMemo(() => {
    // Start from W2 May 2026 (May 5)
    const startDate = new Date(2026, 4, 5);
    const weeks = generateWeeks(startDate);

    const allContacts = companies.flatMap(c =>
      c.contacts.map(contact => ({
        ...contact,
        relevanceTier: c.relevance_tier,
      }))
    );

    // Only high/medium for outreach metrics
    const hmContacts = allContacts.filter(c => c.relevanceTier === 'high' || c.relevanceTier === 'medium');

    // 1. Outreach: connection_sent_at timestamps from high/medium
    const outreachTimestamps = hmContacts
      .filter(c => c.connection_sent_at)
      .map(c => c.connection_sent_at);
    const outreachByWeek = bucketByWeek(outreachTimestamps, weeks);

    // 2. Connected: contacts that reached 'connected' or beyond (use last_touch_at as proxy for connected contacts)
    // We look for contacts with status beyond connection_sent
    const connectedStatuses = ['connected', 'video_sent', 'replied', 'demo_booked', 'beta_tester'];
    const connectedTimestamps = hmContacts
      .filter(c => connectedStatuses.includes(c.status) && c.last_touch_at)
      .map(c => c.last_touch_at);
    const connectedByWeek = bucketByWeek(connectedTimestamps, weeks);

    // 3. Demos booked: demo_booked contacts
    const demoTimestamps = allContacts
      .filter(c => c.status === 'demo_booked' && c.last_touch_at)
      .map(c => c.last_touch_at);
    const demosByWeek = bucketByWeek(demoTimestamps, weeks);

    // 4. Videos sent: video_sent_at timestamps
    const videoTimestamps = allContacts
      .filter(c => c.video_sent_at)
      .map(c => c.video_sent_at);
    const videosByWeek = bucketByWeek(videoTimestamps, weeks);

    // Build chart data
    const weekLabels = weeks.map(w => weekLabel(w));
    return weekLabels.map(label => ({
      week: label,
      outreach: outreachByWeek.get(label) ?? 0,
      connected: connectedByWeek.get(label) ?? 0,
      demos: demosByWeek.get(label) ?? 0,
      videosSent: videosByWeek.get(label) ?? 0,
    }));
  }, [companies]);

  // Summary totals
  const totalOutreach = data.reduce((s, d) => s + d.outreach, 0);
  const totalConnected = data.reduce((s, d) => s + d.connected, 0);
  const totalDemos = data.reduce((s, d) => s + d.demos, 0);
  const totalVideos = data.reduce((s, d) => s + d.videosSent, 0);

  return (
    <div className="flex flex-col gap-4">
      {/* Summary cards */}
      <div className="flex gap-3">
        <SummaryCard label="Total outreach" value={totalOutreach} sublabel="High/Med" />
        <SummaryCard label="Connected" value={totalConnected} sublabel="High/Med" />
        <SummaryCard label="Demos booked" value={totalDemos} sublabel="All tiers" />
        <SummaryCard label="Videos sent" value={totalVideos} sublabel="All tiers" />
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-2 gap-3">
        <ChartCard title="Outreach per week (High/Med)" goal={20}>
          <MiniBar data={data} dataKey="outreach" color="#60a5fa" goal={20} />
        </ChartCard>
        <ChartCard title="Connected per week (High/Med)" goal={10}>
          <MiniBar data={data} dataKey="connected" color="#34d399" goal={10} />
        </ChartCard>
        <ChartCard title="Demos booked per week" goal={5}>
          <MiniBar data={data} dataKey="demos" color="#fbbf24" goal={5} />
        </ChartCard>
        <ChartCard title="Videos sent per week" goal={10}>
          <MiniBar data={data} dataKey="videosSent" color="#a78bfa" goal={10} />
        </ChartCard>
      </div>
    </div>
  );
}

function SummaryCard({ label, value, sublabel }: { label: string; value: number; sublabel: string }) {
  return (
    <div className="bg-card border border-border rounded-md px-4 py-3 flex-1">
      <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{label}</p>
      <p className="text-xl font-bold text-foreground mt-0.5">{value}</p>
      <p className="text-[10px] text-muted-foreground">{sublabel}</p>
    </div>
  );
}

function ChartCard({ title, goal, children }: { title: string; goal: number | null; children: React.ReactNode }) {
  return (
    <div className="bg-card border border-border rounded-md px-4 py-3">
      <div className="flex items-center justify-between mb-2">
        <p className="text-[11px] text-muted-foreground">{title}</p>
        {goal !== null && (
          <span className="text-[10px] text-muted-foreground/60">Goal: {goal}/wk</span>
        )}
      </div>
      {children}
    </div>
  );
}

function MiniBar({ data, dataKey, color, goal }: { data: any[]; dataKey: string; color: string; goal?: number }) {
  return (
    <ResponsiveContainer width="100%" height={120}>
      <BarChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
        <XAxis
          dataKey="week"
          tick={{ fontSize: 9, fill: '#737373' }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          tick={{ fontSize: 9, fill: '#737373' }}
          axisLine={false}
          tickLine={false}
          allowDecimals={false}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: '#262626',
            border: '1px solid #2e2e2e',
            borderRadius: 6,
            fontSize: 11,
            fontFamily: 'JetBrains Mono, monospace',
          }}
          labelStyle={{ color: '#737373', fontSize: 10 }}
          itemStyle={{ color: '#cccccc' }}
        />
        {goal != null && (
          <ReferenceLine
            y={goal}
            stroke="#ef4444"
            strokeDasharray="6 3"
            strokeWidth={1.5}
            label={{
              value: `Goal: ${goal}`,
              position: 'right',
              fontSize: 9,
              fill: '#ef4444',
              fontFamily: 'JetBrains Mono, monospace',
            }}
          />
        )}
        <Bar dataKey={dataKey} fill={color} radius={[2, 2, 0, 0]} maxBarSize={24} />
      </BarChart>
    </ResponsiveContainer>
  );
}
