// Reporting periods always use Korean calendar days, regardless of server TZ.
export function koreanDay(now = new Date()): string {
  return new Date(now.getTime() + 9 * 60 * 60 * 1000).toISOString().slice(0, 10);
}
export function dayWindow(day: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) throw new Error('Invalid day');
  const start = new Date(`${day}T00:00:00+09:00`);
  if (!Number.isFinite(start.getTime()) || koreanDay(start) !== day) throw new Error('Invalid day');
  return { start, end: new Date(start.getTime() + 86400000) };
}
export function previousDay(now = new Date()) { return koreanDay(new Date(now.getTime() - 86400000)); }
export function publicTrafficPath(path: unknown): path is string {
  return typeof path === 'string' && (['/', '/customer', '/inbody', '/install'].includes(path) || /^\/analyze(?:\/(?:tests|desk|demo|movement|live))?$/.test(path));
}
