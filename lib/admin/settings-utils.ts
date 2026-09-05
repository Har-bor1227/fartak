import { getDateKey } from "@/lib/date/tehran";

export function minutesToTime(
  minutes: number,
): string {
  const safeMinutes = Math.max(
    0,
    Math.min(
      1439,
      Math.floor(minutes),
    ),
  );

  const hours = Math.floor(
    safeMinutes / 60,
  );

  const remaining =
    safeMinutes % 60;

  return `${String(hours).padStart(
    2,
    "0",
  )}:${String(remaining).padStart(
    2,
    "0",
  )}`;
}

export function holidayDateKey(
  date: Date,
): string {
  return getDateKey(date);
}