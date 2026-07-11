import React from 'react';

/**
 * ReportShell - shared building blocks for the PDF exports.
 *
 * Everything here is styled with inline hex (mirroring ChartCard's approach)
 * rather than Tailwind utility classes. This keeps the rendered output an exact
 * match for the platform's Untitled UI look AND guarantees html2canvas can read
 * every colour (it can't parse CSS variables / oklch).
 *
 * Each report is a stack of <ReportPage> elements. Pages carry a
 * `data-report-page` attribute so reportPdf.ts can find and capture them.
 */

// ── UUI tokens (from src/constants/designTokens.ts) ──────────────────────────
export const RC = {
  neutral900: '#171717',
  neutral700: '#404040',
  neutral600: '#525252',
  neutral500: '#737373',
  neutral400: '#A3A3A3',
  neutral300: '#D4D4D4',
  neutral200: '#E5E5E5',
  neutral100: '#F5F5F5',
  neutral50: '#FAFAFA',
  white: '#FFFFFF',
  positive: '#067647',
  negative: '#D92D20',
} as const;

export const FONT =
  'Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';

// A4 at 96dpi ≈ 794 × 1123px. We render at this width so the capture maps
// cleanly onto an A4 PDF page.
export const PAGE_WIDTH = 794;
export const PAGE_MIN_HEIGHT = 1123;

// ── Formatting helpers ───────────────────────────────────────────────────────
export const fmtMoney = (value: number): string => {
  if (value === null || value === undefined || Number.isNaN(value)) return '–';
  const abs = Math.abs(value);
  const sign = value < 0 ? '-' : '';
  return `${sign}$${Math.round(abs).toLocaleString('en-AU')}`;
};

export const fmtCompact = (value: number): string => {
  if (value === null || value === undefined || Number.isNaN(value)) return '–';
  const abs = Math.abs(value);
  const sign = value < 0 ? '-' : '';
  if (abs >= 1_000_000) return `${sign}$${(Math.round((abs / 1_000_000) * 100) / 100)}M`;
  if (abs >= 1_000) return `${sign}$${Math.round(abs / 1_000)}k`;
  return `${sign}$${Math.round(abs)}`;
};

export const fmtPct = (value: number, decimals = 1): string => {
  if (value === null || value === undefined || Number.isNaN(value)) return '–';
  return `${value.toFixed(decimals)}%`;
};

export const fmtNum = (value: number): string => {
  if (value === null || value === undefined || Number.isNaN(value)) return '–';
  return Math.round(value).toLocaleString('en-AU');
};

// ── Branding / meta passed into every report ─────────────────────────────────
export interface ReportBranding {
  companyName: string;
  logoUrl: string | null;
  primaryColor: string;
}

export interface ReportMeta {
  /** e.g. "Portfolio Investment Summary" */
  title: string;
  /** e.g. "Mr & Mrs Smith" */
  clientName: string;
  /** Free-text descriptor under the client (optional) */
  subtitle?: string;
  branding: ReportBranding;
}

// ── Page wrapper with branded header + footer ────────────────────────────────
interface ReportPageProps {
  meta: ReportMeta;
  pageNumber: number;
  totalPages: number;
  /** Hides the big title block (used on continuation pages) */
  continuation?: boolean;
  children: React.ReactNode;
}

const todayLabel = (): string =>
  new Date().toLocaleDateString('en-AU', { day: '2-digit', month: 'short', year: 'numeric' });

export const ReportPage: React.FC<ReportPageProps> = ({
  meta,
  pageNumber,
  totalPages,
  continuation,
  children,
}) => {
  const { branding } = meta;
  return (
    <div
      data-report-page
      style={{
        width: PAGE_WIDTH,
        minHeight: PAGE_MIN_HEIGHT,
        background: RC.white,
        fontFamily: FONT,
        color: RC.neutral900,
        boxSizing: 'border-box',
        padding: '40px 44px 64px 44px',
        display: 'flex',
        flexDirection: 'column',
        position: 'relative',
      }}
    >
      {/* ── Header band ── */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingBottom: 16,
          borderBottom: `2px solid ${branding.primaryColor}`,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {branding.logoUrl ? (
            <img
              src={branding.logoUrl}
              alt=""
              crossOrigin="anonymous"
              style={{ height: 36, width: 'auto', objectFit: 'contain' }}
            />
          ) : (
            <div
              style={{
                height: 36,
                minWidth: 36,
                padding: '0 10px',
                borderRadius: 8,
                background: branding.primaryColor,
                color: RC.white,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 14,
                fontWeight: 700,
                letterSpacing: 0.3,
              }}
            >
              {(branding.companyName || 'Report').slice(0, 2).toUpperCase()}
            </div>
          )}
          <span style={{ fontSize: 15, fontWeight: 600, color: RC.neutral900 }}>
            {branding.companyName}
          </span>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: RC.neutral500, textTransform: 'uppercase', letterSpacing: 0.6 }}>
            {continuation ? meta.title : 'Prepared for'}
          </div>
          <div style={{ fontSize: 13, fontWeight: 600, color: RC.neutral700, marginTop: 2 }}>
            {continuation ? meta.clientName : todayLabel()}
          </div>
        </div>
      </div>

      {/* ── Title block (first page only) ── */}
      {!continuation && (
        <div style={{ marginTop: 22, marginBottom: 22 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: branding.primaryColor, textTransform: 'uppercase', letterSpacing: 0.8 }}>
            {meta.title}
          </div>
          <div style={{ fontSize: 26, fontWeight: 700, color: RC.neutral900, marginTop: 6, lineHeight: 1.2 }}>
            {meta.clientName}
          </div>
          {meta.subtitle && (
            <div style={{ fontSize: 13, color: RC.neutral500, marginTop: 4 }}>{meta.subtitle}</div>
          )}
        </div>
      )}

      {/* ── Body ── */}
      <div style={{ flex: 1, marginTop: continuation ? 22 : 0 }}>{children}</div>

      {/* ── Footer ── */}
      <div
        style={{
          position: 'absolute',
          left: 44,
          right: 44,
          bottom: 24,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingTop: 10,
          borderTop: `1px solid ${RC.neutral200}`,
          fontSize: 10,
          color: RC.neutral400,
        }}
      >
        <span>{branding.companyName} - generated {todayLabel()}</span>
        <span>Page {pageNumber} of {totalPages}</span>
      </div>
    </div>
  );
};

// ── Section card (mirrors ChartCard's two-layer shell) ───────────────────────
export const Section: React.FC<{ title?: string; children: React.ReactNode; style?: React.CSSProperties }> = ({
  title,
  children,
  style,
}) => (
  <div
    style={{
      background: RC.neutral50,
      borderRadius: 12,
      boxShadow: `${RC.neutral200} 0px 0px 0px 1px inset`,
      padding: 12,
      ...style,
    }}
  >
    {title && (
      <div style={{ fontSize: 13, fontWeight: 600, color: RC.neutral900, padding: '4px 8px 10px 8px' }}>
        {title}
      </div>
    )}
    <div
      style={{
        background: RC.white,
        borderRadius: 10,
        boxShadow: `${RC.neutral200} 0px 0px 0px 1px inset`,
        padding: 14,
      }}
    >
      {children}
    </div>
  </div>
);

// ── KPI stat tile ────────────────────────────────────────────────────────────
export const KpiStat: React.FC<{ label: string; value: string; accent?: string }> = ({
  label,
  value,
  accent,
}) => (
  <div
    style={{
      background: RC.white,
      borderRadius: 10,
      boxShadow: `${RC.neutral200} 0px 0px 0px 1px inset`,
      padding: '12px 14px',
    }}
  >
    <div style={{ fontSize: 11, color: RC.neutral500, fontWeight: 500 }}>{label}</div>
    <div style={{ fontSize: 20, fontWeight: 700, color: accent ?? RC.neutral900, marginTop: 4 }}>{value}</div>
  </div>
);

// ── Two-column key/value table ───────────────────────────────────────────────
export interface KVRow {
  label: string;
  value: string;
  bold?: boolean;
  /** Section heading row spanning both columns */
  heading?: boolean;
  /** colour the value (e.g. negative cashflow) */
  valueColor?: string;
}

export const KVTable: React.FC<{ rows: KVRow[] }> = ({ rows }) => (
  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
    <tbody>
      {rows.map((r, i) =>
        r.heading ? (
          <tr key={i}>
            <td
              colSpan={2}
              style={{
                padding: '7px 10px',
                fontSize: 11,
                fontWeight: 600,
                color: RC.neutral500,
                background: RC.neutral50,
                textTransform: 'uppercase',
                letterSpacing: 0.4,
                borderTop: `1px solid ${RC.neutral200}`,
              }}
            >
              {r.label}
            </td>
          </tr>
        ) : (
          <tr key={i} style={{ borderTop: `1px solid ${RC.neutral100}` }}>
            <td style={{ padding: '7px 10px', color: RC.neutral500, whiteSpace: 'nowrap' }}>{r.label}</td>
            <td
              style={{
                padding: '7px 10px',
                textAlign: 'right',
                fontWeight: r.bold ? 700 : 600,
                color: r.valueColor ?? RC.neutral900,
                whiteSpace: 'nowrap',
              }}
            >
              {r.value}
            </td>
          </tr>
        )
      )}
    </tbody>
  </table>
);

// ── Generic grid/matrix table (header row + body rows) ───────────────────────
export interface MatrixColumn {
  key: string;
  label: string;
  align?: 'left' | 'right' | 'center';
}
export interface MatrixRow {
  cells: Array<{ value: string; color?: string; bold?: boolean }>;
  highlight?: boolean;
}

export const MatrixTable: React.FC<{ columns: MatrixColumn[]; rows: MatrixRow[] }> = ({ columns, rows }) => (
  <div style={{ overflow: 'hidden' }}>
    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
      <thead>
        <tr style={{ borderBottom: `1px solid ${RC.neutral200}` }}>
          {columns.map((c, i) => (
            <th
              key={c.key}
              style={{
                padding: '7px 8px',
                textAlign: c.align ?? (i === 0 ? 'left' : 'right'),
                fontSize: 11,
                fontWeight: 700,
                color: RC.neutral900,
                whiteSpace: 'nowrap',
              }}
            >
              {c.label}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((r, ri) => (
          <tr
            key={ri}
            style={{
              borderBottom: `1px solid ${RC.neutral100}`,
              background: r.highlight ? RC.neutral50 : 'transparent',
            }}
          >
            {r.cells.map((cell, ci) => (
              <td
                key={ci}
                style={{
                  padding: '6px 8px',
                  textAlign: columns[ci]?.align ?? (ci === 0 ? 'left' : 'right'),
                  color: cell.color ?? (ci === 0 ? RC.neutral500 : RC.neutral700),
                  fontWeight: cell.bold ? 700 : ci === 0 ? 600 : 500,
                  whiteSpace: 'nowrap',
                }}
              >
                {cell.value}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

// ── Disclaimer block ─────────────────────────────────────────────────────────
export const Disclaimer: React.FC = () => (
  <div style={{ marginTop: 18, fontSize: 9.5, lineHeight: 1.5, color: RC.neutral400, fontStyle: 'italic' }}>
    The projections in this report illustrate outcomes calculated from the inputs and assumptions in the
    model. Figures vary with those inputs and are not a guarantee of future performance. This information is
    general in nature, does not account for individual circumstances, and should not be relied on as financial
    or investment advice. Intending investors should obtain independent professional advice.
  </div>
);
