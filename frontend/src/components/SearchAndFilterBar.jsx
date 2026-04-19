import { Search, SlidersHorizontal } from "lucide-react";

const sortOptions = [
  { value: "next_run_at", label: "Next run" },
  { value: "last_run_at", label: "Last run" },
  { value: "name", label: "Name" },
  { value: "status", label: "Status" },
];

const statusOptions = ["All", "Enabled", "Disabled", "Running", "Success", "Failed"];

export function SearchAndFilterBar({
  search,
  statusFilter,
  sortBy,
  onSearchChange,
  onStatusChange,
  onSortChange,
}) {
  return (
    <section className="panel p-4 sm:p-5">
      <div className="grid gap-4 xl:grid-cols-[1.1fr_0.45fr_0.45fr]">
        <label className="relative block">
          <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400 dark:text-slate-500" />
          <input
            className="field pl-11"
            value={search}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="Search by job name, description, or command"
          />
        </label>

        <label className="block">
          <span className="mb-2 flex items-center gap-2 text-xs font-medium uppercase tracking-[0.18em] text-ink-500 dark:text-slate-400">
            <SlidersHorizontal className="h-3.5 w-3.5" />
            Status
          </span>
          <select
            className="field"
            value={statusFilter}
            onChange={(event) => onStatusChange(event.target.value)}
          >
            {statusOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="mb-2 text-xs font-medium uppercase tracking-[0.18em] text-ink-500 dark:text-slate-400">
            Sort by
          </span>
          <select
            className="field"
            value={sortBy}
            onChange={(event) => onSortChange(event.target.value)}
          >
            {sortOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
      </div>
    </section>
  );
}
