export type SizeTier = 'small' | 'mid' | 'whale';

export type ContactStatus =
  | 'not_contacted'
  | 'connection_sent'
  | 'connected'
  | 'video_sent'
  | 'replied'
  | 'demo_booked'
  | 'beta_tester'
  | 'dead';

export type RelevanceTier = 'high' | 'medium' | 'low';

export interface CrmContact {
  id: string;
  company_id: string;
  full_name: string;
  title: string | null;
  linkedin_url: string | null;
  status: ContactStatus;
  connection_sent_at: string | null;
  video_sent_at: string | null;
  replied_at: string | null;
  last_touch_at: string | null;
  next_action_at: string | null;
  notes: string | null;
}

export interface CompanyWithContacts {
  id: string;
  name: string;
  relevance_tier: RelevanceTier;
  employees: number | null;
  state: string | null;
  website: string | null;
  blurb: string | null;
  notes: string | null;
  contacts: CrmContact[];
}

export function sizeTierFromEmployees(employees: number | null): SizeTier {
  if (employees == null) return 'small';
  if (employees < 50) return 'small';
  if (employees < 150) return 'mid';
  return 'whale';
}

export function isContactActive(status: ContactStatus): boolean {
  return status !== 'not_contacted' && status !== 'dead';
}

export function sortCompaniesForMap(rows: CompanyWithContacts[]): CompanyWithContacts[] {
  const tierOrder: Record<RelevanceTier, number> = { high: 0, medium: 1, low: 2 };
  return [...rows].sort((a, b) => {
    const tierDiff = tierOrder[a.relevance_tier] - tierOrder[b.relevance_tier];
    if (tierDiff !== 0) return tierDiff;
    // Largest company first within each tier (DESC), nulls last
    const ae = a.employees ?? -1;
    const be = b.employees ?? -1;
    return be - ae;
  });
}

export const PIPELINE_STAGES = [
  { status: 'connection_sent' as const, label: 'Connection sent' },
  { status: 'connected' as const, label: 'Connected' },
  { status: 'video_sent' as const, label: 'Video sent' },
  { status: 'replied' as const, label: 'Replied' },
  { status: 'demo_booked' as const, label: 'Demo booked' },
  { status: 'beta_tester' as const, label: 'Beta tester' },
  { status: 'dead' as const, label: 'Dead' },
] as const;

export function getTimestampPatch(newStatus: ContactStatus): Record<string, string | null> {
  const now = new Date().toISOString();
  const patch: Record<string, string | null> = { last_touch_at: now };

  switch (newStatus) {
    case 'connection_sent':
      patch.connection_sent_at = now;
      break;
    case 'video_sent':
      patch.video_sent_at = now;
      break;
    case 'replied':
      patch.replied_at = now;
      break;
  }

  return patch;
}
