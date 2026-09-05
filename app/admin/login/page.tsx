"use client";

import { FormEvent, useState } from "react";
import { Eye, EyeOff, Loader2, LockKeyhole, LogIn, UserRound } from "lucide-react";
import { useRouter } from "next/navigation";

export default function AdminLoginPage() {
  const router = useRouter();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setError("");
    setLoading(true);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          username,
          password,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(
          data?.message ||
            "نام کاربری یا رمز عبور اشتباه است.",
        );

        return;
      }

      router.replace("/admin");
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
        bg-[#f7f8fa]
        px-4
        py-8
        sm:px-6
      "
    >
      <div className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-md items-center justify-center">
        <div
          className="
            w-full
            overflow-hidden
            rounded-[28px]
            border
            border-black/5
            bg-white
            shadow-[0_20px_70px_rgba(15,23,42,0.08)]
          "
        >
          <div className="px-6 pb-8 pt-8 sm:px-8">
            <div className="mb-8">
              <div
                className="
                  mb-5
                  flex
                  h-14
                  w-14
                  items-center
                  justify-center
                  rounded-2xl
                  bg-slate-900
                  text-white
                  shadow-lg
                  shadow-slate-900/10
                "
              >
                <LogIn size={24} strokeWidth={2} />
              </div>

              <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                ورود به پنل مدیریت
              </h1>

              <p className="mt-2 text-sm leading-6 text-slate-500">
                برای مدیریت حضور و غیاب وارد حساب کاربری خود شوید.
              </p>
            </div>

            <form
              onSubmit={handleSubmit}
              className="space-y-5"
            >
              <div>
                <label
                  htmlFor="username"
                  className="mb-2 block text-sm font-medium text-slate-700"
                >
                  نام کاربری
                </label>

                <div className="relative">
                  <UserRound
                    size={18}
                    className="
                      pointer-events-none
                      absolute
                      right-4
                      top-1/2
                      -translate-y-1/2
                      text-slate-400
                    "
                  />

                  <input
                    id="username"
                    name="username"
                    type="text"
                    autoComplete="username"
                    value={username}
                    onChange={(event) =>
                      setUsername(event.target.value)
                    }
                    placeholder="نام کاربری"
                    disabled={loading}
                    className="
                      h-13
                      w-full
                      rounded-2xl
                      border
                      border-slate-200
                      bg-slate-50
                      pr-11
                      pl-4
                      text-sm
                      text-slate-900
                      outline-none
                      transition
                      placeholder:text-slate-400
                      focus:border-slate-400
                      focus:bg-white
                      focus:ring-4
                      focus:ring-slate-900/5
                      disabled:cursor-not-allowed
                      disabled:opacity-60
                    "
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="password"
                  className="mb-2 block text-sm font-medium text-slate-700"
                >
                  رمز عبور
                </label>

                <div className="relative">
                  <LockKeyhole
                    size={18}
                    className="
                      pointer-events-none
                      absolute
                      right-4
                      top-1/2
                      -translate-y-1/2
                      text-slate-400
                    "
                  />

                  <input
                    id="password"
                    name="password"
                    type={
                      showPassword ? "text" : "password"
                    }
                    autoComplete="current-password"
                    value={password}
                    onChange={(event) =>
                      setPassword(event.target.value)
                    }
                    placeholder="رمز عبور"
                    disabled={loading}
                    className="
                      h-13
                      w-full
                      rounded-2xl
                      border
                      border-slate-200
                      bg-slate-50
                      px-12
                      text-sm
                      text-slate-900
                      outline-none
                      transition
                      placeholder:text-slate-400
                      focus:border-slate-400
                      focus:bg-white
                      focus:ring-4
                      focus:ring-slate-900/5
                      disabled:cursor-not-allowed
                      disabled:opacity-60
                    "
                  />

                  <button
                    type="button"
                    onClick={() =>
                      setShowPassword((value) => !value)
                    }
                    disabled={loading}
                    aria-label={
                      showPassword
                        ? "پنهان کردن رمز"
                        : "نمایش رمز"
                    }
                    className="
                      absolute
                      left-3
                      top-1/2
                      flex
                      h-9
                      w-9
                      -translate-y-1/2
                      items-center
                      justify-center
                      rounded-xl
                      text-slate-400
                      transition
                      hover:bg-slate-100
                      hover:text-slate-700
                    "
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
                  className="
                    rounded-2xl
                    border
                    border-red-100
                    bg-red-50
                    px-4
                    py-3
                    text-sm
                    leading-6
                    text-red-700
                  "
                >
                  {error}
                </div>
              ) : null}

              <button
                type="submit"
                disabled={loading}
                className="
                  flex
                  h-13
                  w-full
                  items-center
                  justify-center
                  gap-2
                  rounded-2xl
                  bg-slate-900
                  px-5
                  text-sm
                  font-semibold
                  text-white
                  shadow-lg
                  shadow-slate-900/10
                  transition
                  hover:bg-slate-800
                  active:scale-[0.99]
                  disabled:cursor-not-allowed
                  disabled:opacity-60
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
                    ورود به پنل
                    <LogIn size={18} />
                  </>
                )}
              </button>
            </form>
          </div>

          <div
            className="
              border-t
              border-slate-100
              bg-slate-50
              px-6
              py-4
              text-center
              text-xs
              text-slate-400
              sm:px-8
            "
          >
            سامانه مدیریت حضور و غیاب
          </div>
        </div>
      </div>
    </main>
  );
}