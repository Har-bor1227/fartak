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
import { prisma } from "@/lib/prisma";
import {
  formatDate,
  formatTime,
  getDateKey,
  getDateRange,
} from "@/lib/date/tehran";

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

function getCurrentJalaliDate() {
  const now = new Date();

  return toJalaali(
    now.getFullYear(),
    now.getMonth() + 1,
    now.getDate(),
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

  const match = /^(\d{4})-(\d{1,2})$/.exec(monthParam);

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
  if (month >= 1 && month <= 6) {
    return 31;
  }

  if (month >= 7 && month <= 11) {
    return 30;
  }

  return isLeapJalaaliYear(year) ? 30 : 29;
}

function jalaliToIso(
  year: number,
  month: number,
  day: number,
): string {
  const gregorian = toGregorian(
    year,
    month,
    day,
  );

  return [
    String(gregorian.gy).padStart(4, "0"),
    String(gregorian.gm).padStart(2, "0"),
    String(gregorian.gd).padStart(2, "0"),
  ].join("-");
}

function getJalaliWeekdayIndex(
  year: number,
  month: number,
  day: number,
): number {
  const gregorian = toGregorian(
    year,
    month,
    day,
  );

  const weekday = new Date(
    Date.UTC(
      gregorian.gy,
      gregorian.gm - 1,
      gregorian.gd,
    ),
  ).getUTCDay();

  switch (weekday) {
    case 6:
      return 0; // شنبه
    case 0:
      return 1; // یکشنبه
    case 1:
      return 2; // دوشنبه
    case 2:
      return 3; // سه‌شنبه
    case 3:
      return 4; // چهارشنبه
    case 4:
      return 5; // پنجشنبه
    case 5:
      return 6; // جمعه
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
  if (!checkIn || !checkOut) {
    return "—";
  }

  const diff =
    checkOut.getTime() - checkIn.getTime();

  if (diff <= 0) {
    return "—";
  }

  const totalMinutes = Math.floor(
    diff / 60000,
  );

  const hours = Math.floor(
    totalMinutes / 60,
  );

  const minutes = totalMinutes % 60;

  if (hours === 0) {
    return `${minutes.toLocaleString("fa-IR")} دقیقه`;
  }

  if (minutes === 0) {
    return `${hours.toLocaleString("fa-IR")} ساعت`;
  }

  return `${hours.toLocaleString("fa-IR")} ساعت و ${minutes.toLocaleString("fa-IR")} دقیقه`;
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

  if (
    month < 1 ||
    month > 12 ||
    day < 1 ||
    day > 31
  ) {
    return null;
  }

  return {
    year,
    month,
    day,
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
  const user = await requireAdmin();

  const params = await searchParams;

  const {
    year,
    month,
  } = parseMonth(params.month);

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
    getDateRange(firstDateKey);

  const lastDayRange =
    getDateRange(lastDateKey);

  if (!monthRange || !lastDayRange) {
    throw new Error(
      "Unable to create calendar date range.",
    );
  }

  const monthStart =
    monthRange.start;

  const monthEnd =
    lastDayRange.end;

  const settings =
    await prisma.companySettings.findUnique(
      {
        where: {
          id: "company",
        },
      },
    );

  const schedule: WorkSchedule = {
    saturday:
      settings?.saturday ?? true,

    sunday:
      settings?.sunday ?? true,

    monday:
      settings?.monday ?? true,

    tuesday:
      settings?.tuesday ?? true,

    wednesday:
      settings?.wednesday ?? true,

    thursday:
      settings?.thursday ?? true,

    friday:
      settings?.friday ?? false,
  };

  const [
    holidays,
    employees,
    attendances,
  ] = await Promise.all([
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
      },
      orderBy: {
        workDate: "asc",
      },
    }),
  ]);

  const holidayMap = new Map<
    string,
    {
      title: string;
      description: string | null;
    }
  >();

  for (const holiday of holidays) {
    holidayMap.set(
      getDateKey(holiday.date),
      {
        title: holiday.title,
        description:
          holiday.description,
      },
    );
  }

  const attendanceMap = new Map<
    string,
    Array<
      (typeof attendances)[number]
    >
  >();

  for (const attendance of attendances) {
    const key = getDateKey(
      attendance.workDate,
    );

    const existing =
      attendanceMap.get(key) ?? [];

    existing.push(attendance);

    attendanceMap.set(
      key,
      existing,
    );
  }

  const todayKey =
    getDateKey(new Date());

  const days: CalendarDay[] = [];

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

    const holiday =
      holidayMap.get(dateKey);

    const dailyAttendances =
      attendanceMap.get(
        dateKey,
      ) ?? [];

    const workingDay =
      isWorkingDay(
        weekdayIndex,
        schedule,
      );

    let status: CalendarDay["status"];

    if (holiday) {
      status = "holiday";
    } else if (!workingDay) {
      status = "weekend";
    } else if (dateKey > todayKey) {
      status = "future";
    } else if (
      dailyAttendances.length > 0
    ) {
      status = "present";
    } else {
      status = "absent";
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
        holiday?.title ?? null,
      holidayDescription:
        holiday?.description ?? null,
      attendanceCount:
        dailyAttendances.length,
    });
  }

  const requestedDate =
    typeof params.date === "string"
      ? params.date
      : null;

  const validRequestedDate =
    requestedDate &&
    parseIsoDate(requestedDate)
      ? requestedDate
      : null;

  const selectedDateKey =
    validRequestedDate ?? todayKey;

  const selectedRange =
    getDateRange(
      selectedDateKey,
    );

  if (!selectedRange) {
    throw new Error(
      "Unable to create selected date range.",
    );
  }

  const selectedAttendance =
    await prisma.attendance.findMany(
      {
        where: {
          workDate: {
            gte: selectedRange.start,
            lt: selectedRange.end,
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
        },
        orderBy: {
          workDate: "asc",
        },
      },
    );

  const selectedGregorian =
    parseIsoDate(
      selectedDateKey,
    );

  if (!selectedGregorian) {
    throw new Error(
      "Invalid selected calendar date.",
    );
  }

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

  const selectedIsWorkingDay =
    isWorkingDay(
      selectedWeekdayIndex,
      schedule,
    );

  const presentEmployeeIds =
    new Set(
      selectedAttendance.map(
        (attendance) =>
          attendance.userId,
      ),
    );

  const records =
    selectedAttendance.map(
      (attendance) => ({
        id: attendance.id,

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
      }),
    );

  const selectedEmployees =
    employees.map(
      (employee) => ({
        id: employee.id,

        name:
          `${employee.firstName} ${employee.lastName}`.trim(),

        username:
          employee.username,

        phone:
          employee.phone,

        present:
          presentEmployeeIds.has(
            employee.id,
          ),
      }),
    );

  const nonWorkingSelectedDay =
    Boolean(selectedHoliday) ||
    !selectedIsWorkingDay;

  const selectedDay: SelectedDaySummary =
    {
      dateKey:
        selectedDateKey,

      jalaliDate:
        `${selectedJalali.jy.toLocaleString("fa-IR")}/${String(
          selectedJalali.jm,
        ).padStart(2, "0")}/${String(
          selectedJalali.jd,
        ).padStart(2, "0")}`,

      displayDate:
        formatDate(
          selectedRange.start,
        ),

      weekdayName:
        PERSIAN_WEEKDAYS[
          selectedWeekdayIndex
        ],

      isWorkingDay:
        selectedIsWorkingDay,

      holidayTitle:
        selectedHoliday?.title ??
        null,

      holidayDescription:
        selectedHoliday?.description ??
        null,

      totalEmployees:
        employees.length,

      presentCount:
        presentEmployeeIds.size,

      absentCount:
        nonWorkingSelectedDay
          ? 0
          : Math.max(
              employees.length -
                presentEmployeeIds.size,
              0,
            ),

      records,

      employees:
        selectedEmployees,
    };

  const summary: CalendarSummary =
    {
      totalDays:
        days.length,

      workingDays:
        days.filter(
          (day) =>
            day.status ===
              "present" ||
            day.status ===
              "absent",
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
    ).padStart(2, "0")}`;

  const nextMonthUrl =
    `/admin/calendar?month=${nextMonth.year}-${String(
      nextMonth.month,
    ).padStart(2, "0")}`;

  const currentMonthUrl =
    `/admin/calendar?month=${currentJalali.jy}-${String(
      currentJalali.jm,
    ).padStart(2, "0")}`;

  const firstWeekdayIndex =
    getJalaliWeekdayIndex(
      year,
      month,
      1,
    );

  return (
    <AdminShell
      firstName={user.firstName}
      lastName={user.lastName}
    >
      <div className="min-w-0 space-y-6 pb-24 lg:pb-8">
        <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="min-w-0">
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-600 shadow-sm">
              <CalendarDays className="size-4" />
              تقویم سازمان
            </div>

            <h1 className="text-2xl font-black tracking-tight text-slate-900 sm:text-3xl">
              تقویم کاری
            </h1>

            <p className="mt-2 max-w-2xl text-sm leading-7 text-slate-500">
              روزهای کاری، تعطیلات و وضعیت حضور کارکنان را از یک نمای واحد مشاهده کنید.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Link
              href="/admin/settings"
              className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-700 shadow-sm transition hover:bg-slate-50"
            >
              <Clock3 className="size-4" />
              تنظیمات کاری
            </Link>

            <Link
              href="/admin/reports"
              className="inline-flex items-center gap-2 rounded-2xl bg-slate-900 px-4 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-slate-800"
            >
              <FileText className="size-4" />
              گزارش‌ها
            </Link>
          </div>
        </header>

        <section className="rounded-[28px] border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
          <div className="flex items-center justify-between gap-3">
            <Link
              href={previousMonthUrl}
              aria-label="ماه قبل"
              className="flex size-11 shrink-0 items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 text-slate-600 transition hover:bg-slate-100"
            >
              <ChevronRight className="size-5" />
            </Link>

            <div className="min-w-0 text-center">
              <p className="text-lg font-black text-slate-900 sm:text-xl">
                {PERSIAN_MONTHS[
                  month - 1
                ]}{" "}
                {year.toLocaleString(
                  "fa-IR",
                )}
              </p>

              <p className="mt-1 text-xs text-slate-400">
                تقویم شمسی
              </p>
            </div>

            <Link
              href={nextMonthUrl}
              aria-label="ماه بعد"
              className="flex size-11 shrink-0 items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 text-slate-600 transition hover:bg-slate-100"
            >
              <ChevronLeft className="size-5" />
            </Link>
          </div>

          <div className="mt-4 flex justify-center">
            <Link
              href={currentMonthUrl}
              className="rounded-xl bg-slate-100 px-4 py-2 text-xs font-black text-slate-700 transition hover:bg-slate-200"
            >
              ماه جاری
            </Link>
          </div>
        </section>

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-6">
          <SummaryCard
            title="کل روزها"
            value={
              summary.totalDays
            }
            icon={
              <CalendarDays className="size-5" />
            }
          />

          <SummaryCard
            title="روز کاری"
            value={
              summary.workingDays
            }
            icon={
              <Clock3 className="size-5" />
            }
          />

          <SummaryCard
            title="تعطیل"
            value={
              summary.holidayDays
            }
            icon={
              <CalendarOff className="size-5" />
            }
          />

          <SummaryCard
            title="غیرکاری"
            value={
              summary.weekendDays
            }
            icon={
              <CalendarDays className="size-5" />
            }
          />

          <SummaryCard
            title="روز دارای حضور"
            value={
              summary.presentDays
            }
            icon={
              <UserCheck className="size-5" />
            }
          />

          <SummaryCard
            title="روز غیبت"
            value={
              summary.absentDays
            }
            icon={
              <Users className="size-5" />
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
          selectedDay={
            selectedDay
          }
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
    <div className="rounded-[24px] border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-bold text-slate-400">
            {title}
          </p>

          <p className="mt-2 text-2xl font-black text-slate-900">
            {value.toLocaleString(
              "fa-IR",
            )}
          </p>
        </div>

        <div className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-slate-100 text-slate-700">
          {icon}
        </div>
      </div>
    </div>
  );
}