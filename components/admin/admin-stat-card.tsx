import type { LucideIcon } from "lucide-react";

type AdminStatCardProps = {
  title: string;
  value: string | number;
  description: string;
  icon: LucideIcon;
  tone?: "dark" | "blue" | "green" | "amber";
};

const toneClasses = {
  dark: {
    icon:
      "bg-slate-950 text-white shadow-lg shadow-slate-950/10",
    accent:
      "bg-slate-950",
  },

  blue: {
    icon:
      "bg-blue-50 text-blue-700",
    accent:
      "bg-blue-600",
  },

  green: {
    icon:
      "bg-emerald-50 text-emerald-700",
    accent:
      "bg-emerald-600",
  },

  amber: {
    icon:
      "bg-amber-50 text-amber-700",
    accent:
      "bg-amber-500",
  },
};

export default function AdminStatCard({
  title,
  value,
  description,
  icon: Icon,
  tone = "dark",
}: AdminStatCardProps) {
  const styles =
    toneClasses[tone];

  return (
    <div
      className="
        group
        relative
        min-w-0
        overflow-hidden
        rounded-[26px]
        border
        border-slate-200/80
        bg-white
        p-4
        shadow-[0_10px_35px_rgba(15,23,42,0.04)]
        transition-all
        duration-300
        hover:-translate-y-0.5
        hover:shadow-[0_18px_45px_rgba(15,23,42,0.07)]
        sm:p-5
      "
    >
      <div
        className="
          absolute
          -left-8
          -top-8
          h-24
          w-24
          rounded-full
          bg-slate-100/50
          blur-2xl
          transition
          duration-300
          group-hover:scale-125
        "
      />

      <div className="relative flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-[11px] font-semibold text-slate-400 sm:text-xs">
            {title}
          </p>

          <p className="mt-2.5 break-words text-[27px] font-bold tracking-tight text-slate-950 sm:text-3xl">
            {value}
          </p>

          <p className="mt-1.5 truncate text-[10px] text-slate-400 sm:text-[11px]">
            {description}
          </p>
        </div>

        <div
          className={`
            flex
            h-10
            w-10
            shrink-0
            items-center
            justify-center
            rounded-[14px]
            ${styles.icon}
            transition-transform
            duration-300
            group-hover:scale-105
            sm:h-11
            sm:w-11
          `}
        >
          <Icon
            size={19}
            strokeWidth={2.1}
          />
        </div>
      </div>

      <div
        className={`
          absolute
          bottom-0
          right-0
          h-1
          w-16
          rounded-full
          opacity-70
          ${styles.accent}
          sm:w-20
        `}
      />
    </div>
  );
}