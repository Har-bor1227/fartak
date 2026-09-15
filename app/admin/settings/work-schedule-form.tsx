"use client";

import {
  Check,
  Clock3,
  Loader2,
  Save,
} from "lucide-react";
import { useActionState } from "react";

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
    <form
      action={formAction}
      className="space-y-6"
    >
      <div>
        <div className="mb-3">
          <p className="text-xs font-bold text-slate-700">
            ساعات کاری
          </p>

          <p className="mt-1 text-[11px] leading-5 text-slate-400">
            زمان شروع و پایان برنامه معمول شرکت را مشخص کنید.
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <TimeField
            id="work-start"
            name="workStart"
            label="ساعت شروع کار"
            value={workStart}
          />

          <TimeField
            id="work-end"
            name="workEnd"
            label="ساعت پایان کار"
            value={workEnd}
          />
        </div>
      </div>

      <div>
        <div className="mb-3">
          <p className="text-xs font-bold text-slate-700">
            روزهای کاری
          </p>

          <p className="mt-1 text-[11px] leading-5 text-slate-400">
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
                className={`
                  group
                  flex
                  min-h-12
                  cursor-pointer
                  items-center
                  gap-3
                  rounded-2xl
                  border
                  p-3
                  transition
                  ${
                    checked
                      ? "border-slate-900 bg-slate-950 text-white shadow-[0_6px_18px_rgba(15,23,42,0.10)]"
                      : "border-slate-200 bg-slate-50 text-slate-600 hover:border-slate-300 hover:bg-white"
                  }
                `}
              >
                <input
                  type="checkbox"
                  name={day.name}
                  defaultChecked={checked}
                  className="sr-only"
                />

                <span
                  className={`
                    flex
                    h-7
                    w-7
                    shrink-0
                    items-center
                    justify-center
                    rounded-lg
                    transition
                    ${
                      checked
                        ? "bg-white/15 text-white"
                        : "border border-slate-200 bg-white text-transparent group-hover:border-slate-300"
                    }
                  `}
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
          className={`
            rounded-2xl
            border
            px-4
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
          {state.message}
        </div>
      ) : null}

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
          px-4
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
            <Save size={17} />
            ذخیره برنامه کاری
          </>
        )}
      </button>
    </form>
  );
}

function TimeField({
  id,
  name,
  label,
  value,
}: {
  id: string;
  name: string;
  label: string;
  value: string;
}) {
  return (
    <div>
      <label
        htmlFor={id}
        className="mb-2 block text-xs font-semibold text-slate-600"
      >
        {label}
      </label>

      <div className="relative">
        <Clock3
          size={17}
          className="
            pointer-events-none
            absolute
            right-4
            top-1/2
            -translate-y-1/2
            text-slate-400
          "
        />

        <input
          id={id}
          name={name}
          type="time"
          defaultValue={value}
          required
          className="
            h-12
            w-full
            rounded-2xl
            border
            border-slate-200
            bg-slate-50
            pr-11
            pl-4
            text-sm
            font-medium
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