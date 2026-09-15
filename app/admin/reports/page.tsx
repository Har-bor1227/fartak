import {
  ArrowLeft,
  ArrowRightLeft,
  BriefcaseBusiness,
  CalendarDays,
  CheckCircle2,
  Clock3,
  Download,
  FileSpreadsheet,
  MinusCircle,
  PenLine,
  TriangleAlert,
  UserCheck,
  UserRound,
  XCircle,
} from "lucide-react";

import AdminShell from "@/components/admin/admin-shell";
import { requireAdmin } from "@/lib/auth/current-user";
import {
  getDefaultReportRange,
  getEmployeeReport,
  type EmployeeReportResult,
  type ReportLeaveType,
  type ReportTemporaryExitType,
} from "@/lib/admin/reports";
import {
  formatDate as formatTehranDate,
  formatTime as formatTehranTime,
  getDateRange,
} from "@/lib/date/tehran";
import { prisma } from "@/lib/prisma";

import ReportFilters from "./report-filters";

function formatMinutes(
  totalMinutes: number,
): string {
  const safeMinutes = Math.max(
    0,
    Math.round(totalMinutes),
  );

  const hours = Math.floor(
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

function formatReportDate(
  dateKey: string,
): string {
  const range =
    getDateRange(dateKey);

  if (!range) {
    return dateKey;
  }

  return formatTehranDate(
    range.start,
  );
}

function formatDate(
  date: Date | null,
): string {
  if (!date) {
    return "—";
  }

  return formatTehranDate(date);
}

function formatTime(
  date: Date | null,
): string {
  return formatTehranTime(date);
}

function getLeaveTypeLabel(
  type: ReportLeaveType,
): string {
  switch (type) {
    case "ANNUAL":
      return "استحقاقی";

    case "SICK":
      return "استعلاجی";

    case "UNPAID":
      return "بدون حقوق";

    case "OTHER":
      return "سایر";

    default:
      return "مرخصی";
  }
}

function getTemporaryExitTypeLabel(
  type: ReportTemporaryExitType,
): string {
  switch (type) {
    case "MISSION":
      return "مأموریت";

    case "TEMPORARY":
    default:
      return "خروج موقت";
  }
}

function getStateLabel(
  state:
    EmployeeReportResult["items"][number]["calculation"]["state"],
): string {
  switch (state) {
    case "PRESENT":
      return "حاضر";

    case "WORKING":
      return "در حال حضور";

    case "ABSENT":
      return "غایب";

    case "LEAVE":
      return "مرخصی";

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
  state:
    EmployeeReportResult["items"][number]["calculation"]["state"],
): string {
  switch (state) {
    case "PRESENT":
      return "bg-emerald-50 text-emerald-700";

    case "WORKING":
      return "bg-blue-50 text-blue-700";

    case "ABSENT":
      return "bg-rose-50 text-rose-700";

    case "LEAVE":
      return "bg-violet-50 text-violet-700";

    case "HOLIDAY":
      return "bg-violet-50 text-violet-700";

    case "NON_WORKING":
      return "bg-slate-100 text-slate-600";

    case "FUTURE":
      return "bg-sky-50 text-sky-700";

    default:
      return "bg-slate-100 text-slate-600";
  }
}

function StatCard({
  icon,
  label,
  value,
  description,
  className = "bg-slate-100 text-slate-700",
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  description?: string;
  className?: string;
}) {
  return (
    <div className="rounded-[22px] border border-slate-200/80 bg-white p-4 shadow-[0_8px_30px_rgba(15,23,42,0.03)]">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold text-slate-400">
            {label}
          </p>

          <p className="mt-2 text-xl font-black tracking-tight text-slate-950">
            {value}
          </p>

          {description ? (
            <p className="mt-1 text-[10px] leading-5 text-slate-400">
              {description}
            </p>
          ) : null}
        </div>

        <div
          className={`flex size-10 shrink-0 items-center justify-center rounded-xl ${className}`}
        >
          {icon}
        </div>
      </div>
    </div>
  );
}

function EmptyReportState() {
  return (
    <div className="rounded-[28px] border border-dashed border-slate-200 bg-white px-5 py-16 text-center shadow-[0_10px_35px_rgba(15,23,42,0.03)]">
      <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-slate-50 text-slate-300">
        <FileSpreadsheet className="size-7" />
      </div>

      <h2 className="mt-5 text-base font-black text-slate-900">
        هنوز کارمندی برای گزارش انتخاب نشده است
      </h2>

      <p className="mx-auto mt-2 max-w-md text-xs leading-6 text-slate-400">
        از بخش فیلترها یک کارمند و بازه زمانی را انتخاب کنید تا گزارش کامل حضور و غیاب نمایش داده شود.
      </p>
    </div>
  );
}

function ReportErrorState({
  error,
}: {
  error: NonNullable<
    EmployeeReportResult["error"]
  >;
}) {
  const message =
    error === "RANGE_TOO_LARGE"
      ? "بازه انتخاب‌شده بیشتر از حد مجاز است."
      : "بازه زمانی انتخاب‌شده معتبر نیست.";

  return (
    <div className="rounded-[28px] border border-amber-200 bg-amber-50 p-5 sm:p-6">
      <div className="flex items-start gap-3">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-700">
          <TriangleAlert className="size-5" />
        </div>

        <div>
          <h2 className="text-sm font-black text-amber-900">
            امکان ساخت گزارش وجود ندارد
          </h2>

          <p className="mt-1 text-xs leading-6 text-amber-700">
            {message}
          </p>
        </div>
      </div>
    </div>
  );
}

function EmployeeHeader({
  report,
}: {
  report: EmployeeReportResult;
}) {
  return (
    <section className="overflow-hidden rounded-[28px] border border-slate-200/80 bg-white shadow-[0_10px_35px_rgba(15,23,42,0.045)]">
      <div className="bg-slate-950 p-5 text-white sm:p-7">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-center gap-4">
            <div className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-white/10 text-white">
              <UserRound className="size-7" />
            </div>

            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-xl font-black sm:text-2xl">
                  {report.employee.firstName}{" "}
                  {report.employee.lastName}
                </h2>

                {!report.employee.isActive ? (
                  <span className="rounded-full bg-amber-400/15 px-2.5 py-1 text-[10px] font-bold text-amber-200">
                    غیرفعال
                  </span>
                ) : null}
              </div>

              <p className="mt-1 text-xs text-slate-400">
                @{report.employee.username}
                {report.employee.phone
                  ? ` • ${report.employee.phone}`
                  : ""}
              </p>
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 sm:min-w-[230px]">
            <p className="text-[10px] font-semibold text-slate-400">
              بازه گزارش
            </p>

            <p className="mt-1 text-sm font-black text-white">
              {formatReportDate(report.from)}{" "}
              تا{" "}
              {formatReportDate(report.to)}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

function DailyReportRow({
  item,
}: {
  item: EmployeeReportResult["items"][number];
}) {
  const state =
    item.calculation.state;

  const hasLeave =
    Boolean(item.leaveType);

  const hasTemporaryExit =
    item.temporaryExits.length > 0;

  return (
    <div className="rounded-[24px] border border-slate-200 bg-white p-4 sm:p-5">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-black text-slate-900">
              {formatDate(item.workDate)}
            </span>

            <span
              className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${getStateClass(
                state,
              )}`}
            >
              {getStateLabel(state)}
            </span>

            {item.isManual ? (
              <span className="rounded-full bg-violet-50 px-2.5 py-1 text-[10px] font-bold text-violet-700">
                ثبت دستی
              </span>
            ) : null}

            {hasLeave ? (
              <span className="rounded-full bg-violet-50 px-2.5 py-1 text-[10px] font-bold text-violet-700">
                {getLeaveTypeLabel(
                  item.leaveType!,
                )}
              </span>
            ) : null}
          </div>

          <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            <InfoBox
              label="ورود"
              value={formatTime(
                item.checkIn,
              )}
            />

            <InfoBox
              label="خروج"
              value={formatTime(
                item.checkOut,
              )}
            />

            <InfoBox
              label="کارکرد"
              value={formatMinutes(
                item.calculation
                  .workedMinutes,
              )}
            />

            <InfoBox
              label="موظفی"
              value={formatMinutes(
                item.calculation
                  .scheduledMinutes,
              )}
            />
          </div>

          <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            <MetricBox
              label="تأخیر"
              value={formatMinutes(
                item.calculation
                  .lateMinutes,
              )}
              className="border-rose-100 bg-rose-50/70 text-rose-700"
            />

            <MetricBox
              label="تعجیل"
              value={formatMinutes(
                item.calculation
                  .earlyLeaveMinutes,
              )}
              className="border-amber-100 bg-amber-50/70 text-amber-700"
            />

            <MetricBox
              label="اضافه‌کار"
              value={formatMinutes(
                item.calculation
                  .overtimeMinutes,
              )}
              className="border-emerald-100 bg-emerald-50/70 text-emerald-700"
            />

            <MetricBox
              label="تراز"
              value={
                item.calculation
                  .balanceMinutes > 0
                  ? `+${formatMinutes(
                      item.calculation
                        .balanceMinutes,
                    )}`
                  : item.calculation
                        .balanceMinutes <
                      0
                    ? `-${formatMinutes(
                        Math.abs(
                          item.calculation
                            .balanceMinutes,
                        ),
                      )}`
                    : "۰ دقیقه"
              }
              className="border-slate-200 bg-slate-50 text-slate-700"
            />
          </div>

          {hasTemporaryExit ? (
            <div className="mt-4 rounded-[22px] border border-sky-100 bg-sky-50/60 p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-2">
                  <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-white text-sky-600 shadow-sm">
                    <ArrowRightLeft className="size-4" />
                  </div>

                  <div>
                    <p className="text-xs font-black text-slate-900">
                      خروج‌های این روز
                    </p>

                    <p className="mt-0.5 text-[10px] text-slate-400">
                      {item.temporaryExitCount.toLocaleString(
                        "fa-IR",
                      )}{" "}
                      مورد
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  <span className="rounded-full bg-white px-3 py-1.5 text-[10px] font-black text-sky-700 shadow-sm">
                    خروج:{" "}
                    {formatMinutes(
                      item.temporaryExitMinutes,
                    )}
                  </span>

                  {item.missionMinutes >
                  0 ? (
                    <span className="rounded-full bg-white px-3 py-1.5 text-[10px] font-black text-violet-700 shadow-sm">
                      مأموریت:{" "}
                      {formatMinutes(
                        item.missionMinutes,
                      )}
                    </span>
                  ) : null}
                </div>
              </div>

              <div className="mt-3 space-y-2">
                {item.temporaryExits.map(
                  (exit) => (
                    <div
                      key={exit.id}
                      className="rounded-2xl border border-slate-200 bg-white p-3"
                    >
                      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <span
                              className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-black ${
                                exit.type ===
                                "MISSION"
                                  ? "border-violet-200 bg-violet-50 text-violet-700"
                                  : "border-sky-200 bg-sky-50 text-sky-700"
                              }`}
                            >
                              {exit.type ===
                              "MISSION" ? (
                                <BriefcaseBusiness className="size-3.5" />
                              ) : (
                                <ArrowRightLeft className="size-3.5" />
                              )}

                              {getTemporaryExitTypeLabel(
                                exit.type,
                              )}
                            </span>

                            <span
                              className={`rounded-full px-2.5 py-1 text-[10px] font-black ${
                                exit.status ===
                                "OPEN"
                                  ? "bg-amber-100 text-amber-700"
                                  : "bg-emerald-100 text-emerald-700"
                              }`}
                            >
                              {exit.status ===
                              "OPEN"
                                ? "باز"
                                : "تکمیل شده"}
                            </span>
                          </div>

                          <div className="mt-3 grid gap-2 sm:grid-cols-3">
                            <InfoBox
                              label="شروع"
                              value={formatTime(
                                exit.startedAt,
                              )}
                            />

                            <InfoBox
                              label="پایان"
                              value={formatTime(
                                exit.endedAt,
                              )}
                            />

                            <InfoBox
                              label="مدت"
                              value={formatMinutes(
                                exit.durationMinutes,
                              )}
                            />
                          </div>

                          {exit.reason ? (
                            <p className="mt-3 rounded-xl bg-slate-50 px-3 py-2.5 text-xs leading-6 text-slate-600">
                              <span className="font-black text-slate-800">
                                دلیل:
                              </span>{" "}
                              {exit.reason}
                            </p>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  ),
                )}
              </div>
            </div>
          ) : null}

          {hasLeave &&
          item.leaveReason ? (
            <div className="mt-3 rounded-2xl border border-violet-100 bg-violet-50/50 px-4 py-3">
              <p className="text-[10px] font-bold text-violet-500">
                دلیل مرخصی
              </p>

              <p className="mt-1 text-xs leading-6 text-slate-600">
                {item.leaveReason}
              </p>
            </div>
          ) : null}

          {item.calculation.note ? (
            <div className="mt-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
              <p className="text-[10px] font-bold text-slate-400">
                یادداشت
              </p>

              <p className="mt-1 text-xs leading-6 text-slate-600">
                {item.calculation.note}
              </p>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function InfoBox({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="min-w-0 rounded-xl bg-slate-50 p-3">
      <p className="text-[10px] text-slate-400">
        {label}
      </p>

      <p className="mt-1 truncate text-sm font-black text-slate-800">
        {value}
      </p>
    </div>
  );
}

function MetricBox({
  label,
  value,
  className,
}: {
  label: string;
  value: string;
  className: string;
}) {
  return (
    <div
      className={`rounded-xl border px-3 py-2.5 ${className}`}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-[10px] font-semibold opacity-70">
          {label}
        </span>

        <span className="text-xs font-black">
          {value}
        </span>
      </div>
    </div>
  );
}

export default async function AdminReportsPage({
  searchParams,
}: {
  searchParams: Promise<{
    employee?: string;
    from?: string;
    to?: string;
  }>;
}) {
  const user =
    await requireAdmin();

  const params =
    await searchParams;

  const defaults =
    getDefaultReportRange();

  const employeeId =
    typeof params.employee ===
    "string"
      ? params.employee.trim()
      : "";

  const from =
    typeof params.from ===
      "string" &&
    params.from.trim()
      ? params.from.trim()
      : defaults.from;

  const to =
    typeof params.to ===
      "string" &&
    params.to.trim()
      ? params.to.trim()
      : defaults.to;

  const employees =
    await prisma.user.findMany({
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
      },
    });

  const report =
    employeeId
      ? await getEmployeeReport({
          employeeId,
          from,
          to,
        })
      : null;

  const excelUrl =
    employeeId
      ? `/api/admin/reports/excel?employee=${encodeURIComponent(
          employeeId,
        )}&from=${encodeURIComponent(
          from,
        )}&to=${encodeURIComponent(
          to,
        )}`
      : null;

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
            <div className="mb-3 flex items-center gap-2 text-xs text-slate-400">
              <span>
                مدیریت
              </span>

              <ArrowLeft className="size-3.5" />

              <span className="font-semibold text-slate-600">
                گزارش‌ها
              </span>
            </div>

            <h1 className="text-2xl font-black tracking-tight text-slate-950 sm:text-3xl">
              گزارش حضور و غیاب
            </h1>

            <p className="mt-2 max-w-2xl text-sm leading-7 text-slate-500">
              گزارش دقیق حضور، کارکرد، تأخیر، اضافه‌کار، مرخصی و خروج‌های موقت هر کارمند را بررسی کنید.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            {excelUrl ? (
              <a
                href={excelUrl}
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
                  sm:h-12
                  sm:text-sm
                "
              >
                <Download className="size-4" />
                دریافت Excel
              </a>
            ) : null}
          </div>
        </header>

        <div className="grid min-w-0 gap-5 xl:grid-cols-[330px_minmax(0,1fr)]">
          <aside className="min-w-0 h-fit rounded-[28px] border border-slate-200/80 bg-white p-4 shadow-[0_10px_35px_rgba(15,23,42,0.045)] sm:p-5 xl:sticky xl:top-5">
            <div className="mb-5">
              <div className="flex items-center gap-3">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-slate-950 text-white">
                  <CalendarDays className="size-5" />
                </div>

                <div>
                  <h2 className="text-sm font-black text-slate-900">
                    فیلتر گزارش
                  </h2>

                  <p className="mt-1 text-[11px] text-slate-400">
                    کارمند و بازه زمانی را انتخاب کنید.
                  </p>
                </div>
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
          </aside>

          <main className="min-w-0 space-y-5">
            {!report ? (
              <EmptyReportState />
            ) : report.error ? (
              <ReportErrorState
                error={report.error}
              />
            ) : (
              <>
                <EmployeeHeader
                  report={report}
                />

                <section className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
                  <StatCard
                    icon={
                      <UserCheck className="size-5" />
                    }
                    label="روزهای حضور"
                    value={report.attendanceDays.toLocaleString(
                      "fa-IR",
                    )}
                    description="روز دارای حضور"
                    className="bg-emerald-50 text-emerald-700"
                  />

                  <StatCard
                    icon={
                      <CheckCircle2 className="size-5" />
                    }
                    label="تکمیل‌شده"
                    value={report.completedDays.toLocaleString(
                      "fa-IR",
                    )}
                    description="ورود و خروج کامل"
                    className="bg-blue-50 text-blue-700"
                  />

                  <StatCard
                    icon={
                      <TriangleAlert className="size-5" />
                    }
                    label="ناقص"
                    value={report.incompleteDays.toLocaleString(
                      "fa-IR",
                    )}
                    description="ورود بدون خروج"
                    className="bg-amber-50 text-amber-700"
                  />

                  <StatCard
                    icon={
                      <XCircle className="size-5" />
                    }
                    label="غیبت"
                    value={report.absentDays.toLocaleString(
                      "fa-IR",
                    )}
                    description="روز غیبت"
                    className="bg-rose-50 text-rose-700"
                  />

                  <StatCard
                    icon={
                      <CalendarDays className="size-5" />
                    }
                    label="مرخصی"
                    value={report.leaveDays.toLocaleString(
                      "fa-IR",
                    )}
                    description="روز مرخصی تأییدشده"
                    className="bg-violet-50 text-violet-700"
                  />

                  <StatCard
                    icon={
                      <Clock3 className="size-5" />
                    }
                    label="مجموع کارکرد"
                    value={formatMinutes(
                      report.totalWorkedMinutes,
                    )}
                    description="زمان ثبت‌شده"
                    className="bg-slate-100 text-slate-700"
                  />

                  <StatCard
                    icon={
                      <TriangleAlert className="size-5" />
                    }
                    label="مجموع تأخیر"
                    value={formatMinutes(
                      report.totalLateMinutes,
                    )}
                    description="تأخیر ورود"
                    className="bg-rose-50 text-rose-700"
                  />

                  <StatCard
                    icon={
                      <PenLine className="size-5" />
                    }
                    label="مجموع اضافه‌کار"
                    value={formatMinutes(
                      report.totalOvertimeMinutes,
                    )}
                    description="اضافه‌کار ثبت‌شده"
                    className="bg-emerald-50 text-emerald-700"
                  />

                  <StatCard
                    icon={
                      <MinusCircle className="size-5" />
                    }
                    label="مجموع تعجیل"
                    value={formatMinutes(
                      report.totalEarlyLeaveMinutes,
                    )}
                    description="خروج زودتر از موعد"
                    className="bg-amber-50 text-amber-700"
                  />

                  <StatCard
                    icon={
                      <ArrowRightLeft className="size-5" />
                    }
                    label="مجموع خروج موقت"
                    value={formatMinutes(
                      report.totalTemporaryExitMinutes,
                    )}
                    description="کل زمان خروج"
                    className="bg-sky-50 text-sky-700"
                  />

                  <StatCard
                    icon={
                      <BriefcaseBusiness className="size-5" />
                    }
                    label="مجموع مأموریت"
                    value={formatMinutes(
                      report.totalMissionMinutes,
                    )}
                    description="کل زمان مأموریت"
                    className="bg-violet-50 text-violet-700"
                  />

                  <StatCard
                    icon={
                      <Clock3 className="size-5" />
                    }
                    label="میانگین کارکرد"
                    value={formatMinutes(
                      report.averageWorkedMinutes,
                    )}
                    description="به ازای هر روز دارای کارکرد"
                    className="bg-blue-50 text-blue-700"
                  />
                </section>

                <section className="grid gap-4 lg:grid-cols-3">
                  <div className="rounded-[24px] border border-slate-200/80 bg-white p-5 shadow-sm">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-[11px] font-bold text-slate-400">
                          اولین ورود
                        </p>

                        <p className="mt-2 text-lg font-black text-slate-900">
                          {formatTime(
                            report.firstCheckIn,
                          )}
                        </p>
                      </div>

                      <div className="flex size-10 items-center justify-center rounded-xl bg-slate-50 text-slate-600">
                        <LogInIcon />
                      </div>
                    </div>
                  </div>

                  <div className="rounded-[24px] border border-slate-200/80 bg-white p-5 shadow-sm">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-[11px] font-bold text-slate-400">
                          آخرین خروج
                        </p>

                        <p className="mt-2 text-lg font-black text-slate-900">
                          {formatTime(
                            report.lastCheckOut,
                          )}
                        </p>
                      </div>

                      <div className="flex size-10 items-center justify-center rounded-xl bg-slate-50 text-slate-600">
                        <Clock3 className="size-5" />
                      </div>
                    </div>
                  </div>

                  <div className="rounded-[24px] border border-slate-200/80 bg-white p-5 shadow-sm">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-[11px] font-bold text-slate-400">
                          تراز کلی
                        </p>

                        <p
                          className={`mt-2 text-lg font-black ${
                            report.totalBalanceMinutes >
                            0
                              ? "text-emerald-700"
                              : report.totalBalanceMinutes <
                                  0
                                ? "text-rose-700"
                                : "text-slate-900"
                          }`}
                        >
                          {report.totalBalanceMinutes >
                          0
                            ? `+${formatMinutes(
                                report.totalBalanceMinutes,
                              )}`
                            : report.totalBalanceMinutes <
                                0
                              ? `-${formatMinutes(
                                  Math.abs(
                                    report.totalBalanceMinutes,
                                  ),
                                )}`
                              : "۰ دقیقه"}
                        </p>
                      </div>

                      <div className="flex size-10 items-center justify-center rounded-xl bg-slate-50 text-slate-600">
                        <ArrowRightLeft className="size-5" />
                      </div>
                    </div>
                  </div>
                </section>

                <section className="overflow-hidden rounded-[28px] border border-slate-200/80 bg-white shadow-[0_10px_35px_rgba(15,23,42,0.045)]">
                  <div className="border-b border-slate-100 px-5 py-5 sm:px-6">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <h2 className="text-base font-black text-slate-950">
                          جزئیات روزانه
                        </h2>

                        <p className="mt-1 text-xs leading-5 text-slate-400">
                          تمام روزهای بازه انتخاب‌شده، شامل حضور، مرخصی و خروج‌های موقت.
                        </p>
                      </div>

                      <span className="w-fit rounded-full bg-slate-100 px-3 py-1.5 text-[10px] font-black text-slate-600">
                        {report.items.length.toLocaleString(
                          "fa-IR",
                        )}{" "}
                        روز
                      </span>
                    </div>
                  </div>

                  <div className="space-y-3 p-4 sm:p-5">
                    {report.items.map(
                      (item) => (
                        <DailyReportRow
                          key={item.id}
                          item={item}
                        />
                      ),
                    )}
                  </div>
                </section>
              </>
            )}
          </main>
        </div>
      </div>
    </AdminShell>
  );
}

function LogInIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="size-5"
      aria-hidden="true"
    >
      <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
      <path d="m10 17 5-5-5-5" />
      <path d="M15 12H3" />
    </svg>
  );
}