"use client";

import {
  Check,
  Loader2,
  Power,
  Trash2,
  X,
} from "lucide-react";
import {
  useState,
  useTransition,
} from "react";

import {
  deleteShift,
  toggleShift,
} from "@/lib/admin/shifts";

type ShiftActionsProps = {
  shiftId: string;
  isActive: boolean;
};

export default function ShiftActions({
  shiftId,
  isActive,
}: ShiftActionsProps) {
  const [
    pending,
    startTransition,
  ] = useTransition();

  const [message, setMessage] =
    useState<string>("");

  function handleToggle() {
    setMessage("");

    startTransition(async () => {
      const result =
        await toggleShift(
          shiftId,
        );

      setMessage(
        result.message,
      );

      if (result.success) {
        window.location.reload();
      }
    });
  }

  function handleDelete() {
    const confirmed =
      window.confirm(
        "آیا از حذف این شیفت مطمئن هستید؟",
      );

    if (!confirmed) {
      return;
    }

    setMessage("");

    startTransition(async () => {
      const result =
        await deleteShift(
          shiftId,
        );

      setMessage(
        result.message,
      );

      if (result.success) {
        window.location.reload();
      }
    });
  }

  return (
    <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
      <button
        type="button"
        onClick={handleToggle}
        disabled={pending}
        title={
          isActive
            ? "غیرفعال کردن"
            : "فعال کردن"
        }
        className="
          inline-flex
          size-9
          items-center
          justify-center
          rounded-xl
          border
          border-slate-200
          bg-white
          text-slate-500
          shadow-sm
          transition
          hover:bg-slate-50
          disabled:cursor-not-allowed
          disabled:opacity-60
        "
      >
        {pending ? (
          <Loader2
            size={15}
            className="animate-spin"
          />
        ) : (
          <Power
            size={15}
          />
        )}
      </button>

      <button
        type="button"
        onClick={handleDelete}
        disabled={pending}
        title="حذف شیفت"
        className="
          inline-flex
          size-9
          items-center
          justify-center
          rounded-xl
          border
          border-red-100
          bg-red-50
          text-red-600
          transition
          hover:bg-red-100
          disabled:cursor-not-allowed
          disabled:opacity-60
        "
      >
        <Trash2
          size={15}
        />
      </button>

      {message ? (
        <span
          className={`
            flex
            items-center
            gap-1
            text-[10px]
            font-semibold
            ${
              message.includes(
                "موفق",
              ) ||
              message.includes(
                "فعال شد",
              )
                ? "text-emerald-600"
                : "text-red-600"
            }
          `}
        >
          {message.includes(
            "موفق",
          ) ||
          message.includes(
            "فعال شد",
          ) ? (
            <Check
              size={12}
            />
          ) : (
            <X
              size={12}
            />
          )}

          {message}
        </span>
      ) : null}
    </div>
  );
}