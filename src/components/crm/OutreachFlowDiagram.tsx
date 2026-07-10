/**
 * Visualises the PropPath outreach flow with all branches.
 *
 * Drop into any page inside the dark CRM admin area - scales responsively
 * via SVG viewBox, designed for ~720px content width but works down to
 * ~480px before labels get cramped. No external dependencies.
 *
 * Colour palette is hand-tuned for the dark theme used in /admin/crm:
 * - Indigo tint = "our action" (most touches)
 * - Zinc tint  = "decision / wait / end" (forks and the Dead state)
 * - Emerald tint = "success exit" (Conversation mode)
 *
 * Content source of truth: OUTREACH-PLAYBOOK.md at the repo root.
 */
export default function OutreachFlowDiagram() {
  // Colour tokens
  const action = {
    fill: "rgba(99, 102, 241, 0.12)",
    stroke: "rgba(129, 140, 248, 0.4)",
    title: "#c7d2fe",
    subtitle: "#a5b4fc",
  };
  const decision = {
    fill: "rgba(82, 82, 91, 0.4)",
    stroke: "rgba(113, 113, 122, 0.5)",
    title: "#e4e4e7",
    subtitle: "#a1a1aa",
  };
  const success = {
    fill: "rgba(16, 185, 129, 0.12)",
    stroke: "rgba(52, 211, 153, 0.4)",
    title: "#a7f3d0",
    subtitle: "#6ee7b7",
  };
  const connector = "#71717a";
  const label = "#a1a1aa";

  return (
    <svg
      viewBox="0 0 720 820"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label="PropPath outreach flow with all branches"
      className="w-full h-auto"
    >
      <defs>
        <marker
          id="op-arrow"
          viewBox="0 0 10 10"
          refX="9"
          refY="5"
          markerWidth="6"
          markerHeight="6"
          orient="auto-start-reverse"
        >
          <path d="M 0 0 L 10 5 L 0 10 z" fill={connector} />
        </marker>
      </defs>

      {/* Legend */}
      <g transform="translate(20, 15)">
        <rect x="0" y="0" width="12" height="12" rx="2" fill={action.fill} stroke={action.stroke} />
        <text x="18" y="10" fill={label} fontSize="11">Our action</text>
        <rect x="115" y="0" width="12" height="12" rx="2" fill={decision.fill} stroke={decision.stroke} />
        <text x="133" y="10" fill={label} fontSize="11">Decision / wait / end</text>
        <rect x="295" y="0" width="12" height="12" rx="2" fill={success.fill} stroke={success.stroke} />
        <text x="313" y="10" fill={label} fontSize="11">Success exit</text>
      </g>

      {/* Day 0 - Blank LinkedIn request */}
      <g>
        <rect x="220" y="55" width="280" height="48" rx="6" fill={action.fill} stroke={action.stroke} />
        <text x="360" y="76" textAnchor="middle" fontSize="13" fontWeight="500" fill={action.title}>
          Day 0 · Blank LinkedIn request
        </text>
        <text x="360" y="93" textAnchor="middle" fontSize="11" fill={action.subtitle}>
          No message body
        </text>
      </g>
      <path d="M 360 103 L 360 130" stroke={connector} strokeWidth="1.5" markerEnd="url(#op-arrow)" fill="none" />

      {/* Day 1–10 - Accepted? */}
      <g>
        <rect x="260" y="135" width="200" height="48" rx="6" fill={decision.fill} stroke={decision.stroke} />
        <text x="360" y="156" textAnchor="middle" fontSize="13" fontWeight="500" fill={decision.title}>
          Day 1–10 · Accepted?
        </text>
        <text x="360" y="173" textAnchor="middle" fontSize="11" fill={decision.subtitle}>
          Wait, don't bump
        </text>
      </g>
      <path d="M 290 183 L 145 195" stroke={connector} strokeWidth="1.5" markerEnd="url(#op-arrow)" fill="none" />
      <text x="195" y="195" fontSize="11" fill={label}>No</text>
      <path d="M 360 183 L 360 260" stroke={connector} strokeWidth="1.5" markerEnd="url(#op-arrow)" fill="none" />
      <text x="368" y="225" fontSize="11" fill={label}>Yes</text>

      {/* InMail - Day 10 fallback */}
      <g>
        <rect x="20" y="200" width="220" height="48" rx="6" fill={action.fill} stroke={action.stroke} />
        <text x="130" y="221" textAnchor="middle" fontSize="13" fontWeight="500" fill={action.title}>
          InMail · Day 10 fallback
        </text>
        <text x="130" y="238" textAnchor="middle" fontSize="11" fill={action.subtitle}>
          Same content as Day +1 DM
        </text>
      </g>
      <path d="M 130 248 L 240 280" stroke={connector} strokeWidth="1.5" markerEnd="url(#op-arrow)" fill="none" />

      {/* Day +1 - Video + DM */}
      <g>
        <rect x="220" y="265" width="280" height="48" rx="6" fill={action.fill} stroke={action.stroke} />
        <text x="360" y="286" textAnchor="middle" fontSize="13" fontWeight="500" fill={action.title}>
          Day +1 · Video + DM
        </text>
        <text x="360" y="303" textAnchor="middle" fontSize="11" fill={action.subtitle}>
          "Built something you'd find useful · 90 sec"
        </text>
      </g>
      <path d="M 360 313 L 360 330" stroke={connector} strokeWidth="1.5" markerEnd="url(#op-arrow)" fill="none" />

      {/* Day +4 - Replied? */}
      <g>
        <rect x="260" y="335" width="200" height="48" rx="6" fill={decision.fill} stroke={decision.stroke} />
        <text x="360" y="356" textAnchor="middle" fontSize="13" fontWeight="500" fill={decision.title}>
          Day +4 · Replied?
        </text>
        <text x="360" y="373" textAnchor="middle" fontSize="11" fill={decision.subtitle}>
          Reply state only
        </text>
      </g>
      <path d="M 360 383 L 360 400" stroke={connector} strokeWidth="1.5" markerEnd="url(#op-arrow)" fill="none" />
      <text x="335" y="395" fontSize="11" fill={label}>No</text>
      <path d="M 460 359 L 550 395" stroke={connector} strokeWidth="1.5" markerEnd="url(#op-arrow)" fill="none" />
      <text x="475" y="378" fontSize="11" fill={label}>Yes</text>

      {/* Soft nudge */}
      <g>
        <rect x="80" y="405" width="280" height="48" rx="6" fill={action.fill} stroke={action.stroke} />
        <text x="220" y="426" textAnchor="middle" fontSize="13" fontWeight="500" fill={action.title}>
          Soft nudge
        </text>
        <text x="220" y="443" textAnchor="middle" fontSize="11" fill={action.subtitle}>
          "Mess around on a real client? Login offer"
        </text>
      </g>

      {/* Conversation mode (Day +4 exit) */}
      <g>
        <rect x="420" y="405" width="260" height="48" rx="6" fill={success.fill} stroke={success.stroke} />
        <text x="550" y="426" textAnchor="middle" fontSize="13" fontWeight="500" fill={success.title}>
          → Conversation mode
        </text>
        <text x="550" y="443" textAnchor="middle" fontSize="11" fill={success.subtitle}>
          Exit pipeline · their questions
        </text>
      </g>
      <path d="M 220 453 L 320 470" stroke={connector} strokeWidth="1.5" markerEnd="url(#op-arrow)" fill="none" />

      {/* Day +14 - Replied? */}
      <g>
        <rect x="260" y="475" width="200" height="48" rx="6" fill={decision.fill} stroke={decision.stroke} />
        <text x="360" y="496" textAnchor="middle" fontSize="13" fontWeight="500" fill={decision.title}>
          Day +14 · Replied?
        </text>
        <text x="360" y="513" textAnchor="middle" fontSize="11" fill={decision.subtitle}>
          Reply state only
        </text>
      </g>
      <path d="M 360 523 L 360 540" stroke={connector} strokeWidth="1.5" markerEnd="url(#op-arrow)" fill="none" />
      <text x="335" y="535" fontSize="11" fill={label}>No</text>
      <path d="M 460 499 L 550 535" stroke={connector} strokeWidth="1.5" markerEnd="url(#op-arrow)" fill="none" />
      <text x="475" y="518" fontSize="11" fill={label}>Yes</text>

      {/* Day +14 - Remodel hook (Option B) */}
      <g>
        <rect x="80" y="545" width="280" height="48" rx="6" fill={action.fill} stroke={action.stroke} />
        <text x="220" y="566" textAnchor="middle" fontSize="13" fontWeight="500" fill={action.title}>
          Day +14 · Remodel hook (Option B)
        </text>
        <text x="220" y="583" textAnchor="middle" fontSize="11" fill={action.subtitle}>
          "Remodel all clients in &lt;1 min for new landscape"
        </text>
      </g>

      {/* Conversation mode (Day +14 exit) */}
      <g>
        <rect x="420" y="545" width="260" height="48" rx="6" fill={success.fill} stroke={success.stroke} />
        <text x="550" y="566" textAnchor="middle" fontSize="13" fontWeight="500" fill={success.title}>
          → Conversation mode
        </text>
        <text x="550" y="583" textAnchor="middle" fontSize="11" fill={success.subtitle}>
          Exit pipeline · their questions
        </text>
      </g>
      <path d="M 220 593 L 320 610" stroke={connector} strokeWidth="1.5" markerEnd="url(#op-arrow)" fill="none" />

      {/* Day +28 - Email */}
      <g>
        <rect x="220" y="615" width="280" height="48" rx="6" fill={action.fill} stroke={action.stroke} />
        <text x="360" y="636" textAnchor="middle" fontSize="13" fontWeight="500" fill={action.title}>
          Day +28 · Email
        </text>
        <text x="360" y="653" textAnchor="middle" fontSize="11" fill={action.subtitle}>
          Channel switch · case study or bridge
        </text>
      </g>
      <path d="M 360 663 L 360 680" stroke={connector} strokeWidth="1.5" markerEnd="url(#op-arrow)" fill="none" />

      {/* Day +30 - Dead */}
      <g>
        <rect x="260" y="685" width="200" height="48" rx="6" fill={decision.fill} stroke={decision.stroke} />
        <text x="360" y="706" textAnchor="middle" fontSize="13" fontWeight="500" fill={decision.title}>
          Day +30 · Dead
        </text>
        <text x="360" y="723" textAnchor="middle" fontSize="11" fill={decision.subtitle}>
          Stop. Reputation cost &gt; pipeline cost
        </text>
      </g>
      <path
        d="M 360 733 L 360 748"
        stroke={connector}
        strokeWidth="1.5"
        strokeDasharray="3,3"
        markerEnd="url(#op-arrow)"
        fill="none"
      />

      {/* Day +120 - Optional re-engage */}
      <g opacity="0.7">
        <rect x="200" y="755" width="320" height="48" rx="6" fill={decision.fill} stroke={decision.stroke} />
        <text x="360" y="776" textAnchor="middle" fontSize="13" fontWeight="500" fill={decision.title}>
          Day +120 · Optional re-engage
        </text>
        <text x="360" y="793" textAnchor="middle" fontSize="11" fill={decision.subtitle}>
          Only with a genuinely new reason
        </text>
      </g>
    </svg>
  );
}
