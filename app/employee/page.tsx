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
import TemporaryExitPanel from "./temporary-exit-panel";

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
  getTodayRange,
} from "@/lib/date/tehran";

import { prisma } from "@/lib/prisma";

type EmployeeCalculation =
  AttendanceCalculation & {
    state:
      | AttendanceCalculation["state"]
      | "LEAVE";
  };

type LeaveType =
  | "ANNUAL"
  | "SICK"
  | "UNPAID"
  | "OTHER";

type LeaveRecord = {
  id: string;
  type: LeaveType;
  startDate: Date;
  endDate: Date;
  reason: string | null;
};

type HistoryItem = {
  id: string;
  workDate: Date;
  checkIn: Date | null;
  checkOut: Date | null;
  calculation: EmployeeCalculation;
  leave: LeaveRecord | null;
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
  state: EmployeeCalculation["state"],
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

    case "LEAVE":
      return "مرخصی";

    default:
      return "نامشخص";
  }
}

function getStateClass(
  state: EmployeeCalculation["state"],
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

    case "LEAVE":
      return "bg-violet-50 text-violet-700";

    default:
      return "bg-slate-100 text-slate-500";
  }
}

function getStateIcon(
  state: EmployeeCalculation["state"],
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

    case "LEAVE":
      return CalendarDays;

    default:
      return TriangleAlert;
  }
}

function getLeaveTypeLabel(
  type: LeaveType,
): string {
  switch (type) {
    case "ANNUAL":
      return "استحقاقی";

    case "SICK":
      return "استعلاجی";

    case "UNPAID":
      return "بدون حقوق";

    case "OTHER":
      return "سایر";
  }
}

function toEngineAttendance(
  attendance: {
    workDate: Date;
    checkIn: Date | null;
    checkOut: Date | null;
    status: string;
    note: string | null;
    temporaryExits?: Array<{
      type: "TEMPORARY" | "MISSION";
      status: "OPEN" | "COMPLETED";
      startedAt: Date;
      endedAt: Date | null;
    }>;
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
    temporaryExits:
      attendance.temporaryExits?.map(
        (exit) => ({
          type: exit.type,
          status: exit.status,
          startedAt: exit.startedAt,
          endedAt: exit.endedAt,
        }),
      ) ?? [],
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

function createLeaveCalculation(
  calculation: AttendanceCalculation,
): EmployeeCalculation {
  return {
    ...calculation,
    state: "LEAVE",
    checkIn: null,
    checkOut: null,
    workedMinutes: 0,
    scheduledMinutes: 0,
    lateMinutes: 0,
    earlyLeaveMinutes: 0,
    overtimeMinutes: 0,
    underworkMinutes: 0,
    balanceMinutes: 0,
    hasAttendance: false,
    isComplete: false,
    attendanceStatus: null,
    note: null,
  };
}

function leaveCoversDate(
  leave: LeaveRecord,
  dateKey: string,
): boolean {
  const range =
    getDateRange(dateKey);

  if (!range) {
    return false;
  }

  return (
    leave.startDate < range.end &&
    leave.endDate >= range.start
  );
}

function getLeaveForDate(
  leaves: LeaveRecord[],
  dateKey: string,
): LeaveRecord | null {
  return (
    leaves.find((leave) =>
      leaveCoversDate(
        leave,
        dateKey,
      ),
    ) ?? null
  );
}

function isApprovedLeaveDay(
  calculation: AttendanceCalculation,
  attendance: {
    checkIn: Date | null;
    checkOut: Date | null;
  } | null,
  leave: LeaveRecord | null,
): boolean {
  return Boolean(
    leave &&
      !attendance &&
      calculation.isWorkingDay &&
      !calculation.isHoliday &&
      !calculation.isFuture,
  );
}

export default async function EmployeePage() {
  const user =
    await requireEmployee();

  const {
    start,
    end,
  } = getTodayRange();

  const [
    todayAttendance,
    historyRecords,
    settings,
    todayHoliday,
    todayLeaves,
    recentLeaves,
  ] = await Promise.all([
    prisma.attendance.findUnique({
      where: {
        userId_workDate: {
          userId: user.id,
          workDate: start,
        },
      },

      include: {
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

      include: {
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
        userId: user.id,
        status: "APPROVED",
        startDate: {
          lt: end,
        },
        endDate: {
          gte: start,
        },
      },

      orderBy: {
        startDate: "asc",
      },

      select: {
        id: true,
        type: true,
        startDate: true,
        endDate: true,
        reason: true,
      },
    }),

    prisma.leave.findMany({
      where: {
        userId: user.id,
        status: "APPROVED",
        endDate: {
          lt: end,
        },
      },

      orderBy: {
        startDate: "desc",
      },

      take: 20,

      select: {
        id: true,
        type: true,
        startDate: true,
        endDate: true,
        reason: true,
      },
    }),
  ]);

  const fallbackSchedule:
    AttendanceSchedule =
    getDefaultAttendanceSchedule(
      settings,
    );

  const normalizedTodayLeaves: LeaveRecord[] =
    todayLeaves.map((leave) => ({
      ...leave,
      type: leave.type as LeaveType,
    }));

  const normalizedRecentLeaves: LeaveRecord[] =
    recentLeaves.map((leave) => ({
      ...leave,
      type: leave.type as LeaveType,
    }));

  const todayLeave =
    getLeaveForDate(
      normalizedTodayLeaves,
      getDateKey(start),
    );

  const oldestAttendanceDate =
    historyRecords.length > 0
      ? historyRecords[
          historyRecords.length - 1
        ].workDate
      : null;

  const oldestLeaveDate =
    [
      ...normalizedTodayLeaves,
      ...normalizedRecentLeaves,
    ].reduce<Date | null>(
      (oldest, leave) => {
        if (
          !oldest ||
          leave.startDate.getTime() <
            oldest.getTime()
        ) {
          return leave.startDate;
        }

        return oldest;
      },
      null,
    );

  const oldestRelevantDate =
    [
      oldestAttendanceDate,
      oldestLeaveDate,
    ].reduce<Date | null>(
      (oldest, date) => {
        if (!date) {
          return oldest;
        }

        if (
          !oldest ||
          date.getTime() <
            oldest.getTime()
        ) {
          return date;
        }

        return oldest;
      },
      null,
    ) ?? start;

  const [
    shiftAssignments,
    companyScheduleHistory,
  ] = await Promise.all([
    getEmployeeShiftAssignments({
      userIds: [user.id],
      from:
        oldestRelevantDate,
      to: end,
    }),

    getCompanyScheduleHistory({
      from:
        oldestRelevantDate,
      to: end,
    }),
  ]);

  const todaySchedule =
    resolveEmployeeSchedule({
      assignments:
        shiftAssignments,

      userId:
        user.id,

      workDate:
        start,

      fallbackSchedule,

      companyScheduleHistory,

      currentCompanySettings:
        settings,
    });

  const rawTodayCalculation =
    calculateAttendanceDay({
      workDate: start,
      schedule: todaySchedule,
      holiday:
        toEngineHoliday(
          todayHoliday,
        ),
      attendance:
        toEngineAttendance(
          todayAttendance,
        ),
    });

  const todayIsLeave =
    isApprovedLeaveDay(
      rawTodayCalculation,
      todayAttendance,
      todayLeave,
    );

  const todayCalculation:
    EmployeeCalculation =
    todayIsLeave
      ? createLeaveCalculation(
          rawTodayCalculation,
        )
      : rawTodayCalculation;

  let historyHolidays: {
    date: Date;
    title: string;
    description: string | null;
  }[] = [];

  if (oldestRelevantDate) {
    historyHolidays =
      await prisma.holiday.findMany({
        where: {
          date: {
            gte:
              oldestRelevantDate,
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

  for (
    const holiday of
      historyHolidays
  ) {
    holidayMap.set(
      getDateKey(
        holiday.date,
      ),
      toEngineHoliday(
        holiday,
      )!,
    );
  }

  const historyLeaveUnique =
    new Map<
      string,
      LeaveRecord
    >();

  const historyLeaves = [
    ...normalizedRecentLeaves,
    ...normalizedTodayLeaves,
  ];

  for (
    const leave of
      historyLeaves
  ) {
    historyLeaveUnique.set(
      leave.id,
      leave,
    );
  }

  const allHistoryLeaves =
    Array.from(
      historyLeaveUnique.values(),
    );

  const historyByDate =
    new Map<
      string,
      HistoryItem
    >();

  for (
    const item of
      historyRecords
  ) {
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

    const itemSchedule =
      resolveEmployeeSchedule({
        assignments:
          shiftAssignments,

        userId:
          user.id,

        workDate:
          range?.start ??
          item.workDate,

        fallbackSchedule,

        companyScheduleHistory,

        currentCompanySettings:
          settings,
      });

    const rawCalculation =
      calculateAttendanceDay({
        workDate:
          range?.start ??
          item.workDate,

        schedule:
          itemSchedule,

        holiday,

        attendance:
          toEngineAttendance(
            item,
          ),
      });

    const leave =
      getLeaveForDate(
        allHistoryLeaves,
        dateKey,
      );

    const isLeave =
      isApprovedLeaveDay(
        rawCalculation,
        item,
        leave,
      );

    const calculation:
      EmployeeCalculation =
      isLeave
        ? createLeaveCalculation(
            rawCalculation,
          )
        : rawCalculation;

    historyByDate.set(
      dateKey,
      {
        id:
          item.id,

        workDate:
          item.workDate,

        checkIn:
          item.checkIn,

        checkOut:
          item.checkOut,

        calculation,

        leave:
          isLeave
            ? leave
            : null,
      },
    );
  }

  for (
    const leave of
      allHistoryLeaves
  ) {
    const cursor =
      new Date(
        leave.startDate,
      );

    const safeCursorEnd =
      new Date(
        Math.min(
          leave.endDate.getTime(),
          end.getTime() - 1,
        ),
      );

    while (
      cursor <=
      safeCursorEnd
    ) {
      const dateKey =
        getDateKey(
          cursor,
        );

      if (
        !historyByDate.has(
          dateKey,
        )
      ) {
        const range =
          getDateRange(
            dateKey,
          );

        if (range) {
          const holiday =
            holidayMap.get(
              dateKey,
            ) ?? null;

          const daySchedule =
            resolveEmployeeSchedule({
              assignments:
                shiftAssignments,

              userId:
                user.id,

              workDate:
                range.start,

              fallbackSchedule,

              companyScheduleHistory,

              currentCompanySettings:
                settings,
            });

          const rawCalculation =
            calculateAttendanceDay({
              workDate:
                range.start,

              schedule:
                daySchedule,

              holiday,

              attendance:
                null,
            });

          const isLeave =
            isApprovedLeaveDay(
              rawCalculation,
              null,
              leave,
            );

          if (isLeave) {
            historyByDate.set(
              dateKey,
              {
                id:
                  `leave-${leave.id}-${dateKey}`,

                workDate:
                  range.start,

                checkIn:
                  null,

                checkOut:
                  null,

                calculation:
                  createLeaveCalculation(
                    rawCalculation,
                  ),

                leave,
              },
            );
          }
        }
      }

      cursor.setDate(
        cursor.getDate() + 1,
      );
    }
  }

  const history:
    HistoryItem[] =
    Array.from(
      historyByDate.values(),
    )
      .sort(
        (a, b) =>
          b.workDate.getTime() -
          a.workDate.getTime(),
      )
      .slice(0, 20);

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

  const isLeave =
    todayCalculation.state ===
    "LEAVE";

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
        {isLeave ? (
          <div className="p-5 sm:p-7">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-violet-50 text-violet-600">
                <CalendarDays
                  size={22}
                />
              </div>

              <div className="min-w-0">
                <div className="inline-flex items-center rounded-full bg-violet-50 px-3 py-1.5 text-[11px] font-semibold text-violet-700">
                  مرخصی تایید شده
                </div>

                <h2 className="mt-4 text-xl font-bold text-slate-950">
                  امروز در مرخصی هستید
                </h2>

                <p className="mt-2 text-sm leading-6 text-slate-500">
                  {todayLeave
                    ? getLeaveTypeLabel(
                        todayLeave.type,
                      )
                    : "مرخصی ثبت‌شده"}
                </p>

                {todayLeave?.reason ? (
                  <div className="mt-4 rounded-2xl bg-slate-50 px-4 py-3">
                    <p className="text-[10px] font-semibold text-slate-400">
                      دلیل مرخصی
                    </p>

                    <p className="mt-1 text-xs leading-6 text-slate-600">
                      {
                        todayLeave.reason
                      }
                    </p>
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        ) : isHoliday ? (
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
                <Clock3
                  size={21}
                />
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

      {todayAttendance &&
      (isWorking || isCompleted) ? (
        <TemporaryExitPanel
          attendanceId={
            todayAttendance.id
          }
        />
      ) : null}

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
              آخرین ۲۰ وضعیت حضور و مرخصی شما
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
              اولین ورود یا مرخصی شما اینجا نمایش داده خواهد شد.
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

                const isHistoryLeave =
                  item.calculation
                    .state ===
                  "LEAVE";

                return (
                  <div
                    key={item.id}
                    className={`px-5 py-4 ${
                      isHistoryLeave
                        ? "bg-violet-50/30"
                        : ""
                    }`}
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

                          {isHistoryLeave &&
                          item.leave ? (
                            <span className="rounded-full bg-violet-100 px-2.5 py-1 text-[9px] font-semibold text-violet-700">
                              {getLeaveTypeLabel(
                                item.leave.type,
                              )}
                            </span>
                          ) : null}
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
                          {isHistoryLeave
                            ? "—"
                            : formatTime(
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
                          {isHistoryLeave
                            ? "—"
                            : formatTime(
                                item.calculation
                                  .checkOut,
                              )}
                        </p>
                      </div>

                      <div className="text-left sm:min-w-[100px]">
                        <p className="text-[10px] text-slate-400">
                          {isHistoryLeave
                            ? "وضعیت"
                            : "کارکرد"}
                        </p>

                        <p className="mt-1 text-xs font-semibold text-slate-700">
                          {isHistoryLeave
                            ? getLeaveTypeLabel(
                                item.leave
                                  ?.type ??
                                  "OTHER",
                              )
                            : formatMinutes(
                                item.calculation
                                  .workedMinutes,
                              )}
                        </p>
                      </div>
                    </div>

                    {isHistoryLeave &&
                    item.leave?.reason ? (
                      <div className="mt-3 rounded-2xl bg-white/70 px-3.5 py-3">
                        <p className="text-[10px] font-semibold text-slate-400">
                          دلیل مرخصی
                        </p>

                        <p className="mt-1 text-[11px] leading-6 text-slate-500">
                          {
                            item.leave.reason
                          }
                        </p>
                      </div>
                    ) : null}

                    {!isHistoryLeave &&
                    (
                      item.calculation
                        .lateMinutes > 0 ||
                      item.calculation
                        .earlyLeaveMinutes >
                        0 ||
                      item.calculation
                        .overtimeMinutes >
                        0
                    ) ? (
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