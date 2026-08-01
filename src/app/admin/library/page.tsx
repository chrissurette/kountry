import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { listSavedSpecials } from "@/lib/menu/saved-specials-service";
import { SavedSpecialsGrid } from "./saved-specials-grid";

export default async function LibraryPage() {
  const supabase = await createClient();
  const specials = await listSavedSpecials(supabase);

  return (
    <div className="mx-auto max-w-4xl">
      <h1 className="mb-1 text-xl font-semibold">Saved Specials</h1>
      <p className="mb-6 text-sm text-neutral-500">
        Every daily special you&apos;ve rendered is saved here. Open one to edit or publish it; unpublished drafts can
        be deleted, while published specials stay safely preserved in History.
      </p>

      {specials.length === 0 ? (
        <div className="rounded-lg border border-neutral-200 p-8 text-center">
          <p className="text-sm text-neutral-500">No saved specials yet.</p>
          <Link
            href="/admin/menus/new"
            className="mt-3 inline-block rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white"
          >
            New Daily Special
          </Link>
        </div>
      ) : (
        <SavedSpecialsGrid initialSpecials={specials} />
      )}
    </div>
  );
}
