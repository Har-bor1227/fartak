"use client";

import { FormEvent, useState } from "react";
import {
  ArrowLeft,
  Eye,
  EyeOff,
  Loader2,
  LockKeyhole,
  LogIn,
  UserRound,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function EmployeeLoginPage() {
  const router = useRouter();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  const [showPassword, setShowPassword] =
    useState(false);

  const [loading, setLoading] =
    useState(false);

  const [error, setError] =
    useState("");

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    setError("");
    setLoading(true);

    try {
      const response = await fetch(
        "/api/auth/login",
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            username,
            password,
          }),
        },
      );

      const data = await response.json();

      if (!response.ok) {
        setError(
          data?.message ||
            "نام کاربری یا رمز عبور اشتباه است.",
        );

        return;
      }

      router.replace(
        data.redirectTo || "/employee",
      );

      router.refresh();
    } catch {
      setError(
        "ارتباط با سرور برقرار نشد. دوباره تلاش کنید.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main
      dir="rtl"
      className="
        min-h-screen
        bg-[#f6f7f9]
        px-4 py-6
        sm:px-6 sm:py-10
      "
    >
      <div className="mx-auto flex min-h-[calc(100vh-3rem)] max-w-md items-center justify-center sm:min-h-[calc(100vh-5rem)]">
        <div className="w-full overflow-hidden rounded-[30px] border border-black/5 bg-white shadow-[0_25px_80px_rgba(15,23,42,0.08)]">
          <div className="p-6 sm:p-8">
            <div className="mb-8">
              <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-950 text-white shadow-lg shadow-slate-950/10">
                <LogIn
                  size={24}
                  strokeWidth={2}
                />
              </div>

              <h1 className="text-2xl font-bold tracking-tight text-slate-950">
                ورود کارکنان
              </h1>

              <p className="mt-2 text-sm leading-6 text-slate-500">
                برای ثبت حضور و مشاهده سوابق خود
                وارد حساب کاربری شوید.
              </p>
            </div>

            <form
              onSubmit={handleSubmit}
              className="space-y-5"
            >
              <div>
                <label
                  htmlFor="employee-username"
                  className="mb-2 block text-sm font-semibold text-slate-700"
                >
                  نام کاربری
                </label>

                <div className="relative">
                  <UserRound
                    size={18}
                    className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-slate-400"
                  />

                  <input
                    id="employee-username"
                    value={username}
                    onChange={(event) =>
                      setUsername(
                        event.target.value,
                      )
                    }
                    type="text"
                    autoComplete="username"
                    placeholder="نام کاربری شما"
                    disabled={loading}
                    className="
                      h-13 w-full
                      rounded-2xl
                      border border-slate-200
                      bg-slate-50
                      pr-11 pl-4
                      text-sm
                      outline-none
                      transition
                      placeholder:text-slate-400
                      focus:border-slate-400
                      focus:bg-white
                      focus:ring-4
                      focus:ring-slate-900/5
                    "
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="employee-password"
                  className="mb-2 block text-sm font-semibold text-slate-700"
                >
                  رمز عبور
                </label>

                <div className="relative">
                  <LockKeyhole
                    size={18}
                    className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-slate-400"
                  />

                  <input
                    id="employee-password"
                    value={password}
                    onChange={(event) =>
                      setPassword(
                        event.target.value,
                      )
                    }
                    type={
                      showPassword
                        ? "text"
                        : "password"
                    }
                    autoComplete="current-password"
                    placeholder="رمز عبور شما"
                    disabled={loading}
                    className="
                      h-13 w-full
                      rounded-2xl
                      border border-slate-200
                      bg-slate-50
                      px-12
                      text-sm
                      outline-none
                      transition
                      placeholder:text-slate-400
                      focus:border-slate-400
                      focus:bg-white
                      focus:ring-4
                      focus:ring-slate-900/5
                    "
                  />

                  <button
                    type="button"
                    onClick={() =>
                      setShowPassword(
                        (value) => !value,
                      )
                    }
                    disabled={loading}
                    className="
                      absolute left-3 top-1/2
                      flex h-9 w-9
                      -translate-y-1/2
                      items-center justify-center
                      rounded-xl
                      text-slate-400
                      transition
                      hover:bg-slate-100
                    "
                    aria-label={
                      showPassword
                        ? "پنهان کردن رمز"
                        : "نمایش رمز"
                    }
                  >
                    {showPassword ? (
                      <EyeOff size={18} />
                    ) : (
                      <Eye size={18} />
                    )}
                  </button>
                </div>
              </div>

              {error ? (
                <div
                  role="alert"
                  className="rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm leading-6 text-red-700"
                >
                  {error}
                </div>
              ) : null}

              <button
                type="submit"
                disabled={
                  loading ||
                  !username.trim() ||
                  !password
                }
                className="
                  flex h-13 w-full
                  items-center
                  justify-center
                  gap-2
                  rounded-2xl
                  bg-slate-950
                  text-sm font-semibold
                  text-white
                  shadow-lg
                  shadow-slate-950/10
                  transition
                  hover:bg-slate-800
                  disabled:cursor-not-allowed
                  disabled:opacity-50
                "
              >
                {loading ? (
                  <>
                    <Loader2
                      size={18}
                      className="animate-spin"
                    />
                    در حال ورود...
                  </>
                ) : (
                  <>
                    ورود به حساب
                    <ArrowLeft size={18} />
                  </>
                )}
              </button>
            </form>
          </div>

          <div className="border-t border-slate-100 bg-slate-50 px-6 py-4 text-center text-xs text-slate-400 sm:px-8">
            سامانه حضور و غیاب
          </div>
        </div>
      </div>
    </main>
  );
}