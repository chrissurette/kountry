"use client";

import { useActionState } from "react";
import { signIn, type SignInState } from "./actions";
import type { Locale } from "@/lib/i18n/locale";
import { getDictionary } from "@/lib/i18n/dictionary";

const initialState: SignInState = { status: "idle" };

const inputClass = "rounded-md border border-neutral-300 px-3 py-2 text-base focus:border-neutral-500 focus:outline-none";

export function LoginForm({ locale }: { locale: Locale }) {
  const [state, formAction, pending] = useActionState(signIn, initialState);
  const t = getDictionary(locale).admin.login;

  return (
    <main className="mx-auto flex min-h-dvh max-w-sm flex-col justify-center gap-6 px-6">
      <div>
        <h1 className="text-2xl font-semibold">{t.title}</h1>
        <p className="mt-1 text-sm text-neutral-500">{t.tagline}</p>
      </div>

      <form action={formAction} className="flex flex-col gap-3">
        <label htmlFor="identifier" className="text-sm font-medium">
          {t.usernameOrEmail}
        </label>
        <input
          id="identifier"
          name="identifier"
          type="text"
          required
          autoComplete="username"
          autoCapitalize="none"
          spellCheck={false}
          placeholder="username or you@yourrestaurant.com"
          className={inputClass}
        />

        <label htmlFor="password" className="text-sm font-medium">
          {t.password}
        </label>
        <input id="password" name="password" type="password" required autoComplete="current-password" className={inputClass} />

        <button
          type="submit"
          disabled={pending}
          className="mt-1 rounded-md bg-neutral-900 px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          {pending ? t.signingIn : t.signIn}
        </button>
      </form>

      {state.status === "error" && (
        <p role="alert" className="text-sm text-red-700">
          {state.message}
        </p>
      )}
    </main>
  );
}
