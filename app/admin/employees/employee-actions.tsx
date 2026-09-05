"use client";

import {
  CheckCircle2,
  KeyRound,
  Loader2,
  MoreHorizontal,
  Power,
  XCircle,
} from "lucide-react";
import {
  useState,
  useTransition,
} from "react";

import {
  changeEmployeePassword,
  toggleEmployeeStatus,
} from "@/lib/admin/employees";

type EmployeeActionsProps = {
  userId: string;
  firstName: string;
  lastName: string;
  isActive: boolean;
};

export default function EmployeeActions({
  userId,
  firstName,
  lastName,
  isActive,
}: EmployeeActionsProps) {
  const [open, setOpen] = useState(false);

  const [password, setPassword] =
    useState("");

  const [showPasswordDialog, setShowPasswordDialog] =
    useState(false);

  const [message, setMessage] =
    useState("");

  const [isPending, startTransition] =
    useTransition();

  function handleToggle() {
    if (isPending) {
      return;
    }

    setMessage("");

    startTransition(async () => {
      const result =
        await toggleEmployeeStatus(userId);

      setMessage(result.message);
      setOpen(false);
    });
  }

  function handlePasswordChange() {
    if (password.length < 8) {
      setMessage(
        "رمز عبور باید حداقل ۸ کاراکتر باشد.",
      );

      return;
    }

    setMessage("");

    startTransition(async () => {
      const result =
        await changeEmployeePassword(
          userId,
          password,
        );

      setMessage(result.message);

      if (result.success) {
        setPassword("");
        setShowPasswordDialog(false);
        setOpen(false);
      }
    });
  }

  return (
    <>
      <div className="relative">
        <button
          type="button"
          onClick={() =>
            setOpen((value) => !value)
          }
          disabled={isPending}
          aria-label="عملیات کارمند"
          className="
            flex h-10 w-10
            items-center justify-center
            rounded-xl text-slate-400
            transition hover:bg-slate-100
            hover:text-slate-700
            disabled:opacity-50
          "
        >
          {isPending ? (
            <Loader2
              size={18}
              className="animate-spin"
            />
          ) : (
            <MoreHorizontal size={19} />
          )}
        </button>

        {open ? (
          <>
            <button
              type="button"
              aria-label="بستن منوی عملیات"
              onClick={() => setOpen(false)}
              className="
                fixed inset-0 z-30
                cursor-default
              "
            />

            <div
              dir="rtl"
              className="
                absolute left-0 top-12 z-40
                w-52 overflow-hidden
                rounded-2xl border
                border-slate-200
                bg-white p-1.5
                shadow-[0_15px_50px_rgba(15,23,42,0.14)]
              "
            >
              <button
                type="button"
                onClick={() => {
                  setMessage("");
                  setShowPasswordDialog(true);
                  setOpen(false);
                }}
                className="
                  flex w-full items-center gap-3
                  rounded-xl px-3 py-2.5
                  text-right text-sm text-slate-600
                  transition hover:bg-slate-50
                  hover:text-slate-950
                "
              >
                <KeyRound size={17} />
                تغییر رمز عبور
              </button>

              <button
                type="button"
                onClick={handleToggle}
                disabled={isPending}
                className="
                  flex w-full items-center gap-3
                  rounded-xl px-3 py-2.5
                  text-right text-sm text-slate-600
                  transition hover:bg-slate-50
                  hover:text-slate-950
                  disabled:opacity-50
                "
              >
                {isActive ? (
                  <>
                    <Power size={17} />
                    غیرفعال کردن
                  </>
                ) : (
                  <>
                    <CheckCircle2 size={17} />
                    فعال کردن
                  </>
                )}
              </button>
            </div>
          </>
        ) : null}
      </div>

      {showPasswordDialog ? (
        <div
          className="
            fixed inset-0 z-[100]
            flex items-end justify-center
            bg-slate-950/40 p-3
            backdrop-blur-sm
            sm:items-center
          "
        >
          <div
            dir="rtl"
            className="
              w-full max-w-md
              rounded-[26px]
              bg-white p-5
              shadow-2xl
              sm:p-6
            "
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-base font-bold text-slate-950">
                  تغییر رمز عبور
                </h3>

                <p className="mt-1 text-xs leading-5 text-slate-400">
                  رمز جدید برای{" "}
                  <span className="font-semibold text-slate-600">
                    {firstName} {lastName}
                  </span>
                </p>
              </div>

              <button
                type="button"
                disabled={isPending}
                onClick={() => {
                  setShowPasswordDialog(false);
                  setPassword("");
                  setMessage("");
                }}
                className="
                  flex h-9 w-9
                  items-center justify-center
                  rounded-xl text-slate-400
                  transition
                  hover:bg-slate-100
                  hover:text-slate-700
                "
                aria-label="بستن"
              >
                <XCircle size={19} />
              </button>
            </div>

            <div className="mt-5">
              <label
                htmlFor={`employee-password-${userId}`}
                className="mb-2 block text-sm font-medium text-slate-700"
              >
                رمز عبور جدید
              </label>

              <input
                id={`employee-password-${userId}`}
                type="password"
                value={password}
                onChange={(event) =>
                  setPassword(event.target.value)
                }
                placeholder="حداقل ۸ کاراکتر"
                autoFocus
                autoComplete="new-password"
                dir="ltr"
                className="
                  h-12 w-full rounded-2xl
                  border border-slate-200
                  bg-slate-50 px-4
                  text-sm text-slate-900
                  outline-none transition
                  placeholder:text-slate-400
                  focus:border-slate-400
                  focus:bg-white
                  focus:ring-4
                  focus:ring-slate-900/5
                "
              />
            </div>

            {message ? (
              <div
                className="
                  mt-3 flex items-start gap-2
                  rounded-2xl bg-slate-50
                  px-3.5 py-3
                  text-xs leading-5 text-slate-600
                "
              >
                <span>{message}</span>
              </div>
            ) : null}

            <div className="mt-5 grid grid-cols-2 gap-2">
              <button
                type="button"
                disabled={isPending}
                onClick={() => {
                  setShowPasswordDialog(false);
                  setPassword("");
                  setMessage("");
                }}
                className="
                  h-12 rounded-2xl
                  bg-slate-100
                  text-sm font-semibold
                  text-slate-600
                  transition
                  hover:bg-slate-200
                  disabled:opacity-50
                "
              >
                انصراف
              </button>

              <button
                type="button"
                disabled={
                  isPending ||
                  password.length < 8
                }
                onClick={handlePasswordChange}
                className="
                  flex h-12
                  items-center justify-center
                  gap-2 rounded-2xl
                  bg-slate-950
                  text-sm font-semibold
                  text-white
                  transition hover:bg-slate-800
                  disabled:cursor-not-allowed
                  disabled:opacity-50
                "
              >
                {isPending ? (
                  <Loader2
                    size={17}
                    className="animate-spin"
                  />
                ) : (
                  <KeyRound size={17} />
                )}

                تغییر رمز
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}