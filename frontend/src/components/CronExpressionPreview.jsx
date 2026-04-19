import { Copy, Info } from "lucide-react";

import { copyText, formatDateTime } from "../utils/format.js";

export function CronExpressionPreview({ preview, onToast }) {
  return (
    <div className="panel-subtle p-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs font-medium uppercase tracking-[0.18em] text-ink-500 dark:text-slate-400">
              Generated Cron Expression
            </p>
            <button
              type="button"
              className="btn-ghost px-2 py-1 text-xs"
              onClick={async () => {
                await copyText(preview.cronExpression);
                onToast("Copied cron expression.");
              }}
            >
              <Copy className="h-3.5 w-3.5" />
              Copy
            </button>
          </div>
          <div className="field-readonly mt-2 font-mono text-sm">
            {preview.cronExpression}
          </div>
        </div>

        <div>
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-ink-500 dark:text-slate-400">
            Human-readable Schedule
          </p>
          <div className="field-readonly mt-2">{preview.humanReadable}</div>
        </div>
      </div>

      <div className="mt-4 grid gap-3 lg:grid-cols-[1fr_auto] lg:items-start">
        <div className="rounded-2xl border border-mist-100 bg-mist-50/80 px-4 py-3 text-sm text-ink-700 dark:border-mist-500/20 dark:bg-mist-500/10 dark:text-slate-200">
          <p className="flex items-start gap-2">
            <Info className="mt-0.5 h-4 w-4 flex-none text-mist-700 dark:text-mist-200" />
            <span>{preview.notes}</span>
          </p>
        </div>
        <div className="rounded-2xl border border-ink-100 bg-white/70 px-4 py-3 text-sm dark:border-white/10 dark:bg-slate-950/50">
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-ink-500 dark:text-slate-400">
            First Run
          </p>
          <p className="mt-2 font-medium text-ink-900 dark:text-white">
            {formatDateTime(preview.nextRunAt, "Waiting for valid input")}
          </p>
        </div>
      </div>
    </div>
  );
}
