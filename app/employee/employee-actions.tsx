"use client";

import {
  Loader2,
  LogIn,
  LogOut,
} from "lucide-react";
import {
  useActionState,
  useEffect,
} from "react";

import {
  checkIn,
  checkOut,
  type AttendanceActionState,
} from "@/lib/employee/attendance";

const initialState: AttendanceActionState = {
  success: false,
  message: "",
};

function ActionMessage({
  state,
}: {
  state: AttendanceActionState;
}) {
  if (!state.message || state.success) {
    return null;
  }

  return (
    <p
      role="alert"
      className="mt-3 rounded-2xl bg-red-50 px-4 py-3 text-xs leading-5 text-red-700"
    >
      {state.message}
    </p>
  );
}

export function CheckInButton() {
  const [state, formAction, pending] =
    useActionState(
      checkIn,
      initialState,
    );

  useEffect(() => {
    if (!state.success) {
      return;
    }

    window.location.reload();
  }, [state.success]);

  return (
    <div>
      <form action={formAction}>
        <button
          type="submit"
          disabled={pending}
          aria-disabled={pending}
          className="
            flex h-16 w-full
            items-center justify-center
            gap-3 rounded-[22px]
            bg-emerald-600
            px-5
            text-base font-bold
            text-white
            shadow-xl
            shadow-emerald-600/20
            transition
            hover:bg-emerald-700
            active:scale-[0.99]
            disabled:cursor-not-allowed
            disabled:opacity-60
          "
        >
          {pending ? (
            <Loader2
              size={21}
              className="animate-spin"
              aria-hidden="true"
            />
          ) : (
            <LogIn
              size={21}
              aria-hidden="true"
            />
          )}

          <span>
            {pending
              ? "در حال ثبت ورود..."
              : "ثبت ورود"}
          </span>
        </button>
      </form>

      <ActionMessage state={state} />
    </div>
  );
}

export function CheckOutButton() {
  const [state, formAction, pending] =
    useActionState(
      checkOut,
      initialState,
    );

  useEffect(() => {
    if (!state.success) {
      return;
    }

    window.location.reload();
  }, [state.success]);

  return (
    <div>
      <form action={formAction}>
        <button
          type="submit"
          disabled={pending}
          aria-disabled={pending}
          className="
            flex h-16 w-full
            items-center justify-center
            gap-3 rounded-[22px]
            bg-slate-950
            px-5
            text-base font-bold
            text-white
            shadow-xl
            shadow-slate-950/15
            transition
            hover:bg-slate-800
            active:scale-[0.99]
            disabled:cursor-not-allowed
            disabled:opacity-60
          "
        >
          {pending ? (
            <Loader2
              size={21}
              className="animate-spin"
              aria-hidden="true"
            />
          ) : (
            <LogOut
              size={21}
              aria-hidden="true"
            />
          )}

          <span>
            {pending
              ? "در حال ثبت خروج..."
              : "ثبت خروج"}
          </span>
        </button>
      </form>

      <ActionMessage state={state} />
    </div>
  );
}