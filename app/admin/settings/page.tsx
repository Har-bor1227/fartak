import {
  CalendarDays,
  CheckCircle2,
  Clock3,
  Settings2,
} from "lucide-react";

import AdminShell from "@/components/admin/admin-shell";
import { requireAdmin } from "@/lib/auth/current-user";
import {
  holidayDateKey,
  minutesToTime,
} from "@/lib/admin/settings-utils";
import {
  getDefaultAttendanceSchedule,
} from "@/lib/attendance/schedule-resolver";
import { formatDate } from "@/lib/date/tehran";
import { prisma } from "@/lib/prisma";

import HolidayActions from "./holiday-actions";
import HolidayForm from "./holiday-form";
import ShiftActions from "./shift-actions";
import ShiftForm from "./shift-form";
import WorkScheduleForm from "./work-schedule-form";

const WEEKDAY_LABELS = {
  saturday: "شنبه",
  sunday: "یکشنبه",
  monday: "دوشنبه",
  tuesday: "سه‌شنبه",
  wednesday: "چهارشنبه",
  thursday: "پنجشنبه",
  friday: "جمعه",
} as const;

export default async function SettingsPage() {
  const admin =
    await requireAdmin();

  const [
    settings,
    holidays,
    shifts,
  ] =
    await Promise.all([
      prisma.companySettings.findUnique({
        where: {
          id: "company",
        },
      }),

      prisma.holiday.findMany({
        orderBy: {
          date: "asc",
        },
      }),

      prisma.shift.findMany({
        orderBy: [
          {
            isActive: "desc",
          },
          {
            startMinutes: "asc",
          },
          {
            name: "asc",
          },
        ],

        include: {
          _count: {
            select: {
              employeeShifts: true,
            },
          },
        },
      }),
    ]);

  const schedule =
    getDefaultAttendanceSchedule(
      settings,
    );

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
        className="
          mx-auto
          w-full
          max-w-[1200px]
          space-y-4
          px-4
          pb-24
          pt-4
          sm:space-y-5
          sm:px-6
          sm:pb-8
          sm:pt-6
          xl:px-8
        "
      >
        <header className="mb-5 sm:mb-6">
          <div className="mb-3 inline-flex h-8 items-center gap-2 rounded-full border border-slate-200 bg-white px-3 text-[11px] font-bold text-slate-600 shadow-sm">
            <Settings2 size={14} />
            تنظیمات سیستم
          </div>

          <h1 className="text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">
            تنظیمات
          </h1>

          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
            برنامه کاری شرکت، شیفت‌ها و تعطیلات را از این بخش مدیریت کنید.
          </p>
        </header>

        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_380px]">
          <section
            className="
              rounded-[26px]
              border
              border-slate-200/80
              bg-white
              p-5
              shadow-[0_10px_35px_rgba(15,23,42,0.045)]
              sm:p-6
            "
          >
            <div className="flex items-start gap-3">
              <div
                className="
                  flex h-11 w-11
                  shrink-0 items-center justify-center
                  rounded-2xl
                  bg-slate-950
                  text-white
                  shadow-[0_8px_20px_rgba(15,23,42,0.12)]
                "
              >
                <Clock3 size={19} />
              </div>

              <div className="min-w-0">
                <h2 className="text-base font-bold text-slate-950">
                  برنامه پیش‌فرض شرکت
                </h2>

                <p className="mt-1 text-xs leading-5 text-slate-400">
                  این برنامه به‌عنوان برنامه پایه شرکت باقی می‌ماند و برای کارکنانی که شیفت اختصاصی ندارند استفاده می‌شود.
                </p>
              </div>
            </div>

            <div className="mt-6 rounded-[22px] border border-slate-100 bg-slate-50 p-3.5 sm:p-4">
              <div className="grid grid-cols-2 gap-2.5">
                <SummaryItem
                  label="شروع فعلی"
                  value={minutesToTime(
                    schedule.workStartMinutes,
                  )}
                />

                <SummaryItem
                  label="پایان فعلی"
                  value={minutesToTime(
                    schedule.workEndMinutes,
                  )}
                />
              </div>
            </div>

            <div className="mt-5">
              <WorkScheduleForm
                workStart={minutesToTime(
                  schedule.workStartMinutes,
                )}
                workEnd={minutesToTime(
                  schedule.workEndMinutes,
                )}
                saturday={
                  schedule.saturday
                }
                sunday={
                  schedule.sunday
                }
                monday={
                  schedule.monday
                }
                tuesday={
                  schedule.tuesday
                }
                wednesday={
                  schedule.wednesday
                }
                thursday={
                  schedule.thursday
                }
                friday={
                  schedule.friday
                }
              />
            </div>
          </section>

          <section
            className="
              h-fit
              rounded-[26px]
              border
              border-slate-200/80
              bg-white
              p-5
              shadow-[0_10px_35px_rgba(15,23,42,0.045)]
              sm:p-6
              xl:sticky
              xl:top-6
            "
          >
            <div className="flex items-start gap-3">
              <div
                className="
                  flex h-11 w-11
                  shrink-0 items-center justify-center
                  rounded-2xl
                  bg-slate-50
                  text-slate-700
                "
              >
                <Clock3 size={19} />
              </div>

              <div className="min-w-0">
                <h2 className="text-base font-bold text-slate-950">
                  ساخت شیفت جدید
                </h2>

                <p className="mt-1 text-xs leading-5 text-slate-400">
                  برای کارکنان با برنامه متفاوت، یک شیفت اختصاصی تعریف کنید.
                </p>
              </div>
            </div>

            <div className="mt-5">
              <ShiftForm />
            </div>
          </section>
        </div>

        <section
          className="
            overflow-hidden
            rounded-[26px]
            border
            border-slate-200/80
            bg-white
            shadow-[0_10px_35px_rgba(15,23,42,0.045)]
          "
        >
          <div className="border-b border-slate-100 px-5 py-5 sm:px-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <div className="flex size-9 items-center justify-center rounded-xl bg-slate-950 text-white">
                    <Clock3 size={16} />
                  </div>

                  <h2 className="text-base font-bold text-slate-950">
                    شیفت‌های تعریف‌شده
                  </h2>
                </div>

                <p className="mt-1 text-xs text-slate-400">
                  {shifts.length.toLocaleString(
                    "fa-IR",
                  )}{" "}
                  شیفت تعریف شده است.
                </p>
              </div>

              <div className="inline-flex h-9 w-fit items-center rounded-xl bg-slate-50 px-3 text-[11px] font-semibold text-slate-500">
                مدیریت شیفت
              </div>
            </div>
          </div>

          {shifts.length === 0 ? (
            <div className="flex min-h-[260px] flex-col items-center justify-center px-6 py-12 text-center">
              <div
                className="
                  flex h-14 w-14
                  items-center justify-center
                  rounded-2xl
                  border border-slate-100
                  bg-slate-50
                  text-slate-300
                "
              >
                <Clock3 size={24} />
              </div>

              <h3 className="mt-4 text-sm font-bold text-slate-800">
                هنوز شیفتی تعریف نشده
              </h3>

              <p className="mt-2 max-w-sm text-xs leading-6 text-slate-400">
                از فرم بالا اولین شیفت سازمان را ایجاد کنید.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {shifts.map(
                (shift) => (
                  <div
                    key={shift.id}
                    className="px-5 py-5 sm:px-6"
                  >
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                      <div className="flex min-w-0 items-start gap-3">
                        <div
                          className={`
                            flex
                            h-11
                            w-11
                            shrink-0
                            items-center
                            justify-center
                            rounded-2xl
                            ${
                              shift.isActive
                                ? "bg-emerald-50 text-emerald-600"
                                : "bg-slate-100 text-slate-400"
                            }
                          `}
                        >
                          {shift.isActive ? (
                            <CheckCircle2 size={19} />
                          ) : (
                            <Clock3 size={19} />
                          )}
                        </div>

                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="truncate text-sm font-black text-slate-900">
                              {shift.name}
                            </h3>

                            <span
                              className={`
                                rounded-full
                                px-2.5
                                py-1
                                text-[10px]
                                font-bold
                                ${
                                  shift.isActive
                                    ? "bg-emerald-50 text-emerald-700"
                                    : "bg-slate-100 text-slate-500"
                                }
                              `}
                            >
                              {shift.isActive
                                ? "فعال"
                                : "غیرفعال"}
                            </span>
                          </div>

                          <p className="mt-1 text-xs font-semibold text-slate-500">
                            {minutesToTime(
                              shift.startMinutes,
                            )}{" "}
                            تا{" "}
                            {minutesToTime(
                              shift.endMinutes,
                            )}
                          </p>

                          <div className="mt-3 flex flex-wrap gap-1.5">
                            {shift.saturday ? (
                              <DayBadge>
                                {WEEKDAY_LABELS.saturday}
                              </DayBadge>
                            ) : null}

                            {shift.sunday ? (
                              <DayBadge>
                                {WEEKDAY_LABELS.sunday}
                              </DayBadge>
                            ) : null}

                            {shift.monday ? (
                              <DayBadge>
                                {WEEKDAY_LABELS.monday}
                              </DayBadge>
                            ) : null}

                            {shift.tuesday ? (
                              <DayBadge>
                                {WEEKDAY_LABELS.tuesday}
                              </DayBadge>
                            ) : null}

                            {shift.wednesday ? (
                              <DayBadge>
                                {WEEKDAY_LABELS.wednesday}
                              </DayBadge>
                            ) : null}

                            {shift.thursday ? (
                              <DayBadge>
                                {WEEKDAY_LABELS.thursday}
                              </DayBadge>
                            ) : null}

                            {shift.friday ? (
                              <DayBadge>
                                {WEEKDAY_LABELS.friday}
                              </DayBadge>
                            ) : null}
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                        <div className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3">
                          <p className="text-[10px] text-slate-400">
                            تخصیص به کارکنان
                          </p>

                          <p className="mt-1 text-sm font-black text-slate-800">
                            {shift._count.employeeShifts.toLocaleString(
                              "fa-IR",
                            )}{" "}
                            نفر
                          </p>
                        </div>

                        <ShiftActions
                          shiftId={
                            shift.id
                          }
                          isActive={
                            shift.isActive
                          }
                        />
                      </div>
                    </div>
                  </div>
                ),
              )}
            </div>
          )}
        </section>

        <section
          className="
            overflow-hidden
            rounded-[26px]
            border
            border-slate-200/80
            bg-white
            shadow-[0_10px_35px_rgba(15,23,42,0.045)]
          "
        >
          <div className="flex flex-col gap-3 border-b border-slate-100 px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-6">
            <div>
              <h2 className="text-base font-bold text-slate-950">
                تعطیلات ثبت‌شده
              </h2>

              <p className="mt-1 text-xs text-slate-400">
                {holidays.length.toLocaleString(
                  "fa-IR",
                )}{" "}
                تعطیلی ثبت شده است.
              </p>
            </div>

            <div className="inline-flex h-9 w-fit items-center rounded-xl bg-slate-50 px-3 text-[11px] font-semibold text-slate-500">
              تقویم شرکت
            </div>
          </div>

          {holidays.length === 0 ? (
            <div className="flex min-h-[280px] flex-col items-center justify-center px-6 py-12 text-center">
              <div
                className="
                  flex h-14 w-14
                  items-center justify-center
                  rounded-2xl
                  border border-slate-100
                  bg-slate-50
                  text-slate-300
                "
              >
                <CalendarDays size={24} />
              </div>

              <h3 className="mt-4 text-sm font-bold text-slate-800">
                هنوز تعطیلی ثبت نشده
              </h3>

              <p className="mt-2 max-w-sm text-xs leading-6 text-slate-400">
                تعطیلات شرکت را از فرم بالا اضافه کنید.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {holidays.map(
                (holiday) => (
                  <div
                    key={holiday.id}
                    className="
                      flex
                      items-start
                      gap-3
                      px-5
                      py-4
                      transition
                      hover:bg-slate-50/50
                      sm:items-center
                      sm:px-6
                    "
                  >
                    <div
                      className="
                        flex h-11 w-11
                        shrink-0
                        items-center
                        justify-center
                        rounded-2xl
                        bg-slate-50
                        text-slate-600
                      "
                    >
                      <CalendarDays size={18} />
                    </div>

                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-bold text-slate-900">
                        {holiday.title}
                      </p>

                      <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
                        <span className="text-xs font-semibold text-slate-600">
                          {formatDate(
                            holiday.date,
                          )}
                        </span>

                        <span className="text-[10px] text-slate-400">
                          {holidayDateKey(
                            holiday.date,
                          )}
                        </span>
                      </div>

                      {holiday.description ? (
                        <p className="mt-1 truncate text-[11px] text-slate-400">
                          {holiday.description}
                        </p>
                      ) : null}
                    </div>

                    <HolidayActions
                      holidayId={
                        holiday.id
                      }
                      title={
                        holiday.title
                      }
                    />
                  </div>
                ),
              )}
            </div>
          )}
        </section>
      </div>
    </AdminShell>
  );
}

function SummaryItem({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-100 bg-white p-3.5">
      <p className="text-[10px] font-medium text-slate-400">
        {label}
      </p>

      <p className="mt-1 text-lg font-bold text-slate-950">
        {value}
      </p>
    </div>
  );
}

function DayBadge({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[9px] font-bold text-slate-500">
      {children}
    </span>
  );
}