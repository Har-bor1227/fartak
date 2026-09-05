import Link from "next/link";
import {
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  Clock3,
  FileSpreadsheet,
  MinusCircle,
  TriangleAlert,
  UserCheck,
  UserRound,
  XCircle,
} from "lucide-react";

import AdminShell from "@/components/admin/admin-shell";
import { requireAdmin } from "@/lib/auth/current-user";
import {
  formatDate,
  formatShortDate,
  formatTime,
} from "@/lib/date/tehran";
import {
  getDefaultReportRange,
  getEmployeeReport,
  normalizeDateInput,
} from "@/lib/admin/reports";
import { prisma } from "@/lib/prisma";

import ReportFilters from "./report-filters";

type ReportsPageProps = {
  searchParams: Promise<{
    employee?: string;
    from?: string;
    to?: string;
  }>;
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

function formatSignedMinutes(
  totalMinutes: number,
): string {
  if (totalMinutes === 0) {
    return "۰ دقیقه";
  }

  const absolute =
    Math.abs(totalMinutes);

  const text =
    formatMinutes(absolute);

  return totalMinutes > 0
    ? `+${text}`
    : `-${text}`;
}

function getStateLabel(
  state: string,
): string {
  switch (state) {
    case "PRESENT":
      return "حاضر";

    case "WORKING":
      return "در حال کار";

    case "ABSENT":
      return "غایب";

    case "HOLIDAY":
      return "تعطیل";

    case "NON_WORKING":
      return "غیرکاری";

    case "FUTURE":
      return "آینده";

    default:
      return "نامشخص";
  }
}

function getStateClass(
  state: string,
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

    default:
      return "bg-slate-100 text-slate-500";
  }
}

function getStateIcon(
  state: string,
) {
  switch (state) {
    case "PRESENT":
      return CheckCircle2;

    case "WORKING":
      return Clock3;

    case "ABSENT":
      return XCircle;

    case "HOLIDAY":
      return CalendarDays;

    case "NON_WORKING":
      return MinusCircle;

    case "FUTURE":
      return Clock3;

    default:
      return TriangleAlert;
  }
}

function getBalanceClass(
  balance: number,
): string {
  if (balance > 0) {
    return "text-emerald-600";
  }

  if (balance < 0) {
    return "text-rose-600";
  }

  return "text-slate-600";
}

export default async function ReportsPage({
  searchParams,
}: ReportsPageProps) {
  const admin = await requireAdmin();

  const params =
    await searchParams;

  const defaults =
    getDefaultReportRange();

  const from =
    normalizeDateInput(params.from) ??
    defaults.from;

  const to =
    normalizeDateInput(params.to) ??
    defaults.to;

  const employeeId =
    typeof params.employee ===
    "string"
      ? params.employee
      : "";

  const employees =
    await prisma.user.findMany({
      where: {
        role: "EMPLOYEE",
      },

      select: {
        id: true,
        firstName: true,
        lastName: true,
        username: true,
      },

      orderBy: [
        {
          isActive: "desc",
        },
        {
          firstName: "asc",
        },
        {
          lastName: "asc",
        },
      ],
    });

  const invalidRange =
    from > to;

  let report = null;

  if (
    employeeId &&
    !invalidRange
  ) {
    report =
      await getEmployeeReport({
        employeeId,
        from,
        to,
      });
  }

  return (
    <AdminShell
      firstName={
        admin.firstName
      }
      lastName={
        admin.lastName
      }
    >
      <div
        dir="rtl"
        className="mx-auto max-w-[1500px] px-4 py-4 sm:px-6 sm:py-6 xl:px-8"
      >
        <header className="mb-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <div className="mb-3 inline-flex h-7 items-center gap-1.5 rounded-full bg-violet-50 px-3 text-[11px] font-semibold text-violet-700">
                <FileSpreadsheet
                  size={13}
                />
                مرکز گزارش‌ها
              </div>

              <h1 className="text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">
                گزارش حضور و غیاب
              </h1>

              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
                عملکرد حضور، کارکرد، تأخیر، اضافه‌کاری و کسری کارمند را در بازه زمانی انتخابی بررسی کنید.
              </p>
            </div>
          </div>
        </header>

        <div className="grid gap-4 xl:grid-cols-[340px_minmax(0,1fr)]">
          <aside className="h-fit rounded-[26px] border border-slate-200/80 bg-white p-5 shadow-[0_8px_30px_rgba(15,23,42,0.04)] xl:sticky xl:top-6 sm:p-6">
            <div className="flex items-start gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-slate-950 text-white">
                <CalendarDays
                  size={19}
                />
              </div>

              <div>
                <h2 className="text-base font-bold text-slate-950">
                  تنظیم گزارش
                </h2>

                <p className="mt-1 text-xs leading-5 text-slate-400">
                  کارمند و بازه زمانی را انتخاب کنید.
                </p>
              </div>
            </div>

            <ReportFilters
              employees={
                employees
              }
              employeeId={
                employeeId
              }
              from={from}
              to={to}
            />

            <div className="mt-5 rounded-2xl bg-slate-50 p-4">
              <p className="text-[11px] leading-6 text-slate-500">
                گزارش بر اساس برنامه کاری شرکت، تعطیلات و رکوردهای حضور محاسبه می‌شود. روز کاری بدون ورود به‌عنوان غیبت و رکورد ورود بدون خروج به‌عنوان وضعیت ناقص در نظر گرفته می‌شود.
              </p>
            </div>
          </aside>

          <section className="min-w-0">
            {invalidRange ? (
              <MessageCard
                title="بازه زمانی نامعتبر است"
                description="تاریخ شروع باید قبل یا برابر تاریخ پایان باشد."
              />
            ) : !employeeId ? (
              <EmptyReport />
            ) : !report ? (
              <MessageCard
                title="کارمند پیدا نشد"
                description="کارمند انتخاب‌شده وجود ندارد یا قابل نمایش نیست."
              />
            ) : (
              <ReportResult
                report={report}
              />
            )}
          </section>
        </div>
      </div>
    </AdminShell>
  );
}

function ReportResult({
  report,
}: {
  report: NonNullable<
    Awaited<
      ReturnType<
        typeof getEmployeeReport
      >
    >
  >;
}) {
  return (
    <div className="space-y-4">
      <section className="rounded-[26px] border border-slate-200/80 bg-white p-5 shadow-[0_10px_35px_rgba(15,23,42,0.04)] sm:p-6">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-center gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-slate-950 text-sm font-bold text-white">
              {report.employee
                .firstName?.[0] ??
                ""}
              {report.employee
                .lastName?.[0] ??
                ""}
            </div>

            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="truncate text-xl font-bold text-slate-950">
                  {
                    report.employee
                      .firstName
                  }{" "}
                  {
                    report.employee
                      .lastName
                  }
                </h2>

                <span
                  className={
                    report.employee
                      .isActive
                      ? "rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-semibold text-emerald-700"
                      : "rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-semibold text-slate-500"
                  }
                >
                  {report.employee
                    .isActive
                    ? "فعال"
                    : "غیرفعال"}
                </span>
              </div>

              <p className="mt-1 text-xs text-slate-400">
                @{report.employee.username}
              </p>

              <p className="mt-1 text-xs text-slate-400">
                از {report.from} تا{" "}
                {report.to}
              </p>
            </div>
          </div>

          <Link
            href={`/admin/attendance/${report.employee.id}`}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-slate-100 px-4 text-xs font-semibold text-slate-600 transition hover:bg-slate-200"
          >
            جزئیات کارمند
            <ArrowLeft
              size={15}
            />
          </Link>
        </div>
      </section>

      <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <ReportStat
          title="روزهای حضور"
          value={String(
            report.attendanceDays,
          )}
          suffix="روز"
          icon={UserCheck}
          valueClass="text-emerald-600"
        />

        <ReportStat
          title="روزهای کامل"
          value={String(
            report.completedDays,
          )}
          suffix="روز"
          icon={CheckCircle2}
        />

        <ReportStat
          title="کارکرد کل"
          value={formatMinutes(
            report.totalWorkedMinutes,
          )}
          icon={Clock3}
        />

        <ReportStat
          title="میانگین روزانه"
          value={formatMinutes(
            report.averageWorkedMinutes,
          )}
          icon={Clock3}
        />
      </section>

      <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <ReportStat
          title="غیبت"
          value={String(
            report.absentDays,
          )}
          suffix="روز"
          icon={XCircle}
          valueClass="text-rose-600"
        />

        <ReportStat
          title="روز تعطیل"
          value={String(
            report.holidayDays,
          )}
          suffix="روز"
          icon={CalendarDays}
          valueClass="text-violet-600"
        />

        <ReportStat
          title="تأخیر"
          value={formatMinutes(
            report.totalLateMinutes,
          )}
          icon={TriangleAlert}
          valueClass="text-amber-600"
        />

        <ReportStat
          title="اضافه‌کاری"
          value={formatMinutes(
            report.totalOvertimeMinutes,
          )}
          icon={Clock3}
          valueClass="text-emerald-600"
        />
      </section>

      <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <ReportStat
          title="تعجیل خروج"
          value={formatMinutes(
            report.totalEarlyLeaveMinutes,
          )}
          icon={ArrowLeft}
          valueClass="text-rose-600"
        />

        <ReportStat
          title="کسری کار"
          value={formatMinutes(
            report.totalUnderworkMinutes,
          )}
          icon={TriangleAlert}
          valueClass="text-rose-600"
        />

        <ReportStat
          title="کارکرد موظفی"
          value={formatMinutes(
            report.totalScheduledMinutes,
          )}
          icon={CalendarDays}
        />

        <ReportStat
          title="تراز کارکرد"
          value={formatSignedMinutes(
            report.totalBalanceMinutes,
          )}
          icon={Clock3}
          valueClass={getBalanceClass(
            report.totalBalanceMinutes,
          )}
        />
      </section>

      <section className="grid gap-3 sm:grid-cols-2">
        <InsightCard
          title="اولین ورود"
          value={
            report.firstCheckIn
              ? formatTime(
                  report.firstCheckIn,
                )
              : "—"
          }
          description="اولین ورود ثبت‌شده در این بازه"
          icon={UserRound}
        />

        <InsightCard
          title="آخرین خروج"
          value={
            report.lastCheckOut
              ? formatTime(
                  report.lastCheckOut,
                )
              : "—"
          }
          description="آخرین خروج ثبت‌شده در این بازه"
          icon={Clock3}
        />
      </section>

      <section className="overflow-hidden rounded-[26px] border border-slate-200/80 bg-white shadow-[0_8px_30px_rgba(15,23,42,0.04)]">
        <div className="border-b border-slate-100 px-5 py-5 sm:px-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-base font-bold text-slate-950">
                جزئیات گزارش
              </h2>

              <p className="mt-1 text-xs text-slate-400">
                {report.items.length} روز در بازه انتخاب‌شده
              </p>
            </div>

            <FileSpreadsheet
              size={19}
              className="text-slate-300"
            />
          </div>
        </div>

        {report.items.length ===
        0 ? (
          <div className="px-6 py-16 text-center">
            <p className="text-sm font-semibold text-slate-700">
              برای این بازه اطلاعاتی وجود ندارد.
            </p>
          </div>
        ) : (
          <>
            <div className="hidden grid-cols-[140px_100px_100px_minmax(140px,1fr)_120px_110px] gap-4 border-b border-slate-100 bg-slate-50/50 px-6 py-3 text-[11px] font-semibold text-slate-400 lg:grid">
              <span>تاریخ</span>
              <span>ورود</span>
              <span>خروج</span>
              <span>کارکرد</span>
              <span>وضعیت</span>
              <span>تراز</span>
            </div>

            <div className="divide-y divide-slate-100">
              {report.items.map(
                (item) => (
                  <ReportRow
                    key={item.id}
                    item={item}
                  />
                ),
              )}
            </div>
          </>
        )}
      </section>
    </div>
  );
}

function ReportRow({
  item,
}: {
  item: NonNullable<
    Awaited<
      ReturnType<
        typeof getEmployeeReport
      >
    >
  >["items"][number];
}) {
  const calculation =
    item.calculation;

  const StateIcon =
    getStateIcon(
      calculation.state,
    );

  return (
    <div className="px-5 py-4 sm:px-6">
      <div className="grid gap-4 lg:grid-cols-[140px_100px_100px_minmax(140px,1fr)_120px_110px] lg:items-center lg:gap-4">
        <div>
          <p className="text-sm font-bold text-slate-900">
            {formatShortDate(
              item.workDate,
            )}
          </p>

          <p className="mt-1 text-[10px] text-slate-400">
            {formatDate(
              item.workDate,
            )}
          </p>
        </div>

        <div>
          <p className="text-[10px] text-slate-400 lg:hidden">
            ورود
          </p>

          <p className="mt-1 text-sm font-semibold text-slate-700 lg:mt-0">
            {formatTime(
              calculation.checkIn,
            )}
          </p>
        </div>

        <div>
          <p className="text-[10px] text-slate-400 lg:hidden">
            خروج
          </p>

          <p className="mt-1 text-sm font-semibold text-slate-700 lg:mt-0">
            {formatTime(
              calculation.checkOut,
            )}
          </p>
        </div>

        <div>
          <p className="text-[10px] text-slate-400 lg:hidden">
            کارکرد
          </p>

          <div className="mt-1 lg:mt-0">
            <p className="text-sm font-semibold text-slate-800">
              {formatMinutes(
                calculation.workedMinutes,
              )}
            </p>

            {calculation
              .scheduledMinutes >
            0 ? (
              <p className="mt-1 text-[10px] text-slate-400">
                موظفی:{" "}
                {formatMinutes(
                  calculation.scheduledMinutes,
                )}
              </p>
            ) : null}

            {calculation
              .lateMinutes >
            0 ? (
              <p className="mt-1 text-[10px] text-amber-600">
                تأخیر:{" "}
                {formatMinutes(
                  calculation.lateMinutes,
                )}
              </p>
            ) : null}

            {calculation
              .earlyLeaveMinutes >
            0 ? (
              <p className="mt-1 text-[10px] text-rose-600">
                تعجیل:{" "}
                {formatMinutes(
                  calculation.earlyLeaveMinutes,
                )}
              </p>
            ) : null}
          </div>
        </div>

        <div>
          <p className="text-[10px] text-slate-400 lg:hidden">
            وضعیت
          </p>

          <div className="mt-1 flex flex-wrap gap-2 lg:mt-0">
            <span
              className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[10px] font-semibold ${getStateClass(
                calculation.state,
              )}`}
            >
              <StateIcon
                size={12}
              />

              {getStateLabel(
                calculation.state,
              )}
            </span>

            {calculation
              .holiday ? (
              <span className="inline-flex rounded-full bg-violet-50 px-2.5 py-1.5 text-[10px] font-semibold text-violet-700">
                {
                  calculation
                    .holiday
                    .title
                }
              </span>
            ) : null}
          </div>
        </div>

        <div>
          <p className="text-[10px] text-slate-400 lg:hidden">
            تراز
          </p>

          <p
            className={`mt-1 text-sm font-bold lg:mt-0 ${getBalanceClass(
              calculation.balanceMinutes,
            )}`}
          >
            {formatSignedMinutes(
              calculation.balanceMinutes,
            )}
          </p>

          {calculation
            .overtimeMinutes >
          0 ? (
            <p className="mt-1 text-[10px] text-emerald-600">
              اضافه‌کاری:{" "}
              {formatMinutes(
                calculation.overtimeMinutes,
              )}
            </p>
          ) : null}

          {calculation
            .underworkMinutes >
          0 ? (
            <p className="mt-1 text-[10px] text-rose-600">
              کسری:{" "}
              {formatMinutes(
                calculation.underworkMinutes,
              )}
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function ReportStat({
  title,
  value,
  suffix,
  icon: Icon,
  valueClass = "text-slate-950",
}: {
  title: string;
  value: string;
  suffix?: string;
  icon: import("lucide-react").LucideIcon;
  valueClass?: string;
}) {
  return (
    <div className="rounded-[22px] border border-slate-200/80 bg-white p-4 shadow-[0_8px_30px_rgba(15,23,42,0.03)]">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] font-medium text-slate-400">
            {title}
          </p>

          <p
            className={`mt-2 break-words text-lg font-bold ${valueClass}`}
          >
            {value}

            {suffix ? (
              <span className="mr-1 text-xs font-medium text-slate-400">
                {suffix}
              </span>
            ) : null}
          </p>
        </div>

        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-50 text-slate-500">
          <Icon size={17} />
        </div>
      </div>
    </div>
  );
}

function InsightCard({
  title,
  value,
  description,
  icon: Icon,
}: {
  title: string;
  value: string;
  description: string;
  icon: import("lucide-react").LucideIcon;
}) {
  return (
    <div className="rounded-[22px] border border-slate-200/80 bg-white p-5 shadow-[0_8px_30px_rgba(15,23,42,0.03)]">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-50 text-slate-500">
          <Icon size={18} />
        </div>

        <div className="min-w-0">
          <p className="text-xs font-medium text-slate-400">
            {title}
          </p>

          <p className="mt-1 text-xl font-bold text-slate-950">
            {value}
          </p>

          <p className="mt-1 text-[10px] text-slate-400">
            {description}
          </p>
        </div>
      </div>
    </div>
  );
}

function EmptyReport() {
  return (
    <div className="flex min-h-[520px] flex-col items-center justify-center rounded-[26px] border border-slate-200/80 bg-white px-6 text-center shadow-[0_8px_30px_rgba(15,23,42,0.04)]">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-50 text-slate-300">
        <FileSpreadsheet
          size={27}
        />
      </div>

      <h2 className="mt-5 text-lg font-bold text-slate-900">
        گزارش آماده است
      </h2>

      <p className="mt-2 max-w-md text-sm leading-6 text-slate-400">
        برای مشاهده گزارش، یک کارمند و بازه زمانی را از بخش تنظیمات انتخاب کنید.
      </p>
    </div>
  );
}

function MessageCard({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="flex min-h-[320px] flex-col items-center justify-center rounded-[26px] border border-slate-200/80 bg-white px-6 text-center shadow-[0_8px_30px_rgba(15,23,42,0.04)]">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-50 text-slate-300">
        <CalendarDays
          size={24}
        />
      </div>

      <h2 className="mt-5 text-base font-bold text-slate-900">
        {title}
      </h2>

      <p className="mt-2 max-w-md text-xs leading-6 text-slate-400">
        {description}
      </p>
    </div>
  );
}