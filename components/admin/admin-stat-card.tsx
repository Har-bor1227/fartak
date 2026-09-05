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
    icon: "bg-slate-900 text-white",
    accent: "bg-slate-900",
  },
  blue: {
    icon: "bg-blue-50 text-blue-700",
    accent: "bg-blue-600",
  },
  green: {
    icon: "bg-emerald-50 text-emerald-700",
    accent: "bg-emerald-600",
  },
  amber: {
    icon: "bg-amber-50 text-amber-700",
    accent: "bg-amber-500",
  },
};

export default function AdminStatCard({
  title,
  value,
  description,
  icon: Icon,
  tone = "dark",
}: AdminStatCardProps) {
  const styles = toneClasses[tone];

  return (
    <div className="group relative overflow-hidden rounded-[24px] border border-slate-200/80 bg-white p-5 shadow-[0_8px_30px_rgba(15,23,42,0.04)] transition duration-300 hover:-translate-y-0.5 hover:shadow-[0_15px_40px_rgba(15,23,42,0.07)]">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-slate-500">
            {title}
          </p>

          <p className="mt-3 text-3xl font-bold tracking-tight text-slate-950">
            {value}
          </p>

          <p className="mt-2 text-xs text-slate-400">
            {description}
          </p>
        </div>

        <div
          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${styles.icon}`}
        >
          <Icon size={20} strokeWidth={2} />
        </div>
      </div>

      <div
        className={`absolute bottom-0 right-0 h-1 w-20 rounded-full ${styles.accent} opacity-70`}
      />
    </div>
  );
}