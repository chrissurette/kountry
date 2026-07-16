import { createClient } from "@/lib/supabase/server";
import { listSubscribers } from "@/lib/subscribers/service";
import { SubscribersTable } from "./subscribers-table";

export default async function SubscribersPage() {
  const supabase = await createClient();
  const subscribers = await listSubscribers(supabase);

  return (
    <div className="mx-auto max-w-4xl">
      <h1 className="mb-1 text-xl font-semibold">Subscribers</h1>
      {/* Explicit {" "} around the <strong>: JSX drops a newline that sits
          directly against a tag, so relying on source-line breaks for those
          two spaces silently rendered "manually.Export emailsgives". */}
      <p className="mb-6 text-sm text-neutral-500">
        Everyone who&rsquo;s left an email or phone number on the homepage, plus anyone you&rsquo;ve added manually.{" "}
        <strong>Export emails</strong>{" "}
        gives you a CSV of everyone still subscribed — each row includes that person&rsquo;s own unsubscribe link,
        so put it in every email you send. People who unsubscribe stay listed here as a record, but are left out of
        both exports.{" "}
        <strong>Export phones</strong>{" "}
        is the same for phone numbers, so someone reachable only by phone can still be given their unsubscribe link —
        it&rsquo;s for contacting people by hand, not for sending marketing texts, which would need written permission
        this signup doesn&rsquo;t collect.
      </p>
      <SubscribersTable initialSubscribers={subscribers} />
    </div>
  );
}
