"use client";

import {
  ArrowRightLeft,
  BriefcaseBusiness,
  Loader2,
  MapPinOff,
  RotateCcw,
} from "lucide-react";
import {
  useActionState,
  useEffect,
} from "react";

import {
  returnFromTemporaryExit,
  startTemporaryExit,
  type TemporaryExitActionState,
} from "@/lib/employee/attendance";

const initialState: TemporaryExitActionState = {
  success: false,
  message: "",
};

export default function TemporaryExitActions({
  hasOpenExit,
}: {
  hasOpenExit: boolean;
}) {
  const [
    startState,
    startAction,
    startPending,
  ] = useActionState(
    startTemporaryExit,
    initialState,
  );
  const [
    returnState,
    returnAction,
    returnPending,
  ] = useActionState(
    returnFromTemporaryExit,
    initialState,
  );

  useEffect(() => {
    if (
      !startState.success &&
      !returnState.success
    ) {
      return;
    }

    window.location.reload();
  }, [
    startState.success,
    returnState.success,
  ]);

  if (hasOpenExit) {
    return (
      <div className="mt-5 rounded-[24px] border border-amber-200/80 bg-amber-50/70 p-4 sm:p-5">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-amber-100 text-amber-700">
            <ArrowRightLeft
              size={19}
            />
          </div>

          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold text-amber-900">
              خروج موقت فعال است
            </p>

            <p className="mt-1 text-[11px] leading-5 text-amber-700/80">
              شما در حال خروج از محل کار هستید. برای ادامه ثبت حضور، بازگشت خود را ثبت کنید.
            </p>
          </div>
        </div>

        <form
          action={returnAction}
          className="mt-4"
        >
          <button
            type="submit"
            disabled={returnPending}
            aria-disabled={
              returnPending
            }
            className="
              flex
              h-14
              w-full
              items-center
              justify-center
              gap-2.5
              rounded-[18px]
              bg-amber-600
              px-5
              text-sm
              font-bold
              text-white
              shadow-lg
              shadow-amber-600/15
              transition
              hover:bg-amber-700
              active:scale-[0.99]
              disabled:cursor-not-allowed
              disabled:opacity-60
            "
          >
            {returnPending ? (
              <Loader2
                size={18}
                className="animate-spin"
                aria-hidden="true"
              />
            ) : (
              <RotateCcw
                size={18}
                aria-hidden="true"
              />
            )}

            <span>
              {returnPending
                ? "در حال ثبت بازگشت..."
                : "ثبت بازگشت"}
            </span>
          </button>
        </form>

        {!returnState.success &&
        returnState.message ? (
          <p
            role="alert"
            className="mt-3 rounded-2xl bg-rose-50 px-3.5 py-3 text-xs leading-5 text-rose-700"
          >
            {returnState.message}
          </p>
        ) : null}
      </div>
    );
  }

  return (
    <div className="mt-5 rounded-[24px] border border-slate-200/80 bg-slate-50/70 p-4 sm:p-5">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-white text-slate-700 shadow-sm">
          <MapPinOff size={19} />
        </div>

        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold text-slate-900">
            خروج در طول روز
          </p>

          <p className="mt-1 text-[11px] leading-5 text-slate-400">
            برای خروج کوتاه‌مدت یا انجام مأموریت، گزینه مناسب را ثبت کنید.
          </p>
        </div>
      </div>

      <form
        action={startAction}
        className="mt-4"
      >
        <div className="grid grid-cols-2 gap-2.5">
          <button
            type="submit"
            name="type"
            value="TEMPORARY"
            disabled={startPending}
            aria-disabled={
              startPending
            }
            className="
              flex
              h-14
              items-center
              justify-center
              gap-2
              rounded-[18px]
              border
              border-slate-200
              bg-white
              px-3
              text-xs
              font-bold
              text-slate-700
              shadow-sm
              transition
              hover:border-slate-300
              hover:bg-slate-50
              active:scale-[0.99]
              disabled:cursor-not-allowed
              disabled:opacity-60
            "
          >
            {startPending ? (
              <Loader2
                size={17}
                className="animate-spin"
                aria-hidden="true"
              />
            ) : (
              <ArrowRightLeft
                size={17}
                aria-hidden="true"
              />
            )}

            <span>
              خروج موقت
            </span>
          </button>

          <button
            type="submit"
            name="type"
            value="MISSION"
            disabled={startPending}
            aria-disabled={
              startPending
            }
            className="
              flex
              h-14
              items-center
              justify-center
              gap-2
              rounded-[18px]
              bg-slate-950
              px-3
              text-xs
              font-bold
              text-white
              shadow-lg
              shadow-slate-950/10
              transition
              hover:bg-slate-800
              active:scale-[0.99]
              disabled:cursor-not-allowed
              disabled:opacity-60
            "
          >
            {startPending ? (
              <Loader2
                size={17}
                className="animate-spin"
                aria-hidden="true"
              />
            ) : (
              <BriefcaseBusiness
                size={17}
                aria-hidden="true"
              />
            )}

            <span>
              شروع مأموریت
            </span>
          </button>
        </div>
      </form>

      {!startState.success &&
      startState.message ? (
        <p
          role="alert"
          className="mt-3 rounded-2xl bg-rose-50 px-3.5 py-3 text-xs leading-5 text-rose-700"
        >
          {startState.message}
        </p>
      ) : null}
    </div>
  );
}