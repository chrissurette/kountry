export function formatPrice(priceCents: number | null, priceNote: string | null, currency: string): string {
  if (priceCents != null) {
    try {
      return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(priceCents / 100);
    } catch {
      return `${(priceCents / 100).toFixed(2)} ${currency}`;
    }
  }
  return priceNote ?? "";
}

const DAY_LABEL: Record<string, string> = {
  mon: "Mon",
  tue: "Tue",
  wed: "Wed",
  thu: "Thu",
  fri: "Fri",
  sat: "Sat",
  sun: "Sun",
};

export function formatHours(hours: { day: string; open: string; close: string }[]): string[] {
  return hours.map((h) => `${DAY_LABEL[h.day] ?? h.day} ${h.open}–${h.close}`);
}
