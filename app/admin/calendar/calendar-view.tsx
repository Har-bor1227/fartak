"use client";

import Link from "next/link";
import {
  ArrowRightLeft,
  BriefcaseBusiness,
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
    | "absent"
    | "leave";
  holidayTitle: string | null;
  holidayDescription: string | null;
  attendanceCount: number;
  leaveCount: number;
  temporaryExitCount: number;
  openTemporaryExitCount: number;
};

export type CalendarLeaveType =
  | "ANNUAL"
  | "SICK"
  | "UNPAID"
  | "OTHER";

export type CalendarTemporaryExitType =
  | "TEMPORARY"
  | "MISSION";

export type CalendarTemporaryExitStatus =
  | "OPEN"
  | "COMPLETED";

export type CalendarTemporaryExit = {
  id: string;
  type: CalendarTemporaryExitType;
  status: CalendarTemporaryExitStatus;
  startedAt: string;
  endedAt: string;
  duration: string;
  reason: string | null;
  note: string | null;
};

export type CalendarEmployee = {
  id: string;
  name: string;
  username: string;
  phone: string | null;
  present: boolean;
  onLeave: boolean;
  leaveType: CalendarLeaveType | null;
  hasOpenTemporaryExit: boolean;
  hasMission: boolean;
};

export type CalendarRecord = {
  id: string;
  employeeName: string;
  username: string;
  checkIn: string;
  checkOut: string;
  duration: string;
  status: "OPEN" | "COMPLETED" | "MANUAL";
  temporaryExitCount: number;
  openTemporaryExitCount: number;
  temporaryExitMinutes: number;
  missionMinutes: number;
  temporaryExits: CalendarTemporaryExit[];
};

export type SelectedDaySummary = {
  dateKey: string;
  jalaliDate: string;
  displayDate: string;
  weekdayName: string;
  isWorkingDay: boolean;
  isFuture: boolean;
  holidayTitle: string | null;
  holidayDescription: string | null;
  totalEmployees: number;
  presentCount: number;
  leaveCount: number;
  absentCount: number;
  temporaryExitCount: number;
  openTemporaryExitCount: number;
  temporaryExitMinutes: number;
  missionMinutes: number;
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
  leaveDays: number;
  temporaryExitCount: number;
  openTemporaryExitCount: number;
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

  leave: {
    label: "مرخصی",
    cell:
      "border-violet-200 bg-violet-50 text-violet-900",
    badge:
      "bg-violet-100 text-violet-700",
  },
};

const LEAVE_TYPE_LABELS: Record<
  CalendarLeaveType,
  string
> = {
  ANNUAL: "استحقاقی",
  SICK: "استعلاجی",
  UNPAID: "بدون حقوق",
  OTHER: "سایر",
};

const TEMPORARY_EXIT_TYPE_LABELS: Record<
  CalendarTemporaryExitType,
  string
> = {
  TEMPORARY: "خروج موقت",
  MISSION: "مأموریت",
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
    <div className="grid min-w-0 gap-5 xl:grid-cols-[minmax(0,1.5fr)_410px]">
      <section className="min-w-0 rounded-[28px] border border-slate-200/80 bg-white p-3 shadow-[0_10px_35px_rgba(15,23,42,0.045)] sm:p-5">
        <div className="mb-4 flex flex-col gap-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-slate-950 text-white">
                  <CalendarDays className="size-4" />
                </div>

                <div>
                  <h2 className="text-base font-black text-slate-900 sm:text-lg">
                    تقویم ماه
                  </h2>

                  <p className="mt-1 text-[11px] leading-5 text-slate-400 sm:text-xs">
                    برای مشاهده جزئیات، روز موردنظر را انتخاب کنید.
                  </p>
                </div>
              </div>
            </div>

            <div className="flex shrink-0 flex-wrap gap-1.5">
              <Legend
                className="bg-emerald-100 text-emerald-700"
                label="حضور"
              />

              <Legend
                className="bg-violet-100 text-violet-700"
                label="مرخصی"
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
        </div>

        <div className="overflow-hidden rounded-3xl border border-slate-200">
          <div className="grid grid-cols-7 bg-slate-50">
            {WEEKDAYS.map((weekday) => (
              <div
                key={weekday}
                className="
                  border-b
                  border-l
                  border-slate-200
                  px-1
                  py-3
                  text-center
                  text-[9px]
                  font-black
                  text-slate-500
                  sm:text-xs
                "
              >
                {weekday}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7">
            {emptyCells.map((index) => (
              <div
                key={`empty-${index}`}
                className="
                  min-h-[92px]
                  border-b
                  border-l
                  border-slate-100
                  bg-white
                  sm:min-h-[130px]
                "
              />
            ))}

            {days.map((day) => {
              const styles =
                STATUS_STYLES[day.status];

              const selected =
                selectedDay.dateKey ===
                day.dateKey;

              const monthValue =
                String(month).padStart(2, "0");

              const href =
                `/admin/calendar?month=${year}-${monthValue}&date=${day.dateKey}`;

              return (
                <Link
                  key={day.dateKey}
                  href={href}
                  aria-current={
                    selected
                      ? "date"
                      : undefined
                  }
                  className={[
                    "group relative min-h-[92px] border-b border-l border-slate-100 p-2 text-right transition sm:min-h-[130px] sm:p-3",
                    styles.cell,
                    selected
                      ? "z-10 ring-2 ring-inset ring-slate-950"
                      : "hover:brightness-[0.98]",
                  ].join(" ")}
                >
                  <div className="flex items-start justify-between gap-1.5">
                    <span className="text-sm font-black sm:text-lg">
                      {day.day.toLocaleString(
                        "fa-IR",
                      )}
                    </span>

                    <span
                      className={`
                        hidden
                        rounded-full
                        px-2
                        py-1
                        text-[9px]
                        font-black
                        sm:inline-flex
                        ${styles.badge}
                      `}
                    >
                      {styles.label}
                    </span>
                  </div>

                  <p className="mt-1.5 truncate text-[9px] font-bold opacity-60 sm:mt-2 sm:text-xs">
                    {day.weekdayName}
                  </p>

                  {day.holidayTitle ? (
                    <p className="mt-2 line-clamp-2 text-[9px] font-black leading-4 sm:mt-3 sm:text-xs sm:leading-5">
                      {day.holidayTitle}
                    </p>
                  ) : null}

                  {day.leaveCount > 0 ? (
                    <div
                      className="
                        mt-2
                        inline-flex
                        max-w-full
                        items-center
                        gap-1
                        rounded-full
                        bg-violet-100/90
                        px-2
                        py-1
                        text-[8px]
                        font-black
                        text-violet-700
                        shadow-sm
                        sm:mt-3
                        sm:text-[9px]
                      "
                    >
                      <CalendarDays className="size-3" />

                      {day.leaveCount.toLocaleString(
                        "fa-IR",
                      )}

                      <span className="hidden sm:inline">
                        مرخصی
                      </span>
                    </div>
                  ) : null}

                  {day.attendanceCount > 0 ? (
                    <div
                      className="
                        absolute
                        bottom-2
                        right-2
                        inline-flex
                        items-center
                        gap-1
                        rounded-full
                        bg-white/85
                        px-2
                        py-1
                        text-[8px]
                        font-black
                        text-slate-700
                        shadow-sm
                        backdrop-blur-sm
                        sm:bottom-3
                        sm:right-3
                        sm:text-[9px]
                      "
                    >
                      <UserCheck className="size-3" />

                      {day.attendanceCount.toLocaleString(
                        "fa-IR",
                      )}

                      <span className="hidden sm:inline">
                        نفر
                      </span>
                    </div>
                  ) : null}

                  {day.temporaryExitCount >
                  0 ? (
                    <div
                      className="
                        absolute
                        bottom-2
                        left-2
                        inline-flex
                        items-center
                        gap-1
                        rounded-full
                        bg-white/90
                        px-2
                        py-1
                        text-[8px]
                        font-black
                        text-sky-700
                        shadow-sm
                        backdrop-blur-sm
                        sm:bottom-3
                        sm:left-3
                        sm:text-[9px]
                      "
                    >
                      <ArrowRightLeft className="size-3" />

                      {day.temporaryExitCount.toLocaleString(
                        "fa-IR",
                      )}

                      <span className="hidden sm:inline">
                        خروج
                      </span>

                      {day.openTemporaryExitCount >
                      0 ? (
                        <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                      ) : null}
                    </div>
                  ) : null}

                  {selected ? (
                    <span
                      className="
                        absolute
                        top-2
                        left-2
                        h-1.5
                        w-1.5
                        rounded-full
                        bg-slate-950
                        sm:top-3
                        sm:left-3
                      "
                    />
                  ) : null}
                </Link>
              );
            })}
          </div>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-6">
          <MiniCard
            icon={
              <CalendarCheck2 className="size-4" />
            }
            label="روز کاری"
            value={summary.workingDays}
          />

          <MiniCard
            icon={
              <CalendarOff className="size-4" />
            }
            label="تعطیلات"
            value={summary.holidayDays}
          />

          <MiniCard
            icon={
              <CalendarDays className="size-4" />
            }
            label="روز مرخصی"
            value={summary.leaveDays}
          />

          <MiniCard
            icon={
              <UserCheck className="size-4" />
            }
            label="روز دارای حضور"
            value={summary.presentDays}
          />

          <MiniCard
            icon={
              <ArrowRightLeft className="size-4" />
            }
            label="تعداد خروج"
            value={
              summary.temporaryExitCount
            }
          />

          <MiniCard
            icon={
              <Clock3 className="size-4" />
            }
            label="خروج باز"
            value={
              summary.openTemporaryExitCount
            }
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

  const hasEmployees =
    selectedDay.totalEmployees > 0;

  const attendanceRate =
    !nonWorking &&
    !selectedDay.isFuture &&
    hasEmployees
      ? Math.round(
          (selectedDay.presentCount /
            selectedDay.totalEmployees) *
            100,
        )
      : 0;

  return (
    <aside className="min-w-0 rounded-[28px] border border-slate-200/80 bg-white p-4 shadow-[0_10px_35px_rgba(15,23,42,0.045)] sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <span
            className="
              inline-flex
              rounded-full
              bg-slate-100
              px-3
              py-1.5
              text-[10px]
              font-black
              text-slate-600
            "
          >
            {selectedDay.weekdayName}
          </span>

          <h3 className="mt-3 text-xl font-black tracking-tight text-slate-900">
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

      {selectedDay.isFuture ? (
        <div className="mt-5 rounded-2xl border border-sky-200 bg-sky-50 p-4">
          <div className="flex gap-3">
            <Clock3 className="mt-0.5 size-5 shrink-0 text-sky-600" />

            <div className="min-w-0">
              <p className="text-xs font-black text-sky-700">
                تاریخ آینده
              </p>

              <p className="mt-1 text-xs leading-6 text-sky-700">
                وضعیت حضور این روز هنوز محاسبه نشده است.
              </p>
            </div>
          </div>
        </div>
      ) : null}

      {selectedDay.holidayTitle ? (
        <div className="mt-5 rounded-2xl border border-rose-200 bg-rose-50 p-4">
          <div className="flex gap-3">
            <CalendarOff className="mt-0.5 size-5 shrink-0 text-rose-600" />

            <div className="min-w-0">
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

      {!selectedDay.isWorkingDay &&
      !selectedDay.holidayTitle ? (
        <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <div className="flex items-start gap-3">
            <CalendarOff className="mt-0.5 size-5 shrink-0 text-slate-500" />

            <div>
              <p className="text-xs font-black text-slate-700">
                روز غیرکاری
              </p>

              <p className="mt-1 text-xs leading-6 text-slate-500">
                این روز طبق برنامه شرکت روز کاری محسوب نمی‌شود.
              </p>
            </div>
          </div>
        </div>
      ) : null}

      {selectedDay.leaveCount > 0 ? (
        <div className="mt-5 rounded-2xl border border-violet-200 bg-violet-50 p-4">
          <div className="flex gap-3">
            <CalendarDays className="mt-0.5 size-5 shrink-0 text-violet-600" />

            <div className="min-w-0">
              <p className="text-xs font-black text-violet-700">
                مرخصی‌های ثبت‌شده
              </p>

              <p className="mt-1 text-sm font-black text-violet-900">
                {selectedDay.leaveCount.toLocaleString(
                  "fa-IR",
                )}{" "}
                نفر در مرخصی هستند
              </p>

              <p className="mt-1 text-xs leading-6 text-violet-700">
                مرخصی افراد دارای رکورد حضور واقعی، در وضعیت حضور اولویت کمتری دارد.
              </p>
            </div>
          </div>
        </div>
      ) : null}

      {selectedDay.temporaryExitCount >
      0 ? (
        <div className="mt-5 rounded-2xl border border-sky-200 bg-sky-50 p-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-2">
              <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-white text-sky-600 shadow-sm">
                <ArrowRightLeft className="size-4" />
              </div>

              <div className="min-w-0">
                <p className="text-xs font-black text-slate-900">
                  خروج‌ها و مأموریت‌ها
                </p>

                <p className="mt-1 text-[10px] text-slate-400">
                  {selectedDay.temporaryExitCount.toLocaleString(
                    "fa-IR",
                  )}{" "}
                  مورد ثبت شده
                </p>
              </div>
            </div>

            {selectedDay.openTemporaryExitCount >
            0 ? (
              <span className="rounded-full bg-amber-100 px-2.5 py-1 text-[10px] font-black text-amber-700">
                {selectedDay.openTemporaryExitCount.toLocaleString(
                  "fa-IR",
                )}{" "}
                باز
              </span>
            ) : null}
          </div>

          <div className="mt-3 grid grid-cols-2 gap-2">
            <div className="rounded-xl bg-white p-3">
              <p className="text-[10px] text-slate-400">
                کل زمان خروج
              </p>

              <p className="mt-1 text-xs font-black text-sky-700">
                {formatMinutes(
                  selectedDay.temporaryExitMinutes,
                )}
              </p>
            </div>

            <div className="rounded-xl bg-white p-3">
              <p className="text-[10px] text-slate-400">
                زمان مأموریت
              </p>

              <p className="mt-1 text-xs font-black text-violet-700">
                {formatMinutes(
                  selectedDay.missionMinutes,
                )}
              </p>
            </div>
          </div>
        </div>
      ) : null}

      <div className="mt-5 grid grid-cols-2 gap-3">
        <DayStat
          icon={
            <Users className="size-4" />
          }
          label="کل کارکنان"
          value={
            selectedDay.totalEmployees
          }
        />

        <DayStat
          icon={
            <UserCheck className="size-4" />
          }
          label="حاضر"
          value={
            selectedDay.presentCount
          }
          valueClass={
            "text-emerald-700"
          }
        />

        <DayStat
          icon={
            <CalendarDays className="size-4" />
          }
          label="مرخصی"
          value={
            selectedDay.leaveCount
          }
          valueClass={
            "text-violet-700"
          }
        />

        <DayStat
          icon={
            <UserX className="size-4" />
          }
          label="بدون ثبت"
          value={
            selectedDay.absentCount
          }
          valueClass={
            nonWorking
              ? "text-slate-500"
              : "text-amber-700"
          }
        />

        <DayStat
          icon={
            <ArrowRightLeft className="size-4" />
          }
          label="تعداد خروج"
          value={
            selectedDay.temporaryExitCount
          }
          valueClass="text-sky-700"
        />

        <DayStat
          icon={
            <Clock3 className="size-4" />
          }
          label="نوع روز"
          value={
            nonWorking
              ? selectedDay.holidayTitle
                ? "تعطیل"
                : "غیرکاری"
              : selectedDay.isFuture
                ? "آینده"
                : selectedDay.leaveCount >
                    0 &&
                  selectedDay.presentCount ===
                    0
                  ? "مرخصی"
                  : "کاری"
          }
          small
        />
      </div>

      {!nonWorking &&
      !selectedDay.isFuture &&
      hasEmployees ? (
        <div className="mt-4 rounded-2xl border border-slate-100 bg-slate-50 p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[10px] font-bold text-slate-400">
                نرخ حضور
              </p>

              <p className="mt-1 text-lg font-black text-slate-900">
                {attendanceRate.toLocaleString(
                  "fa-IR",
                )}
                <span className="mr-1 text-xs font-bold text-slate-400">
                  درصد
                </span>
              </p>
            </div>

            <div className="flex size-10 items-center justify-center rounded-xl bg-white text-emerald-600 shadow-sm">
              <UserCheck className="size-4" />
            </div>
          </div>

          <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-200">
            <div
              className="h-full rounded-full bg-emerald-500 transition-all"
              style={{
                width: `${Math.min(
                  attendanceRate,
                  100,
                )}%`,
              }}
            />
          </div>

          <div className="mt-2 flex items-center justify-between gap-3 text-[9px] font-semibold">
            <span className="text-emerald-600">
              {selectedDay.presentCount.toLocaleString(
                "fa-IR",
              )}{" "}
              حاضر
            </span>

            <span className="text-violet-600">
              {selectedDay.leaveCount.toLocaleString(
                "fa-IR",
              )}{" "}
              مرخصی
            </span>

            <span className="text-sky-600">
              {selectedDay.temporaryExitCount.toLocaleString(
                "fa-IR",
              )}{" "}
              خروج
            </span>
          </div>
        </div>
      ) : null}

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

        {selectedDay.records.length ===
        0 ? (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-6 text-center">
            <CircleAlert className="mx-auto size-6 text-slate-400" />

            <p className="mt-3 text-sm font-black text-slate-700">
              رکورد حضوری ثبت نشده است.
            </p>

            <p className="mt-1 text-xs leading-6 text-slate-400">
              وضعیت غیبت یا مرخصی از روی اطلاعات روز محاسبه می‌شود.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {selectedDay.records.map(
              (record) => (
                <div
                  key={record.id}
                  className="
                    rounded-2xl
                    border
                    border-slate-200
                    bg-slate-50
                    p-3
                    transition
                    hover:border-slate-300
                    hover:bg-white
                  "
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

                  {record.temporaryExitCount >
                  0 ? (
                    <div className="mt-3 rounded-2xl border border-sky-100 bg-sky-50/70 p-3">
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2">
                          <ArrowRightLeft className="size-4 text-sky-600" />

                          <span className="text-xs font-black text-slate-900">
                            خروج‌ها
                          </span>

                          <span className="rounded-full bg-white px-2 py-1 text-[9px] font-black text-sky-700 shadow-sm">
                            {record.temporaryExitCount.toLocaleString(
                              "fa-IR",
                            )}
                          </span>
                        </div>

                        <span className="text-[10px] font-black text-sky-700">
                          {formatMinutes(
                            record.temporaryExitMinutes,
                          )}
                        </span>
                      </div>

                      <div className="mt-2 space-y-2">
                        {record.temporaryExits.map(
                          (exit) => (
                            <TemporaryExitRow
                              key={exit.id}
                              exit={exit}
                            />
                          ),
                        )}
                      </div>
                    </div>
                  ) : null}
                </div>
              ),
            )}
          </div>
        )}
      </div>

      <div className="mt-6 border-t border-slate-100 pt-5">
        <div className="mb-3 flex items-center justify-between gap-3">
          <div>
            <h4 className="text-sm font-black text-slate-900">
              وضعیت کارکنان
            </h4>

            <p className="mt-1 text-[11px] text-slate-400">
              وضعیت حضور، مرخصی و خروج
            </p>
          </div>

          {!nonWorking &&
          !selectedDay.isFuture &&
          hasEmployees ? (
            <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-black text-emerald-700">
              {attendanceRate.toLocaleString(
                "fa-IR",
              )}
              ٪ حضور
            </span>
          ) : null}
        </div>

        {selectedDay.employees.length ===
        0 ? (
          <div className="rounded-2xl bg-slate-50 p-5 text-center text-xs font-bold text-slate-400">
            هنوز کارمندی ثبت نشده است.
          </div>
        ) : (
          <div className="max-h-[420px] space-y-2 overflow-y-auto pl-1">
            {selectedDay.employees.map(
              (employee) => (
                <EmployeePresenceRow
                  key={employee.id}
                  employee={employee}
                  nonWorking={
                    nonWorking ||
                    selectedDay.isFuture
                  }
                />
              ),
            )}
          </div>
        )}
      </div>
    </aside>
  );
}

function TemporaryExitRow({
  exit,
}: {
  exit: CalendarTemporaryExit;
}) {
  const mission =
    exit.type === "MISSION";

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span
          className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-black ${
            mission
              ? "border-violet-200 bg-violet-50 text-violet-700"
              : "border-sky-200 bg-sky-50 text-sky-700"
          }`}
        >
          {mission ? (
            <BriefcaseBusiness className="size-3.5" />
          ) : (
            <ArrowRightLeft className="size-3.5" />
          )}

          {
            TEMPORARY_EXIT_TYPE_LABELS[
              exit.type
            ]
          }
        </span>

        <span
          className={`rounded-full px-2.5 py-1 text-[10px] font-black ${
            exit.status === "OPEN"
              ? "bg-amber-100 text-amber-700"
              : "bg-emerald-100 text-emerald-700"
          }`}
        >
          {exit.status === "OPEN"
            ? "باز"
            : "تکمیل شده"}
        </span>
      </div>

      <div className="mt-3 grid grid-cols-3 gap-2">
        <TimeBox
          label="شروع"
          value={exit.startedAt}
        />

        <TimeBox
          label="پایان"
          value={exit.endedAt}
        />

        <TimeBox
          label="مدت"
          value={exit.duration}
        />
      </div>

      {exit.reason ? (
        <p className="mt-2 text-xs leading-6 text-slate-600">
          <span className="font-black text-slate-800">
            دلیل:
          </span>{" "}
          {exit.reason}
        </p>
      ) : null}

      {exit.note ? (
        <p className="mt-1 text-xs leading-6 text-slate-500">
          <span className="font-black text-slate-700">
            توضیح:
          </span>{" "}
          {exit.note}
        </p>
      ) : null}
    </div>
  );
}

function EmployeePresenceRow({
  employee,
  nonWorking,
}: {
  employee: CalendarEmployee;
  nonWorking: boolean;
}) {
  const label = nonWorking
    ? "غیرکاری"
    : employee.hasOpenTemporaryExit
      ? "خروج باز"
      : employee.present
        ? "حاضر"
        : employee.onLeave
          ? "مرخصی"
          : "بدون ثبت";

  const icon = nonWorking ? (
    <CalendarOff className="size-3.5" />
  ) : employee.hasOpenTemporaryExit ? (
    <ArrowRightLeft className="size-3.5" />
  ) : employee.present ? (
    <UserCheck className="size-3.5" />
  ) : employee.onLeave ? (
    <CalendarDays className="size-3.5" />
  ) : (
    <UserX className="size-3.5" />
  );

  const badgeClass = nonWorking
    ? "bg-slate-100 text-slate-500"
    : employee.hasOpenTemporaryExit
      ? "bg-amber-100 text-amber-700"
      : employee.present
        ? "bg-emerald-100 text-emerald-700"
        : employee.onLeave
          ? "bg-violet-100 text-violet-700"
          : "bg-amber-100 text-amber-700";

  return (
    <div
      className="
        flex
        items-center
        justify-between
        gap-3
        rounded-2xl
        border
        border-slate-200
        bg-white
        p-3
        transition
        hover:border-slate-300
      "
    >
      <div className="flex min-w-0 items-center gap-3">
        <div
          className={`
            flex
            size-9
            shrink-0
            items-center
            justify-center
            rounded-xl
            text-[10px]
            font-black
            ${
              employee.hasOpenTemporaryExit &&
              !nonWorking
                ? "bg-amber-100 text-amber-700"
                : employee.present &&
                    !nonWorking
                  ? "bg-slate-950 text-white"
                  : employee.onLeave &&
                      !nonWorking
                    ? "bg-violet-100 text-violet-700"
                    : "bg-slate-100 text-slate-400"
            }
          `}
        >
          {employee.name
            .split(" ")
            .filter(Boolean)
            .slice(0, 2)
            .map(
              (part) => part[0],
            )
            .join("")}
        </div>

        <div className="min-w-0">
          <p className="truncate text-xs font-black text-slate-900">
            {employee.name}
          </p>

          <p className="mt-1 truncate text-[10px] text-slate-400">
            {employee.username}
          </p>

          {employee.onLeave &&
          employee.leaveType &&
          !nonWorking ? (
            <p className="mt-1 truncate text-[9px] font-bold text-violet-500">
              {LEAVE_TYPE_LABELS[
                employee.leaveType
              ]}
            </p>
          ) : null}

          {employee.hasMission &&
          !nonWorking ? (
            <p className="mt-1 truncate text-[9px] font-bold text-violet-500">
              سابقه مأموریت در این روز
            </p>
          ) : null}
        </div>
      </div>

      <span
        className={`
          inline-flex
          shrink-0
          items-center
          gap-1.5
          rounded-full
          px-2.5
          py-1
          text-[10px]
          font-black
          ${badgeClass}
        `}
      >
        {icon}
        {label}
      </span>
    </div>
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
      className={`
        rounded-full
        px-2.5
        py-1
        text-[9px]
        font-black
        sm:text-[10px]
        ${className}
      `}
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
        <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-white text-slate-600 shadow-sm">
          {icon}
        </div>

        <div className="min-w-0">
          <p className="text-[10px] font-bold text-slate-400">
            {label}
          </p>

          <p className="mt-1 text-sm font-black text-slate-900">
            {value.toLocaleString(
              "fa-IR",
            )}
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
  valueClass = "text-slate-900",
}: {
  icon: React.ReactNode;
  label: string;
  value: number | string;
  small?: boolean;
  valueClass?: string;
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
              "mt-1 truncate font-black",
              small
                ? "text-xs"
                : "text-lg",
              valueClass,
            ].join(" ")}
          >
            {typeof value === "number"
              ? value.toLocaleString(
                  "fa-IR",
                )
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

function formatMinutes(
  totalMinutes: number,
) {
  const safeMinutes = Math.max(
    0,
    Math.floor(totalMinutes),
  );

  const hours = Math.floor(
    safeMinutes / 60,
  );

  const minutes =
    safeMinutes % 60;

  if (hours === 0) {
    return `${minutes.toLocaleString(
      "fa-IR",
    )} دقیقه`;
  }

  if (minutes === 0) {
    return `${hours.toLocaleString(
      "fa-IR",
    )} ساعت`;
  }

  return `${hours.toLocaleString(
    "fa-IR",
  )} ساعت و ${minutes.toLocaleString(
    "fa-IR",
  )} دقیقه`;
}