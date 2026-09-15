"use client";

import { useTransition } from "react";
import { Loader2, XCircle } from "lucide-react";

import {
  endEmployeeShift,
} from "@/lib/admin/employee-shifts";

type EmployeeShiftActionsProps = {
  employeeShiftId: string;
  endedAt: Date | null;
};

export default function EmployeeShiftActions({
  employeeShiftId,
  endedAt,
}: EmployeeShiftActionsProps) {
  const [pending, startTransition] =
    useTransition();

  if (endedAt) {
    return (
      <span className="inline-flex items-center justify-center rounded-2xl bg-slate-50 px-4 py-3 text-[11px] font-semibold text-slate-400">
        پایان‌یافته
      </span>
    );
  }

  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => {
        const confirmed =
          window.confirm(
            "آیا از پایان دادن به این انتساب شیفت مطمئن هستید؟",
          );

        if (!confirmed) {
          return;
        }

        startTransition(
          async () => {
            const result =
              await endEmployeeShift(
                employeeShiftId,
              );

            if (!result.success) {
              window.alert(
                result.message,
              );
            }

            window.location.reload();
          },
        );
      }}
      className="inline-flex items-center justify-center gap-2 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-[11px] font-semibold text-rose-600 transition hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-60"
    >
      {pending ? (
        <Loader2
          size={14}
          className="animate-spin"
        />
      ) : (
        <XCircle size={14} />
      )}

      پایان انتساب
    </button>
  );
}