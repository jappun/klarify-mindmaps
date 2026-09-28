// Date helpers. Session dates are plain YYYY-MM-DD; parse as noon UTC so they never shift a day.
// Timestamps render in one fixed zone so server (UTC on Vercel) and browser agree.
const TZ = "America/Toronto";
function parseDate(d: string) {
  return d.length === 10 ? new Date(`${d}T12:00:00Z`) : new Date(d);
}

/** "Monday September 28, 2026" — Klarify's date group header. */
export function formatDayHeader(d: string) {
  const date = parseDate(d);
  const weekday = date.toLocaleDateString("en-US", { weekday: "long", timeZone: TZ });
  const rest = date.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric", timeZone: TZ });
  return `${weekday} ${rest}`;
}

/** "Sep 21, 2026" */
export function formatShortDate(d: string) {
  return parseDate(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: TZ });
}

/** "09/28/26" */
export function formatNumericDate(d: string) {
  return parseDate(d).toLocaleDateString("en-US", { month: "2-digit", day: "2-digit", year: "2-digit", timeZone: TZ });
}

/** "September 2026" */
export function formatMonthYear(d: string) {
  return parseDate(d).toLocaleDateString("en-US", { month: "long", year: "numeric", timeZone: TZ });
}

/** "Sep 2026" */
export function formatShortMonthYear(d: string) {
  return parseDate(d).toLocaleDateString("en-US", { month: "short", year: "numeric", timeZone: TZ });
}

/** "September 28 at 1:51 PM" */
export function formatLastSession(d: string) {
  const date = parseDate(d);
  const day = date.toLocaleDateString("en-US", { month: "long", day: "numeric", timeZone: TZ });
  const time = date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", timeZone: TZ });
  return `${day} at ${time}`;
}

/** "1:51 PM" */
export function formatTime(d: string) {
  return parseDate(d).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", timeZone: TZ });
}

export function sessionTitle(n: number) {
  return `Session ${n}`;
}
