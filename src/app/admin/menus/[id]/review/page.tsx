import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getMenuWithContent } from "@/lib/menu/service";
import { getPendingScheduleForMenu } from "@/lib/publish/service";
import { getCurrentRestaurant } from "@/lib/auth/current-restaurant";
import { dailySpecialMenuSchema } from "@/lib/menu/special-menu-schema";
import { DEFAULT_MENU_THEME_ID } from "@/lib/menu/special-menu-themes";
import { getLocale } from "@/lib/i18n/get-locale";
import { getDictionary } from "@/lib/i18n/dictionary";
import { ReviewSpecialClient } from "./review-special-client";

export default async function ReviewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  let menu;
  try {
    menu = await getMenuWithContent(supabase, id);
  } catch {
    notFound();
  }

  const pendingSchedule = await getPendingScheduleForMenu(supabase, id);

  const imageUrl = menu.generated_image_path
    ? supabase.storage.from("site-media").getPublicUrl(menu.generated_image_path).data.publicUrl
    : null;
  const imageUrlEs = menu.generated_image_path_es
    ? supabase.storage.from("site-media").getPublicUrl(menu.generated_image_path_es).data.publicUrl
    : null;

  // New (structured) drafts carry special_data; legacy image-gen drafts don't.
  const parsedSpecial = dailySpecialMenuSchema.safeParse(menu.special_data?.menu);
  const special = parsedSpecial.success ? parsedSpecial.data : null;
  const themeId = menu.special_data?.themeId ?? DEFAULT_MENU_THEME_ID;

  const parsedSpecialEs = dailySpecialMenuSchema.safeParse(menu.special_data_es);
  const specialEs = parsedSpecialEs.success ? parsedSpecialEs.data : null;

  // Standardized letterhead: overwrite from the profile on load too, so the
  // client-side live preview is byte-identical to what render-special-service
  // will persist — even on drafts extracted before this rule existed.
  const restaurant = await getCurrentRestaurant();
  if (restaurant) {
    for (const m of [special, specialEs]) {
      if (!m) continue;
      m.restaurantName = restaurant.name;
      m.address = restaurant.address;
      m.phone = restaurant.phone;
    }
  }

  const locale = await getLocale();
  const t = getDictionary(locale).admin.review;

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="mb-1 text-xl font-semibold">{t.heading}</h1>
      <p className="mb-6 text-sm text-neutral-500">{t.description}</p>
      <ReviewSpecialClient
        menuId={id}
        initialSpecial={special}
        initialThemeId={themeId}
        initialImageUrl={imageUrl}
        initialSpecialEs={specialEs}
        initialImageUrlEs={imageUrlEs}
        pendingSchedule={pendingSchedule}
        initialMenuStatus={menu.status}
        locale={locale}
      />
    </div>
  );
}
