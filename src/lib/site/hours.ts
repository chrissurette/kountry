import type { RestaurantHours } from "@/types/database";
import type { Locale } from "@/lib/i18n/locale";
import { getDictionary } from "@/lib/i18n/dictionary";

const DAY_ORDER: RestaurantHours["day"][] = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];

// Date.getDay(): 0 = Sunday .. 6 = Saturday
const JS_DAY_TO_KEY: RestaurantHours["day"][] = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];

/** "13:30" → "1:30 PM"; "09:00" → "9 AM". */
export function formatTime(hhmm: string): string {
  const [h, m] = hhmm.split(":").map(Number);
  if (Number.isNaN(h)) return hhmm;
  const period = h < 12 ? "AM" : "PM";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return m === 0 ? `${h12} ${period}` : `${h12}:${String(m).padStart(2, "0")} ${period}`;
}

export interface DayHours {
  day: RestaurantHours["day"];
  full: string;
  ranges: { open: string; close: string }[];
}

/** All seven days in order, each with its (possibly empty, possibly multiple) ranges. */
export function groupHoursByDay(hours: RestaurantHours[], locale: Locale = "en"): DayHours[] {
  const days = getDictionary(locale).common.days;
  return DAY_ORDER.map((day) => ({
    day,
    full: days[day],
    ranges: hours.filter((h) => h.day === day).map((h) => ({ open: h.open, close: h.close })),
  }));
}

function toMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}

/**
 * Whether the restaurant is open at `now` (the visitor's local clock — for a
 * neighborhood restaurant that's effectively the restaurant's timezone, which
 * avoids needing a stored timezone field). Handles overnight ranges where
 * close < open (e.g. 17:00–02:00) spilling from the previous day.
 */
export function isOpenNow(hours: RestaurantHours[], now: Date): boolean {
  const todayKey = JS_DAY_TO_KEY[now.getDay()];
  const prevKey = JS_DAY_TO_KEY[(now.getDay() + 6) % 7];
  const cur = now.getHours() * 60 + now.getMinutes();

  for (const h of hours) {
    const open = toMinutes(h.open);
    const close = toMinutes(h.close);
    const overnight = close <= open;

    if (h.day === todayKey) {
      if (!overnight && cur >= open && cur < close) return true; // same-day range
      if (overnight && cur >= open) return true; // evening part of an overnight range
    }
    if (h.day === prevKey && overnight && cur < close) return true; // morning tail of yesterday's overnight range
  }
  return false;
}
