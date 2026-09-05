import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import {
  Activity,
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  Clock3,
  MinusCircle,
  TriangleAlert,
  UserCheck,
  UserX,
  Users,
} from "lucide-react";

import AdminShell from "@/components/admin/admin-shell";
import AttendanceStatus from "@/components/admin/attendance-status";
import AttendanceFilters from "./attendance-filters";

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
  formatTime,
  getDateKey,
  getDateRange,
  getPersianWeekday,
} from "@/lib/date/tehran";
import { prisma } from "@/lib/prisma";

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
) {
  switch (state) {
    case "PRESENT":
      return CheckCircle2;

    case "WORKING":
      return Activity;

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

export default async function AttendancePage({
  searchParams,
}: AttendancePageProps) {
  const admin = await requireAdmin();

  const params = await searchParams;

  const todayKey =
    getDateKey(new Date());

  const requestedDate =
    typeof params.date === "string" &&
    params.date.length > 0
      ? params.date
      : todayKey;

  const selectedRange =
    getDateRange(requestedDate) ??
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
          gte: selectedRange.start,
          lt: selectedRange.end,
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
      },
    }),

    prisma.companySettings.findUnique({
      where: {
        id: "company",
      },
    }),

    prisma.holiday.findUnique({
      where: {
        date: selectedRange.start,
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
      attendance.userId,
      attendance,
    );
  }

  const engineHoliday =
    holiday
      ? ({
          workDate: holiday.date,
          title: holiday.title,
          description:
            holiday.description,
        } as AttendanceHoliday)
      : null;

  const rows: AttendanceRowData[] =
    employees.map(
      (employee) => {
        const attendance =
          attendanceMap.get(
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
              } as EngineAttendanceRecord)
            : null;

        const calculation =
          calculateAttendanceDay({
            workDate:
              selectedRange.start,
            schedule,
            holiday:
              engineHoliday,
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
      firstName={admin.firstName}
      lastName={admin.lastName}
    >
      <div
        dir="rtl"
        className="mx-auto max-w-[1500px] px-4 py-4 sm:px-6 sm:py-6 xl:px-8"
      >
        <header className="mb-6">
          <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
            <div className="min-w-0">
              <div className="mb-3 flex flex-wrap items-center gap-2">
                <span className="inline-flex h-7 items-center gap-1.5 rounded-full bg-slate-100 px-3 text-[11px] font-semibold text-slate-600">
                  <Activity size={13} />
                  مرکز حضور و غیاب
                </span>

                <span className="inline-flex h-7 items-center rounded-full bg-blue-50 px-3 text-[11px] font-semibold text-blue-700">
                  {getPersianWeekday(
                    selectedRange.start,
                  )}
                </span>

                {holiday ? (
                  <span className="inline-flex h-7 items-center rounded-full bg-violet-50 px-3 text-[11px] font-semibold text-violet-700">
                    {holiday.title}
                  </span>
                ) : null}
              </div>

              <h1 className="text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">
                حضور و غیاب
              </h1>

              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
                وضعیت کارکنان بر اساس برنامه کاری، تعطیلات و رکورد واقعی حضور محاسبه می‌شود.
              </p>
            </div>

            <AttendanceFilters
              date={requestedDate}
            />
          </div>
        </header>

        <section className="mb-4 rounded-[24px] border border-slate-200/80 bg-white p-4 shadow-[0_8px_30px_rgba(15,23,42,0.03)] sm:p-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <p className="text-xs font-medium text-slate-400">
                گزارش روز
              </p>

              <p className="mt-1 truncate text-base font-bold text-slate-950">
                {formatDate(
                  selectedRange.start,
                )}
              </p>
            </div>

            <Link
              href="/admin/attendance"
              className="inline-flex h-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 px-4 text-xs font-semibold text-slate-600 transition hover:bg-slate-200"
            >
              امروز
            </Link>
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
            value={presentCount}
            icon={UserCheck}
            valueClass="text-emerald-600"
          />

          <StatCard
            title="داخل شرکت"
            value={workingCount}
            icon={Activity}
            valueClass="text-blue-600"
          />

          <StatCard
            title="غایب"
            value={absentCount}
            icon={UserX}
            valueClass="text-rose-600"
          />

          <StatCard
            title="تعطیل"
            value={holidayCount}
            icon={CalendarDays}
            valueClass="text-violet-600"
          />

          <StatCard
            title="غیرکاری"
            value={nonWorkingCount}
            icon={MinusCircle}
            valueClass="text-slate-500"
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

        <section className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
          <StatCard
            title="رکوردهای کامل"
            value={completedCount}
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
            value={futureCount}
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

        <section className="mt-4 overflow-hidden rounded-[26px] border border-slate-200/80 bg-white shadow-[0_8px_30px_rgba(15,23,42,0.04)]">
          <div className="flex flex-col gap-3 border-b border-slate-100 px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-6">
            <div>
              <h2 className="text-base font-bold text-slate-950">
                وضعیت کارکنان
              </h2>

              <p className="mt-1 text-xs text-slate-400">
                {formatDate(
                  selectedRange.start,
                )}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2 text-[11px] font-semibold">
              <span className="rounded-full bg-emerald-50 px-3 py-1.5 text-emerald-700">
                {presentCount} حاضر
              </span>

              <span className="rounded-full bg-blue-50 px-3 py-1.5 text-blue-700">
                {workingCount} داخل شرکت
              </span>

              <span className="rounded-full bg-rose-50 px-3 py-1.5 text-rose-700">
                {absentCount} غایب
              </span>

              {holidayCount > 0 ? (
                <span className="rounded-full bg-violet-50 px-3 py-1.5 text-violet-700">
                  {holidayCount} تعطیل
                </span>
              ) : null}
            </div>
          </div>

          {rows.length === 0 ? (
            <EmptyState />
          ) : (
            <>
              <div className="hidden border-b border-slate-100 bg-slate-50/60 px-6 py-3 text-[11px] font-semibold text-slate-400 md:grid md:grid-cols-[minmax(240px,1.5fr)_120px_120px_170px_140px_24px] md:items-center md:gap-4">
                <span>کارمند</span>
                <span>ورود</span>
                <span>خروج</span>
                <span>کارکرد</span>
                <span>وضعیت</span>
                <span />
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
}: {
  employee: Employee;
  attendance: AttendanceRecord | null;
  calculation: AttendanceCalculation;
}) {
  const StateIcon =
    getStateIcon(
      calculation.state,
    );

  return (
    <Link
      href={`/admin/attendance/${employee.id}`}
      className="group block px-4 py-4 transition hover:bg-slate-50/70 sm:px-5"
    >
      <div className="grid gap-3 md:grid-cols-[minmax(240px,1.5fr)_120px_120px_170px_140px_24px] md:items-center md:gap-4">
        <div className="flex min-w-0 items-center gap-3">
          <div
            className={
              employee.isActive
                ? "flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-slate-950 text-xs font-bold text-white"
                : "flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-slate-100 text-xs font-bold text-slate-400"
            }
          >
            {employee.firstName?.[0] ??
              ""}
            {employee.lastName?.[0] ??
              ""}
          </div>

          <div className="min-w-0">
            <div className="flex min-w-0 items-center gap-2">
              <p className="truncate text-sm font-bold text-slate-900">
                {employee.firstName}{" "}
                {employee.lastName}
              </p>

              {!employee.isActive ? (
                <span className="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-[9px] font-semibold text-slate-400">
                  غیرفعال
                </span>
              ) : null}
            </div>

            <p className="mt-1 truncate text-xs text-slate-400">
              @{employee.username}
            </p>
          </div>
        </div>

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

          {calculation.lateMinutes >
          0 ? (
            <p className="mt-1 text-[10px] text-amber-600">
              تأخیر:{" "}
              {formatMinutes(
                calculation.lateMinutes,
              )}
            </p>
          ) : null}

          {calculation
            .earlyLeaveMinutes >
          0 ? (
            <p className="mt-1 text-[10px] text-rose-600">
              تعجیل:{" "}
              {formatMinutes(
                calculation.earlyLeaveMinutes,
              )}
            </p>
          ) : null}
        </div>

        <div className="flex items-center justify-between gap-3">
          <div className="md:hidden">
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-slate-400">
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

          <div className="mr-auto flex items-center gap-2 md:mr-0">
            <span
              className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-semibold ${getStateClass(
                calculation.state,
              )}`}
            >
              <StateIcon
                size={12}
              />

              {getStateText(
                calculation.state,
              )}
            </span>

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

            <ChevronLeft
              size={16}
              className="text-slate-300 transition group-hover:text-slate-500"
            />
          </div>
        </div>
      </div>
    </Link>
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
    <div className="rounded-[22px] border border-slate-200/80 bg-white p-4 shadow-[0_8px_30px_rgba(15,23,42,0.03)]">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-medium text-slate-400">
            {title}
          </p>

          <p
            className={`mt-2 break-words text-xl font-bold tracking-tight ${valueClass}`}
          >
            {value}
          </p>
        </div>

        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-50 text-slate-500">
          <Icon size={17} />
        </div>
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex min-h-[320px] flex-col items-center justify-center px-6 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-50 text-slate-300">
        <CheckCircle2
          size={27}
        />
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