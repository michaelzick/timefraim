export function addMinutes(isoString: string, minutes: number): string {
  const date = new Date(isoString);
  date.setMinutes(date.getMinutes() + minutes);
  return date.toISOString();
}

/**
 * Steps a YYYY-MM-DD string by `days` (+1 or -1) in a DST-safe way.
 * Works purely on calendar date parts — no UTC parsing that could shift the day.
 */
export function stepLocalDate(dateString: string, days: number): string {
  const [year, month, day] = dateString.split("-").map(Number);
  const d = new Date(year, month - 1, day + days);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}
