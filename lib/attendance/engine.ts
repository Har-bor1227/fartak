import type {
  AttendanceStatus,
  LeaveType,
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

export type AttendanceLeave = {
  type: LeaveType;
};

export type AttendanceTemporaryExit = {
  type: "TEMPORARY" | "MISSION";
  status: "OPEN" | "COMPLETED";
  startedAt: Date;
  endedAt: Date | null;
};

export type AttendanceRecord = {
  workDate: Date;
  checkIn: Date | null;
  checkOut: Date | null;
  status: AttendanceStatus;
  note: string | null;
  temporaryExits?: AttendanceTemporaryExit[];
};

export type AttendanceDayState =
  | "PRESENT"
  | "WORKING"
  | "ABSENT"
  | "LEAVE"
  | "HOLIDAY"
  | "NON_WORKING"
  | "FUTURE";

export type AttendanceCalculation = {
  state: AttendanceDayState;

  isWorkingDay: boolean;
  isHoliday: boolean;
  isFuture: boolean;
  isLeave: boolean;

  holiday: AttendanceHoliday | null;
  leave: AttendanceLeave | null;

  scheduledStartMinutes: number;
  scheduledEndMinutes: number;
  scheduledMinutes: number;

  checkIn: Date | null;
  checkOut: Date | null;

  workedMinutes: number;
  temporaryExitMinutes: number;

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

function normalizeTemporaryExits(
  exits:
    | AttendanceTemporaryExit[]
    | undefined,
): AttendanceTemporaryExit[] {
  if (!exits?.length) {
    return [];
  }

  return exits
    .filter(
      (exit) =>
        exit.startedAt instanceof
        Date,
    )
    .sort(
      (a, b) =>
        a.startedAt.getTime() -
        b.startedAt.getTime(),
    );
}

function getTemporaryExitMinutes(
  attendance: AttendanceRecord | null,
  now: Date,
): number {
  if (
    !attendance?.checkIn
  ) {
    return 0;
  }

  const exits =
    normalizeTemporaryExits(
      attendance.temporaryExits,
    );

  if (!exits.length) {
    return 0;
  }

  const attendanceStart =
    attendance.checkIn;

  const attendanceEnd =
    attendance.checkOut ??
    now;

  const intervals: Array<{
    start: Date;
    end: Date;
  }> = [];

  for (const exit of exits) {
    const exitStart =
      exit.startedAt;

    /*
     * خروجی که قبل از ورود یا از زمان ورود شروع شده،
     * نمی‌تواند بخشی از زمان خروج معتبر این حضور باشد.
     */
    if (
      exitStart.getTime() <=
      attendanceStart.getTime()
    ) {
      continue;
    }

    /*
     * خروجی‌ای که بعد از پایان حضور شروع شده،
     * نباید در کارکرد این رکورد محاسبه شود.
     */
    if (
      exitStart.getTime() >=
      attendanceEnd.getTime()
    ) {
      continue;
    }

    let exitEnd =
      exit.endedAt ??
      null;

    /*
     * رکورد COMPLETED بدون endedAt داده نامعتبر دارد.
     * برای جلوگیری از محاسبه اشتباه، آن را نادیده می‌گیریم.
     */
    if (
      exit.status === "COMPLETED" &&
      !exitEnd
    ) {
      continue;
    }

    /*
     * خروج OPEN تا زمان فعلی ادامه دارد؛
     * البته نه بیشتر از پایان حضور.
     */
    if (!exitEnd) {
      exitEnd =
        now.getTime() <
        attendanceEnd.getTime()
          ? now
          : attendanceEnd;
    }

    const boundedStart =
      exitStart.getTime() >
      attendanceStart.getTime()
        ? exitStart
        : attendanceStart;

    const boundedEnd =
      exitEnd.getTime() <
      attendanceEnd.getTime()
        ? exitEnd
        : attendanceEnd;

    if (
      boundedEnd.getTime() <=
      boundedStart.getTime()
    ) {
      continue;
    }

    intervals.push({
      start: boundedStart,
      end: boundedEnd,
    });
  }

  if (!intervals.length) {
    return 0;
  }

  /*
   * بازه‌ها را مرتب می‌کنیم و سپس Union می‌گیریم.
   *
   * مثال:
   * 10:00 → 11:00
   * 10:30 → 12:00
   *
   * نتیجه:
   * 10:00 → 12:00
   *
   * بنابراین overlap هرگز دوبار از کارکرد
   * کسر نمی‌شود.
   */
  intervals.sort(
    (a, b) =>
      a.start.getTime() -
      b.start.getTime(),
  );

  let totalMilliseconds = 0;

  let mergedStart =
    intervals[0].start;

  let mergedEnd =
    intervals[0].end;

  for (
    let index = 1;
    index < intervals.length;
    index += 1
  ) {
    const current =
      intervals[index];

    /*
     * اگر بازه جدید با قبلی overlap یا حتی
     * دقیقاً به آن چسبیده باشد، merge می‌کنیم.
     */
    if (
      current.start.getTime() <=
      mergedEnd.getTime()
    ) {
      if (
        current.end.getTime() >
        mergedEnd.getTime()
      ) {
        mergedEnd =
          current.end;
      }

      continue;
    }

    totalMilliseconds +=
      mergedEnd.getTime() -
      mergedStart.getTime();

    mergedStart =
      current.start;

    mergedEnd =
      current.end;
  }

  totalMilliseconds +=
    mergedEnd.getTime() -
    mergedStart.getTime();

  return Math.max(
    0,
    Math.floor(
      totalMilliseconds / 60000,
    ),
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

  const rawMinutes =
    getDifferenceInMinutes(
      attendance.checkIn,
      end,
    );

  const temporaryExitMinutes =
    getTemporaryExitMinutes(
      attendance,
      now,
    );

  return Math.max(
    0,
    rawMinutes -
      temporaryExitMinutes,
  );
}

export function calculateAttendanceDay(
  input: {
    workDate: Date;
    attendance: AttendanceRecord | null;
    schedule: AttendanceSchedule;
    holiday?: AttendanceHoliday | null;
    leave?: AttendanceLeave | null;
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

  const leave =
    input.leave ?? null;

  const isHoliday =
    holiday !== null;

  const isLeave =
    leave !== null;

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

  const temporaryExitMinutes =
    getTemporaryExitMinutes(
      attendance,
      now,
    );

  const workedMinutes =
    getWorkedMinutes(
      attendance,
      now,
    );

  let state: AttendanceDayState;

  /*
   * ترتیب اولویت وضعیت‌ها:
   *
   * ۱. تعطیل
   * ۲. روز غیرکاری
   * ۳. حضور واقعی ثبت‌شده
   * ۴. مرخصی تأییدشده
   * ۵. تاریخ آینده
   * ۶. غیبت
   */
  if (isHoliday) {
    state = "HOLIDAY";
  } else if (!isWorkingDay) {
    state = "NON_WORKING";
  } else if (
    hasAttendance &&
    checkOut
  ) {
    state = "PRESENT";
  } else if (
    hasAttendance &&
    checkIn
  ) {
    state = "WORKING";
  } else if (isLeave) {
    state = "LEAVE";
  } else if (isFuture) {
    state = "FUTURE";
  } else {
    state = "ABSENT";
  }

  let lateMinutes = 0;
  let earlyLeaveMinutes = 0;
  let overtimeMinutes = 0;
  let underworkMinutes = 0;

  /*
   * تأخیر ورود
   *
   * خروج موقت هیچ اثری روی زمان ورود ندارد.
   */
  if (
    checkIn &&
    isWorkingDay &&
    !isHoliday &&
    !isLeave &&
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
   * تعجیل و اضافه‌کاری بر اساس خروج نهایی
   * محاسبه می‌شوند، نه آخرین بازگشت موقت.
   */
  if (
    checkOut &&
    isWorkingDay &&
    !isHoliday &&
    !isLeave &&
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
   * کم‌کاری بر اساس کارکرد واقعی
   * بعد از کسر خروج‌های موقت محاسبه می‌شود.
   */
  if (
    isComplete &&
    isWorkingDay &&
    !isHoliday &&
    !isLeave &&
    !isFuture &&
    workedMinutes <
      scheduledMinutes
  ) {
    underworkMinutes =
      scheduledMinutes -
      workedMinutes;
  }

  /*
   * تراز نیز بر اساس کارکرد واقعی است.
   */
  const balanceMinutes =
    isComplete &&
    isWorkingDay &&
    !isHoliday &&
    !isLeave &&
    !isFuture
      ? workedMinutes -
        scheduledMinutes
      : 0;

  return {
    state,

    isWorkingDay,
    isHoliday,
    isFuture,
    isLeave,

    holiday,
    leave,

    scheduledStartMinutes,
    scheduledEndMinutes,
    scheduledMinutes,

    checkIn,
    checkOut,

    workedMinutes,
    temporaryExitMinutes,

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

    case "LEAVE":
      return "مرخصی";

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