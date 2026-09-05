import {
  CalendarDays,
  CheckCircle2,
  Clock3,
  LogIn,
  MinusCircle,
  TriangleAlert,
  UserX,
} from "lucide-react";

import EmployeeDuration from "./employee-duration";
import EmployeeShell from "./employee-shell";

import {
  CheckInButton,
  CheckOutButton,
} from "./employee-actions";

import { requireEmployee } from "@/lib/auth/current-user";

import {
  calculateAttendanceDay,
  type AttendanceCalculation,
  type AttendanceHoliday,
  type AttendanceRecord as EngineAttendanceRecord,
  type AttendanceSchedule,
} from "@/lib/attendance/engine";

import {
  formatDate,
  formatTime,
  getDateKey,
  getDateRange,
  getPersianWeekday,
  getTodayRange,
} from "@/lib/date/tehran";

import { prisma } from "@/lib/prisma";

type HistoryItem = {
  id: string;
  workDate: Date;
  checkIn: Date | null;
  checkOut: Date | null;
  calculation: AttendanceCalculation;
};

function formatMinutes(
  totalMinutes: number,
): string {
  if (totalMinutes <= 0) {
    return "۰ دقیقه";
  }

  const hours = Math.floor(
    totalMinutes / 60,
  );

  const minutes =
    totalMinutes % 60;

  if (hours === 0) {
    return `${minutes} دقیقه`;
  }

  if (minutes === 0) {
    return `${hours} ساعت`;
  }

  return `${hours} ساعت و ${minutes} دقیقه`;
}

function getStateText(
  state: AttendanceCalculation["state"],
): string {
  switch (state) {
    case "PRESENT":
      return "حاضر";

    case "WORKING":
      return "در حال حضور";

    case "ABSENT":
      return "غایب";

    case "HOLIDAY":
      return "تعطیل";

    case "NON_WORKING":
      return "روز غیرکاری";

    case "FUTURE":
      return "آینده";

    default:
      return "نامشخص";
  }
}

function getStateClass(
  state: AttendanceCalculation["state"],
): string {
  switch (state) {
    case "PRESENT":
      return "bg-emerald-50 text-emerald-700";

    case "WORKING":
      return "bg-blue-50 text-blue-700";

    case "ABSENT":
      return "bg-rose-50 text-rose-700";

    case "HOLIDAY":
      return "bg-violet-50 text-violet-700";

    case "NON_WORKING":
      return "bg-slate-100 text-slate-600";

    case "FUTURE":
      return "bg-amber-50 text-amber-700";

    default:
      return "bg-slate-100 text-slate-500";
  }
}

function getStateIcon(
  state: AttendanceCalculation["state"],
) {
  switch (state) {
    case "PRESENT":
      return CheckCircle2;

    case "WORKING":
      return Clock3;

    case "ABSENT":
      return UserX;

    case "HOLIDAY":
      return CalendarDays;

    case "NON_WORKING":
      return MinusCircle;

    case "FUTURE":
      return Clock3;

    default:
      return TriangleAlert;
  }
}

function toEngineAttendance(
  attendance: {
    workDate: Date;
    checkIn: Date | null;
    checkOut: Date | null;
    status: string;
    note: string | null;
  } | null,
): EngineAttendanceRecord | null {
  if (!attendance) {
    return null;
  }

  return {
    workDate: attendance.workDate,
    checkIn: attendance.checkIn,
    checkOut: attendance.checkOut,
    status: attendance.status,
    note: attendance.note,
  } as EngineAttendanceRecord;
}

function toEngineHoliday(
  holiday: {
    date: Date;
    title: string;
    description: string | null;
  } | null,
): AttendanceHoliday | null {
  if (!holiday) {
    return null;
  }

  return {
    workDate: holiday.date,
    title: holiday.title,
    description: holiday.description,
  } as AttendanceHoliday;
}

export default async function EmployeePage() {
  const user =
    await requireEmployee();

  const {
    start,
    end,
  } = getTodayRange();

  /*
   * این سه Query مستقل‌اند و همزمان اجرا می‌شوند.
   * در مرحله بعد فقط برای تعطیلات تاریخچه یک Query
   * دیگر داریم؛ دیگر N+1 Query نداریم.
   */
  const [
    todayAttendance,
    historyRecords,
    settings,
    todayHoliday,
  ] = await Promise.all([
    prisma.attendance.findUnique({
      where: {
        userId_workDate: {
          userId: user.id,
          workDate: start,
        },
      },
    }),

    prisma.attendance.findMany({
      where: {
        userId: user.id,
        workDate: {
          lt: end,
        },
      },
      orderBy: {
        workDate: "desc",
      },
      take: 20,
    }),

    prisma.companySettings.findUnique({
      where: {
        id: "company",
      },
    }),

    prisma.holiday.findUnique({
      where: {
        date: start,
      },
    }),
  ]);

  const schedule: AttendanceSchedule =
    settings ?? {
      workStartMinutes: 510,
      workEndMinutes: 1020,

      saturday: true,
      sunday: true,
      monday: true,
      tuesday: true,
      wednesday: true,
      thursday: true,
      friday: false,
    };

  const todayCalculation =
    calculateAttendanceDay({
      workDate: start,
      schedule,
      holiday:
        toEngineHoliday(
          todayHoliday,
        ),
      attendance:
        toEngineAttendance(
          todayAttendance,
        ),
    });

  /*
   * فقط به اندازه بازه‌ای که تاریخچه واقعاً
   * پوشش می‌دهد تعطیلات را می‌گیریم.
   */
  let historyHolidays: {
    date: Date;
    title: string;
    description: string | null;
  }[] = [];

  const oldestHistoryDate =
    historyRecords.length > 0
      ? historyRecords[
          historyRecords.length - 1
        ].workDate
      : null;

  if (oldestHistoryDate) {
    historyHolidays =
      await prisma.holiday.findMany({
        where: {
          date: {
            gte: oldestHistoryDate,
            lt: end,
          },
        },
        orderBy: {
          date: "asc",
        },
      });
  }

  const holidayMap =
    new Map<
      string,
      AttendanceHoliday
    >();

  for (const holiday of historyHolidays) {
    holidayMap.set(
      getDateKey(holiday.date),
      toEngineHoliday(
        holiday,
      )!,
    );
  }

  const history: HistoryItem[] =
    historyRecords.map(
      (item) => {
        const dateKey =
          getDateKey(
            item.workDate,
          );

        const range =
          getDateRange(
            dateKey,
          );

        const holiday =
          holidayMap.get(
            dateKey,
          ) ?? null;

        const calculation =
          calculateAttendanceDay({
            workDate:
              range?.start ??
              item.workDate,
            schedule,
            holiday,
            attendance:
              toEngineAttendance(
                item,
              ),
          });

        return {
          id: item.id,
          workDate:
            item.workDate,
          checkIn:
            item.checkIn,
          checkOut:
            item.checkOut,
          calculation,
        };
      },
    );

  const hasCheckedIn =
    Boolean(
      todayCalculation.checkIn,
    );

  const hasCheckedOut =
    Boolean(
      todayCalculation.checkOut,
    );

  const isWorking =
    todayCalculation.state ===
    "WORKING";

  const isCompleted =
    todayCalculation.state ===
    "PRESENT";

  const isHoliday =
    todayCalculation.state ===
    "HOLIDAY";

  const isNonWorking =
    todayCalculation.state ===
    "NON_WORKING";

  const todayLabel =
    `${getPersianWeekday(
      new Date(),
    )}، ${formatDate(
      new Date(),
    )}`;

  return (
    <EmployeeShell
      firstName={
        user.firstName
      }
      lastName={
        user.lastName
      }
    >
      <section>
        <p className="text-sm font-medium text-slate-400">
          {todayLabel}
        </p>

        <h1 className="mt-2 text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">
          سلام، {user.firstName} 👋
        </h1>

        <p className="mt-2 text-sm leading-6 text-slate-500">
          وضعیت حضور امروز خود را از اینجا مدیریت کنید.
        </p>
      </section>

      <section className="mt-5 overflow-hidden rounded-[30px] border border-slate-200/80 bg-white shadow-[0_15px_50px_rgba(15,23,42,0.06)]">
        {isHoliday ? (
          <div className="p-5 sm:p-7">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-violet-50 text-violet-600">
                <CalendarDays
                  size={22}
                />
              </div>

              <div>
                <div className="inline-flex items-center rounded-full bg-violet-50 px-3 py-1.5 text-[11px] font-semibold text-violet-700">
                  روز تعطیل
                </div>

                <h2 className="mt-4 text-xl font-bold text-slate-950">
                  امروز تعطیل است
                </h2>

                <p className="mt-2 text-sm leading-6 text-slate-500">
                  {todayCalculation.holiday?.title ??
                    "امروز در تقویم شرکت تعطیل ثبت شده است."}
                </p>

                {todayCalculation
                  .holiday
                  ?.description ? (
                  <p className="mt-2 text-xs leading-5 text-slate-400">
                    {
                      todayCalculation
                        .holiday
                        .description
                    }
                  </p>
                ) : null}
              </div>
            </div>
          </div>
        ) : isNonWorking ? (
          <div className="p-5 sm:p-7">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-slate-100 text-slate-500">
                <MinusCircle
                  size={22}
                />
              </div>

              <div>
                <div className="inline-flex items-center rounded-full bg-slate-100 px-3 py-1.5 text-[11px] font-semibold text-slate-600">
                  روز غیرکاری
                </div>

                <h2 className="mt-4 text-xl font-bold text-slate-950">
                  امروز در برنامه کاری نیست
                </h2>

                <p className="mt-2 text-sm leading-6 text-slate-500">
                  امروز طبق برنامه کاری شرکت روز کاری محسوب نمی‌شود.
                </p>
              </div>
            </div>
          </div>
        ) : isWorking ? (
          <div className="p-5 sm:p-7">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1.5 text-[11px] font-semibold text-emerald-700">
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />
                  در حال حضور
                </div>

                <h2 className="mt-5 text-xl font-bold text-slate-950">
                  شما داخل شرکت هستید
                </h2>

                <p className="mt-2 text-xs leading-5 text-slate-400">
                  زمان حضور شما از لحظه ورود در حال محاسبه است.
                </p>
              </div>

              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
                <Clock3 size={21} />
              </div>
            </div>

            <div className="mt-8 grid grid-cols-2 gap-3">
              <div className="rounded-2xl bg-slate-50 p-4">
                <div className="flex items-center gap-2 text-xs text-slate-400">
                  <LogIn size={14} />
                  ورود
                </div>

                <p className="mt-2 text-lg font-bold text-slate-950">
                  {formatTime(
                    todayCalculation.checkIn,
                  )}
                </p>
              </div>

              <div className="rounded-2xl bg-slate-50 p-4">
                <div className="flex items-center gap-2 text-xs text-slate-400">
                  <Clock3 size={14} />
                  مدت حضور
                </div>

                {todayCalculation.checkIn ? (
                  <div className="mt-2">
                    <EmployeeDuration
                      checkIn={todayCalculation.checkIn.toISOString()}
                    />
                  </div>
                ) : null}
              </div>
            </div>

            <div className="mt-5">
              <CheckOutButton />
            </div>
          </div>
        ) : isCompleted ? (
          <div className="p-5 sm:p-7">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
                <CheckCircle2
                  size={22}
                />
              </div>

              <div>
                <div className="inline-flex items-center rounded-full bg-blue-50 px-3 py-1.5 text-[11px] font-semibold text-blue-700">
                  روز کاری تکمیل شد
                </div>

                <h2 className="mt-4 text-xl font-bold text-slate-950">
                  امروز خداقوت! 👏
                </h2>

                <p className="mt-2 text-sm leading-6 text-slate-500">
                  حضور امروز شما به‌طور کامل ثبت شده است.
                </p>
              </div>
            </div>

            <div className="mt-7 grid grid-cols-3 gap-2 sm:gap-3">
              <TimeBox
                label="ورود"
                value={formatTime(
                  todayCalculation.checkIn,
                )}
              />

              <TimeBox
                label="خروج"
                value={formatTime(
                  todayCalculation.checkOut,
                )}
              />

              <TimeBox
                label="مدت"
                value={formatMinutes(
                  todayCalculation.workedMinutes,
                )}
                compact
              />
            </div>
          </div>
        ) : (
          <div className="p-5 sm:p-7">
            <div className="relative overflow-hidden rounded-[26px] bg-slate-950 p-6 text-white sm:p-8">
              <div className="absolute -left-16 -top-16 h-52 w-52 rounded-full bg-blue-500/20 blur-3xl" />

              <div className="relative">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10">
                  <LogIn size={21} />
                </div>

                <h2 className="mt-6 text-2xl font-bold">
                  هنوز حضور نزده‌اید
                </h2>

                <p className="mt-2 max-w-md text-sm leading-6 text-slate-400">
                  برای شروع ثبت ساعت کاری، ورود خود را ثبت کنید.
                </p>

                <div className="mt-6">
                  <CheckInButton />
                </div>
              </div>
            </div>
          </div>
        )}
      </section>

      <section className="mt-4 grid grid-cols-3 gap-2 sm:gap-3">
        <TimeBox
          label="ورود امروز"
          value={formatTime(
            todayCalculation.checkIn,
          )}
        />

        <TimeBox
          label="خروج امروز"
          value={formatTime(
            todayCalculation.checkOut,
          )}
        />

        <TimeBox
          label="وضعیت"
          value={getStateText(
            todayCalculation.state,
          )}
          compact
        />
      </section>

      <section className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
        <TimeBox
          label="کارکرد"
          value={formatMinutes(
            todayCalculation.workedMinutes,
          )}
          compact
        />

        <TimeBox
          label="موظفی"
          value={formatMinutes(
            todayCalculation.scheduledMinutes,
          )}
          compact
        />

        <TimeBox
          label="تأخیر"
          value={formatMinutes(
            todayCalculation.lateMinutes,
          )}
          compact
        />

        <TimeBox
          label="تراز"
          value={
            todayCalculation.balanceMinutes >
            0
              ? `+${formatMinutes(
                  todayCalculation.balanceMinutes,
                )}`
              : formatMinutes(
                  Math.abs(
                    todayCalculation.balanceMinutes,
                  ),
                ) === "۰ دقیقه"
                ? "۰ دقیقه"
                : `-${formatMinutes(
                    Math.abs(
                      todayCalculation.balanceMinutes,
                    ),
                  )}`
          }
          compact
        />
      </section>

      <section className="mt-5 overflow-hidden rounded-[26px] border border-slate-200/80 bg-white shadow-[0_10px_35px_rgba(15,23,42,0.04)]">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-5">
          <div>
            <h2 className="text-base font-bold text-slate-950">
              تاریخچه حضور
            </h2>

            <p className="mt-1 text-xs text-slate-400">
              آخرین ۲۰ رکورد حضور شما
            </p>
          </div>

          <CalendarDays
            size={19}
            className="text-slate-300"
          />
        </div>

        {history.length === 0 ? (
          <div className="px-5 py-12 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-50 text-slate-300">
              <CalendarDays
                size={24}
              />
            </div>

            <p className="mt-4 text-sm font-semibold text-slate-700">
              هنوز سابقه‌ای ندارید
            </p>

            <p className="mt-2 text-xs text-slate-400">
              اولین ورود شما اینجا ثبت خواهد شد.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {history.map(
              (item) => {
                const StateIcon =
                  getStateIcon(
                    item.calculation
                      .state,
                  );

                return (
                  <div
                    key={item.id}
                    className="px-5 py-4"
                  >
                    <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto_auto_auto] sm:items-center sm:gap-5">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="truncate text-sm font-bold text-slate-900">
                            {formatDate(
                              item.workDate,
                            )}
                          </p>

                          <span
                            className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[9px] font-semibold ${getStateClass(
                              item.calculation
                                .state,
                            )}`}
                          >
                            <StateIcon
                              size={11}
                            />

                            {getStateText(
                              item.calculation
                                .state,
                            )}
                          </span>
                        </div>

                        <p className="mt-1 text-[11px] text-slate-400">
                          {getPersianWeekday(
                            item.workDate,
                          )}
                        </p>
                      </div>

                      <div className="text-left">
                        <p className="text-[10px] text-slate-400">
                          ورود
                        </p>

                        <p className="mt-1 text-xs font-semibold text-slate-700">
                          {formatTime(
                            item.calculation
                              .checkIn,
                          )}
                        </p>
                      </div>

                      <div className="text-left">
                        <p className="text-[10px] text-slate-400">
                          خروج
                        </p>

                        <p className="mt-1 text-xs font-semibold text-slate-700">
                          {formatTime(
                            item.calculation
                              .checkOut,
                          )}
                        </p>
                      </div>

                      <div className="text-left sm:min-w-[100px]">
                        <p className="text-[10px] text-slate-400">
                          کارکرد
                        </p>

                        <p className="mt-1 text-xs font-semibold text-slate-700">
                          {formatMinutes(
                            item.calculation
                              .workedMinutes,
                          )}
                        </p>
                      </div>
                    </div>

                    {item.calculation
                      .lateMinutes > 0 ||
                    item.calculation
                      .earlyLeaveMinutes >
                      0 ||
                    item.calculation
                      .overtimeMinutes >
                      0 ? (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {item.calculation
                          .lateMinutes >
                        0 ? (
                          <MiniMetric
                            label="تأخیر"
                            value={formatMinutes(
                              item.calculation
                                .lateMinutes,
                            )}
                            className="bg-amber-50 text-amber-700"
                          />
                        ) : null}

                        {item.calculation
                          .earlyLeaveMinutes >
                        0 ? (
                          <MiniMetric
                            label="تعجیل"
                            value={formatMinutes(
                              item.calculation
                                .earlyLeaveMinutes,
                            )}
                            className="bg-rose-50 text-rose-700"
                          />
                        ) : null}

                        {item.calculation
                          .overtimeMinutes >
                        0 ? (
                          <MiniMetric
                            label="اضافه‌کاری"
                            value={formatMinutes(
                              item.calculation
                                .overtimeMinutes,
                            )}
                            className="bg-emerald-50 text-emerald-700"
                          />
                        ) : null}
                      </div>
                    ) : null}
                  </div>
                );
              },
            )}
          </div>
        )}
      </section>

      <p className="mt-6 text-center text-[11px] text-slate-400">
        ثبت حضور و غیاب به‌صورت امن در سیستم ذخیره می‌شود.
      </p>
    </EmployeeShell>
  );
}

function TimeBox({
  label,
  value,
  compact = false,
}: {
  label: string;
  value: string;
  compact?: boolean;
}) {
  return (
    <div className="min-w-0 rounded-2xl border border-slate-200/80 bg-white p-3.5 sm:p-4">
      <p className="truncate text-[10px] font-medium text-slate-400 sm:text-xs">
        {label}
      </p>

      <p
        className={`mt-2 break-words font-bold text-slate-900 ${
          compact
            ? "text-sm sm:text-base"
            : "text-base sm:text-lg"
        }`}
      >
        {value}
      </p>
    </div>
  );
}

function MiniMetric({
  label,
  value,
  className,
}: {
  label: string;
  value: string;
  className: string;
}) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-3 py-1.5 text-[10px] font-semibold ${className}`}
    >
      {label}: {value}
    </span>
  );
}