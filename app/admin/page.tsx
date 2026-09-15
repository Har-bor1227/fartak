import {
  Activity,
  ArrowRightLeft,
  CalendarDays,
  CheckCircle2,
  Clock3,
  LogIn,
  LogOut,
  LucideIcon,
  MinusCircle,
  Plane,
  TriangleAlert,
  UserCheck,
  UserX,
  Users,
  BriefcaseBusiness,
} from "lucide-react";

import AdminShell from "@/components/admin/admin-shell";
import AdminStatCard from "@/components/admin/admin-stat-card";

import { requireAdmin } from "@/lib/auth/current-user";

import {
  calculateAttendanceDay,
  type AttendanceCalculation,
  type AttendanceHoliday,
  type AttendanceLeave,
  type AttendanceRecord as EngineAttendanceRecord,
  type AttendanceSchedule,
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

type TemporaryExit = {
  type: "TEMPORARY" | "MISSION";
  status: "OPEN" | "COMPLETED";
  startedAt: Date;
  endedAt: Date | null;
};

type AttendanceRecord = {
  id: string;
  userId: string;
  workDate: Date;
  checkIn: Date | null;
  checkOut: Date | null;
  status: string;
  note: string | null;
  temporaryExits: TemporaryExit[];
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

  const hours =
    Math.floor(
      totalMinutes / 60,
    );

  const minutes =
    totalMinutes % 60;

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
      return "bg-sky-50 text-sky-700";

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
      return Plane;

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

function getTemporaryExitLabel(
  type: TemporaryExit["type"],
): string {
  return type === "MISSION"
    ? "مأموریت"
    : "خروج موقت";
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
      attendance.status as EngineAttendanceRecord["status"],

    note:
      attendance.note,

    temporaryExits:
      attendance.temporaryExits.map(
        (exit) => ({
          type:
            exit.type,

          status:
            exit.status,

          startedAt:
            exit.startedAt,

          endedAt:
            exit.endedAt,
        }),
      ),
  };
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
    title:
      holiday.title,

    description:
      holiday.description,
  };
}

function toEngineLeave(
  leave:
    | {
        type: AttendanceLeave["type"];
      }
    | null,
): AttendanceLeave | null {
  if (!leave) {
    return null;
  }

  return {
    type: leave.type,
  };
}

function getTemporaryExitMinutes(
  exit: TemporaryExit,
  now: Date,
): number {
  const end =
    exit.endedAt ??
    now;

  const difference =
    end.getTime() -
    exit.startedAt.getTime();

  if (difference <= 0) {
    return 0;
  }

  return Math.floor(
    difference / 60000,
  );
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
    todayLeaves,
    companyScheduleHistory,
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

        temporaryExits: {
          orderBy: {
            startedAt: "asc",
          },

          select: {
            type: true,
            status: true,
            startedAt: true,
            endedAt: true,
          },
        },
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

    prisma.leave.findMany({
      where: {
        status: "APPROVED",

        startDate: {
          lte: start,
        },

        endDate: {
          gte: start,
        },

        user: {
          role: "EMPLOYEE",
          isActive: true,
        },
      },

      select: {
        userId: true,
        type: true,
      },
    }),

    getCompanyScheduleHistory({
      from: start,
      to: end,
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

      from: start,
      to: end,
    });

  const attendanceMap =
    new Map<
      string,
      AttendanceRecord
    >();

  for (
    const attendance of
      todayAttendances
  ) {
    attendanceMap.set(
      attendance.userId,
      attendance,
    );
  }

  const leaveMap =
    new Map<
      string,
      AttendanceLeave
    >();

  for (
    const leave of
      todayLeaves
  ) {
    leaveMap.set(
      leave.userId,
      {
        type:
          leave.type,
      },
    );
  }

  const rows:
    DashboardRow[] =
    employees.map(
      (employee) => {
        const attendance =
          attendanceMap.get(
            employee.id,
          ) ?? null;

        const leave =
          leaveMap.get(
            employee.id,
          ) ?? null;

        const employeeSchedule =
          resolveEmployeeSchedule({
            assignments:
              shiftAssignments,

            userId:
              employee.id,

            workDate:
              start,

            fallbackSchedule,

            companyScheduleHistory,

            currentCompanySettings:
              settings,
          });

        const calculation =
          calculateAttendanceDay({
            workDate:
              start,

            schedule:
              employeeSchedule,

            holiday:
              toEngineHoliday(
                todayHoliday,
              ),

            leave:
              toEngineLeave(
                leave,
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

  const leaveCount =
    rows.filter(
      ({ calculation }) =>
        calculation.state ===
        "LEAVE",
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

  const openTemporaryExitCount =
    rows.filter(
      ({ attendance }) =>
        attendance?.temporaryExits.some(
          (exit) =>
            exit.status ===
            "OPEN",
        ) ??
        false,
    ).length;

  const completedTemporaryExitCount =
    rows.reduce(
      (
        total,
        row,
      ) =>
        total +
        (
          row.attendance?.temporaryExits.filter(
            (exit) =>
              exit.status ===
              "COMPLETED",
          ).length ??
          0
        ),
      0,
    );

  const now =
    new Date();

  const totalTemporaryExitMinutes =
    rows.reduce(
      (
        total,
        row,
      ) =>
        total +
        (
          row.attendance
            ?.temporaryExits.reduce(
              (
                sum,
                exit,
              ) =>
                sum +
                getTemporaryExitMinutes(
                  exit,
                  now,
                ),
              0,
            ) ??
          0
        ),
      0,
    );

  const totalMissionMinutes =
    rows.reduce(
      (
        total,
        row,
      ) =>
        total +
        (
          row.attendance
            ?.temporaryExits
            .filter(
              (exit) =>
                exit.type ===
                "MISSION",
            )
            .reduce(
              (
                sum,
                exit,
              ) =>
                sum +
                getTemporaryExitMinutes(
                  exit,
                  now,
                ),
              0,
            ) ??
          0
        ),
      0,
    );

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
        className="
          mx-auto
          max-w-[1500px]
          px-4
          py-4
          sm:px-6
          sm:py-6
          xl:px-8
        "
      >
        <header className="mb-6">
          <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
            <div className="min-w-0">
              <div className="mb-3 flex flex-wrap items-center gap-2">
                <span className="inline-flex h-7 items-center gap-1.5 rounded-full bg-emerald-50 px-3 text-[10px] font-bold text-emerald-700">
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />
                  سیستم فعال است
                </span>

                <span className="hidden text-xs text-slate-400 sm:inline">
                  آخرین بروزرسانی
                </span>
              </div>

              <h1 className="text-[28px] font-bold tracking-tight text-slate-950 sm:text-3xl">
                سلام، {user.firstName} 👋
              </h1>

              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
                وضعیت حضور و غیاب شرکت را از اینجا مدیریت و بررسی کنید.
              </p>
            </div>

            <div className="w-fit rounded-[20px] border border-slate-200/80 bg-white px-4 py-3 shadow-[0_8px_30px_rgba(15,23,42,0.03)]">
              <p className="text-[10px] font-medium text-slate-400">
                امروز
              </p>

              <p className="mt-1 text-sm font-bold text-slate-900">
                {getPersianWeekday(now)}
                {" ، "}
                {formatDate(now)}
              </p>
            </div>
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
            value={
              presentCount
            }
            description={
              absentCount > 0
                ? `${absentCount} نفر غایب`
                : leaveCount > 0
                  ? `${leaveCount} نفر در مرخصی`
                  : "غیبتی ثبت نشده"
            }
            icon={Activity}
            tone="blue"
          />

          <AdminStatCard
            title="داخل شرکت"
            value={
              currentlyWorkingCount
            }
            description="هنوز خروج نهایی ثبت نکرده‌اند"
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
              workedRows.length > 0
                ? `بر اساس ${workedRows.length} نفر`
                : "هنوز اطلاعات کافی نیست"
            }
            icon={Clock3}
            tone="amber"
          />
        </section>

        <section className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-9">
          <MiniStat
            title="تکمیل شده"
            value={
              completedCount
            }
            icon={CheckCircle2}
          />

          <MiniStat
            title="غایب"
            value={
              absentCount
            }
            icon={UserX}
            valueClass="text-rose-600"
          />

          <MiniStat
            title="مرخصی"
            value={
              leaveCount
            }
            icon={Plane}
            valueClass="text-sky-600"
          />

          <MiniStat
            title="تعطیل"
            value={
              holidayCount
            }
            icon={CalendarDays}
            valueClass="text-violet-600"
          />

          <MiniStat
            title="غیرکاری"
            value={
              nonWorkingCount
            }
            icon={MinusCircle}
          />

          <MiniStat
            title="خروج باز"
            value={
              openTemporaryExitCount
            }
            icon={ArrowRightLeft}
            valueClass="text-amber-600"
          />

          <MiniStat
            title="خروج‌های امروز"
            value={
              completedTemporaryExitCount
            }
            icon={ArrowRightLeft}
            valueClass="text-amber-600"
          />

          <MiniStat
            title="تأخیر"
            value={
              totalLateMinutes > 0
                ? formatMinutes(
                    totalLateMinutes,
                  )
                : "۰ دقیقه"
            }
            icon={TriangleAlert}
            valueClass="text-amber-600"
          />

          <MiniStat
            title="مأموریت"
            value={
              totalMissionMinutes > 0
                ? formatMinutes(
                    totalMissionMinutes,
                  )
                : "۰ دقیقه"
            }
            icon={BriefcaseBusiness}
            valueClass="text-blue-600"
          />
        </section>

        <section className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,1.65fr)_minmax(320px,0.85fr)]">
          <div className="overflow-hidden rounded-[28px] border border-slate-200/80 bg-white shadow-[0_10px_35px_rgba(15,23,42,0.04)]">
            <div className="border-b border-slate-100 px-5 py-5 sm:px-6">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-50 text-slate-500">
                      <Activity size={17} />
                    </div>

                    <h2 className="text-base font-bold text-slate-950">
                      وضعیت امروز
                    </h2>
                  </div>

                  <p className="mt-2 text-xs text-slate-400">
                    {formatDate(start)}
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {todayHoliday ? (
                    <span className="rounded-full bg-violet-50 px-3 py-1.5 text-[10px] font-semibold text-violet-700">
                      {todayHoliday.title}
                    </span>
                  ) : null}

                  {leaveCount > 0 ? (
                    <span className="rounded-full bg-sky-50 px-3 py-1.5 text-[10px] font-semibold text-sky-700">
                      {leaveCount} مرخصی
                    </span>
                  ) : null}

                  {openTemporaryExitCount > 0 ? (
                    <span className="rounded-full bg-amber-50 px-3 py-1.5 text-[10px] font-semibold text-amber-700">
                      {openTemporaryExitCount} خروج باز
                    </span>
                  ) : null}

                  <span className="rounded-full bg-slate-50 px-3 py-1.5 text-[10px] font-semibold text-slate-500">
                    {presentCount} حاضر
                  </span>
                </div>
              </div>
            </div>

            {rows.length === 0 ? (
              <div className="flex min-h-[340px] flex-col items-center justify-center px-6 text-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-50 text-slate-300">
                  <Users size={25} />
                </div>

                <h3 className="mt-5 text-sm font-bold text-slate-900">
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
                        row.calculation.state,
                      );

                    const openExit =
                      row.attendance
                        ?.temporaryExits.find(
                          (exit) =>
                            exit.status ===
                            "OPEN",
                        ) ??
                      null;

                    return (
                      <div
                        key={
                          row.employee.id
                        }
                        className="group px-5 py-4 transition hover:bg-slate-50/60 sm:px-6"
                      >
                        <div className="flex min-w-0 items-center gap-3">
                          <div className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-slate-100 text-xs font-bold text-slate-700">
                            {
                              row.employee
                                .firstName?.[0]
                            }
                            {
                              row.employee
                                .lastName?.[0]
                            }

                            {row.calculation.state ===
                            "WORKING" ? (
                              <span className="absolute -bottom-0.5 -left-0.5 h-2.5 w-2.5 rounded-full border-2 border-white bg-emerald-500" />
                            ) : null}
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

                            <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
                              <p className="truncate text-[10px] text-slate-400">
                                @
                                {
                                  row.employee
                                    .username
                                }
                              </p>

                              <span className="hidden text-[10px] text-slate-300 sm:inline">
                                •
                              </span>

                              <p className="text-[10px] text-slate-400">
                                ورود{" "}
                                <span className="font-semibold text-slate-600">
                                  {formatTime(
                                    row.calculation.checkIn,
                                  )}
                                </span>
                              </p>

                              <p className="hidden text-[10px] text-slate-400 sm:block">
                                کارکرد{" "}
                                <span className="font-semibold text-slate-600">
                                  {formatMinutes(
                                    row.calculation.workedMinutes,
                                  )}
                                </span>
                              </p>

                              {row.calculation
                                .temporaryExitMinutes >
                              0 ? (
                                <>
                                  <span className="hidden text-[10px] text-slate-300 sm:inline">
                                    •
                                  </span>

                                  <p className="text-[10px] text-amber-600">
                                    خروج{" "}
                                    <span className="font-semibold">
                                      {formatMinutes(
                                        row.calculation
                                          .temporaryExitMinutes,
                                      )}
                                    </span>
                                  </p>
                                </>
                              ) : null}
                            </div>
                          </div>

                          <div className="flex shrink-0 items-center gap-2">
                            {openExit ? (
                              <span className="hidden items-center gap-1.5 rounded-full bg-amber-50 px-2.5 py-1.5 text-[9px] font-semibold text-amber-700 sm:inline-flex">
                                <ArrowRightLeft size={11} />
                                {getTemporaryExitLabel(
                                  openExit.type,
                                )}
                              </span>
                            ) : null}

                            <span
                              className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1.5 text-[9px] font-semibold sm:px-3 sm:text-[10px] ${getStateClass(
                                row.calculation.state,
                              )}`}
                            >
                              <StateIcon size={11} />

                              {getStateLabel(
                                row.calculation.state,
                              )}
                            </span>
                          </div>
                        </div>

                        {openExit ? (
                          <div className="mt-3 mr-[56px] inline-flex items-center gap-2 rounded-full bg-amber-50 px-3 py-1.5 text-[9px] font-semibold text-amber-700">
                            <ArrowRightLeft size={11} />

                            {getTemporaryExitLabel(
                              openExit.type,
                            )}

                            <span className="font-normal text-amber-600">
                              · فعال
                            </span>
                          </div>
                        ) : null}

                        {row.calculation.state ===
                        "LEAVE" ? (
                          <div className="mt-3 mr-[56px] inline-flex items-center gap-1.5 rounded-full bg-sky-50 px-3 py-1.5 text-[9px] font-semibold text-sky-700">
                            <Plane size={11} />

                            {row.calculation
                              .leave?.type ===
                            "ANNUAL"
                              ? "استحقاقی"
                              : row.calculation
                                    .leave
                                    ?.type ===
                                "SICK"
                                ? "استعلاجی"
                                : row.calculation
                                      .leave
                                      ?.type ===
                                    "UNPAID"
                                  ? "بدون حقوق"
                                  : "متفرقه"}
                          </div>
                        ) : null}
                      </div>
                    );
                  },
                )}
              </div>
            )}

            {rows.length > 0 ? (
              <div className="border-t border-slate-100 bg-slate-50/40 px-5 py-3.5 sm:px-6">
                <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-[10px] text-slate-400">
                  <span>
                    <b className="font-bold text-emerald-600">
                      {presentCount}
                    </b>{" "}
                    حاضر
                  </span>

                  <span>
                    <b className="font-bold text-blue-600">
                      {currentlyWorkingCount}
                    </b>{" "}
                    داخل شرکت
                  </span>

                  <span>
                    <b className="font-bold text-rose-600">
                      {absentCount}
                    </b>{" "}
                    غایب
                  </span>

                  <span>
                    <b className="font-bold text-sky-600">
                      {leaveCount}
                    </b>{" "}
                    مرخصی
                  </span>

                  <span>
                    <b className="font-bold text-amber-600">
                      {openTemporaryExitCount}
                    </b>{" "}
                    خروج باز
                  </span>

                  <span>
                    <b className="font-bold text-slate-700">
                      {completedCount}
                    </b>{" "}
                    خروج نهایی
                  </span>
                </div>
              </div>
            ) : null}
          </div>

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-1">
            <div className="relative overflow-hidden rounded-[28px] bg-slate-950 p-6 text-white shadow-[0_20px_55px_rgba(15,23,42,0.14)]">
              <div className="absolute -left-12 -top-12 h-44 w-44 rounded-full bg-blue-500/20 blur-3xl" />

              <div className="absolute -bottom-16 -right-12 h-48 w-48 rounded-full bg-emerald-500/10 blur-3xl" />

              <div className="relative">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/10">
                    <Activity size={19} />
                  </div>

                  <span className="flex items-center gap-1.5 rounded-full bg-emerald-400/10 px-3 py-1.5 text-[10px] font-bold text-emerald-300">
                    <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
                    زنده
                  </span>
                </div>

                <p className="mt-8 text-xs text-slate-400">
                  کارکنان حاضر در شرکت
                </p>

                <p className="mt-1 text-5xl font-bold tracking-tight sm:text-6xl">
                  {currentlyWorkingCount}
                </p>

                <p className="mt-3 text-xs leading-6 text-slate-400">
                  این افراد امروز وارد شده‌اند و هنوز خروج نهایی خود را ثبت نکرده‌اند.
                </p>

                {openTemporaryExitCount > 0 ? (
                  <div className="mt-5 rounded-2xl bg-amber-400/10 px-4 py-3">
                    <div className="flex items-center gap-2">
                      <ArrowRightLeft
                        size={15}
                        className="text-amber-300"
                      />

                      <p className="text-[11px] font-semibold text-amber-200">
                        {openTemporaryExitCount} نفر در خروج موقت هستند
                      </p>
                    </div>
                  </div>
                ) : null}
              </div>
            </div>

            <div className="rounded-[28px] border border-slate-200/80 bg-white p-6 shadow-[0_10px_35px_rgba(15,23,42,0.04)]">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h3 className="text-sm font-bold text-slate-950">
                    خلاصه امروز
                  </h3>

                  <p className="mt-1 text-[10px] text-slate-400">
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
                  label="خروج باز"
                  value={`${openTemporaryExitCount} نفر`}
                  valueClass="text-amber-600"
                />

                <SummaryRow
                  label="خروج نهایی"
                  value={`${completedCount} نفر`}
                  valueClass="text-slate-900"
                />

                <SummaryRow
                  label="مرخصی"
                  value={`${leaveCount} نفر`}
                  valueClass="text-sky-600"
                />

                <SummaryRow
                  label="مجموع خروج موقت"
                  value={formatMinutes(
                    totalTemporaryExitMinutes,
                  )}
                  valueClass="text-amber-600"
                />
              </div>

              <div className="mt-6 border-t border-slate-100 pt-5">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-[10px] text-slate-400">
                    نرخ حضور
                  </p>

                  <p className="text-xs font-bold text-slate-900">
                    {attendancePercentage}٪
                  </p>
                </div>

                <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100">
                  <div
                    className="h-full rounded-full bg-slate-950 transition-all duration-500"
                    style={{
                      width: `${attendancePercentage}%`,
                    }}
                  />
                </div>

                <p className="mt-2 text-[10px] text-slate-400">
                  {employees.length > 0
                    ? `${attendancePercentage}٪ از کارکنان امروز حضور زده‌اند`
                    : "هنوز کارمندی تعریف نشده است"}
                </p>
              </div>
            </div>
          </div>
        </section>

        {futureCount > 0 ? (
          <p className="mt-4 text-center text-[10px] text-slate-400">
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
    <div className="flex items-center justify-between gap-4">
      <span className="text-xs text-slate-500">
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
    <div className="min-w-0 rounded-[22px] border border-slate-200/80 bg-white p-3.5 shadow-[0_8px_30px_rgba(15,23,42,0.03)] sm:p-4">
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