export function minimumPreferredDate(now = new Date()): string {
  const vietnamDate = new Date(now.getTime() + 7 * 60 * 60_000);
  vietnamDate.setUTCDate(vietnamDate.getUTCDate() + 2);
  return vietnamDate.toISOString().slice(0, 10);
}
