export function PacingPanel() {
  return (
    <div className="bg-card border border-border rounded-lg p-5">
      <h3 className="text-sm font-medium text-foreground mb-4">Numbers & pacing</h3>
      <div className="grid grid-cols-2 gap-6">
        {/* Left column — funnel targets */}
        <div>
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-2">Funnel target</p>
          <table className="w-full text-xs">
            <tbody className="divide-y divide-border">
              <FunnelRow stage="LinkedIn invites sent" volume="~170" conversion="~70% reach video" />
              <FunnelRow stage="Video DMs delivered" volume="~120" conversion="15% reply rate" />
              <FunnelRow stage="Replies across cadence" volume="~18" conversion="50% to demo" />
              <FunnelRow stage="Demo / trial bookings" volume="~9" conversion="60% to beta" />
              <FunnelRow stage="Beta testers" volume="5" conversion="goal" highlight />
            </tbody>
          </table>
        </div>

        {/* Right column — weekly pacing */}
        <div>
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-2">Weekly pacing</p>
          <div className="space-y-2 text-xs">
            <PacingRow label="Week 1-2" value="25-30/wk" sublabel="Watch the funnel" />
            <PacingRow label="Week 3-4" value="40-50/wk" sublabel="Ramp if numbers hold" />
            <PacingRow label="Week 5+" value="40-50/wk" sublabel="Steady state" />
          </div>
          <p className="text-[10px] text-muted-foreground mt-4 pt-3 border-t border-border">
            Estimated timeline: 4-6 weeks of disciplined outreach.
          </p>
        </div>
      </div>
    </div>
  );
}

function FunnelRow({
  stage,
  volume,
  conversion,
  highlight,
}: {
  stage: string;
  volume: string;
  conversion: string;
  highlight?: boolean;
}) {
  return (
    <tr>
      <td className={`py-1.5 pr-3 ${highlight ? 'text-foreground font-medium' : 'text-muted-foreground'}`}>
        {stage}
      </td>
      <td className="py-1.5 pr-3 text-foreground font-mono text-right">{volume}</td>
      <td className="py-1.5 text-muted-foreground text-right">{conversion}</td>
    </tr>
  );
}

function PacingRow({ label, value, sublabel }: { label: string; value: string; sublabel: string }) {
  return (
    <div className="flex items-baseline justify-between">
      <span className="text-muted-foreground">{label}</span>
      <div className="text-right">
        <span className="text-foreground font-mono">{value}</span>
        <span className="text-muted-foreground/60 ml-2">{sublabel}</span>
      </div>
    </div>
  );
}
