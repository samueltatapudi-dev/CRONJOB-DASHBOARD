import {
  Copy,
  Eye,
  Pencil,
  Play,
  Power,
  RefreshCcw,
  Trash2,
} from "lucide-react";

import {
  copyText,
  formatDateTime,
  formatDuration,
  formatNextRun,
  truncateText,
} from "../utils/format.js";
import { StatusBadge } from "./StatusBadge.jsx";

function ActionButtons({ job, onRunNow, onToggleEnabled, onEdit, onDelete, onViewLogs, onToast }) {
  return (
    <div className="flex flex-wrap gap-2">
      <button
        type="button"
        className="btn-ghost px-2 py-1"
        onClick={() => onRunNow(job)}
        disabled={job.is_running}
      >
        <Play className="h-4 w-4" />
        Run Now
      </button>
      <button
        type="button"
        className="btn-ghost px-2 py-1"
        onClick={() => onToggleEnabled(job)}
      >
        {job.enabled ? <Power className="h-4 w-4" /> : <RefreshCcw className="h-4 w-4" />}
        {job.enabled ? "Pause" : "Resume"}
      </button>
      <button type="button" className="btn-ghost px-2 py-1" onClick={() => onEdit(job)}>
        <Pencil className="h-4 w-4" />
        Edit
      </button>
      <button type="button" className="btn-ghost px-2 py-1" onClick={() => onViewLogs(job)}>
        <Eye className="h-4 w-4" />
        Logs
      </button>
      <button
        type="button"
        className="btn-ghost px-2 py-1"
        onClick={async () => {
          await copyText(job.command);
          onToast({
            title: "Copied command",
            description: `${job.name} command copied to clipboard.`,
            tone: "success",
          });
        }}
      >
        <Copy className="h-4 w-4" />
        Copy
      </button>
      <button type="button" className="btn-ghost px-2 py-1 text-ember-700 dark:text-ember-200" onClick={() => onDelete(job)}>
        <Trash2 className="h-4 w-4" />
        Delete
      </button>
    </div>
  );
}

function Pagination({ page, pageCount, onPageChange }) {
  if (pageCount <= 1) {
    return null;
  }

  return (
    <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
      <p className="text-sm text-ink-600 dark:text-slate-400">
        Page {page} of {pageCount}
      </p>
      <div className="flex items-center gap-2">
        <button
          type="button"
          className="btn-secondary"
          onClick={() => onPageChange(page - 1)}
          disabled={page === 1}
        >
          Previous
        </button>
        <button
          type="button"
          className="btn-secondary"
          onClick={() => onPageChange(page + 1)}
          disabled={page === pageCount}
        >
          Next
        </button>
      </div>
    </div>
  );
}

export function JobTable({
  jobs,
  totalCount,
  page,
  pageCount,
  onPageChange,
  onRunNow,
  onToggleEnabled,
  onEdit,
  onDelete,
  onViewLogs,
  onToast,
}) {
  return (
    <section className="panel overflow-hidden p-4 sm:p-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.22em] text-ink-500 dark:text-slate-400">
            2. Current Cron Jobs
          </p>
          <h2 className="mt-2 text-2xl font-bold tracking-tight text-ink-900 dark:text-white">
            Jobs overview
          </h2>
        </div>
        <p className="text-sm text-ink-600 dark:text-slate-400">
          Showing {jobs.length} of {totalCount} jobs
        </p>
      </div>

      <div className="mt-6 hidden overflow-x-auto lg:block">
        <table className="min-w-[1120px] table-fixed border-separate border-spacing-y-3 text-left">
          <thead>
            <tr className="text-xs uppercase tracking-[0.18em] text-ink-500 dark:text-slate-400">
              <th className="px-3 py-2">Job</th>
              <th className="px-3 py-2">Schedule</th>
              <th className="px-3 py-2">Command</th>
              <th className="px-3 py-2">Status</th>
              <th className="px-3 py-2">Last / Next</th>
              <th className="px-3 py-2">Metrics</th>
              <th className="px-3 py-2">Output</th>
              <th className="px-3 py-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {jobs.map((job) => (
              <tr
                key={job.id}
                className="rounded-3xl bg-white/70 shadow-sm ring-1 ring-ink-100/70 dark:bg-slate-950/45 dark:ring-white/10"
              >
                <td className="align-top px-3 py-4">
                  <p className="font-semibold text-ink-900 dark:text-white">{job.name}</p>
                  <p className="mt-2 text-sm text-ink-600 dark:text-slate-400">
                    {truncateText(job.description || "No description", 90)}
                  </p>
                  <p className="mt-3 text-xs text-ink-500 dark:text-slate-500">
                    Created {formatDateTime(job.created_at)}
                    <br />
                    Updated {formatDateTime(job.updated_at)}
                  </p>
                </td>
                <td className="align-top px-3 py-4 text-sm text-ink-700 dark:text-slate-300">
                  <p>{job.frequency_type} × {job.interval_number}</p>
                  <p className="mt-2 font-mono text-xs text-ink-500 dark:text-slate-400">
                    {job.cron_expression}
                  </p>
                  <p className="mt-2 text-xs text-ink-500 dark:text-slate-500">
                    {job.enabled ? "Enabled" : "Disabled"}
                  </p>
                </td>
                <td className="align-top px-3 py-4">
                  <pre className="whitespace-pre-wrap break-words font-mono text-xs leading-6 text-ink-800 dark:text-slate-100">
                    {truncateText(job.command, 160)}
                  </pre>
                </td>
                <td className="align-top px-3 py-4">
                  <StatusBadge status={job.status} />
                </td>
                <td className="align-top px-3 py-4 text-sm text-ink-700 dark:text-slate-300">
                  <p>Last: {formatDateTime(job.last_run_at)}</p>
                  <p className="mt-2">Next: {formatNextRun(job.next_run_at)}</p>
                </td>
                <td className="align-top px-3 py-4 text-sm text-ink-700 dark:text-slate-300">
                  <p>Duration: {formatDuration(job.last_duration_ms)}</p>
                  <p className="mt-2">Exit code: {job.last_exit_code ?? "—"}</p>
                  <p className="mt-2">Runs: {job.total_runs}</p>
                  <p className="mt-2">Failures: {job.failure_count}</p>
                </td>
                <td className="align-top px-3 py-4">
                  <pre className="whitespace-pre-wrap break-words font-mono text-xs leading-6 text-ink-800 dark:text-slate-100">
                    {truncateText(job.latest_output || "No output yet", 160)}
                  </pre>
                </td>
                <td className="align-top px-3 py-4">
                  <ActionButtons
                    job={job}
                    onRunNow={onRunNow}
                    onToggleEnabled={onToggleEnabled}
                    onEdit={onEdit}
                    onDelete={onDelete}
                    onViewLogs={onViewLogs}
                    onToast={onToast}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-6 grid gap-4 lg:hidden">
        {jobs.map((job) => (
          <article key={job.id} className="panel-subtle p-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-lg font-semibold text-ink-900 dark:text-white">
                  {job.name}
                </h3>
                <p className="mt-1 text-sm text-ink-600 dark:text-slate-400">
                  {truncateText(job.description || "No description", 120)}
                </p>
              </div>
              <StatusBadge status={job.status} />
            </div>

            <div className="mt-4 grid gap-3 text-sm text-ink-700 dark:text-slate-300">
              <p><span className="font-medium">Schedule:</span> {job.frequency_type} × {job.interval_number}</p>
              <p><span className="font-medium">Cron:</span> <span className="font-mono">{job.cron_expression}</span></p>
              <p><span className="font-medium">Last run:</span> {formatDateTime(job.last_run_at)}</p>
              <p><span className="font-medium">Next run:</span> {formatNextRun(job.next_run_at)}</p>
              <p><span className="font-medium">Duration:</span> {formatDuration(job.last_duration_ms)}</p>
              <p><span className="font-medium">Exit code:</span> {job.last_exit_code ?? "—"}</p>
              <p><span className="font-medium">Output:</span> {truncateText(job.latest_output || "No output yet", 180)}</p>
            </div>

            <div className="mt-4">
              <ActionButtons
                job={job}
                onRunNow={onRunNow}
                onToggleEnabled={onToggleEnabled}
                onEdit={onEdit}
                onDelete={onDelete}
                onViewLogs={onViewLogs}
                onToast={onToast}
              />
            </div>
          </article>
        ))}
      </div>

      <Pagination page={page} pageCount={pageCount} onPageChange={onPageChange} />
    </section>
  );
}
