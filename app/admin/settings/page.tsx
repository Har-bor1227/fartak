import {
    CalendarDays,
    Clock3,
    Settings2,
  } from "lucide-react";
  
  import AdminShell from "@/components/admin/admin-shell";
  
  import { requireAdmin } from "@/lib/auth/current-user";
  
  import {
    formatDate,
  } from "@/lib/date/tehran";
  
  import {
    holidayDateKey,
    minutesToTime,
  } from "@/lib/admin/settings-utils";
  
  import { prisma } from "@/lib/prisma";
  
  import WorkScheduleForm from "./work-schedule-form";
  import HolidayForm from "./holiday-form";
  import HolidayActions from "./holiday-actions";
  
  export default async function SettingsPage() {
    const admin =
      await requireAdmin();
  
    const [
      settings,
      holidays,
    ] = await Promise.all([
      prisma.companySettings.upsert({
        where: {
          id: "company",
        },
  
        update: {},
  
        create: {
          id: "company",
        },
      }),
  
      prisma.holiday.findMany({
        orderBy: {
          date: "asc",
        },
      }),
    ]);
  
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
          className="mx-auto max-w-[1200px] px-4 py-4 sm:px-6 sm:py-6 xl:px-8"
        >
          <header className="mb-6">
            <div className="mb-3 inline-flex h-7 items-center gap-1.5 rounded-full bg-slate-100 px-3 text-[11px] font-semibold text-slate-600">
              <Settings2
                size={13}
              />
              تنظیمات سیستم
            </div>
  
            <h1 className="text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">
              تنظیمات
            </h1>
  
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
              برنامه کاری شرکت و تعطیلات را مدیریت کنید.
            </p>
          </header>
  
          <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_380px]">
            {/* Work schedule */}
            <section className="rounded-[26px] border border-slate-200/80 bg-white p-5 shadow-[0_10px_35px_rgba(15,23,42,0.04)] sm:p-6">
              <div className="flex items-start gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-slate-950 text-white">
                  <Clock3
                    size={19}
                  />
                </div>
  
                <div>
                  <h2 className="text-base font-bold text-slate-950">
                    برنامه کاری
                  </h2>
  
                  <p className="mt-1 text-xs leading-5 text-slate-400">
                    ساعات کاری و روزهای فعال شرکت را مشخص کنید.
                  </p>
                </div>
              </div>
  
              <div className="mt-6 rounded-[22px] bg-slate-50 p-4">
                <div className="grid grid-cols-2 gap-3">
                  <SummaryItem
                    label="شروع فعلی"
                    value={minutesToTime(
                      settings.workStartMinutes,
                    )}
                  />
  
                  <SummaryItem
                    label="پایان فعلی"
                    value={minutesToTime(
                      settings.workEndMinutes,
                    )}
                  />
                </div>
              </div>
  
              <div className="mt-5">
                <WorkScheduleForm
                  workStart={minutesToTime(
                    settings.workStartMinutes,
                  )}
                  workEnd={minutesToTime(
                    settings.workEndMinutes,
                  )}
                  saturday={
                    settings.saturday
                  }
                  sunday={
                    settings.sunday
                  }
                  monday={
                    settings.monday
                  }
                  tuesday={
                    settings.tuesday
                  }
                  wednesday={
                    settings.wednesday
                  }
                  thursday={
                    settings.thursday
                  }
                  friday={
                    settings.friday
                  }
                />
              </div>
            </section>
  
            {/* Holiday form */}
            <section className="h-fit rounded-[26px] border border-slate-200/80 bg-white p-5 shadow-[0_10px_35px_rgba(15,23,42,0.04)] sm:p-6 xl:sticky xl:top-6">
              <div className="flex items-start gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-blue-700">
                  <CalendarDays
                    size={19}
                  />
                </div>
  
                <div>
                  <h2 className="text-base font-bold text-slate-950">
                    افزودن تعطیلی
                  </h2>
  
                  <p className="mt-1 text-xs leading-5 text-slate-400">
                    یک روز را به‌عنوان تعطیلی شرکت ثبت کنید.
                  </p>
                </div>
              </div>
  
              <HolidayForm />
  
              <div className="mt-5 rounded-2xl bg-slate-50 p-4">
                <p className="text-[11px] leading-6 text-slate-500">
                  تاریخ‌ها در رابط کاربری به‌صورت شمسی نمایش داده می‌شوند و مقدار استاندارد میلادی در دیتابیس ذخیره می‌شود.
                </p>
              </div>
            </section>
          </div>
  
          {/* Holidays */}
          <section className="mt-4 overflow-hidden rounded-[26px] border border-slate-200/80 bg-white shadow-[0_10px_35px_rgba(15,23,42,0.04)]">
            <div className="flex flex-col gap-3 border-b border-slate-100 px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-6">
              <div>
                <h2 className="text-base font-bold text-slate-950">
                  تعطیلات ثبت‌شده
                </h2>
  
                <p className="mt-1 text-xs text-slate-400">
                  {holidays.length} تعطیلی ثبت شده است.
                </p>
              </div>
  
              <div className="flex h-9 items-center rounded-xl bg-slate-50 px-3 text-[11px] font-semibold text-slate-500">
                تقویم شرکت
              </div>
            </div>
  
            {holidays.length === 0 ? (
              <div className="flex min-h-[280px] flex-col items-center justify-center px-6 text-center">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-50 text-slate-300">
                  <CalendarDays
                    size={24}
                  />
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
                      key={
                        holiday.id
                      }
                      className="flex items-center gap-3 px-5 py-4 sm:px-6"
                    >
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-blue-700">
                        <CalendarDays
                          size={18}
                        />
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
                            {
                              holiday.description
                            }
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
      <div className="rounded-2xl bg-white p-3">
        <p className="text-[10px] text-slate-400">
          {label}
        </p>
  
        <p className="mt-1 text-lg font-bold text-slate-950">
          {value}
        </p>
      </div>
    );
  }