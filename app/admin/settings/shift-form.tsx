"use client";

import {
  Check,
  Clock3,
  Loader2,
  Plus,
} from "lucide-react";
import { useActionState } from "react";

import {
  createShift,
  type ShiftActionState,
} from "@/lib/admin/shifts";

type DayName =
  | "saturday"
  | "sunday"
  | "monday"
  | "tuesday"
  | "wednesday"
  | "thursday"
  | "friday";

const initialState: ShiftActionState = {
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

export default function ShiftForm() {
  const [state, formAction, pending] =
    useActionState(
      createShift,
      initialState,
    );

  return (
    <form
      action={formAction}
      className="space-y-5"
    >
      <div>
        <label
          htmlFor="shift-name"
          className="mb-2 block text-xs font-semibold text-slate-600"
        >
          نام شیفت
        </label>

        <input
          id="shift-name"
          name="name"
          type="text"
          required
          maxLength={80}
          placeholder="مثلاً شیفت صبح"
          className="
            h-12
            w-full
            rounded-2xl
            border
            border-slate-200
            bg-slate-50
            px-4
            text-sm
            font-medium
            text-slate-900
            outline-none
            transition
            placeholder:text-slate-300
            hover:border-slate-300
            focus:border-slate-400
            focus:bg-white
            focus:ring-4
            focus:ring-slate-900/5
          "
        />
      </div>

      <div>
        <div className="mb-3">
          <p className="text-xs font-bold text-slate-700">
            ساعت شیفت
          </p>

          <p className="mt-1 text-[11px] leading-5 text-slate-400">
            ساعات شروع و پایان این شیفت را مشخص کنید.
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <TimeField
            id="shift-start"
            name="start"
            label="شروع شیفت"
            defaultValue="08:30"
          />

          <TimeField
            id="shift-end"
            name="end"
            label="پایان شیفت"
            defaultValue="17:00"
          />
        </div>
      </div>

      <div>
        <div className="mb-3">
          <p className="text-xs font-bold text-slate-700">
            روزهای کاری شیفت
          </p>

          <p className="mt-1 text-[11px] leading-5 text-slate-400">
            روزهایی که این شیفت فعال است را انتخاب کنید.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {days.map((day) => (
            <label
              key={day.name}
              className="
                group
                flex
                min-h-12
                cursor-pointer
                items-center
                gap-3
                rounded-2xl
                border
                border-slate-200
                bg-slate-50
                p-3
                text-slate-600
                transition
                hover:border-slate-300
                hover:bg-white
                has-[:checked]:border-slate-900
                has-[:checked]:bg-slate-950
                has-[:checked]:text-white
              "
            >
              <input
                type="checkbox"
                name={day.name}
                defaultChecked={
                  day.name !==
                  "friday"
                }
                className="peer sr-only"
              />

              <span
                className="
                  flex
                  h-7
                  w-7
                  shrink-0
                  items-center
                  justify-center
                  rounded-lg
                  border
                  border-slate-200
                  bg-white
                  text-transparent
                  transition
                  peer-checked:border-white/10
                  peer-checked:bg-white/15
                  peer-checked:text-white
                "
              >
                <Check
                  size={15}
                  strokeWidth={2.5}
                />
              </span>

              <span className="text-xs font-semibold">
                {day.label}
              </span>
            </label>
          ))}
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
            در حال ایجاد شیفت...
          </>
        ) : (
          <>
            <Plus size={17} />
            ایجاد شیفت
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
  defaultValue,
}: {
  id: string;
  name: string;
  label: string;
  defaultValue: string;
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
          defaultValue={
            defaultValue
          }
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