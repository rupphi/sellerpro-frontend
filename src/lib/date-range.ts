export type DateRange = { from: string; to: string };
export const shiftDay = (day: string, days: number) => new Date(Date.parse(day + "T00:00:00Z") + days * 86400000).toISOString().slice(0, 10);
export const rangeDays = (range: DateRange) => (Date.parse(range.to) - Date.parse(range.from)) / 86400000 + 1;
export const formatDay = (day: string) => day.split("-").reverse().join(".");
export const formatRange = (range: DateRange) => `${formatDay(range.from)} – ${formatDay(range.to)}`;
export const moscowToday = () => new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Moscow", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
export function previousRange(range: DateRange): DateRange {
  return { from: shiftDay(range.from, -rangeDays(range)), to: shiftDay(range.from, -1) };
}
export function recentRange(days: number, end = shiftDay(moscowToday(), -1)): DateRange {
  return { from: shiftDay(end, 1 - days), to: end };
}
