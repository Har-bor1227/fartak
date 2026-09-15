"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  CalendarCheck2,
  CalendarDays,
  ClipboardCheck,
  Clock3,
  LayoutDashboard,
  MoreHorizontal,
  Settings,
  Users,
  X,
} from "lucide-react";
import { useEffect, useState } from "react";

import LogoutButton from "@/components/admin/logout-button";

const primaryNavigation = [
  {
    label: "خانه",
    href: "/admin",
    icon: LayoutDashboard,
  },
  {
    label: "کارمندان",
    href: "/admin/employees",
    icon: Users,
  },
  {
    label: "حضور",
    href: "/admin/attendance",
    icon: ClipboardCheck,
  },
  {
    label: "گزارش",
    href: "/admin/reports",
    icon: BarChart3,
  },
];

const moreNavigation = [
  {
    label: "برنامه کاری",
    href: "/admin/employees/shifts",
    icon: Clock3,
  },
  {
    label: "مرخصی‌ها",
    href: "/admin/leave",
    icon: CalendarCheck2,
  },
  {
    label: "تقویم کاری",
    href: "/admin/calendar",
    icon: CalendarDays,
  },
  {
    label: "تنظیمات",
    href: "/admin/settings",
    icon: Settings,
  },
];

export default function AdminMobileNav() {
  const pathname = usePathname();

  const [open, setOpen] = useState(false);

  const isMoreActive =
    pathname.startsWith(
      "/admin/employees/shifts",
    ) ||
    pathname.startsWith(
      "/admin/leave",
    ) ||
    pathname.startsWith(
      "/admin/calendar",
    ) ||
    pathname.startsWith(
      "/admin/settings",
    );

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!open) {
      return;
    }

    const previousOverflow =
      document.body.style.overflow;

    document.body.style.overflow =
      "hidden";

    return () => {
      document.body.style.overflow =
        previousOverflow;
    };
  }, [open]);

  return (
    <>
      {open ? (
        <div
          className="fixed inset-0 z-[60] bg-slate-950/20 backdrop-blur-[2px] lg:hidden"
          onClick={() => setOpen(false)}
          aria-hidden="true"
        />
      ) : null}

      <div
        className={`fixed inset-x-3 bottom-[calc(72px+env(safe-area-inset-bottom))] z-[70] rounded-[24px] border border-slate-200 bg-white p-2 shadow-[0_20px_60px_rgba(15,23,42,0.16)] transition-all duration-200 lg:hidden ${
          open
            ? "translate-y-0 opacity-100"
            : "pointer-events-none translate-y-3 opacity-0"
        }`}
      >
        <div className="flex items-center justify-between px-3 py-2">
          <div>
            <p className="text-sm font-bold text-slate-950">
              بیشتر
            </p>

            <p className="mt-0.5 text-[10px] text-slate-400">
              ابزارهای مدیریت
            </p>
          </div>

          <button
            type="button"
            onClick={() =>
              setOpen(false)
            }
            className="flex h-9 w-9 items-center justify-center rounded-xl text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
            aria-label="بستن منوی بیشتر"
          >
            <X size={18} />
          </button>
        </div>

        <div className="mt-1 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {moreNavigation.map(
            (item) => {
              const Icon =
                item.icon;

              const isActive =
                pathname.startsWith(
                  item.href,
                );

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-3 rounded-2xl p-3 transition ${
                    isActive
                      ? "bg-slate-950 text-white"
                      : "bg-slate-50 text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  <div
                    className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${
                      isActive
                        ? "bg-white/10"
                        : "bg-white"
                    }`}
                  >
                    <Icon size={17} />
                  </div>

                  <span className="text-xs font-semibold">
                    {item.label}
                  </span>
                </Link>
              );
            },
          )}
        </div>

        <div className="mt-2 border-t border-slate-100 pt-2">
          <LogoutButton mobile />
        </div>
      </div>

      <nav
        dir="rtl"
        aria-label="ناوبری موبایل پنل مدیریت"
        className="
          fixed
          inset-x-0
          bottom-0
          z-50
          border-t
          border-slate-200/80
          bg-white/95
          px-2
          pt-2
          pb-[max(8px,env(safe-area-inset-bottom))]
          backdrop-blur-xl
          lg:hidden
        "
      >
        <div className="mx-auto grid max-w-xl grid-cols-5 gap-1">
          {primaryNavigation.map(
            (item) => {
              const Icon =
                item.icon;

              const isActive =
                item.href === "/admin"
                  ? pathname ===
                    "/admin"
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
                  className="flex min-w-0 flex-col items-center justify-center gap-1 py-1"
                >
                  <div
                    className={`flex h-9 w-12 items-center justify-center rounded-xl transition-all duration-200 ${
                      isActive
                        ? "bg-slate-950 text-white shadow-md shadow-slate-950/10"
                        : "text-slate-400"
                    }`}
                  >
                    <Icon
                      size={18}
                      strokeWidth={
                        isActive
                          ? 2.3
                          : 1.9
                      }
                    />
                  </div>

                  <span
                    className={`truncate text-[9px] font-semibold ${
                      isActive
                        ? "text-slate-950"
                        : "text-slate-400"
                    }`}
                  >
                    {item.label}
                  </span>
                </Link>
              );
            },
          )}

          <button
            type="button"
            onClick={() =>
              setOpen(
                (value) =>
                  !value,
              )
            }
            aria-expanded={open}
            aria-label="باز کردن منوی بیشتر"
            className="flex min-w-0 flex-col items-center justify-center gap-1 py-1"
          >
            <div
              className={`flex h-9 w-12 items-center justify-center rounded-xl transition-all duration-200 ${
                open ||
                isMoreActive
                  ? "bg-slate-950 text-white shadow-md shadow-slate-950/10"
                  : "text-slate-400"
              }`}
            >
              <MoreHorizontal
                size={19}
                strokeWidth={
                  open ||
                  isMoreActive
                    ? 2.3
                    : 1.9
                }
              />
            </div>

            <span
              className={`truncate text-[9px] font-semibold ${
                open ||
                isMoreActive
                  ? "text-slate-950"
                  : "text-slate-400"
              }`}
            >
              بیشتر
            </span>
          </button>
        </div>
      </nav>
    </>
  );
}