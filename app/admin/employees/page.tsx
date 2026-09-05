import {
    Search,
    ShieldCheck,
    UserPlus,
    Users,
  } from "lucide-react";
  
  import AdminShell from "@/components/admin/admin-shell";
  import { requireAdmin } from "@/lib/auth/current-user";
  import { prisma } from "@/lib/prisma";
  
  import CreateEmployeeForm from "./create-employee-form";
  import EmployeeActions from "./employee-actions";
  
  type EmployeesPageProps = {
    searchParams: Promise<{
      q?: string;
    }>;
  };
  
  function normalizeSearch(value: string) {
    return value
      .trim()
      .replace(/\s+/g, " ")
      .slice(0, 80);
  }
  
  export default async function EmployeesPage({
    searchParams,
  }: EmployeesPageProps) {
    const user = await requireAdmin();
  
    const params = await searchParams;
  
    const query = normalizeSearch(
      params.q || "",
    );
  
    const employees = await prisma.user.findMany({
      where: {
        role: "EMPLOYEE",
  
        ...(query
          ? {
              OR: [
                {
                  firstName: {
                    contains: query,
                    mode: "insensitive",
                  },
                },
                {
                  lastName: {
                    contains: query,
                    mode: "insensitive",
                  },
                },
                {
                  username: {
                    contains: query,
                    mode: "insensitive",
                  },
                },
                {
                  phone: {
                    contains: query,
                    mode: "insensitive",
                  },
                },
              ],
            }
          : {}),
      },
  
      select: {
        id: true,
        firstName: true,
        lastName: true,
        username: true,
        phone: true,
        isActive: true,
        createdAt: true,
  
        _count: {
          select: {
            attendances: true,
          },
        },
      },
  
      orderBy: [
        {
          isActive: "desc",
        },
        {
          createdAt: "desc",
        },
      ],
    });
  
    const activeCount = employees.filter(
      (employee) => employee.isActive,
    ).length;
  
    const inactiveCount =
      employees.length - activeCount;
  
    return (
      <AdminShell
        firstName={user.firstName}
        lastName={user.lastName}
      >
        <div
          dir="rtl"
          className="
            mx-auto max-w-[1500px]
            px-4 py-4
            sm:px-6 sm:py-6
            xl:px-8
          "
        >
          {/* Page Header */}
          <header className="mb-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <div className="mb-2 flex items-center gap-2">
                  <span
                    className="
                      flex h-7 items-center gap-1.5
                      rounded-full bg-blue-50
                      px-3 text-[11px]
                      font-semibold text-blue-700
                    "
                  >
                    <Users size={13} />
                    {employees.length} کارمند
                  </span>
                </div>
  
                <h1 className="text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">
                  کارکنان
                </h1>
  
                <p className="mt-2 text-sm text-slate-500">
                  کارکنان شرکت را مدیریت و حساب‌های ورود آن‌ها را کنترل کنید.
                </p>
              </div>
  
              <a
                href="#create-employee"
                className="
                  flex h-12
                  items-center justify-center
                  gap-2 rounded-2xl
                  bg-slate-950 px-5
                  text-sm font-semibold text-white
                  shadow-lg shadow-slate-950/10
                  transition hover:bg-slate-800
                "
              >
                <UserPlus size={18} />
                افزودن کارمند
              </a>
            </div>
          </header>
  
          {/* Summary */}
          <section className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
            <SummaryCard
              label="کل کارکنان"
              value={employees.length}
              valueClass="text-slate-950"
            />
  
            <SummaryCard
              label="فعال"
              value={activeCount}
              valueClass="text-emerald-600"
            />
  
            <div className="col-span-2 sm:col-span-1">
              <SummaryCard
                label="غیرفعال"
                value={inactiveCount}
                valueClass="text-slate-500"
              />
            </div>
          </section>
  
          <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_370px]">
            {/* Employee list */}
            <section
              className="
                min-w-0 overflow-hidden
                rounded-[26px]
                border border-slate-200/80
                bg-white
                shadow-[0_8px_30px_rgba(15,23,42,0.04)]
              "
            >
              {/* Search */}
              <div className="border-b border-slate-100 p-4 sm:p-5">
                <form
                  method="GET"
                  className="relative"
                >
                  <Search
                    size={18}
                    className="
                      pointer-events-none
                      absolute right-4
                      top-1/2
                      -translate-y-1/2
                      text-slate-400
                    "
                  />
  
                  <input
                    name="q"
                    defaultValue={query}
                    placeholder="جستجو بر اساس نام، نام کاربری یا شماره تلفن..."
                    autoComplete="off"
                    className="
                      h-12 w-full
                      rounded-2xl
                      border border-slate-200
                      bg-slate-50
                      pr-11 pl-4
                      text-sm text-slate-900
                      outline-none transition
                      placeholder:text-slate-400
                      focus:border-slate-400
                      focus:bg-white
                      focus:ring-4
                      focus:ring-slate-900/5
                    "
                  />
  
                  {query ? (
                    <a
                      href="/admin/employees"
                      className="
                        absolute left-2 top-1/2
                        -translate-y-1/2
                        rounded-xl px-3 py-1.5
                        text-xs font-medium
                        text-slate-400
                        transition
                        hover:bg-slate-200
                        hover:text-slate-700
                      "
                    >
                      پاک کردن
                    </a>
                  ) : null}
                </form>
              </div>
  
              {/* Empty */}
              {employees.length === 0 ? (
                <div className="flex min-h-[360px] flex-col items-center justify-center px-6 text-center">
                  <div
                    className="
                      flex h-16 w-16
                      items-center justify-center
                      rounded-2xl
                      bg-slate-50
                      text-slate-300
                    "
                  >
                    <Users size={26} />
                  </div>
  
                  <h2 className="mt-5 text-base font-bold text-slate-900">
                    {query
                      ? "کارمندی پیدا نشد"
                      : "هنوز کارمندی اضافه نشده"}
                  </h2>
  
                  <p className="mt-2 max-w-sm text-xs leading-6 text-slate-400">
                    {query
                      ? "عبارت جستجو را تغییر دهید و دوباره امتحان کنید."
                      : "اولین کارمند را از فرم افزودن کارمند ایجاد کنید."}
                  </p>
                </div>
              ) : (
                <div>
                  {/* Desktop heading */}
                  <div
                    className="
                      hidden border-b
                      border-slate-100
                      px-5 py-3
                      text-[11px]
                      font-semibold
                      text-slate-400
                      sm:grid
                      sm:grid-cols-[minmax(220px,1.5fr)_1fr_120px_52px]
                      sm:items-center
                      sm:gap-4
                    "
                  >
                    <span>کارمند</span>
                    <span>شماره تماس</span>
                    <span>وضعیت</span>
                    <span />
                  </div>
  
                  <div className="divide-y divide-slate-100">
                    {employees.map((employee) => (
                      <div
                        key={employee.id}
                        className="
                          px-4 py-4
                          transition
                          hover:bg-slate-50/60
                          sm:px-5
                        "
                      >
                        <div
                          className="
                            grid gap-4
                            sm:grid-cols-[minmax(220px,1.5fr)_1fr_120px_52px]
                            sm:items-center
                            sm:gap-4
                          "
                        >
                          {/* Employee */}
                          <div className="flex min-w-0 items-center gap-3">
                            <div
                              className={`
                                flex h-11 w-11
                                shrink-0 items-center
                                justify-center rounded-2xl
                                text-xs font-bold
                                ${
                                  employee.isActive
                                    ? "bg-slate-950 text-white"
                                    : "bg-slate-100 text-slate-400"
                                }
                              `}
                            >
                              {employee.firstName?.[0] || ""}
                              {employee.lastName?.[0] || ""}
                            </div>
  
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <p className="truncate text-sm font-bold text-slate-900">
                                  {employee.firstName}{" "}
                                  {employee.lastName}
                                </p>
  
                                {!employee.isActive ? (
                                  <span
                                    className="
                                      rounded-full
                                      bg-slate-100
                                      px-2 py-0.5
                                      text-[9px]
                                      font-semibold
                                      text-slate-400
                                    "
                                  >
                                    غیرفعال
                                  </span>
                                ) : null}
                              </div>
  
                              <p className="mt-1 truncate text-xs text-slate-400">
                                @{employee.username}
                              </p>
  
                              <p className="mt-1 text-[10px] text-slate-300 sm:hidden">
                                {employee._count.attendances} رکورد حضور
                              </p>
                            </div>
                          </div>
  
                          {/* Phone */}
                          <div className="hidden min-w-0 sm:block">
                            <p className="truncate text-sm text-slate-600">
                              {employee.phone || "—"}
                            </p>
                          </div>
  
                          {/* Status */}
                          <div className="flex items-center justify-between gap-3 sm:justify-start">
                            <div className="sm:hidden">
                              <span className="text-[11px] text-slate-400">
                                وضعیت
                              </span>
                            </div>
  
                            {employee.isActive ? (
                              <span
                                className="
                                  inline-flex items-center gap-1.5
                                  rounded-full
                                  bg-emerald-50
                                  px-3 py-1.5
                                  text-[11px]
                                  font-semibold
                                  text-emerald-700
                                "
                              >
                                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                                فعال
                              </span>
                            ) : (
                              <span
                                className="
                                  inline-flex items-center gap-1.5
                                  rounded-full
                                  bg-slate-100
                                  px-3 py-1.5
                                  text-[11px]
                                  font-semibold
                                  text-slate-500
                                "
                              >
                                <span className="h-1.5 w-1.5 rounded-full bg-slate-400" />
                                غیرفعال
                              </span>
                            )}
                          </div>
  
                          {/* Actions */}
                          <div className="flex justify-end">
                            <EmployeeActions
                              userId={employee.id}
                              firstName={
                                employee.firstName
                              }
                              lastName={
                                employee.lastName
                              }
                              isActive={
                                employee.isActive
                              }
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </section>
  
            {/* Create */}
            <aside
              id="create-employee"
              className="
                scroll-mt-6
                rounded-[26px]
                border border-slate-200/80
                bg-white p-5
                shadow-[0_8px_30px_rgba(15,23,42,0.04)]
                sm:p-6
                xl:sticky xl:top-6
                xl:h-fit
              "
            >
              <div className="flex items-start gap-3">
                <div
                  className="
                    flex h-11 w-11
                    shrink-0 items-center
                    justify-center
                    rounded-2xl
                    bg-slate-950 text-white
                  "
                >
                  <UserPlus size={20} />
                </div>
  
                <div>
                  <h2 className="text-base font-bold text-slate-950">
                    افزودن کارمند
                  </h2>
  
                  <p className="mt-1 text-xs leading-5 text-slate-400">
                    یک حساب کاربری جدید برای کارمند ایجاد کنید.
                  </p>
                </div>
              </div>
  
              <CreateEmployeeForm />
  
              <div className="mt-5 rounded-2xl bg-slate-50 p-4">
                <div className="flex items-start gap-3">
                  <ShieldCheck
                    size={18}
                    className="mt-0.5 shrink-0 text-slate-500"
                  />
  
                  <p className="text-[11px] leading-6 text-slate-500">
                    رمز عبور کارمند به‌صورت Hash شده ذخیره می‌شود
                    و رمز خام داخل دیتابیس نگهداری نخواهد شد.
                  </p>
                </div>
              </div>
            </aside>
          </div>
        </div>
      </AdminShell>
    );
  }
  
  function SummaryCard({
    label,
    value,
    valueClass,
  }: {
    label: string;
    value: number;
    valueClass: string;
  }) {
    return (
      <div
        className="
          rounded-[22px]
          border border-slate-200/80
          bg-white p-4
          shadow-[0_8px_30px_rgba(15,23,42,0.03)]
        "
      >
        <p className="text-xs font-medium text-slate-400">
          {label}
        </p>
  
        <p
          className={`mt-2 text-2xl font-bold ${valueClass}`}
        >
          {value}
        </p>
      </div>
    );
  }