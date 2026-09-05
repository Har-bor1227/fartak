import type { ReactNode } from "react";

import AdminMobileNav from "@/components/admin/admin-mobile-nav";
import AdminSidebar from "@/components/admin/admin-sidebar";

type AdminShellProps = {
  firstName: string;
  lastName: string;
  children: ReactNode;
};

export default function AdminShell({
  firstName,
  lastName,
  children,
}: AdminShellProps) {
  return (
    <div
      dir="rtl"
      className="min-h-screen bg-[#f6f7f9]"
    >
      <div className="flex min-h-screen">
        <AdminSidebar
          firstName={firstName}
          lastName={lastName}
        />

        <main className="min-w-0 flex-1 pb-24 lg:pb-0">
          {children}
        </main>
      </div>

      <AdminMobileNav />
    </div>
  );
}