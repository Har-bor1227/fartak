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
    <div className="w-full rounded-[22px] border border-slate-200/80 bg-white p-2 shadow-[0_8px_30px_rgba(15,23,42,0.04)] sm:w-auto">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() =>
              navigate(
                shiftDate(
                  date,
                  -1,
                ),
              )
            }
            className="
              flex
              h-10
              items-center
              justify-center
              gap-2
              rounded-xl
              bg-slate-50
              px-3
              text-[11px]
              font-semibold
              text-slate-600
              transition
              hover:bg-slate-100
              hover:text-slate-950
              active:scale-[0.99]
              sm:px-4
            "
          >
            <ChevronRight
              size={16}
            />

            روز قبل
          </button>

          <button
            type="button"
            onClick={() =>
              navigate(
                shiftDate(
                  date,
                  1,
                ),
              )
            }
            className="
              flex
              h-10
              items-center
              justify-center
              gap-2
              rounded-xl
              bg-slate-50
              px-3
              text-[11px]
              font-semibold
              text-slate-600
              transition
              hover:bg-slate-100
              hover:text-slate-950
              active:scale-[0.99]
              sm:px-4
            "
          >
            روز بعد

            <ChevronLeft
              size={16}
            />
          </button>
        </div>

        <label className="relative block min-w-0">
          <CalendarDays
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
            type="date"
            value={date}
            onChange={(event) =>
              navigate(
                event.target.value,
              )
            }
            className="
              h-10
              w-full
              appearance-none
              rounded-xl
              border
              border-slate-200
              bg-white
              pr-10
              pl-3
              text-xs
              font-semibold
              text-slate-700
              outline-none
              transition
              hover:border-slate-300
              focus:border-slate-400
              focus:ring-4
              focus:ring-slate-900/5
              sm:w-[185px]
            "
            aria-label="انتخاب تاریخ"
          />
        </label>
      </div>
    </div>
  );
}