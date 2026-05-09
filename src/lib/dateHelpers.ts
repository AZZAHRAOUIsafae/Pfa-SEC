export function parseDeadline(value: string): Date | null {
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function isPastDeadline(deadline: string): boolean {
  const d = parseDeadline(deadline);
  return d ? d.getTime() < Date.now() : false;
}

export function daysUntilDeadline(deadline: string): number | null {
  const d = parseDeadline(deadline);
  if (!d) return null;
  return Math.ceil((d.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
}
