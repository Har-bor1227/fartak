import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import {
  Activity,
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  Clock3,
  MinusCircle,
  PenLine,
  TriangleAlert,
  UserCheck,
  UserX,
  Users,
} from "lucide-react";

import AdminShell from "@/components/admin/admin-shell";
import AttendanceStatus from "@/components/admin/attendance-status";

import { requireAdmin } from "@/lib/auth/current-user";

import {
  calculateAttendanceDay,
  type AttendanceCalculation,
  type AttendanceHoliday,
  type AttendanceLeave,
  type AttendanceRecord as EngineAttendanceRecord,
  type AttendanceSchedule,
  type AttendanceTemporaryExit,
} from "@/lib/attendance/engine";

import {
  getCompanyScheduleHistory,
  getDefaultAttendanceSchedule,
  getEmployeeShiftAssignments,
  resolveEmployeeSchedule,
} from "@/lib/attendance/schedule-resolver";

import {
  formatDate,
  formatTime,
  getDateKey,
  getDateRange,
  getPersianWeekday,
} from "@/lib/date/tehran";

import { prisma } from "@/lib/prisma";

import AttendanceFilters from "./attendance-filters";
import ManualAttendanceDialog from "./manual-attendance-dialog";

type AttendancePageProps = {
  searchParams: Promise<{
    date?: string;
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
  userId: string;
  workDate: Date;
  checkIn: Date | null;
  checkOut: Date | null;
  status: string;
  note: string | null;
  temporaryExits: AttendanceTemporaryExit[];
};

type ApprovedLeave = {
  id: string;
  userId: string;
  type: AttendanceLeave["type"];
  startDate: Date;
  endDate: Date;
};

type AttendanceRowData = {
  employee: Employee;
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

function getStateText(
  state: AttendanceCalculation["state"],
): string {
  switch (state) {
    case "PRESENT":
      return "حاضر";

    case "WORKING":
      return "داخل شرکت";

    case "ABSENT":
      return "غایب";

    case "LEAVE":
      return "مرخصی";

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

    case "LEAVE":
      return "bg-amber-50 text-amber-700";

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
      return Activity;

    case "ABSENT":
      return UserX;

    case "LEAVE":
      return CalendarDays;

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

function formatInputTime(
  value: Date | null,
): string {
  if (!value) {
    return "";
  }

  const parts =
    new Intl.DateTimeFormat(
      "en-GB",
      {
        timeZone:
          process.env.APP_TIMEZONE ||
          "Asia/Tehran",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      },
    ).formatToParts(value);

  const hour =
    parts.find(
      (part) =>
        part.type === "hour",
    )?.value ?? "00";

  const minute =
    parts.find(
      (part) =>
        part.type === "minute",
    )?.value ?? "00";

  return `${hour}:${minute}`;
}

export default async function AttendancePage({
  searchParams,
}: AttendancePageProps) {
  const admin =
    await requireAdmin();

  const params =
    await searchParams;

  const todayKey =
    getDateKey(new Date());

  const requestedDate =
    typeof params.date === "string" &&
    params.date.length > 0
      ? params.date
      : todayKey;

  const selectedRange =
    getDateRange(
      requestedDate,
    ) ??
    getDateRange(todayKey);

  if (selectedRange === null) {
    throw new Error(
      "تاریخ انتخاب شده معتبر نیست.",
    );
  }

  const [
    employees,
    attendances,
    settings,
    holiday,
    approvedLeaves,
    companyScheduleHistory,
  ] = await Promise.all([
    prisma.user.findMany({
      where: {
        role: "EMPLOYEE",
      },

      select: {
        id: true,
        firstName: true,
        lastName: true,
        username: true,
        phone: true,
        isActive: true,
      },

      orderBy: [
        {
          isActive: "desc",
        },
        {
          firstName: "asc",
        },
        {
          lastName: "asc",
        },
      ],
    }),

    prisma.attendance.findMany({
      where: {
        workDate: {
          gte:
            selectedRange.start,
          lt:
            selectedRange.end,
        },

        user: {
          role: "EMPLOYEE",
        },
      },

      select: {
        id: true,
        userId: true,
        workDate: true,
        checkIn: true,
        checkOut: true,
        status: true,
        note: true,

        temporaryExits: {
          select: {
            type: true,
            status: true,
            startedAt: true,
            endedAt: true,
          },

          orderBy: {
            startedAt: "asc",
          },
        },
      },
    }),

    prisma.companySettings.findUnique({
      where: {
        id: "company",
      },
    }),

    prisma.holiday.findUnique({
      where: {
        date:
          selectedRange.start,
      },
    }),

    prisma.leave.findMany({
      where: {
        status: "APPROVED",

        startDate: {
          lt:
            selectedRange.end,
        },

        endDate: {
          gte:
            selectedRange.start,
        },

        user: {
          role: "EMPLOYEE",
        },
      },

      select: {
        id: true,
        userId: true,
        type: true,
        startDate: true,
        endDate: true,
      },
    }),

    getCompanyScheduleHistory({
      from:
        selectedRange.start,
      to:
        selectedRange.end,
    }),
  ]);

  const fallbackSchedule:
    AttendanceSchedule =
    getDefaultAttendanceSchedule(
      settings,
    );

  const shiftAssignments =
    await getEmployeeShiftAssignments({
      userIds:
        employees.map(
          (employee) =>
            employee.id,
        ),

      from:
        selectedRange.start,

      to:
        selectedRange.end,
    });

  const attendanceMap =
    new Map<
      string,
      AttendanceRecord
    >();

  for (
    const attendance of attendances
  ) {
    attendanceMap.set(
      attendance.userId,
      attendance,
    );
  }

  const leaveMap =
    new Map<
      string,
      ApprovedLeave
    >();

  for (
    const leave of approvedLeaves
  ) {
    if (
      leave.startDate.getTime() <
        selectedRange.end.getTime() &&
      leave.endDate.getTime() >=
        selectedRange.start.getTime()
    ) {
      leaveMap.set(
        leave.userId,
        leave,
      );
    }
  }

  const engineHoliday =
    holiday
      ? ({
          title:
            holiday.title,
          description:
            holiday.description,
        } as AttendanceHoliday)
      : null;

  const rows:
    AttendanceRowData[] =
    employees.map(
      (employee) => {
        const attendance =
          attendanceMap.get(
            employee.id,
          ) ?? null;

        const approvedLeave =
          leaveMap.get(
            employee.id,
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

                temporaryExits:
                  attendance.temporaryExits,
              } as EngineAttendanceRecord)
            : null;

        const engineLeave =
          approvedLeave
            ? ({
                type:
                  approvedLeave.type,
              } as AttendanceLeave)
            : null;

        const employeeSchedule =
          resolveEmployeeSchedule({
            assignments:
              shiftAssignments,

            userId:
              employee.id,

            workDate:
              selectedRange.start,

            fallbackSchedule,

            companyScheduleHistory,

            currentCompanySettings:
              settings,
          });

        const calculation =
          calculateAttendanceDay({
            workDate:
              selectedRange.start,

            schedule:
              employeeSchedule,

            holiday:
              engineHoliday,

            leave:
              engineLeave,

            attendance:
              engineAttendance,
          });

        return {
          employee,
          attendance,
          calculation,
        };
      },
    );

  const presentCount =
    rows.filter(
      ({ calculation }) =>
        calculation.state ===
        "PRESENT",
    ).length;

  const workingCount =
    rows.filter(
      ({ calculation }) =>
        calculation.state ===
        "WORKING",
    ).length;

  const leaveCount =
    rows.filter(
      ({ calculation }) =>
        calculation.state ===
        "LEAVE",
    ).length;

  const completedCount =
    rows.filter(
      ({ calculation }) =>
        Boolean(
          calculation.checkIn &&
            calculation.checkOut,
        ),
    ).length;

  const absentCount =
    rows.filter(
      ({ calculation }) =>
        calculation.state ===
        "ABSENT",
    ).length;

  const holidayCount =
    rows.filter(
      ({ calculation }) =>
        calculation.state ===
        "HOLIDAY",
    ).length;

  const nonWorkingCount =
    rows.filter(
      ({ calculation }) =>
        calculation.state ===
        "NON_WORKING",
    ).length;

  const futureCount =
    rows.filter(
      ({ calculation }) =>
        calculation.state ===
        "FUTURE",
    ).length;

  const totalWorkedMinutes =
    rows.reduce(
      (
        total,
        row,
      ) =>
        total +
        row.calculation
          .workedMinutes,
      0,
    );

  const totalLateMinutes =
    rows.reduce(
      (
        total,
        row,
      ) =>
        total +
        row.calculation
          .lateMinutes,
      0,
    );

  const totalOvertimeMinutes =
    rows.reduce(
      (
        total,
        row,
      ) =>
        total +
        row.calculation
          .overtimeMinutes,
      0,
    );

  const totalTemporaryExitMinutes =
    rows.reduce(
      (
        total,
        row,
      ) =>
        total +
        row.calculation
          .temporaryExitMinutes,
      0,
    );

  const workedRows =
    rows.filter(
      ({ calculation }) =>
        calculation.workedMinutes >
        0,
    );

  const averageWorkedMinutes =
    workedRows.length > 0
      ? Math.round(
          totalWorkedMinutes /
            workedRows.length,
        )
      : 0;

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
        className="
          mx-auto
          max-w-[1500px]
          px-4
          pb-24
          pt-4
          sm:px-6
          sm:pb-8
          sm:pt-6
          xl:px-8
        "
      >
        <header className="mb-5">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
            <div className="min-w-0">
              <div className="mb-3 flex flex-wrap items-center gap-2">
                <span className="inline-flex h-7 items-center gap-1.5 rounded-full bg-slate-100 px-3 text-[10px] font-bold text-slate-600">
                  <Activity size={12} />
                  مرکز حضور و غیاب
                </span>

                <span className="inline-flex h-7 items-center rounded-full bg-blue-50 px-3 text-[10px] font-bold text-blue-700">
                  {getPersianWeekday(
                    selectedRange.start,
                  )}
                </span>

                {holiday ? (
                  <span className="inline-flex max-w-full items-center rounded-full bg-violet-50 px-3 py-1.5 text-[10px] font-bold text-violet-700">
                    <span className="truncate">
                      {holiday.title}
                    </span>
                  </span>
                ) : null}

                {leaveCount >
                0 ? (
                  <span className="inline-flex items-center rounded-full bg-amber-50 px-3 py-1.5 text-[10px] font-bold text-amber-700">
                    {leaveCount} نفر مرخصی
                  </span>
                ) : null}
              </div>

              <h1 className="text-[28px] font-bold tracking-tight text-slate-950 sm:text-3xl">
                حضور و غیاب
              </h1>

              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
                وضعیت حضور کارکنان را بررسی کنید یا رکوردهای موردنیاز
                را به‌صورت دستی اصلاح کنید.
              </p>
            </div>

            <AttendanceFilters
              date={requestedDate}
            />
          </div>
        </header>

        <section className="mb-4 rounded-[24px] border border-slate-200/80 bg-white p-4 shadow-[0_8px_30px_rgba(15,23,42,0.03)] sm:p-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-slate-950 text-white">
                <CalendarDays size={19} />
              </div>

              <div className="min-w-0">
                <p className="text-[10px] font-medium text-slate-400">
                  تاریخ انتخاب‌شده
                </p>

                <p className="mt-1 truncate text-sm font-bold text-slate-950">
                  {formatDate(
                    selectedRange.start,
                  )}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-xl bg-violet-50 px-3 py-2 text-[10px] font-semibold text-violet-700">
                <PenLine size={13} />
                امکان ثبت دستی
              </span>

              <Link
                href="/admin/attendance"
                className="
                  inline-flex
                  h-10
                  shrink-0
                  items-center
                  justify-center
                  rounded-xl
                  bg-slate-950
                  px-4
                  text-[11px]
                  font-semibold
                  text-white
                  shadow-lg
                  shadow-slate-950/10
                  transition
                  hover:bg-slate-800
                "
              >
                امروز
              </Link>
            </div>
          </div>
        </section>

        <section className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-7">
          <StatCard
            title="کل کارکنان"
            value={
              employees.length
            }
            icon={Users}
          />

          <StatCard
            title="حاضر"
            value={
              presentCount
            }
            icon={UserCheck}
            valueClass="text-emerald-600"
          />

          <StatCard
            title="داخل شرکت"
            value={
              workingCount
            }
            icon={Activity}
            valueClass="text-blue-600"
          />

          <StatCard
            title="مرخصی"
            value={
              leaveCount
            }
            icon={CalendarDays}
            valueClass="text-amber-600"
          />

          <StatCard
            title="غایب"
            value={
              absentCount
            }
            icon={UserX}
            valueClass="text-rose-600"
          />

          <StatCard
            title="تعطیل"
            value={
              holidayCount
            }
            icon={CalendarDays}
            valueClass="text-violet-600"
          />

          <div className="col-span-2 sm:col-span-1">
            <StatCard
              title="میانگین کارکرد"
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
          </div>
        </section>

        <section className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-7">
          <StatCard
            title="رکوردهای کامل"
            value={
              completedCount
            }
            icon={CheckCircle2}
            valueClass="text-emerald-600"
          />

          <StatCard
            title="مجموع کارکرد"
            value={
              totalWorkedMinutes >
              0
                ? formatMinutes(
                    totalWorkedMinutes,
                  )
                : "—"
            }
            icon={Clock3}
          />

          <StatCard
            title="مجموع خروج موقت"
            value={
              totalTemporaryExitMinutes >
              0
                ? formatMinutes(
                    totalTemporaryExitMinutes,
                  )
                : "۰ دقیقه"
            }
            icon={Clock3}
            valueClass={
              totalTemporaryExitMinutes >
              0
                ? "text-amber-600"
                : "text-slate-950"
            }
          />

          <StatCard
            title="مجموع تأخیر"
            value={
              totalLateMinutes >
              0
                ? formatMinutes(
                    totalLateMinutes,
                  )
                : "۰ دقیقه"
            }
            icon={TriangleAlert}
            valueClass={
              totalLateMinutes >
              0
                ? "text-amber-600"
                : "text-slate-950"
            }
          />

          <StatCard
            title="اضافه‌کاری"
            value={
              totalOvertimeMinutes >
              0
                ? formatMinutes(
                    totalOvertimeMinutes,
                  )
                : "۰ دقیقه"
            }
            icon={Clock3}
            valueClass="text-emerald-600"
          />

          <StatCard
            title="آینده"
            value={
              futureCount
            }
            icon={Clock3}
            valueClass="text-amber-600"
          />

          <StatCard
            title="تعطیلی روز"
            value={
              holiday
                ? holiday.title
                : "ندارد"
            }
            icon={CalendarDays}
            valueClass={
              holiday
                ? "text-violet-600"
                : "text-slate-500"
            }
          />
        </section>

        <section className="mt-4 overflow-hidden rounded-[28px] border border-slate-200/80 bg-white shadow-[0_10px_35px_rgba(15,23,42,0.04)]">
          <div className="border-b border-slate-100 px-5 py-5 sm:px-6">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-50 text-slate-500">
                    <Users size={17} />
                  </div>

                  <h2 className="text-base font-bold text-slate-950">
                    وضعیت کارکنان
                  </h2>
                </div>

                <p className="mt-2 text-xs text-slate-400">
                  {formatDate(
                    selectedRange.start,
                  )}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2 text-[10px] font-semibold">
                <span className="rounded-full bg-emerald-50 px-3 py-1.5 text-emerald-700">
                  {presentCount} حاضر
                </span>

                <span className="rounded-full bg-blue-50 px-3 py-1.5 text-blue-700">
                  {workingCount} داخل شرکت
                </span>

                <span className="rounded-full bg-amber-50 px-3 py-1.5 text-amber-700">
                  {leaveCount} مرخصی
                </span>

                <span className="rounded-full bg-rose-50 px-3 py-1.5 text-rose-700">
                  {absentCount} غایب
                </span>

                {holidayCount >
                0 ? (
                  <span className="rounded-full bg-violet-50 px-3 py-1.5 text-violet-700">
                    {holidayCount} تعطیل
                  </span>
                ) : null}
              </div>
            </div>
          </div>

          {rows.length ===
          0 ? (
            <EmptyState />
          ) : (
            <>
              <div className="hidden border-b border-slate-100 bg-slate-50/60 px-6 py-3 text-[10px] font-semibold text-slate-400 md:grid md:grid-cols-[minmax(230px,1.5fr)_110px_110px_160px_125px_180px] md:items-center md:gap-4">
                <span>کارمند</span>
                <span>ورود</span>
                <span>خروج</span>
                <span>کارکرد</span>
                <span>وضعیت</span>
                <span className="text-left">
                  عملیات
                </span>
              </div>

              <div className="divide-y divide-slate-100">
                {rows.map(
                  (row) => (
                    <AttendanceRow
                      key={
                        row.employee.id
                      }
                      employee={
                        row.employee
                      }
                      attendance={
                        row.attendance
                      }
                      calculation={
                        row.calculation
                      }
                      dateKey={
                        requestedDate
                      }
                    />
                  ),
                )}
              </div>
            </>
          )}
        </section>
      </div>
    </AdminShell>
  );
}

function AttendanceRow({
  employee,
  attendance,
  calculation,
  dateKey,
}: {
  employee: Employee;
  attendance: AttendanceRecord | null;
  calculation: AttendanceCalculation;
  dateKey: string;
}) {
  const StateIcon =
    getStateIcon(
      calculation.state,
    );

  return (
    <div className="px-4 py-4 transition hover:bg-slate-50/50 sm:px-5">
      <div className="grid gap-3 md:grid-cols-[minmax(230px,1.5fr)_110px_110px_160px_125px_180px] md:items-center md:gap-4">
        <Link
          href={`/admin/attendance/${employee.id}`}
          className="group flex min-w-0 items-center gap-3"
        >
          <div
            className={
              employee.isActive
                ? "relative flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-slate-950 text-xs font-bold text-white"
                : "relative flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-slate-100 text-xs font-bold text-slate-400"
            }
          >
            {employee.firstName?.[0] ??
              ""}
            {employee.lastName?.[0] ??
              ""}

            {calculation.state ===
            "WORKING" ? (
              <span className="absolute -bottom-0.5 -left-0.5 h-2.5 w-2.5 rounded-full border-2 border-white bg-emerald-500" />
            ) : null}
          </div>

          <div className="min-w-0">
            <div className="flex min-w-0 items-center gap-2">
              <p className="truncate text-sm font-bold text-slate-900 group-hover:text-slate-700">
                {employee.firstName}{" "}
                {employee.lastName}
              </p>

              {!employee.isActive ? (
                <span className="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-[9px] font-semibold text-slate-400">
                  غیرفعال
                </span>
              ) : null}
            </div>

            <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
              <p className="truncate text-[10px] text-slate-400">
                @{employee.username}
              </p>

              <span className="hidden text-[10px] text-slate-300 sm:inline">
                •
              </span>

              <p className="text-[10px] text-slate-400">
                ورود{" "}
                <span className="font-semibold text-slate-600">
                  {formatTime(
                    calculation.checkIn,
                  )}
                </span>
              </p>
            </div>
          </div>
        </Link>

        <div className="hidden md:block">
          <p className="text-[10px] text-slate-400">
            ورود
          </p>

          <p className="mt-1 text-sm font-semibold text-slate-800">
            {formatTime(
              calculation.checkIn,
            )}
          </p>
        </div>

        <div className="hidden md:block">
          <p className="text-[10px] text-slate-400">
            خروج
          </p>

          <p className="mt-1 text-sm font-semibold text-slate-800">
            {formatTime(
              calculation.checkOut,
            )}
          </p>
        </div>

        <div className="hidden md:block">
          <p className="text-[10px] text-slate-400">
            کارکرد
          </p>

          <p className="mt-1 text-sm font-semibold text-slate-800">
            {formatMinutes(
              calculation.workedMinutes,
            )}
          </p>

          {calculation.temporaryExitMinutes >
          0 ? (
            <p className="mt-1 text-[10px] text-amber-600">
              خروج موقت:{" "}
              {formatMinutes(
                calculation.temporaryExitMinutes,
              )}
            </p>
          ) : null}

          {calculation.lateMinutes >
          0 ? (
            <p className="mt-1 text-[10px] text-amber-600">
              تأخیر:{" "}
              {formatMinutes(
                calculation.lateMinutes,
              )}
            </p>
          ) : null}

          {calculation.earlyLeaveMinutes >
          0 ? (
            <p className="mt-1 text-[10px] text-rose-600">
              تعجیل:{" "}
              {formatMinutes(
                calculation.earlyLeaveMinutes,
              )}
            </p>
          ) : null}
        </div>

        <div className="flex min-w-0 items-center justify-between gap-3">
          <div className="min-w-0 md:hidden">
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-[10px] text-slate-400">
              <span>
                ورود{" "}
                <b className="font-semibold text-slate-700">
                  {formatTime(
                    calculation.checkIn,
                  )}
                </b>
              </span>

              <span>
                خروج{" "}
                <b className="font-semibold text-slate-700">
                  {formatTime(
                    calculation.checkOut,
                  )}
                </b>
              </span>
            </div>

            <p className="mt-1 text-[10px] text-slate-400">
              کارکرد{" "}
              <span className="font-semibold text-slate-600">
                {formatMinutes(
                  calculation.workedMinutes,
                )}
              </span>
            </p>

            {calculation.temporaryExitMinutes >
            0 ? (
              <p className="mt-1 text-[10px] text-amber-600">
                خروج موقت{" "}
                <span className="font-semibold">
                  {formatMinutes(
                    calculation.temporaryExitMinutes,
                  )}
                </span>
              </p>
            ) : null}

            {calculation.lateMinutes >
            0 ? (
              <p className="mt-1 text-[10px] text-amber-600">
                تأخیر{" "}
                <span className="font-semibold">
                  {formatMinutes(
                    calculation.lateMinutes,
                  )}
                </span>
              </p>
            ) : null}
          </div>

          <div className="mr-auto flex shrink-0 items-center gap-2 md:mr-0">
            <span
              className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1.5 text-[9px] font-semibold sm:px-3 sm:text-[10px] ${getStateClass(
                calculation.state,
              )}`}
            >
              <StateIcon size={11} />

              {getStateText(
                calculation.state,
              )}
            </span>

            {attendance?.status ===
            "MANUAL" ? (
              <span className="hidden items-center gap-1 rounded-full bg-violet-50 px-2.5 py-1.5 text-[9px] font-semibold text-violet-700 sm:inline-flex">
                <PenLine size={11} />
                دستی
              </span>
            ) : null}

            {attendance?.checkIn &&
            attendance?.checkOut &&
            calculation.state ===
              "PRESENT" ? (
              <AttendanceStatus
                checkIn={
                  attendance.checkIn
                }
                checkOut={
                  attendance.checkOut
                }
              />
            ) : null}

            <Link
              href={`/admin/attendance/${employee.id}`}
              aria-label={`مشاهده سوابق ${employee.firstName} ${employee.lastName}`}
              className="
                hidden
                h-9
                w-9
                items-center
                justify-center
                rounded-xl
                text-slate-300
                transition
                hover:bg-slate-100
                hover:text-slate-600
                sm:flex
              "
            >
              <ChevronLeft size={16} />
            </Link>
          </div>
        </div>

        <div className="flex items-center justify-between gap-2 md:justify-end">
          <span className="text-[10px] text-slate-400 md:hidden">
            عملیات
          </span>

          <ManualAttendanceDialog
            userId={
              employee.id
            }
            employeeName={`${employee.firstName} ${employee.lastName}`.trim()}
            dateKey={dateKey}
            initialCheckIn={
              formatInputTime(
                attendance?.checkIn ??
                  null,
              )
            }
            initialCheckOut={
              formatInputTime(
                attendance?.checkOut ??
                  null,
              )
            }
            initialNote={
              attendance?.note ?? ""
            }
          />
        </div>
      </div>
    </div>
  );
}

function StatCard({
  title,
  value,
  icon: Icon,
  valueClass = "text-slate-950",
}: {
  title: string;
  value: string | number;
  icon: LucideIcon;
  valueClass?: string;
}) {
  return (
    <div className="min-w-0 rounded-[22px] border border-slate-200/80 bg-white p-4 shadow-[0_8px_30px_rgba(15,23,42,0.03)]">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-[10px] font-medium text-slate-400">
            {title}
          </p>

          <p
            className={`mt-2 break-words text-lg font-bold tracking-tight sm:text-xl ${valueClass}`}
          >
            {value}
          </p>
        </div>

        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-50 text-slate-500">
          <Icon size={16} />
        </div>
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex min-h-[340px] flex-col items-center justify-center px-6 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-50 text-slate-300">
        <CheckCircle2 size={27} />
      </div>

      <h3 className="mt-5 text-base font-bold text-slate-900">
        هیچ کارمندی ثبت نشده
      </h3>

      <p className="mt-2 max-w-sm text-xs leading-6 text-slate-400">
        ابتدا کارکنان را از بخش مدیریت کارکنان تعریف کنید.
      </p>
    </div>
  );
}