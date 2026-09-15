"use client";

import {
  CheckCircle2,
  Clock3,
  Loader2,
  PenLine,
  X,
  XCircle,
} from "lucide-react";
import {
  useActionState,
  useEffect,
  useState,
} from "react";

import {
  saveManualAttendance,
  type ManualAttendanceActionState,
} from "@/lib/admin/attendance";

type ManualAttendanceDialogProps = {
  userId: string;
  employeeName: string;
  dateKey: string;
  initialCheckIn: string;
  initialCheckOut: string;
  initialNote: string;
};

const initialState: ManualAttendanceActionState = {
  success: false,
  message: "",
};

export default function ManualAttendanceDialog({
  userId,
  employeeName,
  dateKey,
  initialCheckIn,
  initialCheckOut,
  initialNote,
}: ManualAttendanceDialogProps) {
  const [open, setOpen] =
    useState(false);

  const [showFeedback, setShowFeedback] =
    useState(false);

  const [
    state,
    formAction,
    pending,
  ] = useActionState(
    saveManualAttendance,
    initialState,
  );

  useEffect(() => {
    if (!pending && state.message) {
      setShowFeedback(true);

      if (state.success) {
        setOpen(false);
      }
    }
  }, [
    pending,
    state.message,
    state.success,
  ]);

  function handleOpen() {
    setShowFeedback(false);
    setOpen(true);
  }

  function handleClose() {
    if (pending) {
      return;
    }

    setShowFeedback(false);
    setOpen(false);
  }

  return (
    <>
      <button
        type="button"
        onClick={handleOpen}
        aria-label={`ثبت حضور دستی برای ${employeeName}`}
        title="ثبت / اصلاح دستی"
        className="
          inline-flex
          h-10
          items-center
          justify-center
          gap-2
          rounded-xl
          border
          border-slate-200
          bg-white
          px-3
          text-[10px]
          font-semibold
          text-slate-600
          transition
          hover:border-slate-300
          hover:bg-slate-50
          hover:text-slate-950
          active:scale-[0.98]
          sm:text-xs
        "
      >
        <PenLine size={15} />
        <span className="hidden sm:inline">
          ثبت دستی
        </span>
      </button>

      {open ? (
        <div
          className="
            fixed
            inset-0
            z-[100]
            flex
            items-end
            justify-center
            bg-slate-950/45
            p-3
            backdrop-blur-sm
            sm:items-center
            sm:p-5
          "
          onMouseDown={(event) => {
            if (
              event.target ===
              event.currentTarget
            ) {
              handleClose();
            }
          }}
        >
          <div
            dir="rtl"
            className="
              max-h-[92vh]
              w-full
              max-w-md
              overflow-y-auto
              rounded-[28px]
              border
              border-white/70
              bg-white
              p-5
              shadow-[0_25px_90px_rgba(15,23,42,0.22)]
              sm:p-6
            "
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex min-w-0 items-start gap-3">
                <div
                  className="
                    flex
                    h-10
                    w-10
                    shrink-0
                    items-center
                    justify-center
                    rounded-xl
                    bg-slate-950
                    text-white
                  "
                >
                  <PenLine size={17} />
                </div>

                <div className="min-w-0">
                  <h2 className="text-base font-bold text-slate-950">
                    ثبت / اصلاح دستی
                  </h2>

                  <p className="mt-1 truncate text-xs text-slate-400">
                    {employeeName}
                  </p>

                  <p
                    dir="ltr"
                    className="mt-1 text-[10px] font-medium text-slate-400"
                  >
                    {dateKey}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={handleClose}
                disabled={pending}
                aria-label="بستن"
                className="
                  flex
                  h-9
                  w-9
                  shrink-0
                  items-center
                  justify-center
                  rounded-xl
                  text-slate-400
                  transition
                  hover:bg-slate-100
                  hover:text-slate-700
                  disabled:opacity-50
                "
              >
                <X size={18} />
              </button>
            </div>

            <form
              action={formAction}
              className="mt-6 space-y-5"
            >
              <input
                type="hidden"
                name="userId"
                value={userId}
              />

              <input
                type="hidden"
                name="date"
                value={dateKey}
              />

              <div className="grid grid-cols-2 gap-3">
                <TimeField
                  name="checkIn"
                  label="ساعت ورود"
                  defaultValue={
                    initialCheckIn
                  }
                  required
                />

                <TimeField
                  name="checkOut"
                  label="ساعت خروج"
                  defaultValue={
                    initialCheckOut
                  }
                />
              </div>

              <div>
                <label
                  htmlFor={`manual-note-${userId}-${dateKey}`}
                  className="mb-2 block text-xs font-semibold text-slate-600"
                >
                  یادداشت
                  <span className="mr-1 font-normal text-slate-400">
                    (اختیاری)
                  </span>
                </label>

                <textarea
                  id={`manual-note-${userId}-${dateKey}`}
                  name="note"
                  defaultValue={
                    initialNote
                  }
                  rows={3}
                  maxLength={1000}
                  placeholder="مثلاً اصلاح ورود به درخواست مدیر..."
                  className="
                    w-full
                    resize-none
                    rounded-2xl
                    border
                    border-slate-200
                    bg-slate-50
                    px-4
                    py-3
                    text-sm
                    leading-6
                    text-slate-900
                    outline-none
                    transition
                    placeholder:text-slate-400
                    hover:border-slate-300
                    focus:border-slate-400
                    focus:bg-white
                    focus:ring-4
                    focus:ring-slate-900/5
                  "
                />
              </div>

              <div className="rounded-2xl border border-violet-100 bg-violet-50/70 p-3.5">
                <div className="flex items-start gap-2.5">
                  <Clock3
                    size={16}
                    className="mt-0.5 shrink-0 text-violet-600"
                  />

                  <p className="text-[10px] leading-6 text-violet-700">
                    این رکورد به‌عنوان
                    {" "}
                    <span className="font-bold">
                      ثبت دستی
                    </span>
                    {" "}
                    ذخیره می‌شود و برای تشخیص تغییرات در
                    مراحل Audit بعدی آماده خواهد بود.
                  </p>
                </div>
              </div>

              {showFeedback &&
              state.message ? (
                <div
                  role="alert"
                  className={`
                    flex
                    items-start
                    gap-2
                    rounded-2xl
                    border
                    px-3.5
                    py-3
                    text-xs
                    leading-5
                    ${
                      state.success
                        ? "border-emerald-100 bg-emerald-50 text-emerald-700"
                        : "border-red-100 bg-red-50 text-red-700"
                    }
                  `}
                >
                  {state.success ? (
                    <CheckCircle2
                      size={17}
                      className="mt-0.5 shrink-0"
                    />
                  ) : (
                    <XCircle
                      size={17}
                      className="mt-0.5 shrink-0"
                    />
                  )}

                  <span>
                    {state.message}
                  </span>
                </div>
              ) : null}

              <div className="grid grid-cols-2 gap-2.5">
                <button
                  type="button"
                  onClick={handleClose}
                  disabled={pending}
                  className="
                    h-12
                    rounded-2xl
                    bg-slate-100
                    text-sm
                    font-semibold
                    text-slate-600
                    transition
                    hover:bg-slate-200
                    active:scale-[0.99]
                    disabled:opacity-50
                  "
                >
                  انصراف
                </button>

                <button
                  type="submit"
                  disabled={pending}
                  className="
                    flex
                    h-12
                    items-center
                    justify-center
                    gap-2
                    rounded-2xl
                    bg-slate-950
                    text-sm
                    font-semibold
                    text-white
                    shadow-[0_10px_25px_rgba(15,23,42,0.12)]
                    transition
                    hover:bg-slate-800
                    active:scale-[0.99]
                    disabled:cursor-not-allowed
                    disabled:opacity-60
                  "
                >
                  {pending ? (
                    <>
                      <Loader2
                        size={17}
                        className="animate-spin"
                      />
                      در حال ذخیره...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 size={17} />
                      ذخیره رکورد
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </>
  );
}

function TimeField({
  name,
  label,
  defaultValue,
  required = false,
}: {
  name: string;
  label: string;
  defaultValue: string;
  required?: boolean;
}) {
  return (
    <div>
      <label
        htmlFor={`manual-${name}`}
        className="mb-2 block text-xs font-semibold text-slate-600"
      >
        {label}
        {required ? (
          <span className="mr-1 text-red-500">
            *
          </span>
        ) : (
          <span className="mr-1 text-[10px] font-normal text-slate-400">
            اختیاری
          </span>
        )}
      </label>

      <div className="relative">
        <Clock3
          size={16}
          className="
            pointer-events-none
            absolute
            right-3.5
            top-1/2
            -translate-y-1/2
            text-slate-400
          "
        />

        <input
          id={`manual-${name}`}
          name={name}
          type="time"
          defaultValue={defaultValue}
          required={required}
          dir="ltr"
          className="
            h-12
            w-full
            rounded-2xl
            border
            border-slate-200
            bg-slate-50
            pr-10
            pl-3
            text-sm
            font-semibold
            text-slate-900
            outline-none
            transition
            hover:border-slate-300
            focus:border-slate-400
            focus:bg-white
            focus:ring-4
            focus:ring-slate-900/5
          "
        />
      </div>
    </div>
  );
}