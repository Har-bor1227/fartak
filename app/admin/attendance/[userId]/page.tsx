import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import {
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  Clock3,
  LogIn,
  LogOut,
  MinusCircle,
  TriangleAlert,
  UserCheck,
  UserX,
} from "lucide-react";

import AdminShell from "@/components/admin/admin-shell";

import { requireAdmin } from "@/lib/auth/current-user";

import {
  calculateAttendanceDay,
  type AttendanceCalculation,
  type AttendanceHoliday,
  type AttendanceRecord as EngineAttendanceRecord,
  type AttendanceSchedule,
} from "@/lib/attendance/engine";

import {
  formatDate,
  formatShortDate,
  formatTime,
  getDateKey,
  getDateRange,
} from "@/lib/date/tehran";

import { prisma } from "@/lib/prisma";

type EmployeeAttendancePageProps = {
  params: Promise<{
    userId: string;
  }>;
};

type Employee = {
  id: string;
  firstName: string;
  lastName: string;
  username: string;
  phone: string | null;
  isActive: boolean;
};

type AttendanceRecord = {
  id: string;
  workDate: Date;
  checkIn: Date | null;
  checkOut: Date | null;
  status: string;
  note: string | null;
};

type AttendanceDay = {
  id: string;
  workDate: Date;
  attendance: AttendanceRecord | null;
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

function formatSignedMinutes(
  totalMinutes: number,
): string {
  if (totalMinutes === 0) {
    return "۰ دقیقه";
  }

  const value = formatMinutes(
    Math.abs(totalMinutes),
  );

  return totalMinutes > 0
    ? `+${value}`
    : `-${value}`;
}

function getStateLabel(
  state: AttendanceCalculation["state"],
): string {
  switch (state) {
    case "PRESENT":
      return "حاضر";

    case "WORKING":
      return "داخل شرکت";

    case "ABSENT":
      return "غایب";

    case "HOLIDAY":
      return "تعطیل";

    case "NON_WORKING":
      return "غیرکاری";

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
): LucideIcon {
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

function addOneDay(
  dateKey: string,
): string {
  const parts = dateKey
    .split("-")
    .map(Number);

  const probe = new Date(
    Date.UTC(
      parts[0],
      parts[1] - 1,
      parts[2] + 1,
      12,
      0,
      0,
      0,
    ),
  );

  return getDateKey(probe);
}

function getMonthRange(
  todayKey: string,
) {
  const [
    year,
    month,
  ] = todayKey
    .split("-")
    .map(Number);

  const monthStartKey =
    `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}-01`;

  const nextMonthProbe =
    new Date(
      Date.UTC(
        year,
        month,
        1,
        12,
        0,
        0,
        0,
      ),
    );

  const nextMonthKey =
    getDateKey(
      nextMonthProbe,
    );

  const start =
    getDateRange(
      monthStartKey,
    );

  const end =
    getDateRange(
      nextMonthKey,
    );

  if (!start || !end) {
    return null;
  }

  return {
    start: start.start,
    end: end.start,
    monthStartKey,
    nextMonthKey,
  };
}

function getDateKeys(
  startKey: string,
  endKey: string,
): string[] {
  const result: string[] = [];

  let current = startKey;

  while (current < endKey) {
    result.push(current);
    current =
      addOneDay(current);
  }

  return result;
}

export default async function EmployeeAttendancePage({
  params,
}: EmployeeAttendancePageProps) {
  const admin =
    await requireAdmin();

  const { userId } =
    await params;

  const employee =
    await prisma.user.findUnique({
      where: {
        id: userId,
      },

      select: {
        id: true,
        firstName: true,
        lastName: true,
        username: true,
        phone: true,
        isActive: true,
      },
    });

  if (
    !employee ||
    employee.id === admin.id
  ) {
    return (
      <AdminShell
        firstName={
          admin.firstName
        }
        lastName={
          admin.lastName
        }
      >
        <div
          dir="rtl"
          className="mx-auto max-w-3xl px-4 py-12 sm:px-6"
        >
          <div className="rounded-[26px] border border-slate-200 bg-white p-8 text-center">
            <h1 className="text-xl font-bold text-slate-900">
              کارمند پیدا نشد
            </h1>

            <Link
              href="/admin/attendance"
              className="mt-5 inline-flex items-center gap-2 rounded-2xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white"
            >
              <ArrowRight
                size={17}
              />
              بازگشت
            </Link>
          </div>
        </div>
      </AdminShell>
    );
  }

  const todayKey =
    getDateKey(new Date());

  const monthRange =
    getMonthRange(todayKey);

  if (!monthRange) {
    throw new Error(
      "بازه ماه جاری قابل محاسبه نیست.",
    );
  }

  const [
    settings,
    holidays,
    attendances,
  ] = await Promise.all([
    prisma.companySettings.findUnique({
      where: {
        id: "company",
      },
    }),

    prisma.holiday.findMany({
      where: {
        date: {
          gte: monthRange.start,
          lt: monthRange.end,
        },
      },

      orderBy: {
        date: "asc",
      },
    }),

    prisma.attendance.findMany({
      where: {
        userId: employee.id,
        workDate: {
          gte: monthRange.start,
          lt: monthRange.end,
        },
      },

      select: {
        id: true,
        workDate: true,
        checkIn: true,
        checkOut: true,
        status: true,
        note: true,
      },

      orderBy: {
        workDate: "asc",
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

  const attendanceMap =
    new Map<
      string,
      AttendanceRecord
    >();

  for (const attendance of attendances) {
    attendanceMap.set(
      getDateKey(
        attendance.workDate,
      ),
      attendance,
    );
  }

  const holidayMap =
    new Map<
      string,
      AttendanceHoliday
    >();

  for (const holiday of holidays) {
    holidayMap.set(
      getDateKey(holiday.date),
      {
        workDate: holiday.date,
        title: holiday.title,
        description:
          holiday.description,
      } as AttendanceHoliday,
    );
  }

  const dateKeys =
    getDateKeys(
      monthRange.monthStartKey,
      monthRange.nextMonthKey,
    );

  const days: AttendanceDay[] =
    dateKeys
      .map((dateKey) => {
        const range =
          getDateRange(dateKey);

        if (!range) {
          return null;
        }

        const attendance =
          attendanceMap.get(
            dateKey,
          ) ?? null;

        const holiday =
          holidayMap.get(
            dateKey,
          ) ?? null;

        const engineAttendance =
          attendance
            ? ({
                workDate:
                  attendance.workDate,
                checkIn:
                  attendance.checkIn,
                checkOut:
                  attendance.checkOut,
                status:
                  attendance.status,
                note:
                  attendance.note,
              } as EngineAttendanceRecord)
            : null;

        const calculation =
          calculateAttendanceDay({
            workDate:
              range.start,
            schedule,
            holiday,
            attendance:
              engineAttendance,
          });

        return {
          id:
            attendance?.id ??
            `virtual-${employee.id}-${dateKey}`,

          workDate:
            range.start,

          attendance,

          calculation,
        };
      })
      .filter(
        (
          item,
        ): item is AttendanceDay =>
          item !== null,
      )
      .reverse();

  const attendanceDays =
    days.filter(
      ({ calculation }) =>
        calculation.state ===
          "PRESENT" ||
        calculation.state ===
          "WORKING",
    ).length;

  const completedDays =
    days.filter(
      ({ calculation }) =>
        Boolean(
          calculation.checkIn &&
            calculation.checkOut,
        ),
    ).length;

  const workingDays =
    days.filter(
      ({ calculation }) =>
        calculation.state ===
        "WORKING",
    ).length;

  const absentDays =
    days.filter(
      ({ calculation }) =>
        calculation.state ===
        "ABSENT",
    ).length;

  const holidayDays =
    days.filter(
      ({ calculation }) =>
        calculation.state ===
        "HOLIDAY",
    ).length;

  const nonWorkingDays =
    days.filter(
      ({ calculation }) =>
        calculation.state ===
        "NON_WORKING",
    ).length;

  const futureDays =
    days.filter(
      ({ calculation }) =>
        calculation.state ===
        "FUTURE",
    ).length;

  const totalWorkedMinutes =
    days.reduce(
      (
        total,
        day,
      ) =>
        total +
        day.calculation
          .workedMinutes,
      0,
    );

  const totalScheduledMinutes =
    days.reduce(
      (
        total,
        day,
      ) =>
        total +
        day.calculation
          .scheduledMinutes,
      0,
    );

  const totalBalanceMinutes =
    days.reduce(
      (
        total,
        day,
      ) =>
        total +
        day.calculation
          .balanceMinutes,
      0,
    );

  const totalLateMinutes =
    days.reduce(
      (
        total,
        day,
      ) =>
        total +
        day.calculation
          .lateMinutes,
      0,
    );

  const totalEarlyLeaveMinutes =
    days.reduce(
      (
        total,
        day,
      ) =>
        total +
        day.calculation
          .earlyLeaveMinutes,
      0,
    );

  const totalOvertimeMinutes =
    days.reduce(
      (
        total,
        day,
      ) =>
        total +
        day.calculation
          .overtimeMinutes,
      0,
    );

  const totalUnderworkMinutes =
    days.reduce(
      (
        total,
        day,
      ) =>
        total +
        day.calculation
          .underworkMinutes,
      0,
    );

  const workedDays =
    days.filter(
      ({ calculation }) =>
        calculation.workedMinutes >
        0,
    );

  const averageWorkedMinutes =
    workedDays.length > 0
      ? Math.round(
          totalWorkedMinutes /
            workedDays.length,
        )
      : 0;

  const firstCheckIns =
    days
      .map(
        ({ calculation }) =>
          calculation.checkIn,
      )
      .filter(
        (
          value,
        ): value is Date =>
          value !== null,
      );

  const lastCheckOuts =
    days
      .map(
        ({ calculation }) =>
          calculation.checkOut,
      )
      .filter(
        (
          value,
        ): value is Date =>
          value !== null,
      );

  let firstCheckIn:
    | Date
    | null = null;

  for (const date of firstCheckIns) {
    if (
      !firstCheckIn ||
      date.getTime() <
        firstCheckIn.getTime()
    ) {
      firstCheckIn = date;
    }
  }

  let lastCheckOut:
    | Date
    | null = null;

  for (const date of lastCheckOuts) {
    if (
      !lastCheckOut ||
      date.getTime() >
        lastCheckOut.getTime()
    ) {
      lastCheckOut = date;
    }
  }

  return (
    <AdminShell
      firstName={
        admin.firstName
      }
      lastName={
        admin.lastName
      }
    >
      <div
        dir="rtl"
        className="mx-auto max-w-[1250px] px-4 py-4 sm:px-6 sm:py-6 xl:px-8"
      >
        <Link
          href="/admin/attendance"
          className="mb-5 inline-flex items-center gap-2 text-xs font-semibold text-slate-400 transition hover:text-slate-900"
        >
          <ArrowRight
            size={16}
          />
          بازگشت به حضور و غیاب
        </Link>

        <section className="overflow-hidden rounded-[28px] border border-slate-200/80 bg-white p-5 shadow-[0_10px_35px_rgba(15,23,42,0.04)] sm:p-6">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex min-w-0 items-center gap-4">
              <div
                className={
                  employee.isActive
                    ? "flex h-16 w-16 shrink-0 items-center justify-center rounded-[22px] bg-slate-950 text-lg font-bold text-white"
                    : "flex h-16 w-16 shrink-0 items-center justify-center rounded-[22px] bg-slate-100 text-lg font-bold text-slate-400"
                }
              >
                {employee.firstName?.[0] ??
                  ""}
                {employee.lastName?.[0] ??
                  ""}
              </div>

              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="truncate text-xl font-bold text-slate-950 sm:text-2xl">
                    {
                      employee.firstName
                    }{" "}
                    {
                      employee.lastName
                    }
                  </h1>

                  <span
                    className={
                      employee.isActive
                        ? "rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-semibold text-emerald-700"
                        : "rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-semibold text-slate-500"
                    }
                  >
                    {employee.isActive
                      ? "فعال"
                      : "غیرفعال"}
                  </span>
                </div>

                <p className="mt-1 text-xs text-slate-400">
                  @{employee.username}
                </p>

                {employee.phone ? (
                  <p className="mt-1 text-xs text-slate-400">
                    {employee.phone}
                  </p>
                ) : null}
              </div>
            </div>

            <div className="rounded-2xl bg-slate-50 px-4 py-3">
              <p className="text-[10px] font-medium text-slate-400">
                ماه جاری
              </p>

              <p className="mt-1 text-sm font-bold text-slate-900">
                {formatDate(
                  getDateRange(
                    monthRange.monthStartKey,
                  )!.start,
                )}
              </p>
            </div>
          </div>
        </section>

        <section className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <InfoCard
            label="روزهای حضور"
            value={`${attendanceDays} روز`}
            icon={UserCheck}
            valueClass="text-emerald-600"
          />

          <InfoCard
            label="داخل شرکت"
            value={`${workingDays} روز`}
            icon={Clock3}
            valueClass="text-blue-600"
          />

          <InfoCard
            label="غیبت"
            value={`${absentDays} روز`}
            icon={UserX}
            valueClass="text-rose-600"
          />

          <InfoCard
            label="روزهای کامل"
            value={`${completedDays} روز`}
            icon={CheckCircle2}
          />
        </section>

        <section className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <InfoCard
            label="مجموع کارکرد"
            value={formatMinutes(
              totalWorkedMinutes,
            )}
            icon={Clock3}
          />

          <InfoCard
            label="موظفی ماه"
            value={formatMinutes(
              totalScheduledMinutes,
            )}
            icon={CalendarDays}
          />

          <InfoCard
            label="تراز کارکرد"
            value={formatSignedMinutes(
              totalBalanceMinutes,
            )}
            icon={Clock3}
            valueClass={
              totalBalanceMinutes >
              0
                ? "text-emerald-600"
                : totalBalanceMinutes <
                    0
                  ? "text-rose-600"
                  : "text-slate-950"
            }
          />

          <InfoCard
            label="میانگین روزانه"
            value={
              averageWorkedMinutes >
              0
                ? formatMinutes(
                    averageWorkedMinutes,
                  )
                : "—"
            }
            icon={Clock3}
          />
        </section>

        <section className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <InfoCard
            label="تأخیر"
            value={formatMinutes(
              totalLateMinutes,
            )}
            icon={TriangleAlert}
            valueClass="text-amber-600"
          />

          <InfoCard
            label="تعجیل خروج"
            value={formatMinutes(
              totalEarlyLeaveMinutes,
            )}
            icon={LogOut}
            valueClass="text-rose-600"
          />

          <InfoCard
            label="اضافه‌کاری"
            value={formatMinutes(
              totalOvertimeMinutes,
            )}
            icon={Clock3}
            valueClass="text-emerald-600"
          />

          <InfoCard
            label="کسری کار"
            value={formatMinutes(
              totalUnderworkMinutes,
            )}
            icon={TriangleAlert}
            valueClass="text-rose-600"
          />
        </section>

        <section className="mt-4 grid gap-3 sm:grid-cols-2">
          <InfoCard
            label="اولین ورود"
            value={
              firstCheckIn
                ? formatTime(
                    firstCheckIn,
                  )
                : "—"
            }
            icon={LogIn}
          />

          <InfoCard
            label="آخرین خروج"
            value={
              lastCheckOut
                ? formatTime(
                    lastCheckOut,
                  )
                : "—"
            }
            icon={LogOut}
          />
        </section>

        <section className="mt-4 overflow-hidden rounded-[26px] border border-slate-200/80 bg-white shadow-[0_8px_30px_rgba(15,23,42,0.04)]">
          <div className="border-b border-slate-100 px-5 py-5 sm:px-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-base font-bold text-slate-950">
                  سوابق ماه جاری
                </h2>

                <p className="mt-1 text-xs leading-5 text-slate-400">
                  وضعیت هر روز بر اساس برنامه کاری، تعطیلات و رکورد حضور محاسبه شده است.
                </p>
              </div>

              <CalendarDays
                size={20}
                className="shrink-0 text-slate-300"
              />
            </div>
          </div>

          {days.length === 0 ? (
            <div className="flex min-h-[300px] flex-col items-center justify-center px-6 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-50 text-slate-300">
                <CalendarDays
                  size={24}
                />
              </div>

              <p className="mt-4 text-sm font-semibold text-slate-700">
                اطلاعاتی برای این ماه وجود ندارد.
              </p>
            </div>
          ) : (
            <>
              <div className="hidden border-b border-slate-100 bg-slate-50/50 px-6 py-3 text-[11px] font-semibold text-slate-400 md:grid md:grid-cols-[150px_110px_110px_minmax(170px,1fr)_140px_120px] md:items-center md:gap-4">
                <span>تاریخ</span>
                <span>ورود</span>
                <span>خروج</span>
                <span>کارکرد</span>
                <span>وضعیت</span>
                <span>تراز</span>
              </div>

              <div className="divide-y divide-slate-100">
                {days.map(
                  (day) => {
                    const StateIcon =
                      getStateIcon(
                        day.calculation
                          .state,
                      );

                    return (
                      <div
                        key={
                          day.id
                        }
                        className="px-5 py-4 sm:px-6"
                      >
                        <div className="grid gap-4 md:grid-cols-[150px_110px_110px_minmax(170px,1fr)_140px_120px] md:items-center md:gap-4">
                          <div>
                            <p className="text-sm font-bold text-slate-900">
                              {formatShortDate(
                                day.workDate,
                              )}
                            </p>

                            <p className="mt-1 text-[10px] text-slate-400">
                              {formatDate(
                                day.workDate,
                              )}
                            </p>
                          </div>

                          <div>
                            <p className="text-[10px] text-slate-400 md:hidden">
                              ورود
                            </p>

                            <p className="mt-1 text-sm font-semibold text-slate-700 md:mt-0">
                              <LogIn
                                size={14}
                                className="ml-1 inline"
                              />

                              {formatTime(
                                day.calculation
                                  .checkIn,
                              )}
                            </p>
                          </div>

                          <div>
                            <p className="text-[10px] text-slate-400 md:hidden">
                              خروج
                            </p>

                            <p className="mt-1 text-sm font-semibold text-slate-700 md:mt-0">
                              <LogOut
                                size={14}
                                className="ml-1 inline"
                              />

                              {formatTime(
                                day.calculation
                                  .checkOut,
                              )}
                            </p>
                          </div>

                          <div>
                            <p className="text-[10px] text-slate-400 md:hidden">
                              کارکرد
                            </p>

                            <p className="mt-1 text-sm font-bold text-slate-900 md:mt-0">
                              {formatMinutes(
                                day.calculation
                                  .workedMinutes,
                              )}
                            </p>

                            {day.calculation
                              .scheduledMinutes >
                            0 ? (
                              <p className="mt-1 text-[10px] text-slate-400">
                                موظفی:{" "}
                                {formatMinutes(
                                  day.calculation
                                    .scheduledMinutes,
                                )}
                              </p>
                            ) : null}

                            {day.calculation
                              .lateMinutes >
                            0 ? (
                              <p className="mt-1 text-[10px] text-amber-600">
                                تأخیر:{" "}
                                {formatMinutes(
                                  day.calculation
                                    .lateMinutes,
                                )}
                              </p>
                            ) : null}

                            {day.calculation
                              .earlyLeaveMinutes >
                            0 ? (
                              <p className="mt-1 text-[10px] text-rose-600">
                                تعجیل:{" "}
                                {formatMinutes(
                                  day.calculation
                                    .earlyLeaveMinutes,
                                )}
                              </p>
                            ) : null}
                          </div>

                          <div>
                            <p className="text-[10px] text-slate-400 md:hidden">
                              وضعیت
                            </p>

                            <div className="mt-1 flex flex-wrap items-center gap-2 md:mt-0">
                              <span
                                className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[10px] font-semibold ${getStateClass(
                                  day.calculation
                                    .state,
                                )}`}
                              >
                                <StateIcon
                                  size={12}
                                />

                                {getStateLabel(
                                  day.calculation
                                    .state,
                                )}
                              </span>

                              {day.calculation
                                .holiday ? (
                                <span className="inline-flex max-w-full rounded-full bg-violet-50 px-2.5 py-1.5 text-[10px] font-semibold text-violet-700">
                                  {
                                    day.calculation
                                      .holiday
                                      .title
                                  }
                                </span>
                              ) : null}
                            </div>
                          </div>

                          <div>
                            <p className="text-[10px] text-slate-400 md:hidden">
                              تراز
                            </p>

                            <p
                              className={`mt-1 text-sm font-bold md:mt-0 ${
                                day.calculation
                                  .balanceMinutes >
                                0
                                  ? "text-emerald-600"
                                  : day.calculation
                                      .balanceMinutes <
                                      0
                                    ? "text-rose-600"
                                    : "text-slate-500"
                              }`}
                            >
                              {formatSignedMinutes(
                                day.calculation
                                  .balanceMinutes,
                              )}
                            </p>

                            {day.calculation
                              .overtimeMinutes >
                            0 ? (
                              <p className="mt-1 text-[10px] text-emerald-600">
                                اضافه‌کاری:{" "}
                                {formatMinutes(
                                  day.calculation
                                    .overtimeMinutes,
                                )}
                              </p>
                            ) : null}

                            {day.calculation
                              .underworkMinutes >
                            0 ? (
                              <p className="mt-1 text-[10px] text-rose-600">
                                کسری:{" "}
                                {formatMinutes(
                                  day.calculation
                                    .underworkMinutes,
                                )}
                              </p>
                            ) : null}
                          </div>
                        </div>

                        {day.calculation
                          .note ? (
                          <div className="mt-3 rounded-xl bg-slate-50 px-3 py-2 text-[10px] leading-5 text-slate-500">
                            یادداشت:{" "}
                            {
                              day.calculation
                                .note
                            }
                          </div>
                        ) : null}
                      </div>
                    );
                  },
                )}
              </div>
            </>
          )}
        </section>
      </div>
    </AdminShell>
  );
}

function InfoCard({
  label,
  value,
  icon: Icon,
  valueClass = "text-slate-950",
}: {
  label: string;
  value: string;
  icon: LucideIcon;
  valueClass?: string;
}) {
  return (
    <div className="rounded-[22px] border border-slate-200/80 bg-white p-4 shadow-[0_8px_30px_rgba(15,23,42,0.03)]">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] font-medium text-slate-400">
            {label}
          </p>

          <p
            className={`mt-2 break-words text-lg font-bold ${valueClass}`}
          >
            {value}
          </p>
        </div>

        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-50 text-slate-500">
          <Icon
            size={17}
          />
        </div>
      </div>
    </div>
  );
}