"use client";

import {
  Check,
  Clock3,
  Loader2,
  Save,
} from "lucide-react";
import {
  useActionState,
} from "react";

import {
  saveWorkSchedule,
  type SettingsActionState,
} from "@/lib/admin/settings";

type WorkScheduleFormProps = {
  workStart: string;
  workEnd: string;

  saturday: boolean;
  sunday: boolean;
  monday: boolean;
  tuesday: boolean;
  wednesday: boolean;
  thursday: boolean;
  friday: boolean;
};

type DayName =
  | "saturday"
  | "sunday"
  | "monday"
  | "tuesday"
  | "wednesday"
  | "thursday"
  | "friday";

const initialState: SettingsActionState = {
  success: false,
  message: "",
};

const days: Array<{
  name: DayName;
  label: string;
}> = [
  {
    name: "saturday",
    label: "شنبه",
  },
  {
    name: "sunday",
    label: "یکشنبه",
  },
  {
    name: "monday",
    label: "دوشنبه",
  },
  {
    name: "tuesday",
    label: "سه‌شنبه",
  },
  {
    name: "wednesday",
    label: "چهارشنبه",
  },
  {
    name: "thursday",
    label: "پنجشنبه",
  },
  {
    name: "friday",
    label: "جمعه",
  },
];

export default function WorkScheduleForm({
  workStart,
  workEnd,
  saturday,
  sunday,
  monday,
  tuesday,
  wednesday,
  thursday,
  friday,
}: WorkScheduleFormProps) {
  const [state, formAction, pending] =
    useActionState(
      saveWorkSchedule,
      initialState,
    );

  const selectedDays: Record<
    DayName,
    boolean
  > = {
    saturday,
    sunday,
    monday,
    tuesday,
    wednesday,
    thursday,
    friday,
  };

  return (
    <form action={formAction}>
      <div className="grid gap-5 md:grid-cols-2">
        <div>
          <label
            htmlFor="work-start"
            className="mb-2 block text-xs font-semibold text-slate-600"
          >
            ساعت شروع کار
          </label>

          <div className="relative">
            <Clock3
              size={17}
              className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-slate-400"
            />

            <input
              id="work-start"
              name="workStart"
              type="time"
              defaultValue={workStart}
              required
              className="h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 pr-11 pl-4 text-sm font-medium text-slate-900 outline-none transition focus:border-slate-400 focus:bg-white focus:ring-4 focus:ring-slate-900/5"
            />
          </div>
        </div>

        <div>
          <label
            htmlFor="work-end"
            className="mb-2 block text-xs font-semibold text-slate-600"
          >
            ساعت پایان کار
          </label>

          <div className="relative">
            <Clock3
              size={17}
              className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-slate-400"
            />

            <input
              id="work-end"
              name="workEnd"
              type="time"
              defaultValue={workEnd}
              required
              className="h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 pr-11 pl-4 text-sm font-medium text-slate-900 outline-none transition focus:border-slate-400 focus:bg-white focus:ring-4 focus:ring-slate-900/5"
            />
          </div>
        </div>
      </div>

      <div className="mt-6">
        <div className="mb-3">
          <p className="text-xs font-semibold text-slate-700">
            روزهای کاری
          </p>

          <p className="mt-1 text-[11px] text-slate-400">
            روزهایی که شرکت به‌صورت معمول فعال است را انتخاب کنید.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {days.map((day) => {
            const checked =
              selectedDays[day.name];

            return (
              <label
                key={day.name}
                className={
                  checked
                    ? "flex cursor-pointer items-center gap-3 rounded-2xl border border-slate-900 bg-slate-950 p-3 text-white transition"
                    : "flex cursor-pointer items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-3 text-slate-600 transition hover:bg-white"
                }
              >
                <input
                  type="checkbox"
                  name={day.name}
                  defaultChecked={checked}
                  className="sr-only"
                />

                <span
                  className={
                    checked
                      ? "flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-white/15"
                      : "flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-white"
                  }
                >
                  {checked ? (
                    <Check
                      size={15}
                      strokeWidth={2.5}
                    />
                  ) : null}
                </span>

                <span className="text-xs font-semibold">
                  {day.label}
                </span>
              </label>
            );
          })}
        </div>
      </div>

      {state.message ? (
        <div
          role="status"
          className={
            state.success
              ? "mt-5 rounded-2xl bg-emerald-50 px-4 py-3 text-xs leading-5 text-emerald-700"
              : "mt-5 rounded-2xl bg-red-50 px-4 py-3 text-xs leading-5 text-red-700"
          }
        >
          {state.message}
        </div>
      ) : null}

      <button
        type="submit"
        disabled={pending}
        className="mt-5 flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-slate-950 text-sm font-semibold text-white shadow-lg shadow-slate-950/10 transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
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
            <Save size={17} />
            ذخیره برنامه کاری
          </>
        )}
      </button>
    </form>
  );
}