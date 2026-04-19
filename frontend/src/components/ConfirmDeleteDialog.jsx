import { AlertTriangle, X } from "lucide-react";

export function ConfirmDeleteDialog({ open, job, deleting, onClose, onConfirm }) {
  if (!open || !job) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm">
      <div className="panel w-full max-w-lg p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="rounded-2xl bg-ember-100 p-3 text-ember-700 dark:bg-ember-500/15 dark:text-ember-200">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-xl font-semibold text-ink-900 dark:text-white">
                Delete job
              </h3>
              <p className="mt-2 text-sm text-ink-700 dark:text-slate-300">
                This will remove <span className="font-semibold">{job.name}</span>
                {" "}and its log history from SQLite.
              </p>
            </div>
          </div>
          <button type="button" className="btn-ghost px-2 py-1" onClick={onClose}>
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-6 flex flex-wrap gap-3">
          <button
            type="button"
            className="btn-primary bg-ember-600 hover:bg-ember-500 dark:bg-ember-500 dark:text-white dark:hover:bg-ember-400"
            onClick={onConfirm}
            disabled={deleting}
          >
            {deleting ? "Deleting…" : "Delete Job"}
          </button>
          <button type="button" className="btn-secondary" onClick={onClose}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
