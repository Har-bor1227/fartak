"use client";

import {
  useActionState,
  useState,
} from "react";

import {
  useFormStatus,
} from "react-dom";

import {
  AlertCircle,
  CalendarDays,
  CheckCircle2,
  FileText,
  Loader2,
} from "lucide-react";

import JalaliDatePicker from "@/components/shared/jalali-date-picker";

import {
  createLeaveRequest,
  type LeaveActionState,
} from "@/lib/employee/leave";

const initialState: LeaveActionState = {
  success: false,
  message: "",
};

function SubmitButton() {
  const {
    pending,
  } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="
        flex
        h-12
        w-full
        items-center
        justify-center
        gap-2
        rounded-2xl
        bg-slate-950
        px-5
        text-sm
        font-bold
        text-white
        shadow-[0_10px_30px_rgba(15,23,42,0.12)]
        transition
        hover:bg-slate-800
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
          در حال ثبت درخواست...
        </>
      ) : (
        "ثبت درخواست مرخصی"
      )}
    </button>
  );
}

export default function LeaveForm() {
  const [
    state,
    formAction,
  ] = useActionState(
    createLeaveRequest,
    initialState,
  );

  const [
    startDate,
    setStartDate,
  ] = useState("");

  const [
    endDate,
    setEndDate,
  ] = useState("");

  function handleStartDateChange(
    value: string,
  ) {
    setStartDate(value);

    /*
     * اگر تاریخ پایان قبلی قبل از تاریخ
     * شروع جدید باشد، آن را پاک می‌کنیم.
     */
    if (
      value &&
      endDate &&
      endDate < value
    ) {
      setEndDate("");
    }
  }

  return (
    <form
      action={formAction}
      className="space-y-5"
    >
      {state.message ? (
        <div
          className={`
            flex
            items-start
            gap-3
            rounded-2xl
            border
            px-4
            py-3.5
            text-xs
            leading-6
            ${
              state.success
                ? "border-emerald-100 bg-emerald-50 text-emerald-700"
                : "border-rose-100 bg-rose-50 text-rose-700"
            }
          `}
          role="alert"
        >
          <div className="mt-0.5 shrink-0">
            {state.success ? (
              <CheckCircle2
                size={17}
              />
            ) : (
              <AlertCircle
                size={17}
              />
            )}
          </div>

          <p>
            {state.message}
          </p>
        </div>
      ) : null}

      <Field label="نوع مرخصی">
        <select
          name="type"
          defaultValue="ANNUAL"
          className="
            h-12
            w-full
            rounded-2xl
            border
            border-slate-200
            bg-white
            px-4
            text-sm
            font-medium
            text-slate-900
            outline-none
            transition
            focus:border-slate-400
            focus:ring-4
            focus:ring-slate-950/5
          "
        >
          <option value="ANNUAL">
            مرخصی استحقاقی
          </option>

          <option value="SICK">
            مرخصی استعلاجی
          </option>

          <option value="UNPAID">
            مرخصی بدون حقوق
          </option>

          <option value="OTHER">
            سایر
          </option>
        </select>
      </Field>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="تاریخ شروع">
          <JalaliDatePicker
            name="startDate"
            value={startDate}
            onChange={handleStartDateChange}
            placeholder="انتخاب تاریخ شروع"
          />
        </Field>

        <Field label="تاریخ پایان">
          <JalaliDatePicker
            name="endDate"
            value={endDate}
            onChange={setEndDate}
            placeholder="انتخاب تاریخ پایان"
            min={startDate || undefined}
          />
        </Field>
      </div>

      <div className="rounded-2xl border border-blue-100 bg-blue-50/70 px-4 py-3.5">
        <div className="flex items-start gap-3">
          <CalendarDays
            size={17}
            className="mt-0.5 shrink-0 text-blue-600"
          />

          <p className="text-xs leading-6 text-blue-700">
            تاریخ‌ها با تقویم شمسی انتخاب می‌شوند.
            تاریخ پایان نیز نمی‌تواند قبل از تاریخ شروع باشد.
          </p>
        </div>
      </div>

      <Field
        label="توضیحات"
        hint="اختیاری"
      >
        <div className="relative">
          <FileText
            size={17}
            className="
              pointer-events-none
              absolute
              right-4
              top-4
              text-slate-400
            "
          />

          <textarea
            name="reason"
            rows={4}
            maxLength={1000}
            placeholder="در صورت نیاز، توضیحات درخواست را وارد کنید..."
            className="
              min-h-[120px]
              w-full
              resize-none
              rounded-2xl
              border
              border-slate-200
              bg-white
              px-4
              pb-4
              pl-4
              pr-11
              pt-3.5
              text-sm
              leading-6
              text-slate-900
              outline-none
              transition
              placeholder:text-slate-300
              focus:border-slate-400
              focus:ring-4
              focus:ring-slate-950/5
            "
          />
        </div>
      </Field>

      <div className="pt-1">
        <SubmitButton />
      </div>

      <p className="text-center text-[11px] leading-5 text-slate-400">
        درخواست شما پس از ثبت برای بررسی مدیر ارسال می‌شود.
      </p>
    </form>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <div className="mb-2 flex items-center justify-between gap-3">
        <span className="text-xs font-bold text-slate-700">
          {label}
        </span>

        {hint ? (
          <span className="text-[10px] text-slate-400">
            {hint}
          </span>
        ) : null}
      </div>

      {children}
    </label>
  );
}