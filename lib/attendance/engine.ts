
import type {
  AttendanceStatus,
} from "@/app/generated/prisma/client";

export type AttendanceSchedule = {
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

export type AttendanceHoliday = {
  title: string;
  description: string | null;
};

export type AttendanceRecord = {
  workDate: Date;
  checkIn: Date | null;
  checkOut: Date | null;
  status: AttendanceStatus;
  note: string | null;
};

export type AttendanceDayState =
  | "PRESENT"
  | "WORKING"
  | "ABSENT"
  | "HOLIDAY"
  | "NON_WORKING"
  | "FUTURE";

export type AttendanceCalculation = {
  state: AttendanceDayState;

  isWorkingDay: boolean;
  isHoliday: boolean;
  isFuture: boolean;

  holiday: AttendanceHoliday | null;

  scheduledStartMinutes: number;
  scheduledEndMinutes: number;
  scheduledMinutes: number;

  checkIn: Date | null;
  checkOut: Date | null;

  workedMinutes: number;

  lateMinutes: number;
  earlyLeaveMinutes: number;
  overtimeMinutes: number;
  underworkMinutes: number;

  balanceMinutes: number;

  hasAttendance: boolean;
  isComplete: boolean;

  attendanceStatus: AttendanceStatus | null;

  note: string | null;
};

type WeekdayKey =
  | "saturday"
  | "sunday"
  | "monday"
  | "tuesday"
  | "wednesday"
  | "thursday"
  | "friday";

const TIME_ZONE =
  process.env.APP_TIMEZONE ||
  "Asia/Tehran";

const WEEKDAY_KEYS: Record<
  string,
  WeekdayKey
> = {
  Sat: "saturday",
  Sun: "sunday",
  Mon: "monday",
  Tue: "tuesday",
  Wed: "wednesday",
  Thu: "thursday",
  Fri: "friday",
};

function clampMinutes(
  value: number,
): number {
  if (!Number.isFinite(value)) {
    return 0;
  }

  return Math.max(
    0,
    Math.min(
      1439,
      Math.floor(value),
    ),
  );
}

function normalizeSchedule(
  schedule: AttendanceSchedule,
): AttendanceSchedule {
  const start =
    clampMinutes(
      schedule.workStartMinutes,
    );

  const end =
    clampMinutes(
      schedule.workEndMinutes,
    );

  return {
    workStartMinutes: start,
    workEndMinutes: end,

    saturday:
      Boolean(schedule.saturday),

    sunday:
      Boolean(schedule.sunday),

    monday:
      Boolean(schedule.monday),

    tuesday:
      Boolean(schedule.tuesday),

    wednesday:
      Boolean(schedule.wednesday),

    thursday:
      Boolean(schedule.thursday),

    friday:
      Boolean(schedule.friday),
  };
}

function getDateParts(
  date: Date,
): {
  year: number;
  month: number;
  day: number;
} {
  const formatter =
    new Intl.DateTimeFormat(
      "en-US",
      {
        timeZone: TIME_ZONE,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      },
    );

  const parts =
    formatter.formatToParts(date);

  const year = Number(
    parts.find(
      (part) =>
        part.type === "year",
    )?.value,
  );

  const month = Number(
    parts.find(
      (part) =>
        part.type === "month",
    )?.value,
  );

  const day = Number(
    parts.find(
      (part) =>
        part.type === "day",
    )?.value,
  );

  return {
    year:
      Number.isFinite(year)
        ? year
        : 0,

    month:
      Number.isFinite(month)
        ? month
        : 0,

    day:
      Number.isFinite(day)
        ? day
        : 0,
  };
}

function getDateKey(
  date: Date,
): string {
  const parts =
    getDateParts(date);

  return [
    String(parts.year).padStart(
      4,
      "0",
    ),
    String(parts.month).padStart(
      2,
      "0",
    ),
    String(parts.day).padStart(
      2,
      "0",
    ),
  ].join("-");
}

function getWeekdayKey(
  date: Date,
): WeekdayKey {
  const weekday =
    new Intl.DateTimeFormat(
      "en-US",
      {
        timeZone: TIME_ZONE,
        weekday: "short",
      },
    ).format(date);

  return (
    WEEKDAY_KEYS[weekday] ??
    "saturday"
  );
}

function getIsWorkingDay(
  date: Date,
  schedule: AttendanceSchedule,
): boolean {
  const weekdayKey =
    getWeekdayKey(date);

  return schedule[
    weekdayKey
  ];
}

function getMinutesOfDay(
  date: Date,
): number {
  const formatter =
    new Intl.DateTimeFormat(
      "en-US",
      {
        timeZone: TIME_ZONE,
        hour: "2-digit",
        minute: "2-digit",
        hourCycle: "h23",
      },
    );

  const parts =
    formatter.formatToParts(date);

  const hour = Number(
    parts.find(
      (part) =>
        part.type === "hour",
    )?.value,
  );

  const minute = Number(
    parts.find(
      (part) =>
        part.type === "minute",
    )?.value,
  );

  if (
    !Number.isFinite(hour) ||
    !Number.isFinite(minute)
  ) {
    return 0;
  }

  return hour * 60 + minute;
}

function getDifferenceInMinutes(
  from: Date,
  to: Date,
): number {
  const difference =
    to.getTime() -
    from.getTime();

  if (difference <= 0) {
    return 0;
  }

  return Math.floor(
    difference / 60000,
  );
}

function isFutureDate(
  workDate: Date,
  now: Date,
): boolean {
  return (
    getDateKey(workDate) >
    getDateKey(now)
  );
}

function getWorkedMinutes(
  attendance: AttendanceRecord | null,
  now: Date,
): number {
  if (
    !attendance ||
    !attendance.checkIn
  ) {
    return 0;
  }

  const end =
    attendance.checkOut ??
    now;

  return getDifferenceInMinutes(
    attendance.checkIn,
    end,
  );
}

export function calculateAttendanceDay(
  input: {
    workDate: Date;
    attendance: AttendanceRecord | null;
    schedule: AttendanceSchedule;
    holiday?: AttendanceHoliday | null;
    now?: Date;
  },
): AttendanceCalculation {
  const now =
    input.now ?? new Date();

  const schedule =
    normalizeSchedule(
      input.schedule,
    );

  const holiday =
    input.holiday ?? null;

  const isHoliday =
    holiday !== null;

  const isWorkingDay =
    getIsWorkingDay(
      input.workDate,
      schedule,
    );

  const isFuture =
    isFutureDate(
      input.workDate,
      now,
    );

  const attendance =
    input.attendance;

  const hasAttendance =
    attendance !== null;

  const checkIn =
    attendance?.checkIn ??
    null;

  const checkOut =
    attendance?.checkOut ??
    null;

  const isComplete =
    Boolean(
      checkIn &&
        checkOut,
    );

  const scheduledStartMinutes =
    schedule.workStartMinutes;

  const scheduledEndMinutes =
    schedule.workEndMinutes;

  const scheduledMinutes =
    Math.max(
      0,
      scheduledEndMinutes -
        scheduledStartMinutes,
    );

  const workedMinutes =
    getWorkedMinutes(
      attendance,
      now,
    );

  let state: AttendanceDayState;

  if (isFuture) {
    state = "FUTURE";
  } else if (isHoliday) {
    state = "HOLIDAY";
  } else if (!isWorkingDay) {
    state = "NON_WORKING";
  } else if (!hasAttendance) {
    state = "ABSENT";
  } else if (!checkOut) {
    state = "WORKING";
  } else {
    state = "PRESENT";
  }

  let lateMinutes = 0;
  let earlyLeaveMinutes = 0;
  let overtimeMinutes = 0;
  let underworkMinutes = 0;

  /*
   * تأخیر ورود
   *
   * فقط برای روز کاری واقعی و
   * رکورد دارای ورود محاسبه می‌شود.
   */
  if (
    checkIn &&
    isWorkingDay &&
    !isHoliday &&
    !isFuture
  ) {
    const actualCheckInMinutes =
      getMinutesOfDay(checkIn);

    if (
      actualCheckInMinutes >
      scheduledStartMinutes
    ) {
      lateMinutes =
        actualCheckInMinutes -
        scheduledStartMinutes;
    }
  }

  /*
   * محاسبات خروج
   *
   * تعجیل و اضافه‌کاری بر اساس
   * ساعت خروج واقعی نسبت به پایان
   * برنامه کاری محاسبه می‌شوند.
   */
  if (
    checkOut &&
    isWorkingDay &&
    !isHoliday &&
    !isFuture
  ) {
    const actualCheckOutMinutes =
      getMinutesOfDay(checkOut);

    if (
      actualCheckOutMinutes <
      scheduledEndMinutes
    ) {
      earlyLeaveMinutes =
        scheduledEndMinutes -
        actualCheckOutMinutes;
    }

    if (
      actualCheckOutMinutes >
      scheduledEndMinutes
    ) {
      overtimeMinutes =
        actualCheckOutMinutes -
        scheduledEndMinutes;
    }
  }

  /*
   * کم‌کاری فقط زمانی قطعی است که
   * خروج هم ثبت شده باشد.
   */
  if (
    isComplete &&
    isWorkingDay &&
    !isHoliday &&
    !isFuture &&
    workedMinutes <
      scheduledMinutes
  ) {
    underworkMinutes =
      scheduledMinutes -
      workedMinutes;
  }

  /*
   * تراز فقط روی رکورد کامل معنی دارد.
   */
  const balanceMinutes =
    isComplete &&
    isWorkingDay &&
    !isHoliday &&
    !isFuture
      ? workedMinutes -
        scheduledMinutes
      : 0;

  return {
    state,

    isWorkingDay,
    isHoliday,
    isFuture,

    holiday,

    scheduledStartMinutes,
    scheduledEndMinutes,
    scheduledMinutes,

    checkIn,
    checkOut,

    workedMinutes,

    lateMinutes,
    earlyLeaveMinutes,
    overtimeMinutes,
    underworkMinutes,

    balanceMinutes,

    hasAttendance,
    isComplete,

    attendanceStatus:
      attendance?.status ??
      null,

    note:
      attendance?.note ??
      null,
  };
}

export function minutesToClock(
  totalMinutes: number,
): string {
  const safe =
    Number.isFinite(
      totalMinutes,
    )
      ? Math.max(
          0,
          Math.floor(
            totalMinutes,
          ),
        )
      : 0;

  const hours =
    Math.floor(
      safe / 60,
    );

  const minutes =
    safe % 60;

  return `${String(hours).padStart(
    2,
    "0",
  )}:${String(minutes).padStart(
    2,
    "0",
  )}`;
}

export function formatAttendanceMinutes(
  totalMinutes: number,
): string {
  const safe =
    Number.isFinite(
      totalMinutes,
    )
      ? Math.max(
          0,
          Math.floor(
            totalMinutes,
          ),
        )
      : 0;

  const hours =
    Math.floor(
      safe / 60,
    );

  const minutes =
    safe % 60;

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

export function formatSignedAttendanceMinutes(
  totalMinutes: number,
): string {
  if (
    !Number.isFinite(
      totalMinutes,
    ) ||
    totalMinutes === 0
  ) {
    return "۰ دقیقه";
  }

  const absolute =
    Math.abs(
      Math.floor(
        totalMinutes,
      ),
    );

  const formatted =
    formatAttendanceMinutes(
      absolute,
    );

  return totalMinutes > 0
    ? `+${formatted}`
    : `-${formatted}`;
}

export function getAttendanceStateLabel(
  state: AttendanceDayState,
): string {
  switch (state) {
    case "PRESENT":
      return "حضور کامل";

    case "WORKING":
      return "در حال کار";

    case "ABSENT":
      return "غیبت";

    case "HOLIDAY":
      return "تعطیل";

    case "NON_WORKING":
      return "روز غیرکاری";

    case "FUTURE":
      return "آینده";

    default:
      return "نامشخص";
  }
}

