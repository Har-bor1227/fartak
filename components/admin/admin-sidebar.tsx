"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  CalendarCheck2,
  CalendarDays,
  ChevronLeft,
  ClipboardCheck,
  Clock3,
  LayoutDashboard,
  Settings,
  Users,
} from "lucide-react";

import LogoutButton from "@/components/admin/logout-button";

const navigation = [
  {
    label: "داشبورد",
    description: "نمای کلی سیستم",
    href: "/admin",
    icon: LayoutDashboard,
  },
  {
    label: "کارمندان",
    description: "مدیریت کارکنان",
    href: "/admin/employees",
    icon: Users,
  },
  {
    label: "برنامه کاری",
    description: "اختصاص شیفت کارکنان",
    href: "/admin/employees/shifts",
    icon: Clock3,
  },
  {
    label: "حضور و غیاب",
    description: "وضعیت روزانه",
    href: "/admin/attendance",
    icon: ClipboardCheck,
  },
  {
    label: "مرخصی‌ها",
    description: "درخواست‌های پرسنلی",
    href: "/admin/leave",
    icon: CalendarCheck2,
  },
  {
    label: "گزارش‌ها",
    description: "تحلیل و گزارش",
    href: "/admin/reports",
    icon: BarChart3,
  },
  {
    label: "تقویم کاری",
    description: "روزهای کاری و تعطیلات",
    href: "/admin/calendar",
    icon: CalendarDays,
  },
  {
    label: "تنظیمات",
    description: "پیکربندی سیستم",
    href: "/admin/settings",
    icon: Settings,
  },
];

type AdminSidebarProps = {
  firstName: string;
  lastName: string;
};

function isNavigationItemActive(
  pathname: string,
  href: string,
): boolean {
  if (href === "/admin") {
    return pathname === "/admin";
  }

  if (href === "/admin/employees") {
    return pathname === "/admin/employees";
  }

  return pathname.startsWith(href);
}

export default function AdminSidebar({
  firstName,
  lastName,
}: AdminSidebarProps) {
  const pathname = usePathname();

  return (
    <aside
      dir="rtl"
      className="
        hidden
        h-screen
        w-[286px]
        shrink-0
        border-l
        border-slate-200/80
        bg-[#fbfcfd]
        lg:flex
        lg:flex-col
      "
    >
      <div className="flex h-full min-h-0 flex-col">
        <div className="px-4 pb-4 pt-4">
          <Link
            href="/admin"
            className="
              group
              flex
              items-center
              gap-3
              rounded-[22px]
              border
              border-slate-200/80
              bg-white
              px-3
              py-3
              shadow-[0_8px_30px_rgba(15,23,42,0.035)]
              transition-all
              duration-200
              hover:border-slate-300
              hover:shadow-[0_12px_32px_rgba(15,23,42,0.06)]
            "
          >
            <div
              className="
                relative
                flex
                h-11
                w-11
                shrink-0
                items-center
                justify-center
                overflow-hidden
                rounded-[15px]
                bg-slate-950
                text-white
                shadow-[0_10px_24px_rgba(15,23,42,0.14)]
                transition-transform
                duration-200
                group-hover:scale-[1.02]
              "
            >
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.16),transparent_55%)]" />

              <ClipboardCheck
                size={21}
                strokeWidth={2.2}
                className="relative"
              />
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-2">
                <p className="truncate text-[15px] font-bold tracking-tight text-slate-950">
                  حضورینو
                </p>

                <ChevronLeft
                  size={14}
                  className="
                    shrink-0
                    text-slate-200
                    transition-all
                    duration-200
                    group-hover:-translate-x-0.5
                    group-hover:text-slate-400
                  "
                />
              </div>

              <p className="mt-0.5 truncate text-[11px] text-slate-400">
                سامانه حضور و غیاب
              </p>
            </div>
          </Link>
        </div>

        <div className="min-h-0 flex-1 px-4">
          <div className="flex h-full min-h-0 flex-col rounded-[24px] border border-slate-200/70 bg-white shadow-[0_8px_30px_rgba(15,23,42,0.025)]">
            <div className="px-3 pb-2 pt-4">
              <div className="flex items-center justify-between gap-3 px-2">
                <p className="text-[10px] font-bold tracking-wide text-slate-400">
                  مدیریت سیستم
                </p>

                <span className="h-1.5 w-1.5 rounded-full bg-slate-200" />
              </div>
            </div>

            <nav
              aria-label="ناوبری پنل مدیریت"
              className="
                min-h-0
                flex-1
                overflow-y-auto
                px-2
                pb-3
                [scrollbar-width:thin]
                [scrollbar-color:#e2e8f0_transparent]
              "
            >
              <div className="space-y-1">
                {navigation.map((item) => {
                  const Icon = item.icon;

                  const isActive =
                    isNavigationItemActive(
                      pathname,
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
                      className={`
                        group
                        relative
                        flex
                        items-center
                        gap-3
                        rounded-[18px]
                        px-2.5
                        py-2.5
                        transition-all
                        duration-200
                        ${
                          isActive
                            ? "bg-slate-950 text-white shadow-[0_10px_24px_rgba(15,23,42,0.12)]"
                            : "text-slate-500 hover:bg-slate-50 hover:text-slate-950"
                        }
                      `}
                    >
                      {isActive ? (
                        <>
                          <span
                            className="
                              absolute
                              right-0
                              top-1/2
                              h-7
                              w-1
                              -translate-y-1/2
                              rounded-l-full
                              bg-white
                            "
                          />

                          <span
                            className="
                              pointer-events-none
                              absolute
                              inset-0
                              rounded-[18px]
                              bg-[radial-gradient(circle_at_20%_0%,rgba(255,255,255,0.08),transparent_48%)]
                            "
                          />
                        </>
                      ) : null}

                      <div
                        className={`
                          relative
                          flex
                          h-10
                          w-10
                          shrink-0
                          items-center
                          justify-center
                          rounded-[14px]
                          transition-all
                          duration-200
                          ${
                            isActive
                              ? "bg-white/10"
                              : "bg-slate-50 group-hover:bg-white group-hover:shadow-sm"
                          }
                        `}
                      >
                        <Icon
                          size={18}
                          strokeWidth={
                            isActive
                              ? 2.25
                              : 1.9
                          }
                          className={
                            isActive
                              ? "text-white"
                              : "text-slate-400 transition-colors group-hover:text-slate-700"
                          }
                        />
                      </div>

                      <div className="relative min-w-0 flex-1">
                        <p
                          className={`
                            truncate
                            text-sm
                            font-semibold
                            ${
                              isActive
                                ? "text-white"
                                : "text-slate-700 group-hover:text-slate-950"
                            }
                          `}
                        >
                          {item.label}
                        </p>

                        <p
                          className={`
                            mt-0.5
                            truncate
                            text-[10px]
                            ${
                              isActive
                                ? "text-slate-400"
                                : "text-slate-400 group-hover:text-slate-500"
                            }
                          `}
                        >
                          {item.description}
                        </p>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </nav>
          </div>
        </div>

        <div className="px-4 pb-4 pt-3">
          <div className="rounded-[24px] border border-slate-200/70 bg-white p-2.5 shadow-[0_8px_30px_rgba(15,23,42,0.035)]">
            <div className="flex items-center gap-3 rounded-[18px] bg-slate-50 px-3 py-3">
              <div className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-sm font-bold text-slate-800 shadow-sm">
                {firstName?.[0] || "م"}
                {lastName?.[0] || ""}

                <span className="absolute -bottom-0.5 -left-0.5 h-2.5 w-2.5 rounded-full border-2 border-slate-50 bg-emerald-500" />
              </div>

              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-bold text-slate-900">
                  {firstName} {lastName}
                </p>

                <div className="mt-1 flex items-center gap-1.5">
                  <span className="text-[10px] font-medium text-slate-400">
                    مدیر سیستم
                  </span>

                  <span className="h-1 w-1 rounded-full bg-emerald-400" />
                  <span className="text-[10px] font-medium text-emerald-600">
                    آنلاین
                  </span>
                </div>
              </div>
            </div>

            <div className="mt-2">
              <LogoutButton />
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}