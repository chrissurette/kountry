"use client";

import { useActionState } from "react";
import { updateEmployeeUsername, updateEmployeeEmail, updateEmployeePassword, type EmployeeAccountState } from "./employee-actions";
import type { EmployeeAccount } from "@/lib/restaurant/employees-service";

const initial: EmployeeAccountState = { status: "idle" };
const inputClass = "rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-neutral-500 focus:outline-none";

function StatusLine({ state }: { state: EmployeeAccountState }) {
  if (state.status === "idle") return null;
  return (
    <p role={state.status === "error" ? "alert" : "status"} className={`mt-1 text-xs ${state.status === "success" ? "text-green-700" : "text-red-700"}`}>
      {state.message}
    </p>
  );
}

function EmployeeAccountCard({ employee }: { employee: EmployeeAccount }) {
  const [uState, uAction, uPending] = useActionState(updateEmployeeUsername, initial);
  const [eState, eAction, ePending] = useActionState(updateEmployeeEmail, initial);
  const [pState, pAction, pPending] = useActionState(updateEmployeePassword, initial);

  return (
    <div className="rounded-md border border-neutral-200 p-4">
      <p className="text-sm font-medium">{employee.email ?? "Unknown email"}</p>
      <p className="text-xs text-neutral-400">Current username: {employee.username ?? "not set"}</p>

      <form action={uAction} className="mt-3 flex flex-wrap gap-2">
        <input type="hidden" name="userId" value={employee.userId} />
        <input
          name="username"
          defaultValue={employee.username ?? ""}
          autoCapitalize="none"
          spellCheck={false}
          placeholder="username"
          className={`${inputClass} min-w-[10rem] flex-1`}
        />
        <button type="submit" disabled={uPending} className="rounded-md border border-neutral-300 px-3 py-2 text-sm font-medium disabled:opacity-50">
          {uPending ? "Saving…" : "Save username"}
        </button>
      </form>
      <StatusLine state={uState} />

      <form action={eAction} className="mt-3 flex flex-wrap gap-2">
        <input type="hidden" name="userId" value={employee.userId} />
        <input
          name="email"
          type="email"
          defaultValue={employee.email ?? ""}
          placeholder="email"
          className={`${inputClass} min-w-[12rem] flex-1`}
        />
        <button type="submit" disabled={ePending} className="rounded-md border border-neutral-300 px-3 py-2 text-sm font-medium disabled:opacity-50">
          {ePending ? "Saving…" : "Save email"}
        </button>
      </form>
      <StatusLine state={eState} />

      <form action={pAction} className="mt-3 flex flex-wrap gap-2">
        <input type="hidden" name="userId" value={employee.userId} />
        <input name="password" type="password" autoComplete="new-password" placeholder="New password" className={`${inputClass} min-w-[10rem] flex-1`} />
        <input name="confirm" type="password" autoComplete="new-password" placeholder="Confirm" className={`${inputClass} min-w-[10rem] flex-1`} />
        <button type="submit" disabled={pPending} className="rounded-md bg-neutral-900 px-3 py-2 text-sm font-medium text-white disabled:opacity-50">
          {pPending ? "Updating…" : "Set password"}
        </button>
      </form>
      <StatusLine state={pState} />
    </div>
  );
}

export function EmployeePanel({ employees }: { employees: EmployeeAccount[] }) {
  if (employees.length === 0) return null;

  return (
    <section className="rounded-lg border border-neutral-200 p-4">
      <h2 className="text-base font-semibold">Employee accounts</h2>
      <p className="mt-1 text-sm text-neutral-500">
        Employees can only use the Daily Special generator — they don&apos;t have access to this Settings page.
        Change their sign-in details here.
      </p>
      <div className="mt-4 flex flex-col gap-3">
        {employees.map((e) => (
          <EmployeeAccountCard key={e.userId} employee={e} />
        ))}
      </div>
    </section>
  );
}
