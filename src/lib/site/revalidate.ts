import { revalidatePath } from "next/cache";

/** Every marketing page that reads the restaurant profile (name/address/phone/hours/brand/social) — revalidated on-demand after a Settings save so changes show up immediately instead of waiting out each page's ISR window. */
export function revalidateMarketingSite(): void {
  for (const path of ["/", "/menu", "/about", "/visit", "/gallery", "/catering", "/order"]) {
    revalidatePath(path);
  }
}
