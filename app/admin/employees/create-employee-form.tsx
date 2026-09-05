"use client";

import {
  CheckCircle2,
  Loader2,
  UserPlus,
  XCircle,
} from "lucide-react";
import { useActionState } from "react";

import {
  createEmployee,
  type EmployeeActionState,
} from "@/lib/admin/employees";

const initialState: EmployeeActionState = {
  success: false,
  message: "",
};

export default function CreateEmployeeForm() {
  const [state, formAction, pending] = useActionState(
    createEmployee,
    initialState,
  );

  return (
    <form
      action={formAction}
      className="mt-6 space-y-4"
    >
      <FormField
        label="نام"
        name="firstName"
        placeholder="مثلاً علی"
        required
      />

      <FormField
        label="نام خانوادگی"
        name="lastName"
        placeholder="مثلاً رضایی"
        required
      />

      <FormField
        label="نام کاربری"
        name="username"
        placeholder="مثلاً alirezaei"
        dir="ltr"
        required
      />

      <FormField
        label="رمز عبور"
        name="password"
        type="password"
        placeholder="حداقل ۸ کاراکتر"
        dir="ltr"
        required
      />

      <FormField
        label="شماره تماس"
        name="phone"
        placeholder="مثلاً 09121234567"
        dir="ltr"
      />

      {state.message ? (
        <div
          role="alert"
          className={`flex items-start gap-2 rounded-2xl px-3.5 py-3 text-xs leading-5 ${
            state.success
              ? "bg-emerald-50 text-emerald-700"
              : "bg-red-50 text-red-700"
          }`}
        >
          {state.success ? (
            <CheckCircle2
              size={17}
              className="mt-0.5 shrink-0"
            />
          ) : (
            <XCircle
              size={17}
              className="mt-0.5 shrink-0"
            />
          )}

          <span>{state.message}</span>
        </div>
      ) : null}

      <button
        type="submit"
        disabled={pending}
        className="
          flex h-12 w-full items-center justify-center
          gap-2 rounded-2xl bg-slate-950
          text-sm font-semibold text-white
          shadow-lg shadow-slate-950/10
          transition hover:bg-slate-800
          disabled:cursor-not-allowed
          disabled:opacity-60
        "
      >
        {pending ? (
          <>
            <Loader2
              size={17}
              className="animate-spin"
            />
            در حال ایجاد...
          </>
        ) : (
          <>
            <UserPlus size={17} />
            ایجاد کارمند
          </>
        )}
      </button>
    </form>
  );
}

function FormField({
  label,
  name,
  placeholder,
  type = "text",
  dir,
  required = false,
}: {
  label: string;
  name: string;
  placeholder: string;
  type?: string;
  dir?: "ltr" | "rtl";
  required?: boolean;
}) {
  return (
    <div>
      <label
        htmlFor={`employee-${name}`}
        className="mb-2 block text-xs font-semibold text-slate-600"
      >
        {label}

        {required ? (
          <span className="mr-1 text-red-500">*</span>
        ) : null}
      </label>

      <input
        id={`employee-${name}`}
        name={name}
        type={type}
        placeholder={placeholder}
        dir={dir}
        required={required}
        autoComplete={
          name === "password"
            ? "new-password"
            : "off"
        }
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
  );
}