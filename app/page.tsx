import Link from "next/link";
import {
  ArrowLeft,
  ShieldCheck,
  UserRound,
  Users,
} from "lucide-react";

export default function Home() {
  return (
    <main
      dir="rtl"
      className="
        flex
        min-h-screen
        items-center
        justify-center
        bg-[#f6f7f9]
        px-4
        py-8
        sm:px-6
      "
    >
      <div
        className="
          w-full
          max-w-md
          overflow-hidden
          rounded-[28px]
          border
          border-slate-200/80
          bg-white
          shadow-[0_20px_60px_rgba(15,23,42,0.08)]
        "
      >
        <div className="p-6 sm:p-8">
          <div className="text-center">
            <div
              className="
                mx-auto
                flex
                h-14
                w-14
                items-center
                justify-center
                rounded-2xl
                bg-slate-950
                text-white
                shadow-[0_10px_25px_rgba(15,23,42,0.15)]
              "
            >
              <Users size={24} />
            </div>

            <h1 className="mt-5 text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">
              سامانه حضور و غیاب
            </h1>

            <p className="mx-auto mt-3 max-w-sm text-sm leading-7 text-slate-500">
              برای ورود به سامانه، نوع حساب کاربری خود را انتخاب کنید.
            </p>
          </div>

          <div className="mt-8 space-y-3">
            <Link
              href="/login"
              className="
                group
                flex
                min-h-14
                w-full
                items-center
                justify-between
                gap-4
                rounded-2xl
                bg-slate-950
                px-5
                text-white
                shadow-[0_10px_25px_rgba(15,23,42,0.12)]
                transition-all
                duration-200
                hover:bg-slate-900
                hover:shadow-[0_14px_30px_rgba(15,23,42,0.16)]
                active:scale-[0.985]
                focus:outline-none
                focus:ring-4
                focus:ring-slate-950/10
              "
            >
              <span className="flex min-w-0 items-center gap-3">
                <span
                  className="
                    flex
                    h-10
                    w-10
                    shrink-0
                    items-center
                    justify-center
                    rounded-xl
                    bg-white/10
                    text-white
                  "
                >
                  <UserRound size={19} />
                </span>

                <span className="text-right">
                  <span className="block text-sm font-bold text-white">
                    ورود کارمندان
                  </span>

                  <span className="mt-0.5 block text-[10px] font-medium text-white/60">
                    ورود به حساب کارمندی
                  </span>
                </span>
              </span>

              <ArrowLeft
                size={18}
                className="
                  shrink-0
                  text-white/50
                  transition-transform
                  duration-200
                  group-hover:-translate-x-1
                "
              />
            </Link>

            <Link
              href="/admin/login"
              className="
                group
                flex
                min-h-14
                w-full
                items-center
                justify-between
                gap-4
                rounded-2xl
                border
                border-slate-200
                bg-white
                px-5
                text-slate-950
                transition-all
                duration-200
                hover:border-slate-300
                hover:bg-slate-50
                active:scale-[0.985]
                focus:outline-none
                focus:ring-4
                focus:ring-slate-950/5
              "
            >
              <span className="flex min-w-0 items-center gap-3">
                <span
                  className="
                    flex
                    h-10
                    w-10
                    shrink-0
                    items-center
                    justify-center
                    rounded-xl
                    bg-slate-100
                    text-slate-700
                  "
                >
                  <ShieldCheck size={19} />
                </span>

                <span className="text-right">
                  <span className="block text-sm font-bold text-slate-900">
                    ورود مدیریت
                  </span>

                  <span className="mt-0.5 block text-[10px] font-medium text-slate-400">
                    ورود به پنل مدیریت
                  </span>
                </span>
              </span>

              <ArrowLeft
                size={18}
                className="
                  shrink-0
                  text-slate-300
                  transition-transform
                  duration-200
                  group-hover:-translate-x-1
                  group-hover:text-slate-500
                "
              />
            </Link>
          </div>
        </div>

        <div
          className="
            border-t
            border-slate-100
            bg-slate-50/70
            px-6
            py-4
            text-center
          "
        >
          <p className="text-[10px] font-medium text-slate-400">
            سامانه مدیریت حضور و غیاب
          </p>
        </div>
      </div>
    </main>
  );
}