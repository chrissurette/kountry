import { createClient } from "@/lib/supabase/server";
import { getRestaurantProfile } from "@/lib/restaurant/service";
import { listSnapshots } from "@/lib/history/service";
import { HistoryList } from "./history-list";

export default async function HistoryPage() {
  const supabase = await createClient();
  const [restaurant, snapshots] = await Promise.all([getRestaurantProfile(supabase), listSnapshots(supabase)]);

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="mb-1 text-xl font-semibold">History</h1>
      <p className="mb-6 text-sm text-neutral-500">
        Every published daily special is kept forever — re-publish any of them with one tap.
      </p>
      <HistoryList snapshots={snapshots} liveSnapshotId={restaurant.live_snapshot_id} />
    </div>
  );
}
