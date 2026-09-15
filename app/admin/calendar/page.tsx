import Link from "next/link";
import {
  CalendarDays,
  CalendarOff,
  ChevronLeft,
  ChevronRight,
  Clock3,
  FileText,
  UserCheck,
  Users,
} from "lucide-react";
import {
  isLeapJalaaliYear,
  toGregorian,
  toJalaali,
} from "jalaali-js";

import AdminShell from "@/components/admin/admin-shell";
import { requireAdmin } from "@/lib/auth/current-user";
import {
  getCompanyScheduleHistory,
  getDefaultAttendanceSchedule,
  getEmployeeShiftAssignments,
  resolveCompanySchedule,
  resolveEmployeeSchedule,
} from "@/lib/attendance/schedule-resolver";
import {
  getDateKey,
  getDateRange,
  formatDate,
  formatTime,
} from "@/lib/date/tehran";
import { prisma } from "@/lib/prisma";

import CalendarView, {
  type CalendarDay,
  type CalendarSummary,
  type SelectedDaySummary,
} from "./calendar-view";

const PERSIAN_MONTHS = [
  "فروردین",
  "اردیبهشت",
  "خرداد",
  "تیر",
  "مرداد",
  "شهریور",
  "مهر",
  "آبان",
  "آذر",
  "دی",
  "بهمن",
  "اسفند",
];

const PERSIAN_WEEKDAYS = [
  "شنبه",
  "یکشنبه",
  "دوشنبه",
  "سه‌شنبه",
  "چهارشنبه",
  "پنجشنبه",
  "جمعه",
];

type WorkSchedule = {
  saturday: boolean;
  sunday: boolean;
  monday: boolean;
  tuesday: boolean;
  wednesday: boolean;
  thursday: boolean;
  friday: boolean;
};

type CalendarLeaveType =
  | "ANNUAL"
  | "SICK"
  | "UNPAID"
  | "OTHER";

type CalendarLeave = {
  id: string;
  userId: string;
  type: CalendarLeaveType;
  startDate: Date;
  endDate: Date;
  reason: string | null;
};

type TemporaryExitType =
  | "TEMPORARY"
  | "MISSION";

type TemporaryExitStatus =
  | "OPEN"
  | "COMPLETED";

type CalendarTemporaryExit = {
  id: string;
  userId: string;
  attendanceId: string;
  type: TemporaryExitType;
  status: TemporaryExitStatus;
  startedAt: Date;
  endedAt: Date | null;
  reason: string | null;
  note: string | null;
};

function getCurrentJalaliDate() {
  const now = new Date();
  const todayKey = getDateKey(now);

  const match =
    /^(\d{4})-(\d{2})-(\d{2})$/.exec(
      todayKey,
    );

  if (!match) {
    throw new Error(
      "Unable to resolve current Tehran date.",
    );
  }

  return toJalaali(
    Number(match[1]),
    Number(match[2]),
    Number(match[3]),
  );
}

function parseMonth(monthParam?: string) {
  const current = getCurrentJalaliDate();

  if (!monthParam) {
    return {
      year: current.jy,
      month: current.jm,
    };
  }

  const match =
    /^(\d{4})-(\d{1,2})$/.exec(
      monthParam,
    );

  if (!match) {
    return {
      year: current.jy,
      month: current.jm,
    };
  }

  const year = Number(match[1]);
  const month = Number(match[2]);

  if (
    !Number.isInteger(year) ||
    !Number.isInteger(month) ||
    month < 1 ||
    month > 12
  ) {
    return {
      year: current.jy,
      month: current.jm,
    };
  }

  return {
    year,
    month,
  };
}

function getJalaliMonthDays(
  year: number,
  month: number,
): number {
  if (
    month >= 1 &&
    month <= 6
  ) {
    return 31;
  }

  if (
    month >= 7 &&
    month <= 11
  ) {
    return 30;
  }

  return isLeapJalaaliYear(year)
    ? 30
    : 29;
}

function jalaliToIso(
  year: number,
  month: number,
  day: number,
): string {
  const gregorian =
    toGregorian(
      year,
      month,
      day,
    );

  return [
    String(gregorian.gy).padStart(
      4,
      "0",
    ),
    String(gregorian.gm).padStart(
      2,
      "0",
    ),
    String(gregorian.gd).padStart(
      2,
      "0",
    ),
  ].join("-");
}

function getJalaliWeekdayIndex(
  year: number,
  month: number,
  day: number,
): number {
  const gregorian =
    toGregorian(
      year,
      month,
      day,
    );

  const weekday =
    new Date(
      Date.UTC(
        gregorian.gy,
        gregorian.gm - 1,
        gregorian.gd,
      ),
    ).getUTCDay();

  switch (weekday) {
    case 6:
      return 0;

    case 0:
      return 1;

    case 1:
      return 2;

    case 2:
      return 3;

    case 3:
      return 4;

    case 4:
      return 5;

    case 5:
      return 6;

    default:
      return 0;
  }
}

function isWorkingDay(
  weekdayIndex: number,
  schedule: WorkSchedule,
): boolean {
  switch (weekdayIndex) {
    case 0:
      return schedule.saturday;

    case 1:
      return schedule.sunday;

    case 2:
      return schedule.monday;

    case 3:
      return schedule.tuesday;

    case 4:
      return schedule.wednesday;

    case 5:
      return schedule.thursday;

    case 6:
      return schedule.friday;

    default:
      return false;
  }
}

function isValidGregorianDateKey(
  value: string,
): boolean {
  return Boolean(
    getDateRange(value),
  );
}

function addOneDay(
  dateKey: string,
): string | null {
  const range =
    getDateRange(dateKey);

  if (!range) {
    return null;
  }

  const probe =
    new Date(
      Date.UTC(
        range.start.getUTCFullYear(),
        range.start.getUTCMonth(),
        range.start.getUTCDate() + 1,
        12,
        0,
        0,
        0,
      ),
    );

  const nextKey =
    getDateKey(probe);

  return isValidGregorianDateKey(
    nextKey,
  )
    ? nextKey
    : null;
}

function getPreviousMonth(
  year: number,
  month: number,
) {
  if (month === 1) {
    return {
      year: year - 1,
      month: 12,
    };
  }

  return {
    year,
    month: month - 1,
  };
}

function getNextMonth(
  year: number,
  month: number,
) {
  if (month === 12) {
    return {
      year: year + 1,
      month: 1,
    };
  }

  return {
    year,
    month: month + 1,
  };
}

function formatWorkDuration(
  checkIn: Date | null,
  checkOut: Date | null,
): string {
  if (
    !checkIn ||
    !checkOut
  ) {
    return "—";
  }

  const diff =
    checkOut.getTime() -
    checkIn.getTime();

  if (diff <= 0) {
    return "—";
  }

  const totalMinutes =
    Math.floor(
      diff / 60000,
    );

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

function formatDurationMinutes(
  totalMinutes: number,
): string {
  const safeMinutes =
    Math.max(
      0,
      Math.floor(totalMinutes),
    );

  const hours =
    Math.floor(
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

function getTemporaryExitDurationMinutes(
  exit: CalendarTemporaryExit,
  attendanceCheckOut: Date | null,
  now: Date,
): number {
  const end =
    exit.endedAt ??
    attendanceCheckOut ??
    now;

  const effectiveEnd =
    end.getTime() > now.getTime()
      ? now
      : end;

  const diff =
    effectiveEnd.getTime() -
    exit.startedAt.getTime();

  if (diff <= 0) {
    return 0;
  }

  return Math.floor(
    diff / 60000,
  );
}

function parseIsoDate(
  value: string,
) {
  const match =
    /^(\d{4})-(\d{2})-(\d{2})$/.exec(
      value,
    );

  if (!match) {
    return null;
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);

  const dateKey =
    [
      String(year).padStart(
        4,
        "0",
      ),
      String(month).padStart(
        2,
        "0",
      ),
      String(day).padStart(
        2,
        "0",
      ),
    ].join("-");

  if (
    !isValidGregorianDateKey(
      dateKey,
    )
  ) {
    return null;
  }

  return {
    year,
    month,
    day,
  };
}

function addLeaveToDateMap(
  map: Map<
    string,
    CalendarLeave[]
  >,
  leave: CalendarLeave,
  monthStart: Date,
  monthEnd: Date,
) {
  const leaveStartKey =
    getDateKey(
      leave.startDate,
    );

  const leaveEndKey =
    getDateKey(
      leave.endDate,
    );

  const monthStartKey =
    getDateKey(
      monthStart,
    );

  const monthEndExclusiveKey =
    getDateKey(
      new Date(
        monthEnd.getTime() - 1,
      ),
    );

  let currentKey =
    leaveStartKey < monthStartKey
      ? monthStartKey
      : leaveStartKey;

  const effectiveEndKey =
    leaveEndKey >
    monthEndExclusiveKey
      ? monthEndExclusiveKey
      : leaveEndKey;

  while (
    currentKey <=
    effectiveEndKey
  ) {
    const range =
      getDateRange(
        currentKey,
      );

    if (!range) {
      break;
    }

    const list =
      map.get(
        currentKey,
      ) ?? [];

    list.push(leave);

    map.set(
      currentKey,
      list,
    );

    const nextKey =
      addOneDay(currentKey);

    if (!nextKey) {
      break;
    }

    currentKey =
      nextKey;
  }
}

function mapTemporaryExit(
  exit: {
    id: string;
    userId: string;
    attendanceId: string;
    type:
      | "TEMPORARY"
      | "MISSION";
    status:
      | "OPEN"
      | "COMPLETED";
    startedAt: Date;
    endedAt: Date | null;
    reason: string | null;
    note: string | null;
  },
): CalendarTemporaryExit {
  return {
    id: exit.id,
    userId: exit.userId,
    attendanceId:
      exit.attendanceId,
    type: exit.type,
    status: exit.status,
    startedAt:
      exit.startedAt,
    endedAt:
      exit.endedAt,
    reason:
      exit.reason,
    note:
      exit.note,
  };
}

export default async function AdminCalendarPage({
  searchParams,
}: {
  searchParams: Promise<{
    month?: string;
    date?: string;
  }>;
}) {
  const user =
    await requireAdmin();

  const params =
    await searchParams;

  const {
    year,
    month,
  } =
    parseMonth(
      params.month,
    );

  const daysInMonth =
    getJalaliMonthDays(
      year,
      month,
    );

  const firstDateKey =
    jalaliToIso(
      year,
      month,
      1,
    );

  const lastDateKey =
    jalaliToIso(
      year,
      month,
      daysInMonth,
    );

  const monthRange =
    getDateRange(
      firstDateKey,
    );

  const lastDayRange =
    getDateRange(
      lastDateKey,
    );

  if (
    !monthRange ||
    !lastDayRange
  ) {
    throw new Error(
      "Unable to create calendar date range.",
    );
  }

  const monthStart =
    monthRange.start;

  const monthEnd =
    lastDayRange.end;

  const [
    settings,
    holidays,
    employees,
    attendances,
    approvedLeaves,
    companyScheduleHistory,
  ] =
    await Promise.all([
      prisma.companySettings.findUnique({
        where: {
          id: "company",
        },
      }),

      prisma.holiday.findMany({
        where: {
          date: {
            gte: monthStart,
            lt: monthEnd,
          },
        },

        orderBy: {
          date: "asc",
        },
      }),

      prisma.user.findMany({
        where: {
          role: "EMPLOYEE",
        },

        orderBy: [
          {
            firstName: "asc",
          },
          {
            lastName: "asc",
          },
        ],

        select: {
          id: true,
          firstName: true,
          lastName: true,
          username: true,
          phone: true,
        },
      }),

      prisma.attendance.findMany({
        where: {
          workDate: {
            gte: monthStart,
            lt: monthEnd,
          },
        },

        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              username: true,
              phone: true,
            },
          },

          temporaryExits: {
            orderBy: {
              startedAt: "asc",
            },
          },
        },

        orderBy: {
          workDate: "asc",
        },
      }),

      prisma.leave.findMany({
        where: {
          status: "APPROVED",

          startDate: {
            lt: monthEnd,
          },

          endDate: {
            gte: monthStart,
          },
        },

        select: {
          id: true,
          userId: true,
          type: true,
          startDate: true,
          endDate: true,
          reason: true,
        },

        orderBy: [
          {
            startDate: "asc",
          },
          {
            userId: "asc",
          },
        ],
      }),

      getCompanyScheduleHistory({
        from: monthStart,
        to: monthEnd,
      }),
    ]);

  const fallbackSchedule =
    getDefaultAttendanceSchedule(
      settings,
    );

  const employeeIds =
    employees.map(
      (employee) =>
        employee.id,
    );

  const shiftAssignments =
    await getEmployeeShiftAssignments({
      userIds:
        employeeIds,
      from:
        monthStart,
      to:
        monthEnd,
    });

  const now =
    new Date();

  const holidayMap =
    new Map<
      string,
      {
        title: string;
        description: string | null;
      }
    >();

  for (
    const holiday of
      holidays
  ) {
    holidayMap.set(
      getDateKey(
        holiday.date,
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
      Array<
        (typeof attendances)[number]
      >
    >();

  for (
    const attendance of
      attendances
  ) {
    const key =
      getDateKey(
        attendance.workDate,
      );

    const existing =
      attendanceMap.get(
        key,
      ) ?? [];

    existing.push(
      attendance,
    );

    attendanceMap.set(
      key,
      existing,
    );
  }

  const leaveMap =
    new Map<
      string,
      CalendarLeave[]
    >();

  for (
    const leave of
      approvedLeaves
  ) {
    addLeaveToDateMap(
      leaveMap,
      leave as CalendarLeave,
      monthStart,
      monthEnd,
    );
  }

  const todayKey =
    getDateKey(now);

  const days:
    CalendarDay[] = [];

  for (
    let day = 1;
    day <= daysInMonth;
    day += 1
  ) {
    const dateKey =
      jalaliToIso(
        year,
        month,
        day,
      );

    const weekdayIndex =
      getJalaliWeekdayIndex(
        year,
        month,
        day,
      );

    const dayRange =
      getDateRange(
        dateKey,
      );

    if (!dayRange) {
      continue;
    }

    const holiday =
      holidayMap.get(
        dateKey,
      );

    const dailyAttendances =
      attendanceMap.get(
        dateKey,
      ) ?? [];

    const dailyLeaves =
      leaveMap.get(
        dateKey,
      ) ?? [];

    const companySchedule =
      resolveCompanySchedule({
        workDate:
          dayRange.start,

        history:
          companyScheduleHistory,

        currentSettings:
          settings,
      });

    const workingDay =
      isWorkingDay(
        weekdayIndex,
        {
          saturday:
            companySchedule.saturday,

          sunday:
            companySchedule.sunday,

          monday:
            companySchedule.monday,

          tuesday:
            companySchedule.tuesday,

          wednesday:
            companySchedule.wednesday,

          thursday:
            companySchedule.thursday,

          friday:
            companySchedule.friday,
        },
      );

    const temporaryExitCount =
      dailyAttendances.reduce(
        (
          total,
          attendance,
        ) =>
          total +
          attendance
            .temporaryExits
            .length,
        0,
      );

    const openTemporaryExitCount =
      dailyAttendances.reduce(
        (
          total,
          attendance,
        ) =>
          total +
          attendance.temporaryExits.filter(
            (exit) =>
              exit.status ===
              "OPEN",
          ).length,
        0,
      );

    let status:
      CalendarDay["status"];

    if (holiday) {
      status =
        "holiday";
    } else if (
      !workingDay
    ) {
      status =
        "weekend";
    } else if (
      dateKey > todayKey
    ) {
      status =
        "future";
    } else if (
      dailyAttendances.length >
      0
    ) {
      status =
        "present";
    } else if (
      dailyLeaves.length >
      0
    ) {
      status =
        "leave";
    } else {
      status =
        "absent";
    }

    days.push({
      day,
      dateKey,
      weekdayIndex,
      weekdayName:
        PERSIAN_WEEKDAYS[
          weekdayIndex
        ],
      status,
      holidayTitle:
        holiday?.title ??
        null,
      holidayDescription:
        holiday?.description ??
        null,
      attendanceCount:
        dailyAttendances.length,
      leaveCount:
        dailyLeaves.length,
      temporaryExitCount,
      openTemporaryExitCount,
    });
  }

  const requestedDate =
    typeof params.date ===
    "string"
      ? params.date
      : null;

  const validRequestedDate =
    requestedDate &&
    parseIsoDate(
      requestedDate,
    )
      ? requestedDate
      : null;

  const selectedDateKey =
    validRequestedDate ??
    todayKey;

  const selectedRange =
    getDateRange(
      selectedDateKey,
    );

  if (!selectedRange) {
    throw new Error(
      "Unable to create selected date range.",
    );
  }

  const selectedGregorian =
    parseIsoDate(
      selectedDateKey,
    );

  if (!selectedGregorian) {
    throw new Error(
      "Invalid selected calendar date.",
    );
  }

  const [
    selectedAttendance,
    selectedLeaves,
  ] = await Promise.all([
    prisma.attendance.findMany({
      where: {
        workDate: {
          gte:
            selectedRange.start,
          lt:
            selectedRange.end,
        },
      },

      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            username: true,
            phone: true,
          },
        },

        temporaryExits: {
          orderBy: {
            startedAt: "asc",
          },
        },
      },

      orderBy: {
        workDate: "asc",
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
      },

      select: {
        id: true,
        userId: true,
        type: true,
        startDate: true,
        endDate: true,
        reason: true,
      },

      orderBy: {
        startDate: "asc",
      },
    }),
  ]);

  const selectedJalali =
    toJalaali(
      selectedGregorian.year,
      selectedGregorian.month,
      selectedGregorian.day,
    );

  const selectedWeekdayIndex =
    getJalaliWeekdayIndex(
      selectedJalali.jy,
      selectedJalali.jm,
      selectedJalali.jd,
    );

  const selectedHoliday =
    holidayMap.get(
      selectedDateKey,
    ) ?? null;

  const selectedCompanySchedule =
    resolveCompanySchedule({
      workDate:
        selectedRange.start,

      history:
        companyScheduleHistory,

      currentSettings:
        settings,
    });

  const selectedCompanyWorkingDay =
    isWorkingDay(
      selectedWeekdayIndex,
      {
        saturday:
          selectedCompanySchedule.saturday,

        sunday:
          selectedCompanySchedule.sunday,

        monday:
          selectedCompanySchedule.monday,

        tuesday:
          selectedCompanySchedule.tuesday,

        wednesday:
          selectedCompanySchedule.wednesday,

        thursday:
          selectedCompanySchedule.thursday,

        friday:
          selectedCompanySchedule.friday,
      },
    );

  const selectedLeaveByUser =
    new Map<
      string,
      CalendarLeave
    >();

  for (
    const leave of
      selectedLeaves
  ) {
    if (
      isValidGregorianDateKey(
        getDateKey(
          leave.startDate,
        ),
      )
    ) {
      selectedLeaveByUser.set(
        leave.userId,
        leave as CalendarLeave,
      );
    }
  }

  const presentAttendanceByUser =
    new Map<
      string,
      (typeof selectedAttendance)[number]
    >();

  for (
    const attendance of
      selectedAttendance
  ) {
    if (
      !presentAttendanceByUser.has(
        attendance.userId,
      )
    ) {
      presentAttendanceByUser.set(
        attendance.userId,
        attendance,
      );
    }
  }

  const records =
    selectedAttendance.map(
      (
        attendance,
      ) => {
        const temporaryExits =
          attendance.temporaryExits.map(
            mapTemporaryExit,
          );

        const temporaryExitMinutes =
          temporaryExits.reduce(
            (
              total,
              exit,
            ) =>
              total +
              getTemporaryExitDurationMinutes(
                exit,
                attendance.checkOut,
                now,
              ),
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
                getTemporaryExitDurationMinutes(
                  exit,
                  attendance.checkOut,
                  now,
                ),
              0,
            );

        return {
          id:
            attendance.id,

          employeeName:
            `${attendance.user.firstName} ${attendance.user.lastName}`.trim(),

          username:
            attendance.user.username,

          checkIn:
            formatTime(
              attendance.checkIn,
            ),

          checkOut:
            formatTime(
              attendance.checkOut,
            ),

          duration:
            formatWorkDuration(
              attendance.checkIn,
              attendance.checkOut,
            ),

          status:
            attendance.status,

          temporaryExitCount:
            temporaryExits.length,

          openTemporaryExitCount:
            temporaryExits.filter(
              (exit) =>
                exit.status ===
                "OPEN",
            ).length,

          temporaryExitMinutes,

          missionMinutes,

          temporaryExits:
            temporaryExits.map(
              (exit) => ({
                id:
                  exit.id,

                type:
                  exit.type,

                status:
                  exit.status,

                startedAt:
                  formatTime(
                    exit.startedAt,
                  ),

                endedAt:
                  formatTime(
                    exit.endedAt,
                  ),

                duration:
                  formatDurationMinutes(
                    getTemporaryExitDurationMinutes(
                      exit,
                      attendance.checkOut,
                      now,
                    ),
                  ),

                reason:
                  exit.reason,

                note:
                  exit.note,
              }),
            ),
        };
      },
    );

  const selectedEmployees =
    employees.map(
      (employee) => {
        const leave =
          selectedLeaveByUser.get(
            employee.id,
          );

        const attendance =
          presentAttendanceByUser.get(
            employee.id,
          ) ?? null;

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

        const employeeWorkingDay =
          isWorkingDay(
            selectedWeekdayIndex,
            {
              saturday:
                employeeSchedule.saturday,

              sunday:
                employeeSchedule.sunday,

              monday:
                employeeSchedule.monday,

              tuesday:
                employeeSchedule.tuesday,

              wednesday:
                employeeSchedule.wednesday,

              thursday:
                employeeSchedule.thursday,

              friday:
                employeeSchedule.friday,
            },
          );

        const present =
          Boolean(
            attendance,
          );

        const onLeave =
          Boolean(
            leave &&
              !present &&
              employeeWorkingDay &&
              !selectedHoliday &&
              !(
                selectedDateKey >
                todayKey
              ),
          );

        const employeeTemporaryExits =
          attendance?.temporaryExits ??
          [];

        const hasOpenTemporaryExit =
          employeeTemporaryExits.some(
            (exit) =>
              exit.status ===
              "OPEN",
          );

        const hasMission =
          employeeTemporaryExits.some(
            (exit) =>
              exit.type ===
              "MISSION",
          );

        return {
          id:
            employee.id,

          name:
            `${employee.firstName} ${employee.lastName}`.trim(),

          username:
            employee.username,

          phone:
            employee.phone,

          present,

          onLeave,

          leaveType:
            onLeave
              ? leave?.type ??
                null
              : null,

          hasOpenTemporaryExit,

          hasMission,
        };
      },
    );

  const selectedLeaveCount =
    selectedEmployees.filter(
      (employee) =>
        employee.onLeave,
    ).length;

  const selectedTemporaryExitCount =
    selectedAttendance.reduce(
      (
        total,
        attendance,
      ) =>
        total +
        attendance
          .temporaryExits
          .length,
      0,
    );

  const selectedOpenTemporaryExitCount =
    selectedAttendance.reduce(
      (
        total,
        attendance,
      ) =>
        total +
        attendance.temporaryExits.filter(
          (exit) =>
            exit.status ===
            "OPEN",
        ).length,
      0,
    );

  const selectedTemporaryExitMinutes =
    selectedAttendance.reduce(
      (
        total,
        attendance,
      ) =>
        total +
        attendance.temporaryExits.reduce(
          (
            exitTotal,
            exit,
          ) =>
            exitTotal +
            getTemporaryExitDurationMinutes(
              mapTemporaryExit(
                exit,
              ),
              attendance.checkOut,
              now,
            ),
          0,
        ),
      0,
    );

  const selectedMissionMinutes =
    selectedAttendance.reduce(
      (
        total,
        attendance,
      ) =>
        total +
        attendance.temporaryExits
          .filter(
            (exit) =>
              exit.type ===
              "MISSION",
          )
          .reduce(
            (
              exitTotal,
              exit,
            ) =>
              exitTotal +
              getTemporaryExitDurationMinutes(
                mapTemporaryExit(
                  exit,
                ),
                attendance.checkOut,
                now,
              ),
            0,
          ),
      0,
    );

  const nonWorkingSelectedDay =
    Boolean(
      selectedHoliday,
    ) ||
    !selectedCompanyWorkingDay;

  const isFutureSelectedDay =
    selectedDateKey >
    todayKey;

  const effectiveAbsentCount =
    nonWorkingSelectedDay ||
    isFutureSelectedDay
      ? selectedEmployees.filter(
          (employee) =>
            employee.present ===
              false &&
            employee.onLeave ===
              false,
        ).length
      : selectedEmployees.filter(
          (employee) =>
            employee.present ===
              false &&
            employee.onLeave ===
              false,
        ).length;

  const selectedDay:
    SelectedDaySummary = {
    dateKey:
      selectedDateKey,

    jalaliDate:
      `${selectedJalali.jy.toLocaleString(
        "fa-IR",
      )}/${String(
        selectedJalali.jm,
      ).padStart(
        2,
        "0",
      )}/${String(
        selectedJalali.jd,
      ).padStart(
        2,
        "0",
      )}`,

    displayDate:
      formatDate(
        selectedRange.start,
      ),

    weekdayName:
      PERSIAN_WEEKDAYS[
        selectedWeekdayIndex
      ],

    isWorkingDay:
      selectedCompanyWorkingDay,

    isFuture:
      isFutureSelectedDay,

    holidayTitle:
      selectedHoliday?.title ??
      null,

    holidayDescription:
      selectedHoliday?.description ??
      null,

    totalEmployees:
      employees.length,

    presentCount:
      selectedEmployees.filter(
        (employee) =>
          employee.present,
      ).length,

    leaveCount:
      selectedLeaveCount,

    absentCount:
      effectiveAbsentCount,

    temporaryExitCount:
      selectedTemporaryExitCount,

    openTemporaryExitCount:
      selectedOpenTemporaryExitCount,

    temporaryExitMinutes:
      selectedTemporaryExitMinutes,

    missionMinutes:
      selectedMissionMinutes,

    records,

    employees:
      selectedEmployees,
  };

  const summary:
    CalendarSummary = {
    totalDays:
      days.length,

    workingDays:
      days.filter(
        (day) =>
          day.status ===
            "present" ||
          day.status ===
            "absent" ||
          day.status ===
            "leave",
      ).length,

    holidayDays:
      days.filter(
        (day) =>
          day.status ===
          "holiday",
      ).length,

    weekendDays:
      days.filter(
        (day) =>
          day.status ===
          "weekend",
      ).length,

    futureDays:
      days.filter(
        (day) =>
          day.status ===
          "future",
      ).length,

    presentDays:
      days.filter(
        (day) =>
          day.status ===
          "present",
      ).length,

    absentDays:
      days.filter(
        (day) =>
          day.status ===
          "absent",
      ).length,

    leaveDays:
      days.filter(
        (day) =>
          day.leaveCount >
          0,
      ).length,

    temporaryExitCount:
      days.reduce(
        (
          total,
          day,
        ) =>
          total +
          day.temporaryExitCount,
        0,
      ),

    openTemporaryExitCount:
      days.reduce(
        (
          total,
          day,
        ) =>
          total +
          day.openTemporaryExitCount,
        0,
      ),
  };

  const previousMonth =
    getPreviousMonth(
      year,
      month,
    );

  const nextMonth =
    getNextMonth(
      year,
      month,
    );

  const currentJalali =
    getCurrentJalaliDate();

  const previousMonthUrl =
    `/admin/calendar?month=${previousMonth.year}-${String(
      previousMonth.month,
    ).padStart(
      2,
      "0",
    )}`;

  const nextMonthUrl =
    `/admin/calendar?month=${nextMonth.year}-${String(
      nextMonth.month,
    ).padStart(
      2,
      "0",
    )}`;

  const currentMonthUrl =
    `/admin/calendar?month=${currentJalali.jy}-${String(
      currentJalali.jm,
    ).padStart(
      2,
      "0",
    )}`;

  const firstWeekdayIndex =
    getJalaliWeekdayIndex(
      year,
      month,
      1,
    );

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
          min-w-0
          max-w-[1500px]
          space-y-5
          px-4
          pb-24
          pt-4
          sm:space-y-6
          sm:px-6
          sm:pb-8
          sm:pt-6
          xl:px-8
        "
      >
        <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="min-w-0">
            <div className="mb-3 inline-flex h-8 items-center gap-2 rounded-full border border-slate-200 bg-white px-3 text-[11px] font-bold text-slate-600 shadow-sm">
              <CalendarDays className="size-4" />
              تقویم سازمان
            </div>

            <h1 className="text-2xl font-black tracking-tight text-slate-950 sm:text-3xl">
              تقویم کاری
            </h1>

            <p className="mt-2 max-w-2xl text-sm leading-7 text-slate-500">
              روزهای کاری، تعطیلات، مرخصی‌ها، حضور کارکنان و خروج‌های موقت را از یک نمای واحد مشاهده کنید.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-2 sm:flex">
            <Link
              href="/admin/settings"
              className="
                inline-flex
                h-11
                items-center
                justify-center
                gap-2
                rounded-2xl
                border
                border-slate-200
                bg-white
                px-4
                text-xs
                font-bold
                text-slate-700
                shadow-sm
                transition
                hover:bg-slate-50
                active:scale-[0.99]
                sm:h-12
                sm:text-sm
              "
            >
              <Clock3 className="size-4" />
              تنظیمات کاری
            </Link>

            <Link
              href="/admin/reports"
              className="
                inline-flex
                h-11
                items-center
                justify-center
                gap-2
                rounded-2xl
                bg-slate-950
                px-4
                text-xs
                font-bold
                text-white
                shadow-[0_10px_25px_rgba(15,23,42,0.12)]
                transition
                hover:bg-slate-800
                active:scale-[0.99]
                sm:h-12
                sm:text-sm
              "
            >
              <FileText className="size-4" />
              گزارش‌ها
            </Link>
          </div>
        </header>

        <section className="overflow-hidden rounded-[28px] border border-slate-200/80 bg-white shadow-[0_10px_35px_rgba(15,23,42,0.045)]">
          <div className="p-4 sm:p-5">
            <div className="flex items-center justify-between gap-3">
              <Link
                href={previousMonthUrl}
                aria-label="ماه قبل"
                className="
                  flex
                  size-11
                  shrink-0
                  items-center
                  justify-center
                  rounded-2xl
                  border
                  border-slate-200
                  bg-slate-50
                  text-slate-600
                  transition
                  hover:bg-slate-100
                  active:scale-[0.97]
                "
              >
                <ChevronRight className="size-5" />
              </Link>

              <div className="min-w-0 text-center">
                <p className="text-lg font-black text-slate-950 sm:text-xl">
                  {
                    PERSIAN_MONTHS[
                      month - 1
                    ]
                  }{" "}
                  {year.toLocaleString(
                    "fa-IR",
                  )}
                </p>

                <p className="mt-1 text-[11px] text-slate-400">
                  تقویم شمسی
                </p>
              </div>

              <Link
                href={nextMonthUrl}
                aria-label="ماه بعد"
                className="
                  flex
                  size-11
                  shrink-0
                  items-center
                  justify-center
                  rounded-2xl
                  border
                  border-slate-200
                  bg-slate-50
                  text-slate-600
                  transition
                  hover:bg-slate-100
                  active:scale-[0.97]
                "
              >
                <ChevronLeft className="size-5" />
              </Link>
            </div>

            <div className="mt-4 flex justify-center">
              <Link
                href={currentMonthUrl}
                className="
                  inline-flex
                  h-10
                  items-center
                  justify-center
                  rounded-xl
                  bg-slate-100
                  px-4
                  text-xs
                  font-black
                  text-slate-700
                  transition
                  hover:bg-slate-200
                  active:scale-[0.99]
                "
              >
                ماه جاری
              </Link>
            </div>
          </div>
        </section>

        <section className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-9">
          <SummaryCard
            title="کل روزها"
            value={summary.totalDays}
            icon={
              <CalendarDays className="size-5" />
            }
          />

          <SummaryCard
            title="روز کاری"
            value={summary.workingDays}
            icon={
              <Clock3 className="size-5" />
            }
          />

          <SummaryCard
            title="تعطیل"
            value={summary.holidayDays}
            icon={
              <CalendarOff className="size-5" />
            }
          />

          <SummaryCard
            title="غیرکاری"
            value={summary.weekendDays}
            icon={
              <CalendarDays className="size-5" />
            }
          />

          <SummaryCard
            title="روز دارای حضور"
            value={summary.presentDays}
            icon={
              <UserCheck className="size-5" />
            }
          />

          <SummaryCard
            title="روز مرخصی"
            value={summary.leaveDays}
            icon={
              <CalendarDays className="size-5" />
            }
          />

          <SummaryCard
            title="روز غیبت"
            value={summary.absentDays}
            icon={
              <Users className="size-5" />
            }
          />

          <SummaryCard
            title="تعداد خروج"
            value={
              summary.temporaryExitCount
            }
            icon={
              <Clock3 className="size-5" />
            }
          />

          <SummaryCard
            title="خروج باز"
            value={
              summary.openTemporaryExitCount
            }
            icon={
              <Clock3 className="size-5" />
            }
          />
        </section>

        <CalendarView
          year={year}
          month={month}
          firstWeekdayIndex={
            firstWeekdayIndex
          }
          days={days}
          selectedDay={selectedDay}
          summary={summary}
        />
      </div>
    </AdminShell>
  );
}

function SummaryCard({
  title,
  value,
  icon,
}: {
  title: string;
  value: number;
  icon: React.ReactNode;
}) {
  return (
    <div
      className="
        rounded-[22px]
        border
        border-slate-200/80
        bg-white
        p-4
        shadow-[0_8px_30px_rgba(15,23,42,0.03)]
      "
    >
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold text-slate-400">
            {title}
          </p>

          <p className="mt-2 text-xl font-black tracking-tight text-slate-950 sm:text-2xl">
            {value.toLocaleString(
              "fa-IR",
            )}
          </p>
        </div>

        <div className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-slate-50 text-slate-600 sm:size-11">
          {icon}
        </div>
      </div>
    </div>
  );
}