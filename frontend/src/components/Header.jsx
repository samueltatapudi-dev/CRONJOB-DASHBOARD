import { Activity, RefreshCw } from "lucide-react";

import { ThemeToggle } from "./ThemeToggle.jsx";

export function Header({
  theme,
  onToggleTheme,
  onRefresh,
  refreshing,
  lastUpdated,
}) {
  return (
    <header className="panel overflow-hidden p-6 sm:p-8">
      <div className="grid gap-6 lg:grid-cols-[1.35fr_0.65fr] lg:items-start">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-mist-200 bg-mist-50 px-3 py-1 text-xs font-medium uppercase tracking-[0.22em] text-mist-800 dark:border-mist-500/30 dark:bg-mist-500/10 dark:text-mist-100">
            <Activity className="h-3.5 w-3.5" />
            Local Cron Control Plane
          </div>
          <h1 className="mt-4 text-4xl font-bold tracking-tight text-ink-900 dark:text-white">
            Cron Job Dashboard
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-ink-700 dark:text-slate-300">
            Create, execute, pause, resume, and inspect cron jobs from one
            modern dashboard. Jobs are persisted in SQLite, polled by
            <span className="font-mono"> node-cron </span>
            every minute, and their exact cadence is enforced with saved
            interval metadata.
          </p>
        </div>

        <div className="flex flex-col gap-3 lg:items-end">
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              className="btn-secondary"
              onClick={onRefresh}
              disabled={refreshing}
            >
              <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
              Refresh
            </button>
            <ThemeToggle theme={theme} onToggle={onToggleTheme} />
          </div>

          <div className="rounded-2xl border border-ink-100 bg-white/70 px-4 py-3 text-sm text-ink-700 dark:border-white/10 dark:bg-slate-950/50 dark:text-slate-300">
            <p className="font-medium text-ink-900 dark:text-white">Auto-refresh</p>
            <p className="mt-1 text-xs uppercase tracking-[0.18em] opacity-70">
              every 5 seconds
            </p>
            <p className="mt-3 text-xs">
              Last updated:
              <span className="ml-2 font-mono">{lastUpdated}</span>
            </p>
          </div>
        </div>
      </div>
    </header>
  );
}
