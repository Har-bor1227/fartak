import {
  CalendarDays,
  CheckCircle2,
  Clock3,
  UserRound,
} from "lucide-react";

import AdminShell from "@/components/admin/admin-shell";
import { requireAdmin } from "@/lib/auth/current-user";
import {
  getDateKey,
} from "@/lib/date/tehran";
import { prisma } from "@/lib/prisma";

import EmployeeShiftActions from "./employee-shift-actions";
import EmployeeShiftForm from "./employee-shift-form";

function formatShiftTime(minutes: number) {
  const safeMinutes = Math.max(
    0,
    Math.min(1439, Math.floor(minutes)),
  );

  const hours = Math.floor(
    safeMinutes / 60,
  );

  const minute =
    safeMinutes % 60;

  return `${String(hours).padStart(
    2,
    "0",
  )}:${String(minute).padStart(2, "0")}`;
}

function formatRangeEnd(
  date: Date | null,
) {
  if (!date) {
    return "بدون تاریخ پایان";
  }

  return getDateKey(date);
}

export default async function EmployeeShiftsPage() {
  const admin = await requireAdmin();

  const [
    employees,
    shifts,
    assignments,
  ] = await Promise.all([
    prisma.user.findMany({
      where: {
        role: "EMPLOYEE",
        isActive: true,
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        username: true,
      },
      orderBy: [
        {
          firstName: "asc",
        },
        {
          lastName: "asc",
        },
      ],
    }),

    prisma.shift.findMany({
      where: {
        isActive: true,
      },
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
      orderBy: {
        name: "asc",
      },
    }),

    prisma.employeeShift.findMany({
      orderBy: [
        {
          startsAt: "desc",
        },
        {
          createdAt: "desc",
        },
      ],
      select: {
        id: true,
        userId: true,
        shiftId: true,
        startsAt: true,
        endsAt: true,

        user: {
          select: {
            firstName: true,
            lastName: true,
            username: true,
          },
        },

        shift: {
          select: {
            name: true,
            startMinutes: true,
            endMinutes: true,
          },
        },
      },
    }),
  ]);

  return (
    <AdminShell
      firstName={admin.firstName}
      lastName={admin.lastName}
    >
      <div
        dir="rtl"
        className="mx-auto max-w-[1200px] px-4 py-4 sm:px-6 sm:py-6 xl:px-8"
      >
        <header className="mb-6">
          <div className="mb-3 inline-flex h-7 items-center gap-1.5 rounded-full bg-blue-50 px-3 text-[11px] font-semibold text-blue-700">
            <CalendarDays size={13} />
            برنامه کاری کارکنان
          </div>

          <h1 className="text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">
            اختصاص شیفت به کارکنان
          </h1>

          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
            برای هر کارمند، شیفت و بازه زمانی مشخص
            تعریف کنید. بازه‌های هم‌پوشان اجازه ثبت
            ندارند.
          </p>
        </header>

        <div className="grid gap-4 xl:grid-cols-[370px_minmax(0,1fr)]">
          <aside className="h-fit rounded-[26px] border border-slate-200/80 bg-white p-5 shadow-[0_8px_30px_rgba(15,23,42,0.04)] sm:p-6 xl:sticky xl:top-6">
            <div className="flex items-start gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-slate-950 text-white">
                <Clock3 size={20} />
              </div>

              <div>
                <h2 className="text-base font-bold text-slate-950">
                  انتساب جدید
                </h2>

                <p className="mt-1 text-xs leading-5 text-slate-400">
                  شیفت موردنظر را برای یک کارمند
                  فعال مشخص کنید.
                </p>
              </div>
            </div>

            <EmployeeShiftForm
              employees={employees}
              shifts={shifts}
            />

            <div className="mt-5 rounded-2xl bg-slate-50 p-4">
              <div className="flex items-start gap-3">
                <CheckCircle2
                  size={17}
                  className="mt-0.5 shrink-0 text-emerald-600"
                />

                <p className="text-[11px] leading-6 text-slate-500">
                  شیفت اختصاصی کارمند فقط در بازه
                  تعیین‌شده معتبر است. خارج از آن، در
                  مرحله بعد برنامه پیش‌فرض شرکت استفاده
                  خواهد شد.
                </p>
              </div>
            </div>
          </aside>

          <section className="min-w-0 overflow-hidden rounded-[26px] border border-slate-200/80 bg-white shadow-[0_8px_30px_rgba(15,23,42,0.04)]">
            <div className="border-b border-slate-100 px-5 py-4 sm:px-6">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-base font-bold text-slate-950">
                    انتساب‌های ثبت‌شده
                  </h2>

                  <p className="mt-1 text-xs text-slate-400">
                    {assignments.length} انتساب
                  </p>
                </div>

                <UserRound
                  size={19}
                  className="text-slate-300"
                />
              </div>
            </div>

            {assignments.length === 0 ? (
              <div className="flex min-h-[320px] flex-col items-center justify-center px-6 text-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-50 text-slate-300">
                  <CalendarDays size={27} />
                </div>

                <h3 className="mt-5 text-base font-bold text-slate-900">
                  هنوز شیفتی به کارمندان اختصاص داده نشده
                </h3>

                <p className="mt-2 max-w-sm text-xs leading-6 text-slate-400">
                  از فرم سمت راست اولین انتساب را ثبت
                  کنید.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {assignments.map(
                  (assignment) => (
                    <article
                      key={assignment.id}
                      className="p-5 sm:p-6"
                    >
                      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                        <div className="min-w-0">
                          <div className="flex items-start gap-3">
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-50 text-slate-500">
                              <UserRound size={18} />
                            </div>

                            <div className="min-w-0">
                              <h3 className="truncate text-sm font-bold text-slate-950">
                                {
                                  assignment.user
                                    .firstName
                                }{" "}
                                {
                                  assignment.user
                                    .lastName
                                }
                              </h3>

                              <p className="mt-1 truncate text-[11px] text-slate-400">
                                @
                                {
                                  assignment.user
                                    .username
                                }
                              </p>
                            </div>
                          </div>

                          <div className="mt-4 flex flex-wrap gap-2">
                            <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-3 py-1.5 text-[11px] font-semibold text-blue-700">
                              <Clock3
                                size={12}
                              />

                              {
                                assignment
                                  .shift
                                  .name
                              }

                              <span className="font-normal text-blue-500">
                                •
                                {" "}
                                {formatShiftTime(
                                  assignment
                                    .shift
                                    .startMinutes,
                                )}
                                {" "}
                                تا
                                {" "}
                                {formatShiftTime(
                                  assignment
                                    .shift
                                    .endMinutes,
                                )}
                              </span>
                            </span>

                            <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-50 px-3 py-1.5 text-[11px] font-medium text-slate-600">
                              <CalendarDays
                                size={12}
                              />
                              شروع:
                              {" "}
                              {getDateKey(
                                assignment.startsAt,
                              )}
                            </span>

                            <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-50 px-3 py-1.5 text-[11px] font-medium text-slate-600">
                              پایان:
                              {" "}
                              {formatRangeEnd(
                                assignment.endsAt,
                              )}
                            </span>
                          </div>
                        </div>

                        <EmployeeShiftActions
                          employeeShiftId={
                            assignment.id
                          }
                          endedAt={
                            assignment.endsAt
                          }
                        />
                      </div>
                    </article>
                  ),
                )}
              </div>
            )}
          </section>
        </div>
      </div>
    </AdminShell>
  );
}