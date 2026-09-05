import { requireAdmin } from "@/lib/auth/current-user";
import {
  calculateAttendanceDay,
  type AttendanceCalculation,
  type AttendanceHoliday,
  type AttendanceRecord,
  type AttendanceSchedule,
} from "@/lib/attendance/engine";
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

export type EmployeeReportItem = {
  id: string;
  workDate: Date;
  checkIn: Date | null;
  checkOut: Date | null;
  status: string;
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

  items: EmployeeReportItem[];

  attendanceDays: number;
  completedDays: number;
  incompleteDays: number;
  absentDays: number;
  holidayDays: number;
  nonWorkingDays: number;
  futureDays: number;

  totalWorkedMinutes: number;
  totalScheduledMinutes: number;
  totalBalanceMinutes: number;

  totalLateMinutes: number;
  totalEarlyLeaveMinutes: number;
  totalOvertimeMinutes: number;
  totalUnderworkMinutes: number;

  averageWorkedMinutes: number;

  firstCheckIn: Date | null;
  lastCheckOut: Date | null;
}

export function normalizeDateInput(
  value: string | null | undefined,
): string | null {
  if (!value) {
    return null;
  }

  const normalized = value.trim();

  if (!/^\d{4}-\d{2}-\d{2}$/.test(normalized)) {
    return null;
  }

  const range = getDateRange(normalized);

  if (!range) {
    return null;
  }

  return normalized;
}

export function getDefaultReportRange() {
  const todayKey = getDateKey(new Date());

  const [year, month, day] = todayKey
    .split("-")
    .map(Number);

  const fromProbe = new Date(
    Date.UTC(
      year,
      month - 1,
      day - 29,
      12,
      0,
      0,
      0,
    ),
  );

  const toProbe = new Date(
    Date.UTC(
      year,
      month - 1,
      day,
      12,
      0,
      0,
      0,
    ),
  );

  return {
    from: getDateKey(fromProbe),
    to: getDateKey(toProbe),
  };
}

function resolveQuery(
  input: EmployeeReportQuery | string,
  fromInput?: string | null,
  toInput?: string | null,
): EmployeeReportQuery {
  if (typeof input === "string") {
    return {
      employeeId: input,
      from: fromInput,
      to: toInput,
    };
  }

  return input;
}

function addDays(
  date: Date,
  amount: number,
): Date {
  const result = new Date(date);
  result.setUTCDate(
    result.getUTCDate() + amount,
  );
  return result;
}

function getDateKeysBetween(
  from: Date,
  to: Date,
): string[] {
  const keys: string[] = [];

  let current = new Date(from);

  while (current < to) {
    keys.push(getDateKey(current));
    current = addDays(current, 1);
  }

  return keys;
}

function getAttendanceRecordKey(
  record: {
    workDate: Date;
  },
) {
  return getDateKey(record.workDate);
}

function getHolidayKey(
  holiday: {
    date: Date;
  },
) {
  return getDateKey(holiday.date);
}

export async function getEmployeeReport(
  input: EmployeeReportQuery | string,
  fromInput?: string | null,
  toInput?: string | null,
): Promise<EmployeeReportResult | null> {
  await requireAdmin();

  const query = resolveQuery(
    input,
    fromInput,
    toInput,
  );

  const defaults =
    getDefaultReportRange();

  const from =
    normalizeDateInput(query.from) ??
    defaults.from;

  const to =
    normalizeDateInput(query.to) ??
    defaults.to;

  const employee =
    await prisma.user.findUnique({
      where: {
        id: query.employeeId,
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

  const fromRange = getDateRange(from);
  const toRange = getDateRange(to);

  if (!fromRange || !toRange) {
    return {
      employee,
      from,
      to,

      items: [],

      attendanceDays: 0,
      completedDays: 0,
      incompleteDays: 0,
      absentDays: 0,
      holidayDays: 0,
      nonWorkingDays: 0,
      futureDays: 0,

      totalWorkedMinutes: 0,
      totalScheduledMinutes: 0,
      totalBalanceMinutes: 0,

      totalLateMinutes: 0,
      totalEarlyLeaveMinutes: 0,
      totalOvertimeMinutes: 0,
      totalUnderworkMinutes: 0,

      averageWorkedMinutes: 0,

      firstCheckIn: null,
      lastCheckOut: null,
    };
  }

  const rangeStart =
    fromRange.start <= toRange.start
      ? fromRange.start
      : toRange.start;

  const rangeEnd =
    fromRange.start <= toRange.start
      ? toRange.end
      : fromRange.end;

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
          gte: rangeStart,
          lt: rangeEnd,
        },
      },
      orderBy: {
        date: "asc",
      },
    }),

    prisma.attendance.findMany({
      where: {
        userId: query.employeeId,
        workDate: {
          gte: rangeStart,
          lt: rangeEnd,
        },
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

  /*
   * Engine's AttendanceHoliday type intentionally
   * does not carry the database `id`.
   *
   * We therefore keep the raw Prisma holiday records
   * separate and adapt only the data Engine needs.
   */
  const holidayMap =
    new Map<string, AttendanceHoliday>();

  for (const holiday of holidays) {
    const engineHoliday =
      {
        ...holiday,
        workDate: holiday.date,
      } as unknown as AttendanceHoliday;

    holidayMap.set(
      getHolidayKey(holiday),
      engineHoliday,
    );
  }

  /*
   * Same idea for attendance:
   * Engine does not need the database id,
   * but report items do.
   */
  const attendanceMap =
    new Map<
      string,
      {
        id: string;
        record: AttendanceRecord;
      }
    >();

  for (const attendance of attendances) {
    attendanceMap.set(
      getAttendanceRecordKey(attendance),
      {
        id: attendance.id,
        record:
          attendance as AttendanceRecord,
      },
    );
  }

  const dateKeys =
    getDateKeysBetween(
      rangeStart,
      rangeEnd,
    );

  const items: EmployeeReportItem[] = [];

  let attendanceDays = 0;
  let completedDays = 0;
  let incompleteDays = 0;
  let absentDays = 0;
  let holidayDays = 0;
  let nonWorkingDays = 0;
  let futureDays = 0;

  let totalWorkedMinutes = 0;
  let totalScheduledMinutes = 0;
  let totalBalanceMinutes = 0;

  let totalLateMinutes = 0;
  let totalEarlyLeaveMinutes = 0;
  let totalOvertimeMinutes = 0;
  let totalUnderworkMinutes = 0;

  const checkIns: Date[] = [];
  const checkOuts: Date[] = [];

  for (const dateKey of dateKeys) {
    const dayRange =
      getDateRange(dateKey);

    if (!dayRange) {
      continue;
    }

    const attendanceEntry =
      attendanceMap.get(dateKey);

    const attendance =
      attendanceEntry?.record ?? null;

    const holiday =
      holidayMap.get(dateKey) ?? null;

    const calculation =
      calculateAttendanceDay({
        workDate: dayRange.start,
        schedule,
        holiday,
        attendance,
      });

    if (calculation.isHoliday) {
      holidayDays += 1;
    }

    if (!calculation.isWorkingDay) {
      nonWorkingDays += 1;
    }

    if (calculation.isFuture) {
      futureDays += 1;
    }

    if (
      calculation.state === "PRESENT" ||
      calculation.state === "WORKING"
    ) {
      attendanceDays += 1;
    }

    if (
      calculation.checkIn &&
      calculation.checkOut
    ) {
      completedDays += 1;
    }

    if (
      calculation.checkIn &&
      !calculation.checkOut &&
      calculation.isWorkingDay &&
      !calculation.isHoliday &&
      !calculation.isFuture
    ) {
      incompleteDays += 1;
    }

    if (
      calculation.state === "ABSENT"
    ) {
      absentDays += 1;
    }

    totalWorkedMinutes +=
      calculation.workedMinutes;

    totalScheduledMinutes +=
      calculation.scheduledMinutes;

    totalBalanceMinutes +=
      calculation.balanceMinutes;

    totalLateMinutes +=
      calculation.lateMinutes;

    totalEarlyLeaveMinutes +=
      calculation.earlyLeaveMinutes;

    totalOvertimeMinutes +=
      calculation.overtimeMinutes;

    totalUnderworkMinutes +=
      calculation.underworkMinutes;

    if (calculation.checkIn) {
      checkIns.push(
        calculation.checkIn,
      );
    }

    if (calculation.checkOut) {
      checkOuts.push(
        calculation.checkOut,
      );
    }

    items.push({
      id:
        attendanceEntry?.id ??
        `virtual-${query.employeeId}-${dateKey}`,

      workDate: dayRange.start,

      checkIn:
        calculation.checkIn,

      checkOut:
        calculation.checkOut,

      status:
        calculation.attendanceStatus ??
        calculation.state,

      calculation,
    });
  }

  let firstCheckIn: Date | null =
    null;

  for (const date of checkIns) {
    if (
      !firstCheckIn ||
      date.getTime() <
        firstCheckIn.getTime()
    ) {
      firstCheckIn = date;
    }
  }

  let lastCheckOut: Date | null =
    null;

  for (const date of checkOuts) {
    if (
      !lastCheckOut ||
      date.getTime() >
        lastCheckOut.getTime()
    ) {
      lastCheckOut = date;
    }
  }

  const workedDays =
    items.filter(
      (item) =>
        item.calculation.workedMinutes >
        0,
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

    items,

    attendanceDays,
    completedDays,
    incompleteDays,
    absentDays,
    holidayDays,
    nonWorkingDays,
    futureDays,

    totalWorkedMinutes,
    totalScheduledMinutes,
    totalBalanceMinutes,

    totalLateMinutes,
    totalEarlyLeaveMinutes,
    totalOvertimeMinutes,
    totalUnderworkMinutes,

    averageWorkedMinutes,

    firstCheckIn,
    lastCheckOut,
  };
}