"use client";

import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { useRouter } from "next/navigation";

type AttendanceFiltersProps = {
  date: string;
};

function shiftDate(
  dateString: string,
  days: number,
) {
  const date = new Date(
    `${dateString}T12:00:00`,
  );

  date.setDate(
    date.getDate() + days,
  );

  return [
    date.getFullYear(),
    String(
      date.getMonth() + 1,
    ).padStart(2, "0"),
    String(
      date.getDate(),
    ).padStart(2, "0"),
  ].join("-");
}

export default function AttendanceFilters({
  date,
}: AttendanceFiltersProps) {
  const router = useRouter();

  function navigate(
    nextDate: string,
  ) {
    router.push(
      `/admin/attendance?date=${nextDate}`,
    );
  }

  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() =>
            navigate(
              shiftDate(date, -1),
            )
          }
          className="
            flex h-11
            items-center justify-center
            gap-2 rounded-2xl
            border border-slate-200
            bg-white px-4
            text-xs font-semibold
            text-slate-600
            transition
            hover:bg-slate-50
          "
        >
          <ChevronRight
            size={17}
          />

          روز قبل
        </button>

        <button
          type="button"
          onClick={() =>
            navigate(
              shiftDate(date, 1),
            )
          }
          className="
            flex h-11
            items-center justify-center
            gap-2 rounded-2xl
            border border-slate-200
            bg-white px-4
            text-xs font-semibold
            text-slate-600
            transition
            hover:bg-slate-50
          "
        >
          روز بعد

          <ChevronLeft
            size={17}
          />
        </button>
      </div>

      <label className="relative block">
        <CalendarDays
          size={17}
          className="
            pointer-events-none
            absolute right-4
            top-1/2
            -translate-y-1/2
            text-slate-400
          "
        />

        <input
          type="date"
          value={date}
          onChange={(event) =>
            navigate(
              event.target.value,
            )
          }
          className="
            h-11 w-full
            appearance-none
            rounded-2xl
            border border-slate-200
            bg-white
            pr-11 pl-4
            text-sm
            font-medium
            text-slate-700
            outline-none
            transition
            focus:border-slate-400
            focus:ring-4
            focus:ring-slate-900/5
            sm:w-[190px]
          "
          aria-label="انتخاب تاریخ"
        />
      </label>
    </div>
  );
}