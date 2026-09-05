"use client";

import {
  LogOut,
  Loader2,
} from "lucide-react";
import { useState } from "react";
import { useRouter } from "next/navigation";

type LogoutButtonProps = {
  mobile?: boolean;
};

export default function LogoutButton({
  mobile = false,
}: LogoutButtonProps) {
  const router = useRouter();

  const [loading, setLoading] =
    useState(false);

  async function handleLogout() {
    if (loading) {
      return;
    }

    setLoading(true);

    try {
      await fetch("/api/auth/logout", {
        method: "POST",
      });

      router.replace("/login");
      router.refresh();
    } catch {
      setLoading(false);
    }
  }

  if (mobile) {
    return (
      <button
        type="button"
        onClick={handleLogout}
        disabled={loading}
        className="flex flex-col items-center justify-center gap-1.5 py-1.5 disabled:opacity-60"
      >
        <div className="flex h-9 w-12 items-center justify-center rounded-2xl text-slate-400 transition hover:bg-red-50 hover:text-red-600">
          {loading ? (
            <Loader2
              size={18}
              className="animate-spin"
            />
          ) : (
            <LogOut size={18} />
          )}
        </div>

        <span className="text-[10px] font-semibold text-slate-400">
          خروج
        </span>
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={handleLogout}
      disabled={loading}
      className="flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium text-slate-500 transition hover:bg-red-50 hover:text-red-600 disabled:opacity-60"
    >
      {loading ? (
        <Loader2
          size={18}
          className="animate-spin"
        />
      ) : (
        <LogOut size={18} />
      )}

      خروج
    </button>
  );
}