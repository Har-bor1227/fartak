"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  ClipboardCheck,
  LayoutDashboard,
  MoreHorizontal,
  Users,
} from "lucide-react";

const navigation = [
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
  {
    label: "بیشتر",
    href: "/admin/settings",
    icon: MoreHorizontal,
  },
];

export default function AdminMobileNav() {
  const pathname = usePathname();

  return (
    <nav
      dir="rtl"
      className="fixed inset-x-0 bottom-0 z-50 border-t border-slate-200/80 bg-white/95 px-3 pb-[max(10px,env(safe-area-inset-bottom))] pt-2 backdrop-blur-xl lg:hidden"
    >
      <div className="mx-auto grid max-w-xl grid-cols-5">
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
              className="flex flex-col items-center justify-center gap-1.5 py-1.5"
            >
              <div
                className={`flex h-9 w-12 items-center justify-center rounded-2xl transition ${
                  isActive
                    ? "bg-slate-950 text-white"
                    : "text-slate-400"
                }`}
              >
                <Icon size={18} />
              </div>

              <span
                className={`text-[10px] font-semibold ${
                  isActive
                    ? "text-slate-950"
                    : "text-slate-400"
                }`}
              >
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}