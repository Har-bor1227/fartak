"use client";

import {
  useActionState,
} from "react";

import {
  useFormStatus,
} from "react-dom";

import {
  Check,
  Loader2,
  X,
} from "lucide-react";

import {
  reviewLeaveRequest,
  type LeaveReviewActionState,
} from "@/lib/admin/leave";

const initialState: LeaveReviewActionState = {
  success: false,
  message: "",
};

function ActionButton({
  decision,
}: {
  decision:
    | "APPROVED"
    | "REJECTED";
}) {
  const {
    pending,
  } = useFormStatus();

  const approved =
    decision === "APPROVED";

  return (
    <button
      type="submit"
      name="decision"
      value={decision}
      disabled={pending}
      className={`
        flex
        h-11
        flex-1
        items-center
        justify-center
        gap-2
        rounded-xl
        px-4
        text-xs
        font-bold
        transition
        disabled:cursor-not-allowed
        disabled:opacity-60
        ${
          approved
            ? "bg-emerald-600 text-white hover:bg-emerald-700"
            : "bg-rose-600 text-white hover:bg-rose-700"
        }
      `}
    >
      {pending ? (
        <Loader2
          size={16}
          className="animate-spin"
        />
      ) : approved ? (
        <Check
          size={16}
        />
      ) : (
        <X size={16} />
      )}

      {approved
        ? "تأیید درخواست"
        : "رد درخواست"}
    </button>
  );
}

export default function LeaveReviewForm({
  leaveId,
}: {
  leaveId: string;
}) {
  const [
    state,
    formAction,
  ] = useActionState(
    reviewLeaveRequest,
    initialState,
  );

  return (
    <form
      action={formAction}
      className="mt-4 space-y-3"
    >
      <input
        type="hidden"
        name="leaveId"
        value={leaveId}
      />

      <div>
        <label
          htmlFor={`review-note-${leaveId}`}
          className="mb-2 block text-[11px] font-semibold text-slate-600"
        >
          توضیح بررسی
          <span className="mr-1 text-slate-400">
            برای رد کردن الزامی است
          </span>
        </label>

        <textarea
          id={`review-note-${leaveId}`}
          name="reviewNote"
          maxLength={1000}
          rows={3}
          placeholder="در صورت نیاز توضیح بررسی را وارد کنید..."
          className="
            min-h-[88px]
            w-full
            resize-none
            rounded-2xl
            border
            border-slate-200
            bg-slate-50
            px-4
            py-3
            text-xs
            leading-6
            text-slate-800
            outline-none
            transition
            placeholder:text-slate-300
            focus:border-slate-400
            focus:bg-white
            focus:ring-4
            focus:ring-slate-950/5
          "
        />
      </div>

      {state.message ? (
        <div
          className={`
            rounded-2xl
            border
            px-3.5
            py-3
            text-xs
            leading-6
            ${
              state.success
                ? "border-emerald-100 bg-emerald-50 text-emerald-700"
                : "border-rose-100 bg-rose-50 text-rose-700"
            }
          `}
          role="alert"
        >
          {state.message}
        </div>
      ) : null}

      <div className="flex gap-2">
        <ActionButton
          decision="REJECTED"
        />

        <ActionButton
          decision="APPROVED"
        />
      </div>
    </form>
  );
}