const dateTimeFormatter = new Intl.DateTimeFormat(undefined, {
  dateStyle: "medium",
  timeStyle: "short",
});

function isValidDate(value) {
  const date = new Date(value);
  return !Number.isNaN(date.getTime());
}

export function formatDateTime(value, fallback = "Never") {
  if (!value || !isValidDate(value)) {
    return fallback;
  }

  return dateTimeFormatter.format(new Date(value));
}

export function formatDuration(durationMs) {
  if (durationMs == null) {
    return "—";
  }

  if (durationMs < 1000) {
    return `${durationMs} ms`;
  }

  const seconds = durationMs / 1000;

  if (seconds < 60) {
    return `${seconds.toFixed(1)} s`;
  }

  return `${(seconds / 60).toFixed(1)} min`;
}

export function truncateText(value, maxLength = 140) {
  if (!value) {
    return "—";
  }

  return value.length > maxLength ? `${value.slice(0, maxLength)}…` : value;
}

export function formatNextRun(value) {
  if (!value || !isValidDate(value)) {
    return "Unscheduled";
  }

  const date = new Date(value);
  const now = new Date();

  if (date < now) {
    return `Overdue since ${formatDateTime(value)}`;
  }

  return formatDateTime(value);
}

export function copyText(value) {
  return navigator.clipboard.writeText(value ?? "");
}

export function downloadTextFile(filename, content) {
  const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");

  anchor.href = url;
  anchor.download = filename;
  anchor.click();

  URL.revokeObjectURL(url);
}

export function sortJobs(jobs, sortBy) {
  const statusOrder = {
    Running: 0,
    Failed: 1,
    Enabled: 2,
    Success: 3,
    Disabled: 4,
  };

  return [...jobs].sort((left, right) => {
    switch (sortBy) {
      case "name":
        return left.name.localeCompare(right.name);
      case "last_run_at":
        return new Date(right.last_run_at ?? 0) - new Date(left.last_run_at ?? 0);
      case "status":
        return (statusOrder[left.status] ?? 99) - (statusOrder[right.status] ?? 99);
      case "next_run_at":
      default:
        return new Date(left.next_run_at ?? 0) - new Date(right.next_run_at ?? 0);
    }
  });
}
