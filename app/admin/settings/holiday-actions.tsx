"use client";

import {
  Loader2,
  Trash2,
} from "lucide-react";
import {
  useTransition,
} from "react";

import {
  deleteHoliday,
} from "@/lib/admin/settings";

type HolidayActionsProps = {
  holidayId: string;
  title: string;
};

export default function HolidayActions({
  holidayId,
  title,
}: HolidayActionsProps) {
  const [pending, startTransition] =
    useTransition();

  function handleDelete() {
    const confirmed =
      window.confirm(
        `آیا از حذف تعطیلی «${title}» مطمئن هستید؟`,
      );

    if (!confirmed) {
      return;
    }

    startTransition(async () => {
      await deleteHoliday(
        holidayId,
      );
    });
  }

  return (
    <button
      type="button"
      onClick={handleDelete}
      disabled={pending}
      aria-label={`حذف ${title}`}
      className="flex h-9 w-9 items-center justify-center rounded-xl text-slate-400 transition hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
    >
      {pending ? (
        <Loader2
          size={16}
          className="animate-spin"
        />
      ) : (
        <Trash2
          size={16}
        />
      )}
    </button>
  );
}