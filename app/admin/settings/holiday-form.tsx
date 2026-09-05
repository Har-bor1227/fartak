"use client";

import {
  CalendarPlus,
  CheckCircle2,
  Loader2,
  XCircle,
} from "lucide-react";
import {
  useActionState,
  useState,
} from "react";

import JalaliDatePicker from "@/components/shared/jalali-date-picker";

import {
  createHoliday,
  type SettingsActionState,
} from "@/lib/admin/settings";

const initialState: SettingsActionState = {
  success: false,
  message: "",
};

export default function HolidayForm() {
  const [date, setDate] =
    useState("");

  const [state, formAction, pending] =
    useActionState(
      createHoliday,
      initialState,
    );

  return (
    <form action={formAction}>
      <div>
        <label className="mb-2 block text-xs font-semibold text-slate-600">
          تاریخ تعطیلی
        </label>

        <JalaliDatePicker
          value={date}
          onChange={setDate}
          placeholder="انتخاب تاریخ شمسی"
        />

        <input
          type="hidden"
          name="date"
          value={date}
          readOnly
        />
      </div>

      <div className="mt-4">
        <label
          htmlFor="holiday-title"
          className="mb-2 block text-xs font-semibold text-slate-600"
        >
          عنوان تعطیلی
        </label>

        <input
          id="holiday-title"
          name="title"
          type="text"
          placeholder="مثلاً تعطیلی شرکت"
          required
          className="h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-400 focus:bg-white focus:ring-4 focus:ring-slate-900/5"
        />
      </div>

      <div className="mt-4">
        <label
          htmlFor="holiday-description"
          className="mb-2 block text-xs font-semibold text-slate-600"
        >
          توضیحات
          <span className="mr-1 font-normal text-slate-400">
            (اختیاری)
          </span>
        </label>

        <textarea
          id="holiday-description"
          name="description"
          rows={3}
          placeholder="توضیح کوتاه درباره این تعطیلی..."
          className="w-full resize-none rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm leading-6 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-400 focus:bg-white focus:ring-4 focus:ring-slate-900/5"
        />
      </div>

      {state.message ? (
        <div
          className={`mt-4 flex items-start gap-2 rounded-2xl px-3.5 py-3 text-xs leading-5 ${
            state.success
              ? "bg-emerald-50 text-emerald-700"
              : "bg-red-50 text-red-700"
          }`}
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

      <button
        type="submit"
        disabled={
          pending || !date
        }
        className="mt-4 flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-slate-950 text-sm font-semibold text-white shadow-lg shadow-slate-950/10 transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {pending ? (
          <>
            <Loader2
              size={17}
              className="animate-spin"
            />
            در حال ثبت...
          </>
        ) : (
          <>
            <CalendarPlus
              size={17}
            />
            ثبت تعطیلی
          </>
        )}
      </button>
    </form>
  );
}