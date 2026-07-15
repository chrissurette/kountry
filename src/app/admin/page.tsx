import { redirect } from "next/navigation";

// /admin is the PWA's start_url. The daily task is photographing today's
// menu, so land staff straight on the capture screen — the header nav in the
// admin layout covers everything else.
export default function AdminIndex() {
  redirect("/admin/menus/new");
}
