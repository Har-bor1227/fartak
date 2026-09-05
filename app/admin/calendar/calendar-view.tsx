"use client";

import Link from "next/link";
import {
    CalendarCheck2,
    CalendarDays,
    CalendarOff,
    CheckCircle2,
    CircleAlert,
    Clock3,
    UserCheck,
    UserX,
    Users,
  } from "lucide-react";

export type CalendarDay = {
  day: number;
  dateKey: string;
  weekdayIndex: number;
  weekdayName: string;
  status:
    | "holiday"
    | "weekend"
    | "future"
    | "present"
    | "absent";
  holidayTitle: string | null;
  holidayDescription: string | null;
  attendanceCount: number;
};

export type CalendarEmployee = {
  id: string;
  name: string;
  username: string;
  phone: string | null;
  present: boolean;
};

export type CalendarRecord = {
  id: string;
  employeeName: string;
  username: string;
  checkIn: string;
  checkOut: string;
  duration: string;
  status: "OPEN" | "COMPLETED" | "MANUAL";
};

export type SelectedDaySummary = {
  dateKey: string;
  jalaliDate: string;
  displayDate: string;
  weekdayName: string;
  isWorkingDay: boolean;
  holidayTitle: string | null;
  holidayDescription: string | null;
  totalEmployees: number;
  presentCount: number;
  absentCount: number;
  records: CalendarRecord[];
  employees: CalendarEmployee[];
};

export type CalendarSummary = {
  totalDays: number;
  workingDays: number;
  holidayDays: number;
  weekendDays: number;
  futureDays: number;
  presentDays: number;
  absentDays: number;
};

type Props = {
  year: number;
  month: number;
  firstWeekdayIndex: number;
  days: CalendarDay[];
  selectedDay: SelectedDaySummary;
  summary: CalendarSummary;
};

const WEEKDAYS = [
  "شنبه",
  "یکشنبه",
  "دوشنبه",
  "سه‌شنبه",
  "چهارشنبه",
  "پنجشنبه",
  "جمعه",
];

const STATUS_STYLES: Record<
  CalendarDay["status"],
  {
    label: string;
    cell: string;
    badge: string;
  }
> = {
  holiday: {
    label: "تعطیل",
    cell:
      "border-rose-200 bg-rose-50 text-rose-900",
    badge:
      "bg-rose-100 text-rose-700",
  },

  weekend: {
    label: "غیرکاری",
    cell:
      "border-slate-200 bg-slate-50 text-slate-800",
    badge:
      "bg-slate-200 text-slate-600",
  },

  future: {
    label: "آینده",
    cell:
      "border-sky-200 bg-sky-50 text-sky-900",
    badge:
      "bg-sky-100 text-sky-700",
  },

  present: {
    label: "حضور",
    cell:
      "border-emerald-200 bg-emerald-50 text-emerald-900",
    badge:
      "bg-emerald-100 text-emerald-700",
  },

  absent: {
    label: "غیبت",
    cell:
      "border-amber-200 bg-amber-50 text-amber-900",
    badge:
      "bg-amber-100 text-amber-700",
  },
};

export default function CalendarView({
  year,
  month,
  firstWeekdayIndex,
  days,
  selectedDay,
  summary,
}: Props) {
  const emptyCells = Array.from(
    {
      length: firstWeekdayIndex,
    },
    (_, index) => index,
  );

  return (
    <div className="grid min-w-0 gap-6 xl:grid-cols-[minmax(0,1.5fr)_380px]">
      <section className="min-w-0 rounded-[28px] border border-slate-200 bg-white p-3 shadow-sm sm:p-5">
        <div className="mb-4 flex flex-col gap-3">
          <div>
            <h2 className="text-lg font-black text-slate-900">
              تقویم ماه
            </h2>

            <p className="mt-1 text-xs leading-6 text-slate-400">
              برای مشاهده جزئیات یک روز، روی همان روز کلیک کنید.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Legend
              className="bg-emerald-100 text-emerald-700"
              label="حضور"
            />

            <Legend
              className="bg-rose-100 text-rose-700"
              label="تعطیل"
            />

            <Legend
              className="bg-amber-100 text-amber-700"
              label="غیبت"
            />

            <Legend
              className="bg-slate-200 text-slate-600"
              label="غیرکاری"
            />
          </div>
        </div>

        <div className="overflow-hidden rounded-3xl border border-slate-200">
          <div className="grid grid-cols-7 bg-slate-50">
            {WEEKDAYS.map((weekday) => (
              <div
                key={weekday}
                className="border-b border-l border-slate-200 px-1 py-3 text-center text-[10px] font-black text-slate-500 sm:text-xs"
              >
                {weekday}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7">
            {emptyCells.map((index) => (
              <div
                key={`empty-${index}`}
                className="min-h-[100px] border-b border-l border-slate-100 bg-white sm:min-h-[130px]"
              />
            ))}

            {days.map((day) => {
              const styles =
                STATUS_STYLES[day.status];

              const selected =
                selectedDay.dateKey === day.dateKey;

              const monthValue =
                String(month).padStart(2, "0");

              const href =
                `/admin/calendar?month=${year}-${monthValue}&date=${day.dateKey}`;

              return (
                <Link
                  key={day.dateKey}
                  href={href}
                  className={[
                    "relative min-h-[100px] border-b border-l border-slate-100 p-2 text-right transition sm:min-h-[130px] sm:p-3",
                    styles.cell,
                    selected
                      ? "z-10 ring-2 ring-inset ring-slate-900"
                      : "hover:brightness-[0.98]",
                  ].join(" ")}
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-base font-black sm:text-lg">
                      {day.day.toLocaleString("fa-IR")}
                    </span>

                    <span
                      className={`hidden rounded-full px-2 py-1 text-[9px] font-black sm:inline-flex ${styles.badge}`}
                    >
                      {styles.label}
                    </span>
                  </div>

                  <p className="mt-2 text-[10px] font-bold opacity-60 sm:text-xs">
                    {day.weekdayName}
                  </p>

                  {day.holidayTitle ? (
                    <p className="mt-3 line-clamp-2 text-[10px] font-black leading-5 sm:text-xs">
                      {day.holidayTitle}
                    </p>
                  ) : null}

                  {day.attendanceCount > 0 ? (
                    <div className="absolute bottom-2 right-2 inline-flex items-center gap-1 rounded-full bg-white/80 px-2 py-1 text-[9px] font-black shadow-sm sm:bottom-3 sm:right-3">
                      <UserCheck className="size-3" />

                      {day.attendanceCount.toLocaleString(
                        "fa-IR",
                      )}
                    </div>
                  ) : null}
                </Link>
              );
            })}
          </div>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <MiniCard
            icon={<CalendarCheck2 className="size-4" />}
            label="روز کاری"
            value={summary.workingDays}
          />

          <MiniCard
            icon={<CalendarOff className="size-4" />}
            label="تعطیلات"
            value={summary.holidayDays}
          />

          <MiniCard
            icon={<UserCheck className="size-4" />}
            label="روز دارای حضور"
            value={summary.presentDays}
          />
        </div>
      </section>

      <SelectedDayPanel
        selectedDay={selectedDay}
      />
    </div>
  );
}

function SelectedDayPanel({
  selectedDay,
}: {
  selectedDay: SelectedDaySummary;
}) {
  const nonWorking =
    Boolean(selectedDay.holidayTitle) ||
    !selectedDay.isWorkingDay;

  return (
    <aside className="min-w-0 rounded-[28px] border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <span className="inline-flex rounded-full bg-slate-100 px-3 py-1.5 text-[10px] font-black text-slate-600">
            {selectedDay.weekdayName}
          </span>

          <h3 className="mt-3 text-xl font-black text-slate-900">
            {selectedDay.jalaliDate}
          </h3>

          <p className="mt-1 text-xs leading-6 text-slate-400">
            {selectedDay.displayDate}
          </p>
        </div>

        <div className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-slate-100 text-slate-700">
          <CalendarDays className="size-5" />
        </div>
      </div>

      {selectedDay.holidayTitle ? (
        <div className="mt-5 rounded-2xl border border-rose-200 bg-rose-50 p-4">
          <div className="flex gap-3">
            <CalendarOff className="mt-0.5 size-5 shrink-0 text-rose-600" />

            <div>
              <p className="text-xs font-black text-rose-700">
                تعطیلی
              </p>

              <p className="mt-1 text-sm font-black text-rose-900">
                {selectedDay.holidayTitle}
              </p>

              {selectedDay.holidayDescription ? (
                <p className="mt-2 text-xs leading-6 text-rose-700">
                  {selectedDay.holidayDescription}
                </p>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}

      <div className="mt-5 grid grid-cols-2 gap-3">
        <DayStat
          icon={<Users className="size-4" />}
          label="کل کارکنان"
          value={selectedDay.totalEmployees}
        />

        <DayStat
          icon={<UserCheck className="size-4" />}
          label="حاضر"
          value={selectedDay.presentCount}
        />

        <DayStat
          icon={<UserX className="size-4" />}
          label="بدون ثبت"
          value={selectedDay.absentCount}
        />

        <DayStat
          icon={<Clock3 className="size-4" />}
          label="نوع روز"
          value={
            nonWorking
              ? "غیرکاری"
              : "کاری"
          }
          small
        />
      </div>

      <div className="mt-6 border-t border-slate-100 pt-5">
        <div className="mb-3 flex items-center justify-between gap-3">
          <div>
            <h4 className="text-sm font-black text-slate-900">
              رکوردهای حضور
            </h4>

            <p className="mt-1 text-[11px] text-slate-400">
              ثبت‌های واقعی این روز
            </p>
          </div>

          <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-black text-slate-600">
            {selectedDay.records.length.toLocaleString(
              "fa-IR",
            )}{" "}
            رکورد
          </span>
        </div>

        {selectedDay.records.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-6 text-center">
            <CircleAlert className="mx-auto size-6 text-slate-400" />

            <p className="mt-3 text-sm font-black text-slate-700">
              رکورد حضوری ثبت نشده است.
            </p>

            <p className="mt-1 text-xs leading-6 text-slate-400">
              وضعیت غیبت بعداً توسط موتور حضور و غیاب محاسبه خواهد شد.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {selectedDay.records.map(
              (record) => (
                <div
                  key={record.id}
                  className="rounded-2xl border border-slate-200 bg-slate-50 p-3"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-xs font-black text-slate-900">
                        {record.employeeName}
                      </p>

                      <p className="mt-1 truncate text-[10px] text-slate-400">
                        {record.username}
                      </p>
                    </div>

                    <StatusBadge
                      status={record.status}
                    />
                  </div>

                  <div className="mt-3 grid grid-cols-3 gap-2">
                    <TimeBox
                      label="ورود"
                      value={record.checkIn}
                    />

                    <TimeBox
                      label="خروج"
                      value={record.checkOut}
                    />

                    <TimeBox
                      label="کارکرد"
                      value={record.duration}
                    />
                  </div>
                </div>
              ),
            )}
          </div>
        )}
      </div>

      <div className="mt-6 border-t border-slate-100 pt-5">
        <div className="mb-3">
          <h4 className="text-sm font-black text-slate-900">
            وضعیت کارکنان
          </h4>

          <p className="mt-1 text-[11px] text-slate-400">
            وضعیت ثبت حضور هر کارمند
          </p>
        </div>

        {selectedDay.employees.length === 0 ? (
          <div className="rounded-2xl bg-slate-50 p-5 text-center text-xs font-bold text-slate-400">
            هنوز کارمندی ثبت نشده است.
          </div>
        ) : (
          <div className="max-h-[360px] space-y-2 overflow-y-auto pl-1">
            {selectedDay.employees.map(
              (employee) => (
                <div
                  key={employee.id}
                  className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-3"
                >
                  <div className="min-w-0">
                    <p className="truncate text-xs font-black text-slate-900">
                      {employee.name}
                    </p>

                    <p className="mt-1 truncate text-[10px] text-slate-400">
                      {employee.username}
                    </p>
                  </div>

                  <span
                    className={[
                      "inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-black",
                      employee.present
                        ? "bg-emerald-100 text-emerald-700"
                        : "bg-amber-100 text-amber-700",
                    ].join(" ")}
                  >
                    {employee.present ? (
                      <>
                        <UserCheck className="size-3.5" />
                        حاضر
                      </>
                    ) : (
                      <>
                        <UserX className="size-3.5" />
                        بدون ثبت
                      </>
                    )}
                  </span>
                </div>
              ),
            )}
          </div>
        )}
      </div>
    </aside>
  );
}

function Legend({
  className,
  label,
}: {
  className: string;
  label: string;
}) {
  return (
    <span
      className={`rounded-full px-2.5 py-1 text-[10px] font-black ${className}`}
    >
      {label}
    </span>
  );
}

function MiniCard({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
      <div className="flex items-center gap-2">
        <div className="flex size-9 items-center justify-center rounded-xl bg-white text-slate-600 shadow-sm">
          {icon}
        </div>

        <div>
          <p className="text-[10px] font-bold text-slate-400">
            {label}
          </p>

          <p className="mt-1 text-sm font-black text-slate-900">
            {value.toLocaleString("fa-IR")}
          </p>
        </div>
      </div>
    </div>
  );
}

function DayStat({
  icon,
  label,
  value,
  small = false,
}: {
  icon: React.ReactNode;
  label: string;
  value: number | string;
  small?: boolean;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
      <div className="flex items-center gap-2">
        <div className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-white text-slate-600">
          {icon}
        </div>

        <div className="min-w-0">
          <p className="text-[10px] font-bold text-slate-400">
            {label}
          </p>

          <p
            className={[
              "mt-1 font-black text-slate-900",
              small
                ? "text-xs"
                : "text-lg",
            ].join(" ")}
          >
            {typeof value === "number"
              ? value.toLocaleString("fa-IR")
              : value}
          </p>
        </div>
      </div>
    </div>
  );
}

function TimeBox({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="min-w-0 rounded-xl bg-white p-2">
      <p className="text-[9px] font-bold text-slate-400">
        {label}
      </p>

      <p className="mt-1 truncate text-[10px] font-black text-slate-700">
        {value}
      </p>
    </div>
  );
}

function StatusBadge({
  status,
}: {
  status:
    | "OPEN"
    | "COMPLETED"
    | "MANUAL";
}) {
  if (status === "OPEN") {
    return (
      <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-sky-100 px-2.5 py-1 text-[10px] font-black text-sky-700">
        <Clock3 className="size-3.5" />
        در حال کار
      </span>
    );
  }

  if (status === "MANUAL") {
    return (
      <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-violet-100 px-2.5 py-1 text-[10px] font-black text-violet-700">
        <CheckCircle2 className="size-3.5" />
        دستی
      </span>
    );
  }

  return (
    <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-emerald-100 px-2.5 py-1 text-[10px] font-black text-emerald-700">
      <CheckCircle2 className="size-3.5" />
      تکمیل
    </span>
  );
}