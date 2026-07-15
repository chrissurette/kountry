import { redirect } from "next/navigation";

// Design + Publish merged into the Review & Publish screen once Daily
// Specials became image-based (2026-07-15) — there's no separate theme/style
// step to configure anymore. Kept as a redirect rather than deleted outright
// in case anything still links here.
export default async function PublishPageRedirect({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  redirect(`/admin/menus/${id}/review`);
}
