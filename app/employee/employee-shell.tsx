"use client";

import type { ReactNode } from "react";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  CalendarCheck2,
  CalendarDays,
  ClipboardCheck,
  Clock3,
  Home,
} from "lucide-react";

import LogoutButton from "@/components/admin/logout-button";

type EmployeeShellProps = {
  firstName: string;
  lastName: string;
  children: ReactNode;
};

const navigation = [
  {
    label: "داشبورد",
    description: "وضعیت حضور امروز",
    href: "/employee",
    icon: Home,
  },
  {
    label: "مرخصی‌ها",
    description: "درخواست‌های پرسنلی",
    href: "/employee/leave",
    icon: CalendarCheck2,
  },
];

export default function EmployeeShell({
  firstName,
  lastName,
  children,
}: EmployeeShellProps) {
  const pathname = usePathname();

  return (
    <div
      dir="rtl"
      className="min-h-screen bg-[#f6f7f9]"
    >
      <div className="min-h-screen lg:flex">
        {/* Desktop Sidebar */}
        <aside
          className="
            hidden
            h-screen
            w-[270px]
            shrink-0
            border-l
            border-slate-200/80
            bg-white
            lg:flex
            lg:flex-col
          "
        >
          <div className="flex h-full flex-col p-4">
            {/* Brand */}
            <div className="px-2 pb-6 pt-2">
              <Link
                href="/employee"
                className="group flex items-center gap-3 rounded-2xl px-2 py-2 transition hover:bg-slate-50"
              >
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[15px] bg-slate-950 text-white shadow-lg shadow-slate-950/10 transition group-hover:scale-[1.02]">
                  <Clock3
                    size={21}
                    strokeWidth={2.2}
                  />
                </div>

                <div className="min-w-0">
                  <p className="text-[15px] font-bold tracking-tight text-slate-950">
                    حضورینو
                  </p>

                  <p className="mt-0.5 text-[11px] text-slate-400">
                    پنل کارمند
                  </p>
                </div>
              </Link>
            </div>

            {/* Navigation */}
            <nav
              aria-label="ناوبری پنل کارمند"
              className="min-h-0 flex-1"
            >
              <p className="mb-3 px-3 text-[10px] font-bold tracking-wide text-slate-400">
                پنل کاربری
              </p>

              <div className="space-y-1">
                {navigation.map(
                  (item) => {
                    const Icon =
                      item.icon;

                    const isActive =
                      item.href ===
                      "/employee"
                        ? pathname ===
                          "/employee"
                        : pathname.startsWith(
                            item.href,
                          );

                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        aria-current={
                          isActive
                            ? "page"
                            : undefined
                        }
                        className={`group relative flex items-center gap-3 rounded-2xl px-3 py-3 transition-all duration-200 ${
                          isActive
                            ? "bg-slate-950 text-white shadow-[0_10px_25px_rgba(15,23,42,0.14)]"
                            : "text-slate-500 hover:bg-slate-50 hover:text-slate-950"
                        }`}
                      >
                        {isActive ? (
                          <span className="absolute right-0 top-1/2 h-7 w-1 -translate-y-1/2 rounded-l-full bg-white/90" />
                        ) : null}

                        <div
                          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-[14px] transition ${
                            isActive
                              ? "bg-white/10"
                              : "bg-slate-50 group-hover:bg-white"
                          }`}
                        >
                          <Icon
                            size={18}
                            strokeWidth={
                              isActive
                                ? 2.3
                                : 1.9
                            }
                            className={
                              isActive
                                ? "text-white"
                                : "text-slate-400 transition-colors group-hover:text-slate-700"
                            }
                          />
                        </div>

                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold">
                            {item.label}
                          </p>

                          <p
                            className={`mt-0.5 truncate text-[10px] ${
                              isActive
                                ? "text-slate-400"
                                : "text-slate-400 group-hover:text-slate-500"
                            }`}
                          >
                            {
                              item.description
                            }
                          </p>
                        </div>
                      </Link>
                    );
                  },
                )}
              </div>
            </nav>

            {/* User */}
            <div className="mt-4 space-y-3">
              <div className="rounded-[22px] border border-slate-100 bg-slate-50 p-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-sm font-bold text-slate-800 shadow-sm">
                    {firstName?.[0] ||
                      ""}
                    {lastName?.[0] ||
                      ""}
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold text-slate-900">
                      {firstName}{" "}
                      {lastName}
                    </p>

                    <div className="mt-1 flex items-center gap-1.5">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />

                      <p className="text-[10px] font-medium text-slate-400">
                        حساب کارمند
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <LogoutButton />
            </div>
          </div>
        </aside>

        {/* Main Area */}
        <div className="min-w-0 flex-1">
          <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/95 backdrop-blur-xl">
            <div className="mx-auto flex h-16 max-w-3xl items-center justify-between px-4 sm:px-6 lg:max-w-5xl lg:px-8">
              {/* Mobile / Tablet Brand */}
              <div className="flex min-w-0 items-center gap-3 lg:hidden">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-slate-950 text-white">
                  <Clock3 size={18} />
                </div>

                <div className="min-w-0">
                  <p className="text-sm font-bold text-slate-950">
                    حضورینو
                  </p>

                  <p className="text-[10px] text-slate-400">
                    پنل کارمند
                  </p>
                </div>
              </div>

              {/* Desktop Header */}
              <div className="hidden lg:flex lg:items-center lg:gap-2">
                <ClipboardCheck
                  size={17}
                  className="text-slate-300"
                />

                <span className="text-xs font-medium text-slate-400">
                  سامانه حضور و غیاب
                </span>
              </div>

              <div className="flex shrink-0 items-center gap-3">
                <div className="hidden text-left sm:block">
                  <p className="text-xs font-bold text-slate-900">
                    {firstName}{" "}
                    {lastName}
                  </p>

                  <p className="mt-0.5 text-[10px] text-slate-400">
                    کارمند
                  </p>
                </div>

                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-xs font-bold text-slate-700">
                  {firstName?.[0] ||
                    ""}
                  {lastName?.[0] ||
                    ""}
                </div>
              </div>
            </div>
          </header>

          <main className="mx-auto max-w-3xl px-4 pb-28 pt-5 sm:px-6 sm:pb-28 sm:pt-8 lg:max-w-5xl lg:px-8 lg:pb-12 lg:pt-8">
            {children}
          </main>
        </div>
      </div>

      {/* Mobile / Tablet Bottom Navigation */}
      <nav
        dir="rtl"
        aria-label="ناوبری موبایل و تبلت پنل کارمند"
        className="
          fixed
          inset-x-0
          bottom-0
          z-50
          border-t
          border-slate-200/80
          bg-white/95
          px-2
          pb-[max(10px,env(safe-area-inset-bottom))]
          pt-2
          backdrop-blur-xl
          lg:hidden
        "
      >
        <div className="mx-auto grid max-w-xl grid-cols-3 gap-1 sm:grid-cols-3">
          <MobileNavItem
            href="/employee"
            label="خانه"
            icon={Home}
            active={
              pathname ===
              "/employee"
            }
          />

          <MobileNavItem
            href="/employee/leave"
            label="مرخصی"
            icon={CalendarDays}
            active={pathname.startsWith(
              "/employee/leave",
            )}
          />

          <LogoutButton mobile />
        </div>
      </nav>
    </div>
  );
}

function MobileNavItem({
  href,
  label,
  icon: Icon,
  active = false,
}: {
  href: string;
  label: string;
  icon: typeof Home;
  active?: boolean;
}) {
  return (
    <Link
      href={href}
      aria-current={
        active
          ? "page"
          : undefined
      }
      className="flex min-w-0 flex-col items-center justify-center gap-1.5 py-1.5"
    >
      <div
        className={`flex h-9 w-11 items-center justify-center rounded-2xl transition ${
          active
            ? "bg-slate-950 text-white shadow-[0_6px_18px_rgba(15,23,42,0.12)]"
            : "text-slate-400"
        }`}
      >
        <Icon size={18} />
      </div>

      <span
        className={`text-[10px] font-semibold ${
          active
            ? "text-slate-950"
            : "text-slate-400"
        }`}
      >
        {label}
      </span>
    </Link>
  );
}