"use client";

import {
  useActionState,
  useEffect,
} from "react";
import { useFormStatus } from "react-dom";
import { CalendarDays, Loader2 } from "lucide-react";

import {
  assignEmployeeShift,
  type EmployeeShiftActionState,
} from "@/lib/admin/employee-shifts";

type Employee = {
  id: string;
  firstName: string;
  lastName: string;
  username: string;
};

type Shift = {
  id: string;
  name: string;
  startMinutes: number;
  endMinutes: number;
};

type EmployeeShiftFormProps = {
  employees: Employee[];
  shifts: Shift[];
};

const initialState: EmployeeShiftActionState = {
  success: false,
  message: "",
};

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-slate-950 px-5 text-sm font-semibold text-white shadow-lg shadow-slate-950/10 transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
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
          <CalendarDays size={17} />
          ثبت انتساب شیفت
        </>
      )}
    </button>
  );
}

export default function EmployeeShiftForm({
  employees,
  shifts,
}: EmployeeShiftFormProps) {
  const [state, formAction] =
    useActionState(
      assignEmployeeShift,
      initialState,
    );

  useEffect(() => {
    if (!state.message) {
      return;
    }

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }, [state]);

  return (
    <form
      action={formAction}
      className="mt-6 space-y-5"
    >
      <div>
        <label
          htmlFor="employee-shift-user"
          className="mb-2 block text-sm font-semibold text-slate-700"
        >
          کارمند
        </label>

        <select
          id="employee-shift-user"
          name="userId"
          required
          defaultValue=""
          className="h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm text-slate-900 outline-none transition focus:border-slate-400 focus:bg-white focus:ring-4 focus:ring-slate-900/5"
        >
          <option value="" disabled>
            انتخاب کارمند
          </option>

          {employees.map(
            (employee) => (
              <option
                key={employee.id}
                value={employee.id}
              >
                {employee.firstName}{" "}
                {employee.lastName} — @
                {employee.username}
              </option>
            ),
          )}
        </select>
      </div>

      <div>
        <label
          htmlFor="employee-shift-shift"
          className="mb-2 block text-sm font-semibold text-slate-700"
        >
          شیفت
        </label>

        <select
          id="employee-shift-shift"
          name="shiftId"
          required
          defaultValue=""
          className="h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm text-slate-900 outline-none transition focus:border-slate-400 focus:bg-white focus:ring-4 focus:ring-slate-900/5"
        >
          <option value="" disabled>
            انتخاب شیفت
          </option>

          {shifts.map((shift) => (
            <option
              key={shift.id}
              value={shift.id}
            >
              {shift.name}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label
          htmlFor="employee-shift-start"
          className="mb-2 block text-sm font-semibold text-slate-700"
        >
          تاریخ شروع
        </label>

        <input
          id="employee-shift-start"
          name="startsAt"
          type="date"
          required
          className="h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm text-slate-900 outline-none transition focus:border-slate-400 focus:bg-white focus:ring-4 focus:ring-slate-900/5"
        />

        <p className="mt-1.5 text-[10px] leading-5 text-slate-400">
          تاریخ را با قالب میلادی مرورگر وارد کنید؛
          سیستم آن را با زمان‌بندی تهران ذخیره می‌کند.
        </p>
      </div>

      <div>
        <label
          htmlFor="employee-shift-end"
          className="mb-2 block text-sm font-semibold text-slate-700"
        >
          تاریخ پایان
          <span className="mr-1 font-normal text-slate-400">
            (اختیاری)
          </span>
        </label>

        <input
          id="employee-shift-end"
          name="endsAt"
          type="date"
          className="h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm text-slate-900 outline-none transition focus:border-slate-400 focus:bg-white focus:ring-4 focus:ring-slate-900/5"
        />

        <p className="mt-1.5 text-[10px] leading-5 text-slate-400">
          خالی بگذارید تا شیفت بدون تاریخ پایان
          ادامه داشته باشد.
        </p>
      </div>

      {state.message ? (
        <div
          className={`rounded-2xl px-4 py-3 text-xs leading-6 ${
            state.success
              ? "bg-emerald-50 text-emerald-700"
              : "bg-rose-50 text-rose-700"
          }`}
        >
          {state.message}
        </div>
      ) : null}

      {employees.length === 0 ? (
        <div className="rounded-2xl bg-amber-50 px-4 py-3 text-xs leading-6 text-amber-700">
          در حال حاضر کارمند فعالی برای اختصاص
          شیفت وجود ندارد.
        </div>
      ) : null}

      {shifts.length === 0 ? (
        <div className="rounded-2xl bg-amber-50 px-4 py-3 text-xs leading-6 text-amber-700">
          ابتدا حداقل یک شیفت فعال در تنظیمات ایجاد
          کنید.
        </div>
      ) : null}

      <SubmitButton />
    </form>
  );
}