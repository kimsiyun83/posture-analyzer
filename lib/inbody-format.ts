// Display only: retain full precision in saved records and chart data.
export function formatInbodyValue(value: number | null | undefined, unit: string): string {
  if (value == null || !Number.isFinite(value)) return '—';
  if (unit !== 'kg') return String(value);
  const fixed = value.toFixed(1);
  return fixed === '-0.0' ? '0.0' : fixed;
}
export function formatInbodyDelta(value: number, unit: string, digits = 2): string {
  const rounded = Number(value.toFixed(unit === 'kg' ? 1 : digits));
  return `${rounded > 0 ? '+' : ''}${formatInbodyValue(rounded, unit)}`;
}
