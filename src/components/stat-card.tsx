import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export function StatCard({
  label,
  value,
  hint,
  icon: Icon,
  variant = "default",
  trend,
  className,
}: {
  label: string;
  value: string | number;
  hint?: string;
  icon?: LucideIcon;
  variant?: "default" | "accent" | "ghost";
  trend?: { value: number; label?: string };
  className?: string;
}) {
  const accent = variant === "accent";
  return (
    <div
      className={cn(
        "group relative overflow-hidden rounded-2xl p-5 transition-all",
        accent
          ? "bg-gradient-to-br from-foreground to-foreground/90 text-background shadow-lg ring-1 ring-foreground/10"
          : variant === "ghost"
            ? "bg-muted/40 ring-1 ring-border/50"
            : "bg-card shadow-sm ring-1 ring-border hover:shadow-md hover:ring-border/80",
        className,
      )}
    >
      <div className="flex items-start justify-between">
        <p
          className={cn(
            "text-[11px] font-semibold uppercase tracking-[0.12em]",
            accent ? "text-background/70" : "text-muted-foreground",
          )}
        >
          {label}
        </p>
        {Icon ? (
          <div
            className={cn(
              "flex h-8 w-8 items-center justify-center rounded-lg",
              accent ? "bg-background/15 text-background" : "bg-muted text-muted-foreground",
            )}
          >
            <Icon className="h-4 w-4" />
          </div>
        ) : null}
      </div>
      <p className="mt-3 text-3xl font-bold tracking-tight tabular-nums">{value}</p>
      {hint || trend ? (
        <div className="mt-1.5 flex items-center gap-2 text-xs">
          {trend ? (
            <span
              className={cn(
                "inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 font-semibold tabular-nums",
                trend.value >= 0
                  ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                  : "bg-red-500/10 text-red-600 dark:text-red-400",
              )}
            >
              {trend.value >= 0 ? "↑" : "↓"} {Math.abs(trend.value)}%
            </span>
          ) : null}
          {hint ? (
            <span className={accent ? "text-background/70" : "text-muted-foreground"}>{hint}</span>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
