export const PROPPATH_ADMIN_EMAILS = [
  'rob@proppath.com.au',
  'james@proppath.com.au',
  'rk@hyperhq.com',
  'jamescb40@gmail.com',
] as const;

export function isPropPathAdmin(email: string | null | undefined): boolean {
  if (!email) return false;
  return (PROPPATH_ADMIN_EMAILS as readonly string[])
    .map(e => e.toLowerCase())
    .includes(email.toLowerCase());
}
