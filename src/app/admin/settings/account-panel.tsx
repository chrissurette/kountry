"use client";

import { useActionState } from "react";
import { changeUsername, changePassword, type AccountState } from "./account-actions";

const initial: AccountState = { status: "idle" };
const inputClass = "rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-neutral-500 focus:outline-none";

export function AccountPanel({ email, currentUsername }: { email: string | null; currentUsername: string | null }) {
  const [uState, uAction, uPending] = useActionState(changeUsername, initial);
  const [pState, pAction, pPending] = useActionState(changePassword, initial);

  return (
    <section className="rounded-lg border border-neutral-200 p-4">
      <h2 className="text-base font-semibold">Account</h2>
      <p className="mt-1 text-sm text-neutral-500">
        Your admin sign-in. You can sign in with either your username or your email.
      </p>

      <dl className="mt-4 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
        <dt className="text-neutral-500">Email</dt>
        <dd>{email ?? "—"}</dd>
        <dt className="text-neutral-500">Username</dt>
        <dd>{currentUsername ?? <span className="text-neutral-400">not set</span>}</dd>
      </dl>

      <form action={uAction} className="mt-4 flex flex-col gap-2 border-t border-neutral-200 pt-4">
        <label htmlFor="account-username" className="text-sm font-medium">
          Change username
        </label>
        <div className="flex flex-wrap gap-2">
          <input
            id="account-username"
            name="username"
            defaultValue={currentUsername ?? ""}
            autoComplete="username"
            autoCapitalize="none"
            spellCheck={false}
            placeholder="e.g. kkimmokalee"
            className={`${inputClass} min-w-[12rem] flex-1`}
          />
          <button
            type="submit"
            disabled={uPending}
            className="rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
          >
            {uPending ? "Saving…" : "Save username"}
          </button>
        </div>
        <p className="text-xs text-neutral-400">Lowercase letters, numbers, hyphen or underscore.</p>
        {uState.status === "success" && uState.field === "username" && (
          <p role="status" className="text-sm text-green-700">{uState.message}</p>
        )}
        {uState.status === "error" && uState.field === "username" && (
          <p role="alert" className="text-sm text-red-700">{uState.message}</p>
        )}
      </form>

      <form action={pAction} className="mt-4 flex flex-col gap-2 border-t border-neutral-200 pt-4">
        <label htmlFor="account-password" className="text-sm font-medium">
          Change password
        </label>
        <input
          id="account-password"
          name="password"
          type="password"
          autoComplete="new-password"
          placeholder="New password"
          className={`${inputClass} sm:max-w-xs`}
        />
        <input
          name="confirm"
          type="password"
          autoComplete="new-password"
          placeholder="Confirm new password"
          className={`${inputClass} sm:max-w-xs`}
        />
        <button
          type="submit"
          disabled={pPending}
          className="self-start rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          {pPending ? "Updating…" : "Update password"}
        </button>
        <p className="text-xs text-neutral-400">At least 8 characters.</p>
        {pState.status === "success" && pState.field === "password" && (
          <p role="status" className="text-sm text-green-700">{pState.message}</p>
        )}
        {pState.status === "error" && pState.field === "password" && (
          <p role="alert" className="text-sm text-red-700">{pState.message}</p>
        )}
      </form>
    </section>
  );
}
