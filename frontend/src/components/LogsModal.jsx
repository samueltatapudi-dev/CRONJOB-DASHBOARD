import { useEffect, useState } from "react";
import {
  ChevronDown,
  ChevronUp,
  Copy,
  Download,
  RefreshCw,
  X,
} from "lucide-react";

import { copyText, downloadTextFile, formatDateTime, formatDuration, truncateText } from "../utils/format.js";
import { StatusBadge } from "./StatusBadge.jsx";

function buildLogText(log) {
  return [
    `Status: ${log.status}`,
    `Started: ${log.started_at}`,
    `Finished: ${log.finished_at ?? "n/a"}`,
    `Duration: ${log.duration_ms ?? "n/a"} ms`,
    `Exit code: ${log.exit_code ?? "n/a"}`,
    "",
    "STDOUT",
    log.stdout || "(empty)",
    "",
    "STDERR",
    log.stderr || "(empty)",
  ].join("\n");
}

export function LogsModal({
  open,
  job,
  logs,
  loading,
  refreshing,
  onClose,
  onRefresh,
  onToast,
}) {
  const [expanded, setExpanded] = useState({});

  useEffect(() => {
    setExpanded({});
  }, [job?.id, open]);

  useEffect(() => {
    if (!open) {
      return undefined;
    }

    function handleKeyDown(event) {
      if (event.key === "Escape") {
        onClose();
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose]);

  if (!open || !job) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-40 overflow-y-auto bg-slate-950/60 p-4 backdrop-blur-sm">
      <div className="mx-auto mt-6 w-full max-w-5xl">
        <div className="panel p-6 sm:p-8">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-xs font-medium uppercase tracking-[0.2em] text-ink-500 dark:text-slate-400">
                Execution history
              </p>
              <h3 className="mt-2 text-2xl font-bold text-ink-900 dark:text-white">
                {job.name}
              </h3>
              <p className="mt-2 max-w-2xl text-sm text-ink-700 dark:text-slate-300">
                Logs are stored in reverse chronological order and persist in
                SQLite. Stdout and stderr are preserved separately and combined
                output is available for copying or download.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <button type="button" className="btn-secondary" onClick={onRefresh}>
                <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
                Refresh
              </button>
              <button type="button" className="btn-ghost px-2 py-1" onClick={onClose}>
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>

          <div className="mt-6 space-y-4">
            {loading ? (
              <div className="panel-subtle p-6 text-sm text-ink-600 dark:text-slate-300">
                Loading execution logs…
              </div>
            ) : logs.length === 0 ? (
              <div className="panel-subtle p-6 text-sm text-ink-600 dark:text-slate-300">
                No execution history yet for this job.
              </div>
            ) : (
              logs.map((log) => {
                const isExpanded = Boolean(expanded[log.id]);
                const combinedOutput = log.combined_output || buildLogText(log);

                return (
                  <article
                    key={log.id}
                    className={`panel-subtle p-4 ${
                      log.status === "Failed"
                        ? "border-ember-200/80 dark:border-ember-500/20"
                        : ""
                    }`}
                  >
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div>
                        <div className="flex flex-wrap items-center gap-3">
                          <StatusBadge status={log.status} />
                          <p className="text-sm font-medium text-ink-900 dark:text-white">
                            {formatDateTime(log.started_at)}
                          </p>
                        </div>
                        <p className="mt-2 text-sm text-ink-600 dark:text-slate-400">
                          Finished: {formatDateTime(log.finished_at, "Still running")}
                          {" · "}
                          Duration: {formatDuration(log.duration_ms)}
                          {" · "}
                          Exit code: {log.exit_code ?? "—"}
                        </p>
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          type="button"
                          className="btn-ghost px-2 py-1"
                          onClick={async () => {
                            await copyText(buildLogText(log));
                            onToast({
                              title: "Copied log output",
                              description: "The selected execution log is now on your clipboard.",
                              tone: "success",
                            });
                          }}
                        >
                          <Copy className="h-4 w-4" />
                          Copy
                        </button>
                        <button
                          type="button"
                          className="btn-ghost px-2 py-1"
                          onClick={() =>
                            downloadTextFile(
                              `${job.name.replace(/\s+/g, "-").toLowerCase()}-${log.id}.txt`,
                              buildLogText(log),
                            )
                          }
                        >
                          <Download className="h-4 w-4" />
                          Download
                        </button>
                        <button
                          type="button"
                          className="btn-ghost px-2 py-1"
                          onClick={() =>
                            setExpanded((current) => ({
                              ...current,
                              [log.id]: !current[log.id],
                            }))
                          }
                        >
                          {isExpanded ? (
                            <ChevronUp className="h-4 w-4" />
                          ) : (
                            <ChevronDown className="h-4 w-4" />
                          )}
                          {isExpanded ? "Collapse" : "Expand"}
                        </button>
                      </div>
                    </div>

                    <div className="mt-4 grid gap-3 lg:grid-cols-2">
                      <div className="rounded-2xl border border-mist-100 bg-mist-50/70 p-4 dark:border-mist-500/20 dark:bg-mist-500/10">
                        <p className="text-xs font-medium uppercase tracking-[0.18em] text-ink-500 dark:text-slate-400">
                          Stdout
                        </p>
                        <pre className="mt-3 whitespace-pre-wrap break-words font-mono text-xs leading-6 text-ink-800 dark:text-slate-100">
                          {isExpanded ? log.stdout || "(empty)" : truncateText(log.stdout || "(empty)", 260)}
                        </pre>
                      </div>
                      <div className="rounded-2xl border border-ember-100 bg-ember-50/70 p-4 dark:border-ember-500/20 dark:bg-ember-500/10">
                        <p className="text-xs font-medium uppercase tracking-[0.18em] text-ink-500 dark:text-slate-400">
                          Stderr
                        </p>
                        <pre className="mt-3 whitespace-pre-wrap break-words font-mono text-xs leading-6 text-ink-800 dark:text-slate-100">
                          {isExpanded ? log.stderr || "(empty)" : truncateText(log.stderr || "(empty)", 260)}
                        </pre>
                      </div>
                    </div>

                    {!isExpanded ? (
                      <div className="mt-4 rounded-2xl border border-ink-100 bg-white/70 p-4 dark:border-white/10 dark:bg-slate-950/40">
                        <p className="text-xs font-medium uppercase tracking-[0.18em] text-ink-500 dark:text-slate-400">
                          Combined preview
                        </p>
                        <pre className="mt-3 whitespace-pre-wrap break-words font-mono text-xs leading-6 text-ink-800 dark:text-slate-100">
                          {truncateText(combinedOutput || "(empty)", 420)}
                        </pre>
                      </div>
                    ) : null}
                  </article>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
