import {
  CalendarDays,
  CheckCircle2,
  Clock3,
  FileText,
  UserRound,
  XCircle,
} from "lucide-react";

import AdminShell from "@/components/admin/admin-shell";

import {
  requireAdmin,
} from "@/lib/auth/current-user";

import {
  formatDate,
} from "@/lib/date/tehran";

import {
  prisma,
} from "@/lib/prisma";

import LeaveReviewForm from "./review-form";

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

export default async function AdminLeavePage() {
  const admin =
    await requireAdmin();

  const requests =
    await prisma.leave.findMany({
      orderBy: [
        {
          status: "asc",
        },
        {
          createdAt: "desc",
        },
      ],

      take: 100,

      select: {
        id: true,
        type: true,
        status: true,
        startDate: true,
        endDate: true,
        reason: true,
        reviewNote: true,
        reviewedAt: true,

        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            username: true,
            phone: true,
            isActive: true,
          },
        },

        reviewer: {
          select: {
            firstName: true,
            lastName: true,
          },
        },
      },
    });

  const pendingCount =
    requests.filter(
      (item) =>
        item.status ===
        "PENDING",
    ).length;

  const approvedCount =
    requests.filter(
      (item) =>
        item.status ===
        "APPROVED",
    ).length;

  const rejectedCount =
    requests.filter(
      (item) =>
        item.status ===
        "REJECTED",
    ).length;

  return (
    <AdminShell
      firstName={
        admin.firstName
      }
      lastName={
        admin.lastName
      }
    >
      <section>
        <p className="text-sm font-medium text-slate-400">
          مدیریت درخواست‌ها
        </p>

        <h1 className="mt-2 text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">
          درخواست‌های مرخصی
        </h1>

        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
          درخواست‌های کارکنان را بررسی و وضعیت آن‌ها را نهایی کنید.
        </p>
      </section>

      <section className="mt-5 grid grid-cols-3 gap-2 sm:gap-3">
        <SummaryCard
          title="در انتظار بررسی"
          value={pendingCount}
          className="text-amber-600"
        />

        <SummaryCard
          title="تأیید شده"
          value={approvedCount}
          className="text-emerald-600"
        />

        <SummaryCard
          title="رد شده"
          value={rejectedCount}
          className="text-rose-600"
        />
      </section>

      <section className="mt-5 overflow-hidden rounded-[28px] border border-slate-200/80 bg-white shadow-[0_10px_35px_rgba(15,23,42,0.04)]">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-5 sm:px-6">
          <div>
            <h2 className="text-base font-bold text-slate-950">
              لیست درخواست‌ها
            </h2>

            <p className="mt-1 text-xs text-slate-400">
              {requests.length.toLocaleString(
                "fa-IR",
              )}{" "}
              درخواست
            </p>
          </div>

          <FileText
            size={19}
            className="text-slate-300"
          />
        </div>

        {requests.length === 0 ? (
          <div className="px-6 py-16 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-50 text-slate-300">
              <CalendarDays
                size={24}
              />
            </div>

            <p className="mt-4 text-sm font-semibold text-slate-700">
              هنوز درخواست مرخصی‌ای ثبت نشده است
            </p>

            <p className="mt-2 text-xs text-slate-400">
              با ثبت اولین درخواست توسط کارمندان، اینجا نمایش داده می‌شود.
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
                    className="p-5 sm:p-6"
                  >
                    <div className="flex items-start gap-3 sm:gap-4">
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-slate-50 text-slate-500">
                        <StatusIcon
                          size={19}
                        />
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-sm font-bold text-slate-950">
                            {request.user.firstName}{" "}
                            {request.user.lastName}
                          </h3>

                          <span
                            className={`
                              inline-flex
                              items-center
                              rounded-full
                              px-2.5
                              py-1
                              text-[9px]
                              font-semibold
                              ${getStatusClass(
                                request.status,
                              )}
                            `}
                          >
                            {getStatusLabel(
                              request.status,
                            )}
                          </span>
                        </div>

                        <p className="mt-1 text-[10px] text-slate-400">
                          @{request.user.username}
                          {request.user.phone
                            ? ` • ${request.user.phone}`
                            : ""}
                        </p>

                        <div className="mt-4 grid gap-3 sm:grid-cols-3">
                          <InfoItem
                            label="نوع مرخصی"
                            value={getLeaveTypeLabel(
                              request.type,
                            )}
                          />

                          <InfoItem
                            label="بازه"
                            value={`${formatDate(
                              request.startDate,
                            )} تا ${formatDate(
                              request.endDate,
                            )}`}
                          />

                          <InfoItem
                            label="مدت"
                            value={`${dayCount.toLocaleString(
                              "fa-IR",
                            )} روز`}
                          />
                        </div>

                        {request.reason ? (
                          <div className="mt-4 rounded-2xl bg-slate-50 px-4 py-3">
                            <p className="text-[10px] font-semibold text-slate-400">
                              توضیحات کارمند
                            </p>

                            <p className="mt-1 text-xs leading-6 text-slate-600">
                              {request.reason}
                            </p>
                          </div>
                        ) : null}

                        {request.status ===
                        "PENDING" ? (
                          <LeaveReviewForm
                            leaveId={
                              request.id
                            }
                          />
                        ) : (
                          <div className="mt-4 rounded-2xl border border-slate-100 bg-slate-50/70 px-4 py-3">
                            <div className="flex items-start gap-3">
                              <UserRound
                                size={16}
                                className="mt-0.5 shrink-0 text-slate-400"
                              />

                              <div className="min-w-0">
                                <p className="text-[10px] font-semibold text-slate-400">
                                  بررسی توسط
                                </p>

                                <p className="mt-1 text-xs font-semibold text-slate-700">
                                  {request.reviewer
                                    ? `${request.reviewer.firstName} ${request.reviewer.lastName}`
                                    : "مدیر"}
                                </p>

                                {request.reviewedAt ? (
                                  <p className="mt-1 text-[10px] text-slate-400">
                                    {formatDate(
                                      request.reviewedAt,
                                    )}
                                  </p>
                                ) : null}

                                {request.reviewNote ? (
                                  <p className="mt-2 text-xs leading-6 text-slate-600">
                                    {
                                      request.reviewNote
                                    }
                                  </p>
                                ) : null}
                              </div>
                            </div>
                          </div>
                        )}
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
        بررسی درخواست‌ها با ثبت مدیر و زمان بررسی در سیستم ذخیره می‌شود.
      </p>
    </AdminShell>
  );
}

function SummaryCard({
  title,
  value,
  className,
}: {
  title: string;
  value: number;
  className: string;
}) {
  return (
    <div className="rounded-[22px] border border-slate-200/80 bg-white p-4 shadow-[0_8px_30px_rgba(15,23,42,0.03)]">
      <p className="text-[10px] font-medium text-slate-400 sm:text-xs">
        {title}
      </p>

      <p
        className={`mt-2 text-xl font-bold sm:text-2xl ${className}`}
      >
        {value.toLocaleString(
          "fa-IR",
        )}
      </p>
    </div>
  );
}

function InfoItem({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-100 bg-white p-3">
      <p className="text-[10px] font-medium text-slate-400">
        {label}
      </p>

      <p className="mt-1.5 break-words text-xs font-semibold leading-5 text-slate-700">
        {value}
      </p>
    </div>
  );
}