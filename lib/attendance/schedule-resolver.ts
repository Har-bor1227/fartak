import { prisma } from "@/lib/prisma";
import type {
  AttendanceSchedule,
} from "@/lib/attendance/engine";

export type ScheduleSettingsSource = {
  workStartMinutes: number;
  workEndMinutes: number;
  saturday: boolean;
  sunday: boolean;
  monday: boolean;
  tuesday: boolean;
  wednesday: boolean;
  thursday: boolean;
  friday: boolean;
};

export type CompanyScheduleHistoryRecord =
  ScheduleSettingsSource & {
    id: string;
    effectiveFrom: Date;
    createdAt: Date;
  };

export type EmployeeShiftAssignment = {
  id: string;
  userId: string;
  shiftId: string;
  startsAt: Date;
  endsAt: Date | null;

  shift: {
    id: string;
    name: string;
    startMinutes: number;
    endMinutes: number;
    saturday: boolean;
    sunday: boolean;
    monday: boolean;
    tuesday: boolean;
    wednesday: boolean;
    thursday: boolean;
    friday: boolean;
  };
};

const DEFAULT_SCHEDULE: AttendanceSchedule = {
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

export function getDefaultAttendanceSchedule(
  settings?: ScheduleSettingsSource | null,
): AttendanceSchedule {
  if (!settings) {
    return DEFAULT_SCHEDULE;
  }

  return {
    workStartMinutes:
      settings.workStartMinutes,

    workEndMinutes:
      settings.workEndMinutes,

    saturday:
      settings.saturday,

    sunday:
      settings.sunday,

    monday:
      settings.monday,

    tuesday:
      settings.tuesday,

    wednesday:
      settings.wednesday,

    thursday:
      settings.thursday,

    friday:
      settings.friday,
  };
}

/**
 * آخرین برنامه پیش‌فرض شرکت که در تاریخ موردنظر
 * فعال شده است را از تاریخچه پیدا می‌کند.
 *
 * effectiveFrom = inclusive
 */
export function pickCompanyScheduleHistory(
  history: CompanyScheduleHistoryRecord[],
  workDate: Date,
): CompanyScheduleHistoryRecord | null {
  const matching =
    history
      .filter(
        (record) =>
          record.effectiveFrom.getTime() <=
          workDate.getTime(),
      )
      .sort(
        (a, b) =>
          b.effectiveFrom.getTime() -
          a.effectiveFrom.getTime(),
      );

  return matching[0] ?? null;
}

export function companyHistoryToAttendanceSchedule(
  record: CompanyScheduleHistoryRecord,
): AttendanceSchedule {
  return {
    workStartMinutes:
      record.workStartMinutes,

    workEndMinutes:
      record.workEndMinutes,

    saturday:
      record.saturday,

    sunday:
      record.sunday,

    monday:
      record.monday,

    tuesday:
      record.tuesday,

    wednesday:
      record.wednesday,

    thursday:
      record.thursday,

    friday:
      record.friday,
  };
}

/**
 * برنامه پیش‌فرض شرکت برای یک تاریخ مشخص.
 *
 * اولویت:
 * 1. تاریخچه ثبت‌شده
 * 2. تنظیمات فعلی شرکت
 * 3. برنامه پیش‌فرض داخلی
 *
 * fallback فعلی برای سازگاری با داده‌های قدیمی
 * نگه داشته شده است.
 */
export function resolveCompanySchedule(
  params: {
    workDate: Date;
    history?: CompanyScheduleHistoryRecord[];
    currentSettings?: ScheduleSettingsSource | null;
  },
): AttendanceSchedule {
  const historical =
    params.history
      ? pickCompanyScheduleHistory(
          params.history,
          params.workDate,
        )
      : null;

  if (historical) {
    return companyHistoryToAttendanceSchedule(
      historical,
    );
  }

  return getDefaultAttendanceSchedule(
    params.currentSettings,
  );
}

/**
 * تاریخچه برنامه پیش‌فرض شرکت را برای بازه موردنظر
 * دریافت می‌کند.
 *
 * یک رکورد قبل از شروع بازه نیز دریافت می‌شود تا
 * اگر هیچ تغییر جدیدی در بازه ثبت نشده بود،
 * برنامه قبلی همچنان برای کل بازه قابل استفاده باشد.
 */
export async function getCompanyScheduleHistory(
  params: {
    from: Date;
    to: Date;
  },
): Promise<CompanyScheduleHistoryRecord[]> {
  const previous =
    await prisma.companyScheduleHistory.findFirst({
      where: {
        effectiveFrom: {
          lt: params.from,
        },
      },

      orderBy: {
        effectiveFrom: "desc",
      },

      select: {
        id: true,
        effectiveFrom: true,
        workStartMinutes: true,
        workEndMinutes: true,
        saturday: true,
        sunday: true,
        monday: true,
        tuesday: true,
        wednesday: true,
        thursday: true,
        friday: true,
        createdAt: true,
      },
    });

  const currentAndFuture =
    await prisma.companyScheduleHistory.findMany({
      where: {
        effectiveFrom: {
          gte: params.from,
          lt: params.to,
        },
      },

      orderBy: {
        effectiveFrom: "asc",
      },

      select: {
        id: true,
        effectiveFrom: true,
        workStartMinutes: true,
        workEndMinutes: true,
        saturday: true,
        sunday: true,
        monday: true,
        tuesday: true,
        wednesday: true,
        thursday: true,
        friday: true,
        createdAt: true,
      },
    });

  return previous
    ? [previous, ...currentAndFuture]
    : currentAndFuture;
}

/**
 * برنامه واقعی کارمند برای یک تاریخ مشخص:
 *
 * 1. Shift اختصاصی معتبر
 * 2. برنامه تاریخی شرکت
 * 3. برنامه فعلی/پیش‌فرض شرکت
 */
export function resolveEmployeeSchedule(
  params: {
    assignments: EmployeeShiftAssignment[];
    userId: string;
    workDate: Date;

    fallbackSchedule?: AttendanceSchedule;

    companyScheduleHistory?: CompanyScheduleHistoryRecord[];

    currentCompanySettings?: ScheduleSettingsSource | null;
  },
): AttendanceSchedule {
  const assignment =
    pickEmployeeShift(
      params.assignments,
      params.userId,
      params.workDate,
    );

  if (assignment) {
    return shiftToAttendanceSchedule(
      assignment.shift,
    );
  }

  if (
    params.companyScheduleHistory
  ) {
    return resolveCompanySchedule({
      workDate:
        params.workDate,

      history:
        params.companyScheduleHistory,

      currentSettings:
        params.currentCompanySettings,
    });
  }

  return (
    params.fallbackSchedule ??
    getDefaultAttendanceSchedule(
      params.currentCompanySettings,
    )
  );
}

export function shiftToAttendanceSchedule(
  shift: EmployeeShiftAssignment["shift"],
): AttendanceSchedule {
  return {
    workStartMinutes:
      shift.startMinutes,

    workEndMinutes:
      shift.endMinutes,

    saturday:
      shift.saturday,

    sunday:
      shift.sunday,

    monday:
      shift.monday,

    tuesday:
      shift.tuesday,

    wednesday:
      shift.wednesday,

    thursday:
      shift.thursday,

    friday:
      shift.friday,
  };
}

/**
 * از بین انتساب‌های موجود، آخرین انتسابی که
 * در تاریخ موردنظر معتبر است را انتخاب می‌کند.
 *
 * startsAt: inclusive
 * endsAt: exclusive
 */
export function pickEmployeeShift(
  assignments: EmployeeShiftAssignment[],
  userId: string,
  workDate: Date,
): EmployeeShiftAssignment | null {
  const matching =
    assignments
      .filter(
        (assignment) =>
          assignment.userId === userId &&
          assignment.startsAt.getTime() <=
            workDate.getTime() &&
          (
            assignment.endsAt ===
              null ||
            assignment.endsAt.getTime() >
              workDate.getTime()
          ),
      )
      .sort(
        (a, b) =>
          b.startsAt.getTime() -
          a.startsAt.getTime(),
      );

  return matching[0] ?? null;
}

export async function getEmployeeShiftAssignments(
  params: {
    userIds: string[];
    from: Date;
    to: Date;
  },
): Promise<EmployeeShiftAssignment[]> {
  if (
    params.userIds.length === 0
  ) {
    return [];
  }

  return prisma.employeeShift.findMany({
    where: {
      userId: {
        in: params.userIds,
      },

      startsAt: {
        lt: params.to,
      },

      OR: [
        {
          endsAt: null,
        },
        {
          endsAt: {
            gt: params.from,
          },
        },
      ],
    },

    select: {
      id: true,
      userId: true,
      shiftId: true,
      startsAt: true,
      endsAt: true,

      shift: {
        select: {
          id: true,
          name: true,

          startMinutes: true,
          endMinutes: true,

          saturday: true,
          sunday: true,
          monday: true,
          tuesday: true,
          wednesday: true,
          thursday: true,
          friday: true,
        },
      },
    },

    orderBy: {
      startsAt: "desc",
    },
  });
}

export async function getEmployeeShiftAssignment(
  params: {
    userId: string;
    workDate: Date;
  },
): Promise<EmployeeShiftAssignment | null> {
  return prisma.employeeShift.findFirst({
    where: {
      userId:
        params.userId,

      startsAt: {
        lte:
          params.workDate,
      },

      OR: [
        {
          endsAt: null,
        },
        {
          endsAt: {
            gt:
              params.workDate,
          },
        },
      ],
    },

    select: {
      id: true,
      userId: true,
      shiftId: true,
      startsAt: true,
      endsAt: true,

      shift: {
        select: {
          id: true,
          name: true,

          startMinutes: true,
          endMinutes: true,

          saturday: true,
          sunday: true,
          monday: true,
          tuesday: true,
          wednesday: true,
          thursday: true,
          friday: true,
        },
      },
    },

    orderBy: {
      startsAt: "desc",
    },
  });
}