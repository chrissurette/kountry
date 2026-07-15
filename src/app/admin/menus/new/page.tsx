import { createClient } from "@/lib/supabase/server";
import { getLatestDraft } from "@/lib/menu/saved-specials-service";
import { getLocale } from "@/lib/i18n/get-locale";
import { NewSpecialClient } from "./new-special-client";

export default async function NewMenuPage() {
  const supabase = await createClient();
  const existingDraft = await getLatestDraft(supabase);
  const locale = await getLocale();
  return <NewSpecialClient existingDraft={existingDraft} locale={locale} />;
}
