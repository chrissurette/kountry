import type { Config } from "@netlify/functions";

/**
 * Netlify Scheduled Function — the Netlify equivalent of the old Vercel Cron
 * entry in vercel.json. All the actual logic (querying due schedules,
 * flipping the live pointer, revalidating public pages) lives in
 * src/app/api/cron/promote-schedules/route.ts; this function's only job is
 * to invoke that route on a schedule with the shared secret, same as Vercel
 * Cron used to do automatically. Runs every minute, matching docs/02's
 * original design (Netlify's Scheduled Functions support this on every
 * plan, including free — unlike Vercel's Hobby tier, which only allows
 * daily cron).
 *
 * process.env.URL is Netlify's own injected "this site's primary URL" var;
 * NEXT_PUBLIC_SITE_URL is the fallback for local `netlify dev` testing.
 */
async function promoteSchedules() {
  const siteUrl = process.env.URL || process.env.NEXT_PUBLIC_SITE_URL;
  if (!siteUrl) {
    console.error("promote-schedules: no site URL available (URL / NEXT_PUBLIC_SITE_URL both unset)");
    return;
  }

  const res = await fetch(`${siteUrl}/api/cron/promote-schedules`, {
    headers: { Authorization: `Bearer ${process.env.CRON_SECRET}` },
  });

  if (!res.ok) {
    console.error(`promote-schedules: cron endpoint returned ${res.status}`);
    return;
  }

  const body = await res.json().catch(() => null);
  console.log("promote-schedules:", body);
}

export default promoteSchedules;

export const config: Config = {
  schedule: "* * * * *",
};
