import type {
    ReactNode,
  } from "react";
  
  import {
    Clock3,
    History,
    Home,
    UserRound,
  } from "lucide-react";
  
  import LogoutButton from "@/components/admin/logout-button";
  
  type EmployeeShellProps = {
    firstName: string;
    lastName: string;
    children: ReactNode;
  };
  
  export default function EmployeeShell({
    firstName,
    lastName,
    children,
  }: EmployeeShellProps) {
    return (
      <div
        dir="rtl"
        className="min-h-screen bg-[#f6f7f9]"
      >
        <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/95 backdrop-blur-xl">
          <div className="mx-auto flex h-16 max-w-3xl items-center justify-between px-4 sm:px-6">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-950 text-white">
                <Clock3 size={18} />
              </div>
  
              <div>
                <p className="text-sm font-bold text-slate-950">
                  حضورینو
                </p>
  
                <p className="text-[10px] text-slate-400">
                  پنل کارمند
                </p>
              </div>
            </div>
  
            <div className="hidden items-center gap-3 sm:flex">
              <div className="text-left">
                <p className="text-xs font-bold text-slate-900">
                  {firstName} {lastName}
                </p>
  
                <p className="mt-0.5 text-[10px] text-slate-400">
                  کارمند
                </p>
              </div>
  
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-xs font-bold text-slate-700">
                {firstName?.[0] || ""}
                {lastName?.[0] || ""}
              </div>
            </div>
          </div>
        </header>
  
        <main className="mx-auto max-w-3xl px-4 pb-28 pt-5 sm:px-6 sm:pb-10 sm:pt-8">
          {children}
        </main>
  
        <nav className="fixed inset-x-0 bottom-0 z-50 border-t border-slate-200/80 bg-white/95 px-4 pb-[max(10px,env(safe-area-inset-bottom))] pt-2 backdrop-blur-xl sm:hidden">
          <div className="mx-auto grid max-w-md grid-cols-4">
            <MobileNavItem
              href="/employee"
              label="خانه"
              icon={Home}
              active
            />
  
            <MobileNavItem
              href="/employee/history"
              label="سوابق"
              icon={History}
            />
  
            <MobileNavItem
              href="/employee/profile"
              label="حساب من"
              icon={UserRound}
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
      <a
        href={href}
        className="flex flex-col items-center justify-center gap-1.5 py-1.5"
      >
        <div
          className={`flex h-9 w-12 items-center justify-center rounded-2xl ${
            active
              ? "bg-slate-950 text-white"
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
      </a>
    );
  }