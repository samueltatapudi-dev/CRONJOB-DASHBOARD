const badgeClasses = {
  Enabled:
    "bg-mist-100 text-mist-900 ring-mist-200 dark:bg-mist-500/15 dark:text-mist-100 dark:ring-mist-500/30",
  Disabled:
    "bg-slate-200 text-slate-900 ring-slate-300 dark:bg-slate-500/15 dark:text-slate-100 dark:ring-slate-500/30",
  Running:
    "bg-amber-100 text-amber-900 ring-amber-200 dark:bg-amber-500/15 dark:text-amber-100 dark:ring-amber-500/30",
  Success:
    "bg-emerald-100 text-emerald-900 ring-emerald-200 dark:bg-emerald-500/15 dark:text-emerald-100 dark:ring-emerald-500/30",
  Failed:
    "bg-ember-100 text-ember-900 ring-ember-200 dark:bg-ember-500/15 dark:text-ember-100 dark:ring-ember-500/30",
};

export function StatusBadge({ status }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ring-1 ${
        badgeClasses[status] ?? badgeClasses.Disabled
      }`}
    >
      {status}
    </span>
  );
}
