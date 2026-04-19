import { FolderSearch } from "lucide-react";

export function EmptyState({ title, description }) {
  return (
    <div className="panel flex min-h-64 flex-col items-center justify-center p-8 text-center">
      <div className="rounded-3xl bg-ink-100 p-4 text-ink-700 dark:bg-slate-800 dark:text-slate-200">
        <FolderSearch className="h-8 w-8" />
      </div>
      <h3 className="mt-5 text-xl font-semibold text-ink-900 dark:text-white">
        {title}
      </h3>
      <p className="mt-2 max-w-md text-sm text-ink-600 dark:text-slate-400">
        {description}
      </p>
    </div>
  );
}
