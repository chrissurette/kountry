import { createClient } from "@/lib/supabase/server";
import { getMainMenu } from "@/lib/main-menu/service";
import { MainMenuEditor } from "./main-menu-editor";

export default async function MainMenuPage() {
  const supabase = await createClient();
  const mainMenu = await getMainMenu(supabase);

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="mb-1 text-xl font-semibold">Main Menu</h1>
      <p className="mb-6 text-sm text-neutral-500">
        Your permanent menu — hand-typed here, not photographed or AI-generated. Changes go live right away, no
        publish step. For what&apos;s cooking today, use <strong>New Daily Special</strong> instead.
      </p>
      <MainMenuEditor initialSections={mainMenu.sections} />
    </div>
  );
}
