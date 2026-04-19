import {
  AlertTriangle,
  CheckCircle2,
  PauseCircle,
  PlayCircle,
  Rows4,
  TimerReset,
} from "lucide-react";

const statCards = [
  {
    key: "total_jobs",
    label: "Total Jobs",
    icon: Rows4,
    accent: "from-ink-900/90 to-ink-700/80 text-white dark:from-slate-100 dark:to-slate-300 dark:text-slate-950",
  },
  {
    key: "enabled_jobs",
    label: "Enabled Jobs",
    icon: PlayCircle,
    accent: "from-mist-400 to-mist-600 text-white",
  },
  {
    key: "disabled_jobs",
    label: "Disabled Jobs",
    icon: PauseCircle,
    accent: "from-slate-400 to-slate-600 text-white",
  },
  {
    key: "running_jobs",
    label: "Currently Running",
    icon: TimerReset,
    accent: "from-amber-400 to-orange-500 text-white",
  },
  {
    key: "failed_jobs",
    label: "Failed Jobs",
    icon: AlertTriangle,
    accent: "from-ember-400 to-ember-600 text-white",
  },
  {
    key: "successful_runs_today",
    label: "Successful Runs Today",
    icon: CheckCircle2,
    accent: "from-emerald-400 to-emerald-600 text-white",
  },
];

export function DashboardStats({ stats, loading }) {
  return (
    <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {statCards.map((card) => {
        const Icon = card.icon;

        return (
          <article key={card.key} className="panel overflow-hidden p-5">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-xs font-medium uppercase tracking-[0.22em] text-ink-500 dark:text-slate-400">
                  {card.label}
                </p>
                <p className="mt-3 text-3xl font-bold tracking-tight text-ink-900 dark:text-white">
                  {loading ? "…" : stats?.[card.key] ?? 0}
                </p>
              </div>
              <div
                className={`flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br ${card.accent}`}
              >
                <Icon className="h-6 w-6" />
              </div>
            </div>
          </article>
        );
      })}
    </section>
  );
}
