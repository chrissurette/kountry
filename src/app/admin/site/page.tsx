import { createClient } from "@/lib/supabase/server";
import { listSiteMedia } from "@/lib/site-media/service";
import { SiteMediaManager } from "./site-media-manager";

export default async function SitePhotosPage() {
  const supabase = await createClient();
  const media = await listSiteMedia(supabase);

  const withUrls = media.map((m) => ({
    id: m.id,
    kind: m.kind,
    url: supabase.storage.from("site-media").getPublicUrl(m.storage_path).data.publicUrl,
    caption: m.caption,
  }));

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="mb-1 text-xl font-semibold">Site Photos</h1>
      <p className="mb-6 text-sm text-neutral-500">
        The hero photo and gallery shown on your public website. Changes here appear on the site right away —
        no redeploy.
      </p>
      <SiteMediaManager
        initialHero={withUrls.filter((m) => m.kind === "hero")}
        initialGallery={withUrls.filter((m) => m.kind === "gallery")}
      />
    </div>
  );
}
