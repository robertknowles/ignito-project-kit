const CHANNELS = [
  'LinkedIn outreach\n(connection + InMail)',
  'Email outreach',
  'Instagram DMs',
  'TikTok DMs',
  'Mortgage broker\nreferrals',
  'Buyers agent\nreferrals',
];

const CX = 300;
const CY = 200;
const RADIUS = 150;

export function FutureChannelsMindmap() {
  const nodes = CHANNELS.map((label, i) => {
    const angle = (Math.PI * 2 * i) / CHANNELS.length - Math.PI / 2;
    return {
      label,
      x: CX + RADIUS * Math.cos(angle),
      y: CY + RADIUS * Math.sin(angle),
    };
  });

  return (
    <svg viewBox="0 0 600 400" className="w-full max-w-2xl mx-auto">
      {nodes.map((node, i) => (
        <line
          key={`line-${i}`}
          x1={CX}
          y1={CY}
          x2={node.x}
          y2={node.y}
          stroke="currentColor"
          strokeOpacity={0.15}
          strokeWidth={1.5}
        />
      ))}

      <circle cx={CX} cy={CY} r={44} fill="currentColor" fillOpacity={0.08} stroke="currentColor" strokeOpacity={0.2} strokeWidth={1} />
      <text x={CX} y={CY - 6} textAnchor="middle" fill="currentColor" fontSize={11} fontWeight={600}>PropPath</text>
      <text x={CX} y={CY + 8} textAnchor="middle" fill="currentColor" fontSize={11} fontWeight={600}>outreach</text>

      {nodes.map((node, i) => (
        <g key={`node-${i}`}>
          <rect
            x={node.x - 60}
            y={node.y - 20}
            width={120}
            height={40}
            rx={6}
            fill="hsl(var(--card))"
            stroke="currentColor"
            strokeOpacity={0.2}
            strokeWidth={1}
          />
          {node.label.split('\n').map((line, j, arr) => (
            <text
              key={j}
              x={node.x}
              y={node.y + (j - (arr.length - 1) / 2) * 13}
              textAnchor="middle"
              dominantBaseline="central"
              fill="currentColor"
              fillOpacity={0.6}
              fontSize={10}
            >
              {line}
            </text>
          ))}
        </g>
      ))}
    </svg>
  );
}
