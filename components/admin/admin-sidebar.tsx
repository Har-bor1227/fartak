"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  CalendarDays,
  ClipboardCheck,
  LayoutDashboard,
  Settings,
  Users,
} from "lucide-react";

import LogoutButton from "@/components/admin/logout-button";

const navigation = [
  {
    label: "داشبورد",
    href: "/admin",
    icon: LayoutDashboard,
  },
  {
    label: "کارمندان",
    href: "/admin/employees",
    icon: Users,
  },
  {
    label: "حضور و غیاب",
    href: "/admin/attendance",
    icon: ClipboardCheck,
  },
  {
    label: "گزارش‌ها",
    href: "/admin/reports",
    icon: BarChart3,
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

type AdminSidebarProps = {
  firstName: string;
  lastName: string;
};

export default function AdminSidebar({
  firstName,
  lastName,
}: AdminSidebarProps) {
  const pathname = usePathname();

  return (
    <aside
      dir="rtl"
      className="hidden h-screen w-[268px] shrink-0 border-l border-slate-200/80 bg-white lg:flex lg:flex-col"
    >
      <div className="flex h-full flex-col p-4">
        <div className="px-3 pb-6 pt-3">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-950 text-white shadow-lg shadow-slate-950/10">
              <ClipboardCheck size={21} />
            </div>

            <div>
              <p className="text-[15px] font-bold text-slate-950">
                حضورینو
              </p>

              <p className="mt-0.5 text-[11px] text-slate-400">
                سامانه حضور و غیاب
              </p>
            </div>
          </div>
        </div>

        <nav className="flex-1 space-y-1.5">
          <p className="mb-3 px-3 text-[11px] font-semibold text-slate-400">
            مدیریت
          </p>

          {navigation.map((item) => {
            const Icon = item.icon;

            const isActive =
              item.href === "/admin"
                ? pathname === "/admin"
                : pathname.startsWith(item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`group flex items-center gap-3 rounded-2xl px-3.5 py-3 text-sm font-medium transition-all ${
                  isActive
                    ? "bg-slate-950 text-white shadow-lg shadow-slate-950/10"
                    : "text-slate-500 hover:bg-slate-50 hover:text-slate-950"
                }`}
              >
                <Icon
                  size={18}
                  strokeWidth={isActive ? 2.3 : 1.9}
                  className={
                    isActive
                      ? "text-white"
                      : "text-slate-400 transition group-hover:text-slate-700"
                  }
                />

                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="mb-4 rounded-[22px] border border-slate-100 bg-slate-50 p-3">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-sm font-bold text-slate-800 shadow-sm">
              {firstName?.[0] || "م"}
              {lastName?.[0] || ""}
            </div>

            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-slate-900">
                {firstName} {lastName}
              </p>

              <p className="mt-0.5 text-xs text-slate-400">
                مدیر سیستم
              </p>
            </div>
          </div>
        </div>

        <LogoutButton />
      </div>
    </aside>
  );
}