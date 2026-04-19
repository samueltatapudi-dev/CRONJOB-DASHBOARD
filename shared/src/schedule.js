import {
  FREQUENCY_LABELS,
  FREQUENCY_TYPES,
  POLLING_EXPRESSION,
} from "./constants.js";

const MINUTE_MS = 60 * 1000;
const HOUR_MS = 60 * MINUTE_MS;
const DAY_MS = 24 * HOUR_MS;
const WEEK_MS = 7 * DAY_MS;

function toDate(value) {
  if (value instanceof Date) {
    return new Date(value);
  }

  if (!value) {
    return null;
  }

  return new Date(value);
}

function isValidDateValue(value) {
  const date = toDate(value);
  return Boolean(date) && !Number.isNaN(date.getTime());
}

export function toMinuteDate(value = new Date()) {
  const date = toDate(value) ?? new Date();
  date.setSeconds(0, 0);
  return date;
}

function getLastDayOfMonth(year, month) {
  return new Date(year, month + 1, 0).getDate();
}

function addMonthsClamped(value, months) {
  const date = toMinuteDate(value);
  const hours = date.getHours();
  const minutes = date.getMinutes();
  const day = date.getDate();
  const base = new Date(date);

  base.setDate(1);
  base.setMonth(base.getMonth() + months);
  base.setHours(hours, minutes, 0, 0);

  const lastDay = getLastDayOfMonth(base.getFullYear(), base.getMonth());
  base.setDate(Math.min(day, lastDay));
  return base;
}

function addYearsClamped(value, years) {
  const date = toMinuteDate(value);
  const hours = date.getHours();
  const minutes = date.getMinutes();
  const day = date.getDate();
  const month = date.getMonth();
  const next = new Date(date);

  next.setFullYear(next.getFullYear() + years, month, 1);
  next.setHours(hours, minutes, 0, 0);

  const lastDay = getLastDayOfMonth(next.getFullYear(), month);
  next.setDate(Math.min(day, lastDay));
  return next;
}

function diffInMonths(startValue, endValue) {
  const start = toMinuteDate(startValue);
  const end = toMinuteDate(endValue);
  return (
    (end.getFullYear() - start.getFullYear()) * 12 +
    (end.getMonth() - start.getMonth())
  );
}

function diffInYears(startValue, endValue) {
  const start = toMinuteDate(startValue);
  const end = toMinuteDate(endValue);
  return end.getFullYear() - start.getFullYear();
}

export function normalizeFrequencyType(value) {
  return FREQUENCY_TYPES.find((item) => item === value) ?? "Minutes";
}

export function isPositiveInteger(value) {
  const number = Number(value);
  return Number.isInteger(number) && number > 0;
}

export function addInterval(value, frequencyType, intervalNumber) {
  const date = toMinuteDate(value);
  const interval = Number(intervalNumber);

  switch (normalizeFrequencyType(frequencyType)) {
    case "Minutes":
      return new Date(date.getTime() + interval * MINUTE_MS);
    case "Hours":
      return new Date(date.getTime() + interval * HOUR_MS);
    case "Days": {
      const next = new Date(date);
      next.setDate(next.getDate() + interval);
      return next;
    }
    case "Weeks":
      return new Date(date.getTime() + interval * WEEK_MS);
    case "Months":
      return addMonthsClamped(date, interval);
    case "Year":
      return addYearsClamped(date, interval);
    default:
      return new Date(date.getTime() + interval * MINUTE_MS);
  }
}

export function formatHumanSchedule(frequencyType, intervalNumber) {
  const interval = Number(intervalNumber);
  const unit = FREQUENCY_LABELS[normalizeFrequencyType(frequencyType)] ?? "minute";

  if (!isPositiveInteger(interval)) {
    return "Enter a valid interval to preview the schedule.";
  }

  if (interval === 1) {
    return `Every ${unit}`;
  }

  return `Every ${interval} ${unit}s`;
}

export function getCronExpression(frequencyType, intervalNumber) {
  const interval = Number(intervalNumber);

  if (!isPositiveInteger(interval)) {
    return POLLING_EXPRESSION;
  }

  // This is a user-facing cron preview. The backend still enforces exact
  // timing with saved interval metadata and `next_run_at`.
  switch (normalizeFrequencyType(frequencyType)) {
    case "Minutes":
      return interval <= 59 && 60 % interval === 0
        ? `*/${interval} * * * *`
        : POLLING_EXPRESSION;
    case "Hours":
      return interval === 1
        ? "0 * * * *"
        : interval <= 23 && 24 % interval === 0
          ? `0 */${interval} * * *`
          : POLLING_EXPRESSION;
    case "Days":
      return interval === 1 ? "0 0 * * *" : POLLING_EXPRESSION;
    case "Weeks":
      return interval === 1 ? "0 0 * * 0" : POLLING_EXPRESSION;
    case "Months":
      return interval === 1 ? "0 0 1 * *" : POLLING_EXPRESSION;
    case "Year":
      return interval === 1 ? "0 0 1 1 *" : POLLING_EXPRESSION;
    default:
      return POLLING_EXPRESSION;
  }
}

export function getScheduleNotes(frequencyType, intervalNumber) {
  const interval = Number(intervalNumber);
  const normalized = normalizeFrequencyType(frequencyType);

  if (!isPositiveInteger(interval)) {
    return "Cron jobs are polled every minute. The saved interval metadata controls exact execution timing.";
  }

  if (
    (normalized === "Minutes" && interval > 1 && 60 % interval !== 0) ||
    (normalized === "Hours" && interval > 1 && 24 % interval !== 0) ||
    (normalized === "Days" && interval > 1) ||
    normalized === "Weeks" ||
    (normalized === "Months" && interval > 1) ||
    normalized === "Year"
  ) {
    return "The first run is scheduled after the selected interval. Exact timing is enforced with saved metadata and a minute-level node-cron poll, so this cron string is a best-effort preview.";
  }

  return "The first run is scheduled after the selected interval. This cadence maps cleanly to cron syntax and is also enforced by the scheduler's saved metadata.";
}

function adjustCandidate(candidate, frequencyType, intervalNumber, referenceDate) {
  let current = toMinuteDate(candidate);
  const reference = toMinuteDate(referenceDate);

  while (current > reference) {
    current = addInterval(current, frequencyType, -Number(intervalNumber));
  }

  while (addInterval(current, frequencyType, intervalNumber) <= reference) {
    current = addInterval(current, frequencyType, intervalNumber);
  }

  return current;
}

export function getMostRecentOccurrence(anchorAt, frequencyType, intervalNumber, referenceDate = new Date()) {
  const anchor = toMinuteDate(anchorAt);
  const reference = toMinuteDate(referenceDate);
  const interval = Number(intervalNumber);

  if (!isPositiveInteger(interval)) {
    return null;
  }

  if (reference < anchor) {
    return null;
  }

  switch (normalizeFrequencyType(frequencyType)) {
    case "Minutes": {
      const diffMinutes = Math.floor((reference.getTime() - anchor.getTime()) / MINUTE_MS);
      return addInterval(anchor, "Minutes", Math.floor(diffMinutes / interval) * interval);
    }
    case "Hours": {
      const diffHours = Math.floor((reference.getTime() - anchor.getTime()) / HOUR_MS);
      const candidate = addInterval(anchor, "Hours", Math.floor(diffHours / interval) * interval);
      return adjustCandidate(candidate, "Hours", interval, reference);
    }
    case "Days": {
      const diffDays = Math.floor((reference.getTime() - anchor.getTime()) / DAY_MS);
      const candidate = addInterval(anchor, "Days", Math.floor(diffDays / interval) * interval);
      return adjustCandidate(candidate, "Days", interval, reference);
    }
    case "Weeks": {
      const diffWeeks = Math.floor((reference.getTime() - anchor.getTime()) / WEEK_MS);
      const candidate = addInterval(anchor, "Weeks", Math.floor(diffWeeks / interval) * interval);
      return adjustCandidate(candidate, "Weeks", interval, reference);
    }
    case "Months": {
      const diffMonths = diffInMonths(anchor, reference);
      const candidate = addInterval(anchor, "Months", Math.floor(diffMonths / interval) * interval);
      return adjustCandidate(candidate, "Months", interval, reference);
    }
    case "Year": {
      const diffYears = diffInYears(anchor, reference);
      const candidate = addInterval(anchor, "Year", Math.floor(diffYears / interval) * interval);
      return adjustCandidate(candidate, "Year", interval, reference);
    }
    default:
      return null;
  }
}

export function computeNextRunAt({
  anchorAt,
  lastRunAt,
  frequencyType,
  intervalNumber,
  referenceDate = new Date(),
}) {
  if (!isPositiveInteger(intervalNumber)) {
    return null;
  }

  const anchor = toMinuteDate(anchorAt);
  const reference = toMinuteDate(referenceDate);
  const firstRunAt = addInterval(anchor, frequencyType, intervalNumber);

  if (!lastRunAt && firstRunAt > reference) {
    return firstRunAt;
  }

  let nextRunAt = lastRunAt
    ? addInterval(lastRunAt, frequencyType, intervalNumber)
    : firstRunAt;

  while (nextRunAt <= reference) {
    nextRunAt = addInterval(nextRunAt, frequencyType, intervalNumber);
  }

  return nextRunAt;
}

export function shouldRunNow({
  anchorAt,
  lastRunAt,
  frequencyType,
  intervalNumber,
  referenceDate = new Date(),
}) {
  if (!isPositiveInteger(intervalNumber)) {
    return false;
  }

  const nextRunAt = lastRunAt
    ? addInterval(lastRunAt, frequencyType, intervalNumber)
    : getFirstRunAt(anchorAt, frequencyType, intervalNumber);

  return nextRunAt && toMinuteDate(nextRunAt) <= toMinuteDate(referenceDate);
}

export function getFirstRunAt(anchorAt, frequencyType, intervalNumber) {
  if (!isPositiveInteger(intervalNumber)) {
    return null;
  }

  return addInterval(anchorAt, frequencyType, intervalNumber);
}

export function isDue(nextRunAt, referenceDate = new Date()) {
  if (!nextRunAt || !isValidDateValue(nextRunAt)) {
    return false;
  }

  return toMinuteDate(nextRunAt) <= toMinuteDate(referenceDate);
}

export function advanceNextRunAt(nextRunAt, frequencyType, intervalNumber, referenceDate = new Date()) {
  if (!nextRunAt || !isValidDateValue(nextRunAt) || !isPositiveInteger(intervalNumber)) {
    return null;
  }

  let next = toMinuteDate(nextRunAt);
  const reference = toMinuteDate(referenceDate);

  // If the app was down or a job ran late, move forward until the next
  // future occurrence without drifting the schedule anchor.
  while (next <= reference) {
    next = addInterval(next, frequencyType, intervalNumber);
  }

  return next;
}

export function createSchedulePreview({
  frequencyType,
  intervalNumber,
  anchorAt = new Date(),
  lastRunAt = null,
  referenceDate = new Date(),
}) {
  const normalized = normalizeFrequencyType(frequencyType);

  return {
    cronExpression: getCronExpression(normalized, intervalNumber),
    humanReadable: formatHumanSchedule(normalized, intervalNumber),
    notes: getScheduleNotes(normalized, intervalNumber),
    nextRunAt: lastRunAt
      ? computeNextRunAt({
          anchorAt,
          lastRunAt,
          frequencyType: normalized,
          intervalNumber,
          referenceDate,
        })
      : getFirstRunAt(anchorAt, normalized, intervalNumber),
  };
}
