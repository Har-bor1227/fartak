import {
  CalendarDays,
  CheckCircle2,
  Clock3,
  FileText,
  XCircle,
} from "lucide-react";

import EmployeeShell from "../employee-shell";
import LeaveForm from "./leave-form";

import {
  requireEmployee,
} from "@/lib/auth/current-user";

import {
  formatDate,
} from "@/lib/date/tehran";

import {
  prisma,
} from "@/lib/prisma";

function getLeaveTypeLabel(
  type: string,
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
      return "نامشخص";
  }
}

function getStatusLabel(
  status: string,
): string {
  switch (status) {
    case "PENDING":
      return "در انتظار بررسی";

    case "APPROVED":
      return "تأیید شده";

    case "REJECTED":
      return "رد شده";

    case "CANCELLED":
      return "لغو شده";

    default:
      return "نامشخص";
  }
}

function getStatusClass(
  status: string,
): string {
  switch (status) {
    case "PENDING":
      return "bg-amber-50 text-amber-700";

    case "APPROVED":
      return "bg-emerald-50 text-emerald-700";

    case "REJECTED":
      return "bg-rose-50 text-rose-700";

    case "CANCELLED":
      return "bg-slate-100 text-slate-600";

    default:
      return "bg-slate-100 text-slate-500";
  }
}

function getStatusIcon(
  status: string,
) {
  switch (status) {
    case "APPROVED":
      return CheckCircle2;

    case "REJECTED":
      return XCircle;

    case "PENDING":
      return Clock3;

    default:
      return CalendarDays;
  }
}

function getDayCount(
  startDate: Date,
  endDate: Date,
): number {
  const difference =
    endDate.getTime() -
    startDate.getTime();

  return (
    Math.max(
      0,
      Math.round(
        difference / 86400000,
      ),
    ) + 1
  );
}

export default async function EmployeeLeavePage() {
  const user =
    await requireEmployee();

  const requests =
    await prisma.leave.findMany({
      where: {
        userId: user.id,
      },
      orderBy: {
        createdAt: "desc",
      },
      take: 20,
      select: {
        id: true,
        type: true,
        status: true,
        startDate: true,
        endDate: true,
        reason: true,
        reviewNote: true,
        createdAt: true,
      },
    });

  return (
    <EmployeeShell
      firstName={
        user.firstName
      }
      lastName={
        user.lastName
      }
    >
      <section>
        <p className="text-sm font-medium text-slate-400">
          درخواست‌های پرسنلی
        </p>

        <h1 className="mt-2 text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">
          مرخصی
        </h1>

        <p className="mt-2 max-w-xl text-sm leading-6 text-slate-500">
          درخواست مرخصی خود را ثبت کنید و وضعیت بررسی آن را پیگیری کنید.
        </p>
      </section>

      <section className="mt-5 overflow-hidden rounded-[30px] border border-slate-200/80 bg-white shadow-[0_15px_50px_rgba(15,23,42,0.06)]">
        <div className="border-b border-slate-100 px-5 py-5 sm:px-7 sm:py-6">
          <div className="flex items-start gap-4">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-slate-950 text-white">
              <CalendarDays
                size={20}
              />
            </div>

            <div>
              <h2 className="text-base font-bold text-slate-950">
                ثبت درخواست جدید
              </h2>

              <p className="mt-1 text-xs leading-5 text-slate-400">
                بازه موردنظر و نوع مرخصی را انتخاب کنید.
              </p>
            </div>
          </div>
        </div>

        <div className="p-5 sm:p-7">
          <LeaveForm />
        </div>
      </section>

      <section className="mt-5 overflow-hidden rounded-[26px] border border-slate-200/80 bg-white shadow-[0_10px_35px_rgba(15,23,42,0.04)]">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-5">
          <div>
            <h2 className="text-base font-bold text-slate-950">
              درخواست‌های من
            </h2>

            <p className="mt-1 text-xs text-slate-400">
              آخرین ۲۰ درخواست مرخصی
            </p>
          </div>

          <FileText
            size={19}
            className="text-slate-300"
          />
        </div>

        {requests.length === 0 ? (
          <div className="px-5 py-14 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-50 text-slate-300">
              <CalendarDays
                size={24}
              />
            </div>

            <p className="mt-4 text-sm font-semibold text-slate-700">
              هنوز درخواستی ثبت نکرده‌اید
            </p>

            <p className="mt-2 text-xs text-slate-400">
              اولین درخواست مرخصی شما در این بخش نمایش داده می‌شود.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {requests.map(
              (request) => {
                const StatusIcon =
                  getStatusIcon(
                    request.status,
                  );

                const dayCount =
                  getDayCount(
                    request.startDate,
                    request.endDate,
                  );

                return (
                  <article
                    key={request.id}
                    className="px-5 py-5 sm:px-6"
                  >
                    <div className="flex items-start gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-slate-50 text-slate-500">
                        <StatusIcon
                          size={18}
                        />
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-sm font-bold text-slate-900">
                            مرخصی{" "}
                            {getLeaveTypeLabel(
                              request.type,
                            )}
                          </h3>

                          <span
                            className={`inline-flex items-center rounded-full px-2.5 py-1 text-[9px] font-semibold ${getStatusClass(
                              request.status,
                            )}`}
                          >
                            {getStatusLabel(
                              request.status,
                            )}
                          </span>
                        </div>

                        <div className="mt-3 grid gap-2 text-xs text-slate-500 sm:grid-cols-3">
                          <div>
                            شروع:{" "}
                            <span className="font-semibold text-slate-700">
                              {formatDate(
                                request.startDate,
                              )}
                            </span>
                          </div>

                          <div>
                            پایان:{" "}
                            <span className="font-semibold text-slate-700">
                              {formatDate(
                                request.endDate,
                              )}
                            </span>
                          </div>

                          <div>
                            مدت:{" "}
                            <span className="font-semibold text-slate-700">
                              {dayCount.toLocaleString(
                                "fa-IR",
                              )}{" "}
                              روز
                            </span>
                          </div>
                        </div>

                        {request.reason ? (
                          <div className="mt-3 rounded-2xl bg-slate-50 px-3.5 py-3">
                            <p className="text-[10px] font-semibold text-slate-400">
                              توضیحات
                            </p>

                            <p className="mt-1 text-xs leading-6 text-slate-600">
                              {
                                request.reason
                              }
                            </p>
                          </div>
                        ) : null}

                        {request.reviewNote ? (
                          <div className="mt-2 rounded-2xl bg-slate-50 px-3.5 py-3">
                            <p className="text-[10px] font-semibold text-slate-400">
                              توضیح بررسی
                            </p>

                            <p className="mt-1 text-xs leading-6 text-slate-600">
                              {
                                request.reviewNote
                              }
                            </p>
                          </div>
                        ) : null}
                      </div>
                    </div>
                  </article>
                );
              },
            )}
          </div>
        )}
      </section>

      <p className="mt-6 text-center text-[11px] text-slate-400">
        درخواست‌های مرخصی پس از بررسی مدیر نهایی می‌شوند.
      </p>
    </EmployeeShell>
  );
}