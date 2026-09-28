import { requireAdmin } from "@/lib/auth/current-user";

import {
  calculateAttendanceDay,
  type AttendanceCalculation,
  type AttendanceHoliday,
  type AttendanceRecord,
} from "@/lib/attendance/engine";

import {
  getCompanyScheduleHistory,
  getDefaultAttendanceSchedule,
  getEmployeeShiftAssignments,
  resolveEmployeeSchedule,
} from "@/lib/attendance/schedule-resolver";

import {
  getDateKey,
  getDateRange,
} from "@/lib/date/tehran";

import { prisma } from "@/lib/prisma";

export type EmployeeReportQuery = {
  employeeId: string;
  from?: string | null;
  to?: string | null;
};

export type EmployeeReportError =
  | "RANGE_TOO_LARGE"
  | "INVALID_RANGE";

export type ReportLeaveType =
  | "ANNUAL"
  | "SICK"
  | "UNPAID"
  | "OTHER";

export type ReportTemporaryExitType =
  | "TEMPORARY"
  | "MISSION";

export type EmployeeReportTemporaryExit = {
  id: string;
  type: ReportTemporaryExitType;
  status: "OPEN" | "COMPLETED";
  startedAt: Date;
  endedAt: Date | null;
  reason: string | null;
  durationMinutes: number;
};

export type EmployeeReportItem = {
  id: string;
  workDate: Date;
  checkIn: Date | null;
  checkOut: Date | null;
  status: string;
  isManual: boolean;

  leaveType: ReportLeaveType | null;
  leaveReason: string | null;

  temporaryExitMinutes: number;
  missionMinutes: number;
  temporaryExitCount: number;

  temporaryExits: EmployeeReportTemporaryExit[];

  calculation: AttendanceCalculation;
};

export type EmployeeReportResult = {
  employee: {
    id: string;
    firstName: string;
    lastName: string;
    username: string;
    phone: string | null;
    isActive: boolean;
  };

  from: string;
  to: string;

  error: EmployeeReportError | null;

  items: EmployeeReportItem[];

  attendanceDays: number;
  completedDays: number;
  incompleteDays: number;
  manualDays: number;
  absentDays: number;
  holidayDays: number;
  nonWorkingDays: number;
  futureDays: number;
  leaveDays: number;

  totalWorkedMinutes: number;
  totalScheduledMinutes: number;
  totalBalanceMinutes: number;

  totalLateMinutes: number;
  totalEarlyLeaveMinutes: number;
  totalOvertimeMinutes: number;
  totalUnderworkMinutes: number;

  totalTemporaryExitMinutes: number;
  totalMissionMinutes: number;

  averageWorkedMinutes: number;

  firstCheckIn: Date | null;
  lastCheckOut: Date | null;
};

export const REPORT_MAX_DAYS = 366;

function createEmptyReport(
  employee: EmployeeReportResult["employee"],
  from: string,
  to: string,
  error: EmployeeReportError | null = null,
): EmployeeReportResult {
  return {
    employee,
    from,
    to,
    error,

    items: [],

    attendanceDays: 0,
    completedDays: 0,
    incompleteDays: 0,
    manualDays: 0,
    absentDays: 0,
    holidayDays: 0,
    nonWorkingDays: 0,
    futureDays: 0,
    leaveDays: 0,

    totalWorkedMinutes: 0,
    totalScheduledMinutes: 0,
    totalBalanceMinutes: 0,

    totalLateMinutes: 0,
    totalEarlyLeaveMinutes: 0,
    totalOvertimeMinutes: 0,
    totalUnderworkMinutes: 0,

    totalTemporaryExitMinutes: 0,
    totalMissionMinutes: 0,

    averageWorkedMinutes: 0,

    firstCheckIn: null,
    lastCheckOut: null,
  };
}

export function normalizeDateInput(
  value: string | null | undefined,
): string | null {
  if (!value) {
    return null;
  }

  const normalized =
    value.trim();

  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(
      normalized,
    )
  ) {
    return null;
  }

  const range =
    getDateRange(
      normalized,
    );

  if (!range) {
    return null;
  }

  return normalized;
}

function addCalendarDays(
  dateKey: string,
  amount: number,
): string | null {
  const match =
    /^(\d{4})-(\d{2})-(\d{2})$/.exec(
      dateKey,
    );

  if (!match) {
    return null;
  }

  const year =
    Number(match[1]);

  const month =
    Number(match[2]);

  const day =
    Number(match[3]);

  if (
    !Number.isInteger(year) ||
    !Number.isInteger(month) ||
    !Number.isInteger(day) ||
    month < 1 ||
    month > 12 ||
    day < 1 ||
    day > 31
  ) {
    return null;
  }

  /*
   * برای محاسبه روز تقویمی، مستقیماً از
   * خود dateKey استفاده می‌کنیم.
   *
   * ساعت 12:00 UTC عمداً انتخاب شده تا
   * تبدیل timezone باعث افتادن تاریخ روی
   * روز قبل نشود.
   */
  const probe =
    new Date(
      Date.UTC(
        year,
        month - 1,
        day + amount,
        12,
        0,
        0,
        0,
      ),
    );

  return getDateKey(
    probe,
  );
}

export function getDefaultReportRange() {
  const todayKey =
    getDateKey(
      new Date(),
    );

  const from =
    addCalendarDays(
      todayKey,
      -29,
    ) ?? todayKey;

  return {
    from,
    to: todayKey,
  };
}

function resolveQuery(
  input:
    | EmployeeReportQuery
    | string,
  fromInput?: string | null,
  toInput?: string | null,
): EmployeeReportQuery {
  if (
    typeof input === "string"
  ) {
    return {
      employeeId: input,
      from: fromInput,
      to: toInput,
    };
  }

  return input;
}

function getDateKeysBetween(
  from: Date,
  to: Date,
): string[] {
  const keys: string[] = [];

  let currentKey =
    getDateKey(from);

  const endKey =
    getDateKey(to);

  while (
    currentKey < endKey
  ) {
    keys.push(
      currentKey,
    );

    const nextKey =
      addCalendarDays(
        currentKey,
        1,
      );

    if (!nextKey) {
      break;
    }

    currentKey =
      nextKey;
  }

  return keys;
}

function getRangeDayCount(
  from: Date,
  to: Date,
): number {
  const difference =
    to.getTime() -
    from.getTime();

  if (difference <= 0) {
    return 0;
  }

  return Math.ceil(
    difference /
      (24 * 60 * 60 * 1000),
  );
}

function getAttendanceRecordKey(
  record: {
    workDate: Date;
  },
): string {
  return getDateKey(
    record.workDate,
  );
}

function getHolidayKey(
  holiday: {
    date: Date;
  },
): string {
  return getDateKey(
    holiday.date,
  );
}

function getLeaveKey(
  leave: {
    startDate: Date;
    endDate: Date;
  },
  dateKey: string,
): boolean {
  const range =
    getDateRange(
      dateKey,
    );

  if (!range) {
    return false;
  }

  return (
    leave.startDate <
      range.end &&
    leave.endDate >=
      range.start
  );
}

function createLeaveCalculation(
  calculation: AttendanceCalculation,
): AttendanceCalculation {
  return {
    ...calculation,

    state:
      "LEAVE" as AttendanceCalculation["state"],

    checkIn: null,
    checkOut: null,

    workedMinutes: 0,
    lateMinutes: 0,
    earlyLeaveMinutes: 0,
    overtimeMinutes: 0,
    underworkMinutes: 0,
    balanceMinutes: 0,

    hasAttendance: false,
    isComplete: false,

    attendanceStatus: null,
  };
}

function getExitDurationMinutes(
  startedAt: Date,
  endedAt: Date | null,
  now: Date,
): number {
  const end =
    endedAt ??
    now;

  const difference =
    end.getTime() -
    startedAt.getTime();

  if (difference <= 0) {
    return 0;
  }

  return Math.floor(
    difference / 60000,
  );
}

function toEngineTemporaryExit(
  exit: {
    type:
      | "TEMPORARY"
      | "MISSION";
    status:
      | "OPEN"
      | "COMPLETED";
    startedAt: Date;
    endedAt: Date | null;
  },
) {
  return {
    type: exit.type,
    status: exit.status,
    startedAt: exit.startedAt,
    endedAt: exit.endedAt,
  };
}

export async function getEmployeeReport(
  input:
    | EmployeeReportQuery
    | string,
  fromInput?: string | null,
  toInput?: string | null,
): Promise<EmployeeReportResult | null> {
  await requireAdmin();

  const query =
    resolveQuery(
      input,
      fromInput,
      toInput,
    );

  const defaults =
    getDefaultReportRange();

  const from =
    normalizeDateInput(
      query.from,
    ) ?? defaults.from;

  const to =
    normalizeDateInput(
      query.to,
    ) ?? defaults.to;

  const employee =
    await prisma.user.findUnique({
      where: {
        id: query.employeeId,
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
    });

  if (!employee) {
    return null;
  }

  const fromRange =
    getDateRange(from);

  const toRange =
    getDateRange(to);

  if (
    !fromRange ||
    !toRange
  ) {
    return createEmptyReport(
      employee,
      from,
      to,
      "INVALID_RANGE",
    );
  }

  if (
    toRange.start <
    fromRange.start
  ) {
    return createEmptyReport(
      employee,
      from,
      to,
      "INVALID_RANGE",
    );
  }

  const rangeStart =
    fromRange.start;

  const rangeEnd =
    toRange.end;

  const rangeDayCount =
    getRangeDayCount(
      rangeStart,
      rangeEnd,
    );

  if (
    rangeDayCount >
    REPORT_MAX_DAYS
  ) {
    return createEmptyReport(
      employee,
      from,
      to,
      "RANGE_TOO_LARGE",
    );
  }

  const [
    settings,
    holidays,
    attendances,
    leaves,
    shiftAssignments,
    companyScheduleHistory,
  ] = await Promise.all([
    prisma.companySettings.findUnique({
      where: {
        id: "company",
      },
    }),

    prisma.holiday.findMany({
      where: {
        date: {
          gte:
            rangeStart,

          lt:
            rangeEnd,
        },
      },

      orderBy: {
        date: "asc",
      },
    }),

    prisma.attendance.findMany({
      where: {
        userId:
          query.employeeId,

        workDate: {
          gte:
            rangeStart,

          lt:
            rangeEnd,
        },
      },

      orderBy: {
        workDate: "asc",
      },

      include: {
        temporaryExits: {
          orderBy: {
            startedAt:
              "asc",
          },

          select: {
            id: true,
            type: true,
            status: true,
            startedAt: true,
            endedAt: true,
            reason: true,
            note: true,
          },
        },
      },
    }),

    prisma.leave.findMany({
      where: {
        userId:
          query.employeeId,

        status:
          "APPROVED",

        startDate: {
          lt:
            rangeEnd,
        },

        endDate: {
          gte:
            rangeStart,
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

    getEmployeeShiftAssignments({
      userIds: [
        query.employeeId,
      ],

      from:
        rangeStart,

      to:
        rangeEnd,
    }),

    getCompanyScheduleHistory({
      from:
        rangeStart,

      to:
        rangeEnd,
    }),
  ]);

  const fallbackSchedule =
    getDefaultAttendanceSchedule(
      settings,
    );

  const holidayMap =
    new Map<
      string,
      AttendanceHoliday
    >();

  for (
    const holiday of holidays
  ) {
    holidayMap.set(
      getHolidayKey(
        holiday,
      ),
      {
        title:
          holiday.title,

        description:
          holiday.description,
      },
    );
  }

  const attendanceMap =
    new Map<
      string,
      {
        id: string;
        record: AttendanceRecord;
        isManual: boolean;
        temporaryExits:
          typeof attendances[number]["temporaryExits"];
      }
    >();

  for (
    const attendance of
      attendances
  ) {
    attendanceMap.set(
      getAttendanceRecordKey(
        attendance,
      ),
      {
        id:
          attendance.id,

        record: {
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
            attendance
              .temporaryExits
              .map(
                toEngineTemporaryExit,
              ),
        } as AttendanceRecord,

        isManual:
          attendance.status ===
          "MANUAL",

        temporaryExits:
          attendance
            .temporaryExits,
      },
    );
  }

  const dateKeys =
    getDateKeysBetween(
      rangeStart,
      rangeEnd,
    );

  const items:
    EmployeeReportItem[] = [];

  let attendanceDays = 0;
  let completedDays = 0;
  let incompleteDays = 0;
  let manualDays = 0;
  let absentDays = 0;
  let holidayDays = 0;
  let nonWorkingDays = 0;
  let futureDays = 0;
  let leaveDays = 0;

  let totalWorkedMinutes = 0;
  let totalScheduledMinutes = 0;
  let totalBalanceMinutes = 0;

  let totalLateMinutes = 0;
  let totalEarlyLeaveMinutes = 0;
  let totalOvertimeMinutes = 0;
  let totalUnderworkMinutes = 0;

  let totalTemporaryExitMinutes = 0;
  let totalMissionMinutes = 0;

  const checkIns: Date[] = [];
  const checkOuts: Date[] = [];

  const now =
    new Date();

  for (
    const dateKey of dateKeys
  ) {
    const dayRange =
      getDateRange(
        dateKey,
      );

    if (!dayRange) {
      continue;
    }

    const attendanceEntry =
      attendanceMap.get(
        dateKey,
      );

    const attendance =
      attendanceEntry?.record ??
      null;

    const holiday =
      holidayMap.get(
        dateKey,
      ) ?? null;

    const schedule =
      resolveEmployeeSchedule({
        assignments:
          shiftAssignments,

        userId:
          query.employeeId,

        workDate:
          dayRange.start,

        fallbackSchedule,

        companyScheduleHistory,

        currentCompanySettings:
          settings,
      });

    const calculation =
      calculateAttendanceDay({
        workDate:
          dayRange.start,

        schedule,

        holiday,

        attendance,

        now,
      });

    const approvedLeave =
      leaves.find(
        (leave) =>
          getLeaveKey(
            leave,
            dateKey,
          ),
      ) ?? null;

    const hasRealAttendance =
      attendance !== null;

    const isLeaveDay =
      Boolean(
        approvedLeave &&
          !hasRealAttendance &&
          calculation.isWorkingDay &&
          !calculation.isHoliday &&
          !calculation.isFuture,
      );

    const effectiveCalculation =
      isLeaveDay
        ? createLeaveCalculation(
            calculation,
          )
        : calculation;

    const isManual =
      attendanceEntry?.isManual ??
      false;

    if (isManual) {
      manualDays += 1;
    }

    if (
      effectiveCalculation
        .isHoliday
    ) {
      holidayDays += 1;
    }

    if (
      !effectiveCalculation
        .isWorkingDay
    ) {
      nonWorkingDays += 1;
    }

    if (
      effectiveCalculation
        .isFuture
    ) {
      futureDays += 1;
    }

    if (isLeaveDay) {
      leaveDays += 1;
    }

    if (
      effectiveCalculation.state ===
        "PRESENT" ||
      effectiveCalculation.state ===
        "WORKING"
    ) {
      attendanceDays += 1;
    }

    if (
      effectiveCalculation.checkIn &&
      effectiveCalculation.checkOut
    ) {
      completedDays += 1;
    }

    if (
      effectiveCalculation.checkIn &&
      !effectiveCalculation.checkOut &&
      effectiveCalculation.isWorkingDay &&
      !effectiveCalculation.isHoliday &&
      !effectiveCalculation.isFuture
    ) {
      incompleteDays += 1;
    }

    if (
      effectiveCalculation.state ===
      "ABSENT"
    ) {
      absentDays += 1;
    }

    const temporaryExits =
      attendanceEntry
        ?.temporaryExits.map(
          (exit) => {
            const durationMinutes =
              getExitDurationMinutes(
                exit.startedAt,
                exit.endedAt,
                now,
              );

            return {
              id:
                exit.id,

              type:
                exit.type as ReportTemporaryExitType,

              status:
                exit.status,

              startedAt:
                exit.startedAt,

              endedAt:
                exit.endedAt,

              reason:
                exit.reason,

              durationMinutes,
            };
          },
        ) ?? [];

    const temporaryExitMinutes =
      temporaryExits.reduce(
        (
          total,
          exit,
        ) =>
          total +
          exit.durationMinutes,
        0,
      );

    const missionMinutes =
      temporaryExits
        .filter(
          (exit) =>
            exit.type ===
            "MISSION",
        )
        .reduce(
          (
            total,
            exit,
          ) =>
            total +
            exit.durationMinutes,
          0,
        );

    const effectiveTemporaryExitMinutes =
      isLeaveDay
        ? 0
        : temporaryExitMinutes;

    const effectiveMissionMinutes =
      isLeaveDay
        ? 0
        : missionMinutes;

    totalWorkedMinutes +=
      effectiveCalculation
        .workedMinutes;

    totalScheduledMinutes +=
      effectiveCalculation
        .scheduledMinutes;

    totalBalanceMinutes +=
      effectiveCalculation
        .balanceMinutes;

    totalLateMinutes +=
      effectiveCalculation
        .lateMinutes;

    totalEarlyLeaveMinutes +=
      effectiveCalculation
        .earlyLeaveMinutes;

    totalOvertimeMinutes +=
      effectiveCalculation
        .overtimeMinutes;

    totalUnderworkMinutes +=
      effectiveCalculation
        .underworkMinutes;

    totalTemporaryExitMinutes +=
      effectiveTemporaryExitMinutes;

    totalMissionMinutes +=
      effectiveMissionMinutes;

    if (
      effectiveCalculation.checkIn
    ) {
      checkIns.push(
        effectiveCalculation.checkIn,
      );
    }

    if (
      effectiveCalculation.checkOut
    ) {
      checkOuts.push(
        effectiveCalculation.checkOut,
      );
    }

    items.push({
      id:
        attendanceEntry?.id ??
        `virtual-${query.employeeId}-${dateKey}`,

      workDate:
        dayRange.start,

      checkIn:
        effectiveCalculation.checkIn,

      checkOut:
        effectiveCalculation.checkOut,

      status:
        attendance?.status ??
        effectiveCalculation
          .attendanceStatus ??
        effectiveCalculation
          .state,

      isManual,

      leaveType:
        isLeaveDay
          ? (approvedLeave?.type as ReportLeaveType) ??
            null
          : null,

      leaveReason:
        isLeaveDay
          ? approvedLeave?.reason ??
            null
          : null,

      temporaryExitMinutes:
        effectiveTemporaryExitMinutes,

      missionMinutes:
        effectiveMissionMinutes,

      temporaryExitCount:
        isLeaveDay
          ? 0
          : temporaryExits.length,

      temporaryExits:
        isLeaveDay
          ? []
          : temporaryExits,

      calculation:
        effectiveCalculation,
    });
  }

  const firstCheckIn =
    checkIns.length > 0
      ? checkIns.reduce(
          (
            first,
            current,
          ) =>
            current.getTime() <
            first.getTime()
              ? current
              : first,
        )
      : null;

  const lastCheckOut =
    checkOuts.length > 0
      ? checkOuts.reduce(
          (
            last,
            current,
          ) =>
            current.getTime() >
            last.getTime()
              ? current
              : last,
        )
      : null;

  const workedDays =
    items.filter(
      (item) =>
        item.calculation
          .workedMinutes > 0,
    ).length;

  const averageWorkedMinutes =
    workedDays > 0
      ? Math.round(
          totalWorkedMinutes /
            workedDays,
        )
      : 0;

  return {
    employee,

    from,
    to,

    error: null,

    items,

    attendanceDays,
    completedDays,
    incompleteDays,
    manualDays,
    absentDays,
    holidayDays,
    nonWorkingDays,
    futureDays,
    leaveDays,

    totalWorkedMinutes,
    totalScheduledMinutes,
    totalBalanceMinutes,

    totalLateMinutes,
    totalEarlyLeaveMinutes,
    totalOvertimeMinutes,
    totalUnderworkMinutes,

    totalTemporaryExitMinutes,
    totalMissionMinutes,

    averageWorkedMinutes,

    firstCheckIn,
    lastCheckOut,
  };
}