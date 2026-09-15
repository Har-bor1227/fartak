const TIME_ZONE =
  process.env.APP_TIMEZONE || "Asia/Tehran";

type DateParts = {
  year: number;
  month: number;
  day: number;
};

function getDateParts(date: Date): DateParts {
  const formatter =
    new Intl.DateTimeFormat("en-US", {
      timeZone: TIME_ZONE,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });

  const parts =
    formatter.formatToParts(date);

  return {
    year: Number(
      parts.find(
        (part) => part.type === "year",
      )?.value,
    ),

    month: Number(
      parts.find(
        (part) => part.type === "month",
      )?.value,
    ),

    day: Number(
      parts.find(
        (part) => part.type === "day",
      )?.value,
    ),
  };
}

function isValidDateParts(
  parts: DateParts,
): boolean {
  if (
    !Number.isInteger(parts.year) ||
    !Number.isInteger(parts.month) ||
    !Number.isInteger(parts.day)
  ) {
    return false;
  }

  if (
    parts.month < 1 ||
    parts.month > 12 ||
    parts.day < 1 ||
    parts.day > 31
  ) {
    return false;
  }

  /*
   * Date.UTC به‌صورت خودکار تاریخ‌های
   * نامعتبر مثل 2026-02-31 را normalize می‌کند.
   *
   * با مقایسه مجدد اجزای تاریخ، مطمئن
   * می‌شویم تاریخ واقعاً در تقویم میلادی
   * معتبر است.
   */
  const probe = new Date(
    Date.UTC(
      parts.year,
      parts.month - 1,
      parts.day,
      12,
      0,
      0,
      0,
    ),
  );

  return (
    probe.getUTCFullYear() ===
      parts.year &&
    probe.getUTCMonth() ===
      parts.month - 1 &&
    probe.getUTCDate() ===
      parts.day
  );
}

function addCalendarDays(
  parts: DateParts,
  amount: number,
): DateParts {
  const probe = new Date(
    Date.UTC(
      parts.year,
      parts.month - 1,
      parts.day + amount,
      12,
      0,
      0,
      0,
    ),
  );

  return {
    year:
      probe.getUTCFullYear(),

    month:
      probe.getUTCMonth() + 1,

    day:
      probe.getUTCDate(),
  };
}

function getTimeZoneOffsetMs(
  date: Date,
): number {
  const formatter =
    new Intl.DateTimeFormat("en-US", {
      timeZone: TIME_ZONE,
      timeZoneName: "shortOffset",
    });

  const parts =
    formatter.formatToParts(date);

  const value =
    parts.find(
      (part) =>
        part.type === "timeZoneName",
    )?.value || "GMT";

  if (
    value === "GMT" ||
    value === "UTC"
  ) {
    return 0;
  }

  const match =
    value.match(
      /^GMT([+-])(\d{1,2})(?::(\d{2}))?$/,
    );

  if (!match) {
    return 0;
  }

  const sign =
    match[1] === "+" ? 1 : -1;

  const hours =
    Number(match[2]);

  const minutes =
    Number(match[3] || 0);

  return (
    sign *
    (hours * 60 + minutes) *
    60 *
    1000
  );
}

function getLocalMidnightUtc(
  parts: DateParts,
): Date {
  /*
   * ابتدا یک حدس در ظهر UTC می‌سازیم.
   * استفاده از ظهر به‌جای نیمه‌شب احتمال
   * برخورد با مرزهای تغییر offset را کمتر می‌کند.
   */
  const utcGuess =
    new Date(
      Date.UTC(
        parts.year,
        parts.month - 1,
        parts.day,
        12,
        0,
        0,
        0,
      ),
    );

  const firstOffset =
    getTimeZoneOffsetMs(
      utcGuess,
    );

  let result =
    new Date(
      Date.UTC(
        parts.year,
        parts.month - 1,
        parts.day,
        0,
        0,
        0,
        0,
      ) - firstOffset,
    );

  /*
   * یک بار دیگر offset را از خود timestamp
   * نهایی می‌گیریم تا اگر timezone در آن
   * بازه تغییر offset داشته باشد، مقدار
   * نهایی دقیق‌تر شود.
   */
  const secondOffset =
    getTimeZoneOffsetMs(result);

  if (
    secondOffset !== firstOffset
  ) {
    result =
      new Date(
        Date.UTC(
          parts.year,
          parts.month - 1,
          parts.day,
          0,
          0,
          0,
          0,
        ) - secondOffset,
      );
  }

  return result;
}

export function getTodayRange() {
  const now = new Date();

  const todayParts =
    getDateParts(now);

  /*
   * در حالت عادی Intl باید یک تاریخ معتبر
   * برگرداند؛ این fallback فقط برای جلوگیری
   * از انتشار Date نامعتبر در لایه‌های بالاتر
   * گذاشته شده است.
   */
  if (
    !isValidDateParts(
      todayParts,
    )
  ) {
    throw new Error(
      "Unable to resolve today's date for the configured timezone.",
    );
  }

  const tomorrowParts =
    addCalendarDays(
      todayParts,
      1,
    );

  const start =
    getLocalMidnightUtc(
      todayParts,
    );

  const end =
    getLocalMidnightUtc(
      tomorrowParts,
    );

  return {
    start,
    end,
  };
}

export function getDateRange(
  dateKey: string,
) {
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

  const parts: DateParts = {
    year,
    month,
    day,
  };

  /*
   * قبلاً فقط بازه 1 تا 31 بررسی می‌شد؛
   * در نتیجه تاریخ‌هایی مثل 2026-02-31
   * می‌توانستند وارد سیستم شوند.
   */
  if (
    !isValidDateParts(parts)
  ) {
    return null;
  }

  const start =
    getLocalMidnightUtc(
      parts,
    );

  const nextDayParts =
    addCalendarDays(
      parts,
      1,
    );

  const end =
    getLocalMidnightUtc(
      nextDayParts,
    );

  return {
    start,
    end,
  };
}

export function getDateKey(
  date: Date,
) {
  const parts =
    getDateParts(date);

  return [
    parts.year
      .toString()
      .padStart(4, "0"),

    parts.month
      .toString()
      .padStart(2, "0"),

    parts.day
      .toString()
      .padStart(2, "0"),
  ].join("-");
}

export function formatTime(
  date: Date | null,
) {
  if (!date) {
    return "--:--";
  }

  return new Intl.DateTimeFormat(
    "fa-IR",
    {
      timeZone: TIME_ZONE,
      hour: "2-digit",
      minute: "2-digit",
    },
  ).format(date);
}

export function formatDate(
  date: Date,
) {
  return new Intl.DateTimeFormat(
    "fa-IR",
    {
      timeZone: TIME_ZONE,
      year: "numeric",
      month: "long",
      day: "numeric",
    },
  ).format(date);
}

export function getPersianWeekday(
  date: Date,
) {
  return new Intl.DateTimeFormat(
    "fa-IR",
    {
      timeZone: TIME_ZONE,
      weekday: "long",
    },
  ).format(date);
}

export function formatShortDate(
  date: Date,
) {
  return new Intl.DateTimeFormat(
    "fa-IR",
    {
      timeZone: TIME_ZONE,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    },
  ).format(date);
}