import { createClient } from "@/lib/supabase/server";
import { listEmailFaxRequests } from "@/lib/email-fax/service";
import { EmailFaxTable } from "./email-fax-table";

// Owner-only screen (middleware blocks employees; RLS is owner-only too).
// English-only content per the established admin-translation scope — only
// the nav label is bilingual, same as Subscribers/Settings/History.
export default async function EmailFaxListPage() {
  const supabase = await createClient();
  const requests = await listEmailFaxRequests(supabase);

  return (
    <div className="mx-auto max-w-5xl">
      <h1 className="mb-1 text-xl font-semibold">Fax/Email List</h1>
      <p className="mb-6 text-sm text-neutral-500">
        Everyone who&rsquo;s asked to have the daily special sent to them, from the public Email/Fax List page. Each
        submission is its own row — if someone submits twice, keep the newer one and delete the older. No days checked
        means they want it every day. Sending is up to you (nothing here sends automatically); these rows are also your
        record that each person asked, so don&rsquo;t clear someone until you&rsquo;ve stopped sending to them.
      </p>
      <EmailFaxTable initialRequests={requests} />
    </div>
  );
}
