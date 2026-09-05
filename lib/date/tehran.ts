const TIME_ZONE =
  process.env.APP_TIMEZONE || "Asia/Tehran";

type DateParts = {
  year: number;
  month: number;
  day: number;
};

function getDateParts(date: Date): DateParts {
  const formatter = new Intl.DateTimeFormat(
    "en-US",
    {
      timeZone: TIME_ZONE,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    },
  );

  const parts = formatter.formatToParts(date);

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

function getTimeZoneOffsetMs(
  date: Date,
): number {
  const formatter = new Intl.DateTimeFormat(
    "en-US",
    {
      timeZone: TIME_ZONE,
      timeZoneName: "shortOffset",
    },
  );

  const parts = formatter.formatToParts(date);

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

  const match = value.match(
    /^GMT([+-])(\d{1,2})(?::(\d{2}))?$/,
  );

  if (!match) {
    return 0;
  }

  const sign =
    match[1] === "+" ? 1 : -1;

  const hours = Number(match[2]);

  const minutes = Number(
    match[3] || 0,
  );

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
  const utcGuess = new Date(
    Date.UTC(
      parts.year,
      parts.month - 1,
      parts.day,
      0,
      0,
      0,
      0,
    ),
  );

  const offset =
    getTimeZoneOffsetMs(utcGuess);

  return new Date(
    utcGuess.getTime() - offset,
  );
}

export function getTodayRange() {
  const now = new Date();

  const todayParts =
    getDateParts(now);

  const start =
    getLocalMidnightUtc(
      todayParts,
    );

  const tomorrowProbe = new Date(
    Date.UTC(
      todayParts.year,
      todayParts.month - 1,
      todayParts.day + 1,
      12,
      0,
      0,
      0,
    ),
  );

  const tomorrowParts =
    getDateParts(
      tomorrowProbe,
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

  const year = Number(
    match[1],
  );

  const month = Number(
    match[2],
  );

  const day = Number(
    match[3],
  );

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

  const start =
    getLocalMidnightUtc({
      year,
      month,
      day,
    });

  const nextDayProbe = new Date(
    Date.UTC(
      year,
      month - 1,
      day + 1,
      12,
      0,
      0,
      0,
    ),
  );

  const nextDayParts =
    getDateParts(
      nextDayProbe,
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