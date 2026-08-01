"use client";

import { useActionState } from "react";
import { updateSettings, type UpdateSettingsState } from "./actions";
import type { Restaurant, RestaurantHours } from "@/types/database";

const DAYS: { key: RestaurantHours["day"]; label: string }[] = [
  { key: "mon", label: "Monday" },
  { key: "tue", label: "Tuesday" },
  { key: "wed", label: "Wednesday" },
  { key: "thu", label: "Thursday" },
  { key: "fri", label: "Friday" },
  { key: "sat", label: "Saturday" },
  { key: "sun", label: "Sunday" },
];

const initialState: UpdateSettingsState = { status: "idle" };

function fieldClass() {
  return "rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-neutral-500 focus:outline-none";
}

function Section({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) {
  return (
    <section className="rounded-lg border border-neutral-200 p-4">
      <h2 className="text-base font-semibold">{title}</h2>
      {description && <p className="mt-1 text-sm text-neutral-500">{description}</p>}
      <div className="mt-4 flex flex-col gap-3">{children}</div>
    </section>
  );
}

export function SettingsForm({ restaurant }: { restaurant: Restaurant }) {
  const [state, formAction, pending] = useActionState(updateSettings, initialState);
  const hoursByDay = new Map(restaurant.hours.map((h) => [h.day, h]));

  return (
    <form action={formAction} className="flex flex-col gap-6 pb-10">
      <Section title="Identity" description="Shown across your public site.">
        <label className="flex flex-col gap-1 text-sm">
          Restaurant name
          <input name="name" defaultValue={restaurant.name} required className={fieldClass()} />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Public URL slug
          <input
            name="slug"
            defaultValue={restaurant.slug}
            pattern="[a-z0-9]+(-[a-z0-9]+)*"
            required
            className={fieldClass()}
          />
          <span className="text-xs text-neutral-400">Used in public links that identify your restaurant.</span>
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Address
          <input name="address" defaultValue={restaurant.address ?? ""} className={fieldClass()} />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Phone
          <input name="phone" defaultValue={restaurant.phone ?? ""} className={fieldClass()} />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Email
          <input name="email" type="email" defaultValue={restaurant.email ?? ""} className={fieldClass()} />
        </label>
      </Section>

      <Section title="Hours">
        <div className="flex flex-col gap-3 sm:gap-2">
          {DAYS.map(({ key, label }) => {
            const existing = hoursByDay.get(key);
            return (
              <div key={key} className="flex flex-wrap items-center gap-x-3 gap-y-2 text-sm">
                <span className="w-20 shrink-0 font-medium sm:w-24 sm:font-normal">{label}</span>
                <div className="flex items-center gap-2">
                  <input type="time" name={`hours[${key}][open]`} defaultValue={existing?.open} className={`${fieldClass()} w-[7.5rem]`} />
                  <span aria-hidden="true">–</span>
                  <input type="time" name={`hours[${key}][close]`} defaultValue={existing?.close} className={`${fieldClass()} w-[7.5rem]`} />
                </div>
                <label className="flex items-center gap-1 text-xs text-neutral-500">
                  <input type="checkbox" name={`hours[${key}][closed]`} defaultChecked={!existing} />
                  Closed
                </label>
              </div>
            );
          })}
        </div>
      </Section>

      <Section title="Social">
        {(["instagram", "facebook", "twitter", "tiktok"] as const).map((key) => (
          <label key={key} className="flex flex-col gap-1 text-sm capitalize">
            {key}
            <input name={`social[${key}]`} defaultValue={restaurant.social[key] ?? ""} className={fieldClass()} />
          </label>
        ))}
      </Section>

      <Section title="Brand" description="Applied automatically across your public site.">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {(["primary", "secondary", "accent", "background", "text"] as const).map((key) => (
            <label key={key} className="flex flex-col gap-1 text-sm capitalize">
              {key} color
              <input
                name={`brand[colors][${key}]`}
                type="text"
                placeholder="#000000"
                defaultValue={restaurant.brand.colors?.[key] ?? ""}
                className={fieldClass()}
              />
            </label>
          ))}
        </div>
        <div className="grid grid-cols-2 gap-3">
          <label className="flex flex-col gap-1 text-sm">
            Heading font
            <input
              name="brand[fonts][heading]"
              defaultValue={restaurant.brand.fonts?.heading ?? ""}
              className={fieldClass()}
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            Body font
            <input
              name="brand[fonts][body]"
              defaultValue={restaurant.brand.fonts?.body ?? ""}
              className={fieldClass()}
            />
          </label>
        </div>
        <p className="text-xs text-neutral-400">
          Colors and fonts are applied automatically across your public site and Daily Specials previews. Logo upload
          is planned for a future update.
        </p>
      </Section>

      <Section title="Menu defaults">
        <label className="flex flex-col gap-1 text-sm">
          Currency (ISO code)
          <input
            name="menu_defaults[currency]"
            defaultValue={restaurant.menu_defaults.currency ?? "USD"}
            maxLength={3}
            className={fieldClass()}
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Tax note
          <input
            name="menu_defaults[taxNote]"
            defaultValue={restaurant.menu_defaults.taxNote ?? ""}
            className={fieldClass()}
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Disclaimer
          <textarea
            name="menu_defaults[disclaimer]"
            defaultValue={restaurant.menu_defaults.disclaimer ?? ""}
            rows={2}
            className={fieldClass()}
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Default section order (comma-separated)
          <input
            name="menu_defaults[sectionOrder]"
            defaultValue={(restaurant.menu_defaults.sectionOrder ?? []).join(", ")}
            placeholder="Starters, Mains, Desserts, Drinks"
            className={fieldClass()}
          />
        </label>
      </Section>

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={pending}
          className="rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          {pending ? "Saving…" : "Save settings"}
        </button>
        {state.status === "success" && (
          <span role="status" className="text-sm text-green-700">
            {state.message}
          </span>
        )}
        {state.status === "error" && (
          <span role="alert" className="text-sm text-red-700">
            {state.message}
          </span>
        )}
      </div>
    </form>
  );
}
