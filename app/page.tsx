import Link from "next/link";

export default function Home() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-zinc-50 px-4 py-8">
      <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-xl ring-1 ring-zinc-200 sm:p-10">
        <div className="text-center">
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900 sm:text-3xl">
            سامانه حضور و غیاب
          </h1>

          <p className="mt-3 text-sm leading-7 text-zinc-500">
            برای ورود، نوع حساب کاربری خود را انتخاب کنید.
          </p>
        </div>

        <div className="mt-8 grid gap-4">
          <Link
            href="/login"
            className="flex min-h-14 items-center justify-center rounded-2xl bg-zinc-900 px-6 text-base font-semibold text-white transition-all duration-200 hover:bg-zinc-800 active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:ring-offset-2"
          >
            ورود کارمندان
          </Link>

          <Link
            href="/admin/login"
            className="flex min-h-14 items-center justify-center rounded-2xl border border-zinc-300 bg-white px-6 text-base font-semibold text-zinc-900 transition-all duration-200 hover:border-zinc-400 hover:bg-zinc-50 active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-zinc-400 focus:ring-offset-2"
          >
            ورود مدیریت
          </Link>
        </div>
      </div>
    </main>
  );
}