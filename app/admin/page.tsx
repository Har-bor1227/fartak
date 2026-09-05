import {
  Activity,
  CalendarDays,
  CheckCircle2,
  Clock3,
  LogIn,
  LogOut,
  MinusCircle,
  TriangleAlert,
  LucideIcon,
  UserCheck,
  UserX,
  Users,
} from "lucide-react";


import AdminShell from "@/components/admin/admin-shell";
import AdminStatCard from "@/components/admin/admin-stat-card";

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
  getPersianWeekday,
  getTodayRange,
} from "@/lib/date/tehran";

import { prisma } from "@/lib/prisma";

type Employee = {
  id: string;
  firstName: string;
  lastName: string;
  username: string;
};

type AttendanceRecord = {
  id: string;
  workDate: Date;
  checkIn: Date | null;
  checkOut: Date | null;
  status: string;
  note: string | null;
};

type DashboardRow = {
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

function toEngineAttendance(
  attendance:
    | AttendanceRecord
    | null,
): EngineAttendanceRecord | null {
  if (!attendance) {
    return null;
  }

  return {
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
  } as EngineAttendanceRecord;
}

function toEngineHoliday(
  holiday:
    | {
        date: Date;
        title: string;
        description: string | null;
      }
    | null,
): AttendanceHoliday | null {
  if (!holiday) {
    return null;
  }

  return {
    title: holiday.title,
    description:
      holiday.description,
  } as AttendanceHoliday;
}

export default async function AdminDashboardPage() {
  const user =
    await requireAdmin();

  const {
    start,
    end,
  } = getTodayRange();

  const [
    employees,
    todayAttendances,
    settings,
    todayHoliday,
  ] = await Promise.all([
    prisma.user.findMany({
      where: {
        role: "EMPLOYEE",
        isActive: true,
      },

      select: {
        id: true,
        firstName: true,
        lastName: true,
        username: true,
      },

      orderBy: [
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
          gte: start,
          lt: end,
        },

        user: {
          role: "EMPLOYEE",
          isActive: true,
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

      orderBy: {
        checkIn: "desc",
      },
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

  const attendanceMap =
    new Map<
      string,
      AttendanceRecord
    >();

  for (const attendance of todayAttendances) {
    attendanceMap.set(
      attendance.userId,
      attendance,
    );
  }

  const rows: DashboardRow[] =
    employees.map(
      (employee) => {
        const attendance =
          attendanceMap.get(
            employee.id,
          ) ?? null;

        const calculation =
          calculateAttendanceDay({
            workDate: start,
            schedule,
            holiday:
              toEngineHoliday(
                todayHoliday,
              ),
            attendance:
              toEngineAttendance(
                attendance,
              ),
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

  const currentlyWorkingCount =
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

  const averageMinutes =
    workedRows.length > 0
      ? Math.round(
          totalWorkedMinutes /
            workedRows.length,
        )
      : 0;

  const now = new Date();

  const attendancePercentage =
    employees.length > 0
      ? Math.round(
          (presentCount /
            employees.length) *
            100,
        )
      : 0;

  return (
    <AdminShell
      firstName={
        user.firstName
      }
      lastName={
        user.lastName
      }
    >
      <div
        dir="rtl"
        className="mx-auto max-w-[1500px] px-4 py-4 sm:px-6 sm:py-6 xl:px-8"
      >
        <header className="mb-6 flex flex-col gap-4 sm:mb-8 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="mb-2 flex items-center gap-2">
              <span className="flex h-7 items-center rounded-full bg-emerald-50 px-3 text-[11px] font-semibold text-emerald-700">
                سیستم فعال است
              </span>

              <span className="hidden text-xs text-slate-400 sm:inline">
                آخرین بروزرسانی خودکار
              </span>
            </div>

            <h1 className="text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">
              سلام، {user.firstName} 👋
            </h1>

            <p className="mt-2 text-sm text-slate-500">
              وضعیت حضور و غیاب شرکت را از اینجا مدیریت کنید.
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200/80 bg-white px-4 py-3 shadow-sm">
            <p className="text-xs font-medium text-slate-400">
              امروز
            </p>

            <p className="mt-1 text-sm font-bold text-slate-900">
              {getPersianWeekday(
                now,
              )}{" "}
              ،{" "}
              {formatDate(now)}
            </p>
          </div>
        </header>

        <section className="grid grid-cols-2 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <AdminStatCard
            title="کل کارکنان"
            value={
              employees.length
            }
            description="کارمندان فعال"
            icon={Users}
            tone="dark"
          />

          <AdminStatCard
            title="حاضر امروز"
            value={presentCount}
            description={`${absentCount} نفر غایب`}
            icon={Activity}
            tone="blue"
          />

          <AdminStatCard
            title="داخل شرکت"
            value={
              currentlyWorkingCount
            }
            description="هنوز خروج ثبت نکرده‌اند"
            icon={LogIn}
            tone="green"
          />

          <AdminStatCard
            title="میانگین کارکرد"
            value={
              averageMinutes > 0
                ? formatMinutes(
                    averageMinutes,
                  )
                : "—"
            }
            description={
              workedRows.length >
              0
                ? `بر اساس ${workedRows.length} نفر`
                : "هنوز اطلاعات کافی نیست"
            }
            icon={Clock3}
            tone="amber"
          />
        </section>

        <section className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
          <MiniStat
            title="تکمیل شده"
            value={
              completedCount
            }
            icon={CheckCircle2}
          />

          <MiniStat
            title="غایب"
            value={absentCount}
            icon={UserX}
            valueClass="text-rose-600"
          />

          <MiniStat
            title="تعطیل"
            value={holidayCount}
            icon={CalendarDays}
            valueClass="text-violet-600"
          />

          <MiniStat
            title="غیرکاری"
            value={nonWorkingCount}
            icon={MinusCircle}
          />

          <MiniStat
            title="تأخیر"
            value={
              totalLateMinutes >
              0
                ? formatMinutes(
                    totalLateMinutes,
                  )
                : "۰ دقیقه"
            }
            icon={TriangleAlert}
            valueClass="text-amber-600"
          />

          <MiniStat
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
        </section>

        <section className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,1.65fr)_minmax(320px,0.85fr)]">
          <div className="overflow-hidden rounded-[26px] border border-slate-200/80 bg-white shadow-[0_8px_30px_rgba(15,23,42,0.04)]">
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-5 sm:px-6">
              <div>
                <h2 className="text-base font-bold text-slate-950">
                  وضعیت امروز
                </h2>

                <p className="mt-1 text-xs text-slate-400">
                  {formatDate(start)}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {todayHoliday ? (
                  <span className="rounded-full bg-violet-50 px-3 py-1.5 text-[11px] font-semibold text-violet-700">
                    {todayHoliday.title}
                  </span>
                ) : null}

                <span className="flex h-9 items-center gap-2 rounded-xl bg-slate-50 px-3 text-xs font-semibold text-slate-500">
                  {presentCount} حاضر
                </span>
              </div>
            </div>

            {rows.length === 0 ? (
              <div className="flex min-h-[300px] flex-col items-center justify-center px-6 text-center">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-50 text-slate-300">
                  <Users size={24} />
                </div>

                <h3 className="mt-4 text-sm font-bold text-slate-900">
                  کارمند فعالی وجود ندارد
                </h3>

                <p className="mt-2 max-w-sm text-xs leading-6 text-slate-400">
                  ابتدا یک کارمند فعال در بخش مدیریت کارکنان ایجاد کنید.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {rows.map(
                  (row) => {
                    const StateIcon =
                      getStateIcon(
                        row.calculation
                          .state,
                      );

                    return (
                      <div
                        key={
                          row.employee
                            .id
                        }
                        className="flex items-center gap-3 px-5 py-4 transition hover:bg-slate-50/70 sm:px-6"
                      >
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-slate-100 text-xs font-bold text-slate-700">
                          {
                            row.employee
                              .firstName?.[0]
                          }
                          {
                            row.employee
                              .lastName?.[0]
                          }
                        </div>

                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-bold text-slate-900">
                            {
                              row.employee
                                .firstName
                            }{" "}
                            {
                              row.employee
                                .lastName
                            }
                          </p>

                          <p className="mt-1 truncate text-[11px] text-slate-400">
                            @
                            {
                              row.employee
                                .username
                            }
                          </p>
                        </div>

                        <div className="hidden min-w-[85px] sm:block">
                          <p className="text-[11px] text-slate-400">
                            ورود
                          </p>

                          <p className="mt-1 text-sm font-semibold text-slate-800">
                            {formatTime(
                              row.calculation
                                .checkIn,
                            )}
                          </p>
                        </div>

                        <div className="hidden min-w-[85px] sm:block">
                          <p className="text-[11px] text-slate-400">
                            خروج
                          </p>

                          <p className="mt-1 text-sm font-semibold text-slate-800">
                            {formatTime(
                              row.calculation
                                .checkOut,
                            )}
                          </p>
                        </div>

                        <div className="hidden min-w-[120px] md:block">
                          <p className="text-[11px] text-slate-400">
                            کارکرد
                          </p>

                          <p className="mt-1 text-sm font-semibold text-slate-800">
                            {formatMinutes(
                              row.calculation
                                .workedMinutes,
                            )}
                          </p>
                        </div>

                        <div className="flex items-center gap-2">
                          <span
                            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[10px] font-semibold ${getStateClass(
                              row.calculation
                                .state,
                            )}`}
                          >
                            <StateIcon
                              size={12}
                            />

                            {getStateLabel(
                              row.calculation
                                .state,
                            )}
                          </span>
                        </div>
                      </div>
                    );
                  },
                )}
              </div>
            )}
          </div>

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-1">
            <div className="relative overflow-hidden rounded-[26px] bg-slate-950 p-6 text-white shadow-[0_20px_50px_rgba(15,23,42,0.15)]">
              <div className="absolute -left-10 -top-10 h-40 w-40 rounded-full bg-blue-500/20 blur-3xl" />

              <div className="relative">
                <div className="flex items-center justify-between">
                  <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/10">
                    <Activity size={19} />
                  </div>

                  <span className="flex items-center gap-1.5 rounded-full bg-emerald-400/10 px-3 py-1.5 text-[11px] font-semibold text-emerald-300">
                    <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
                    زنده
                  </span>
                </div>

                <p className="mt-8 text-sm text-slate-400">
                  کارکنان حاضر در شرکت
                </p>

                <p className="mt-1 text-5xl font-bold tracking-tight">
                  {
                    currentlyWorkingCount
                  }
                </p>

                <p className="mt-3 text-xs leading-6 text-slate-400">
                  این تعداد از کارکنان امروز وارد شده‌اند و هنوز خروج خود را ثبت نکرده‌اند.
                </p>
              </div>
            </div>

            <div className="rounded-[26px] border border-slate-200/80 bg-white p-6 shadow-[0_8px_30px_rgba(15,23,42,0.04)]">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-950">
                    خلاصه امروز
                  </h3>

                  <p className="mt-1 text-xs text-slate-400">
                    وضعیت کلی تیم
                  </p>
                </div>

                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-50 text-slate-700">
                  <LogOut size={18} />
                </div>
              </div>

              <div className="mt-6 space-y-4">
                <SummaryRow
                  label="حاضر"
                  value={`${presentCount} نفر`}
                  valueClass="text-emerald-600"
                />

                <SummaryRow
                  label="داخل شرکت"
                  value={`${currentlyWorkingCount} نفر`}
                  valueClass="text-blue-600"
                />

                <SummaryRow
                  label="خروج ثبت شده"
                  value={`${completedCount} نفر`}
                  valueClass="text-slate-900"
                />

                <SummaryRow
                  label="غایب"
                  value={`${absentCount} نفر`}
                  valueClass="text-rose-600"
                />
              </div>

              <div className="mt-6 border-t border-slate-100 pt-5">
                <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                  <div
                    className="h-full rounded-full bg-slate-950 transition-all"
                    style={{
                      width: `${attendancePercentage}%`,
                    }}
                  />
                </div>

                <p className="mt-2 text-[11px] text-slate-400">
                  {employees.length >
                  0
                    ? `${attendancePercentage}% از کارکنان امروز حضور زده‌اند`
                    : "هنوز کارمندی تعریف نشده است"}
                </p>
              </div>
            </div>
          </div>
        </section>

        {futureCount > 0 ? (
          <p className="mt-4 text-center text-[11px] text-slate-400">
            {futureCount} مورد مربوط به تاریخ آینده است.
          </p>
        ) : null}
      </div>
    </AdminShell>
  );
}

function SummaryRow({
  label,
  value,
  valueClass,
}: {
  label: string;
  value: string;
  valueClass: string;
}) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm text-slate-500">
        {label}
      </span>

      <span
        className={`text-sm font-bold ${valueClass}`}
      >
        {value}
      </span>
    </div>
  );
}

function MiniStat({
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
          <p className="text-[11px] font-medium text-slate-400">
            {title}
          </p>

          <p
            className={`mt-2 break-words text-lg font-bold ${valueClass}`}
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