import { useEffect, useState } from "react";
import { AlertCircle, RotateCcw, Save } from "lucide-react";
import { FREQUENCY_TYPES, createSchedulePreview } from "@cron-dashboard/shared";

import { CronExpressionPreview } from "./CronExpressionPreview.jsx";

function getInitialValues(job = null) {
  return {
    name: job?.name ?? "",
    description: job?.description ?? "",
    frequencyType: job?.frequency_type ?? "Minutes",
    intervalNumber: job?.interval_number?.toString() ?? "5",
    command: job?.command ?? "",
    enabled: job?.enabled ?? true,
  };
}

function validateForm(values, jobs, editingJob) {
  const errors = {};
  const normalizedName = values.name.trim().toLowerCase();

  if (!normalizedName) {
    errors.name = "Job name is required.";
  }

  const duplicate = jobs.find(
    (job) =>
      job.name.trim().toLowerCase() === normalizedName &&
      job.id !== editingJob?.id,
  );

  if (duplicate) {
    errors.name = "Job names must be unique.";
  }

  const interval = Number(values.intervalNumber);

  if (!Number.isInteger(interval) || interval <= 0) {
    errors.intervalNumber = "Interval must be a positive whole number.";
  }

  if (!values.command.trim()) {
    errors.command = "Command is required.";
  }

  return errors;
}

export function CreateCronJobForm({
  jobs,
  editingJob,
  saving,
  onSubmit,
  onCancelEdit,
  onToast,
}) {
  const [values, setValues] = useState(() => getInitialValues(editingJob));
  const [touched, setTouched] = useState({});

  useEffect(() => {
    setValues(getInitialValues(editingJob));
    setTouched({});
  }, [editingJob]);

  const errors = validateForm(values, jobs, editingJob);
  const preview = createSchedulePreview({
    frequencyType: values.frequencyType,
    intervalNumber: Number(values.intervalNumber),
    anchorAt: new Date(),
  });

  function updateField(field, nextValue) {
    setValues((current) => ({ ...current, [field]: nextValue }));
  }

  function touchField(field) {
    setTouched((current) => ({ ...current, [field]: true }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setTouched({
      name: true,
      intervalNumber: true,
      command: true,
    });

    if (Object.keys(errors).length > 0) {
      return;
    }

    await onSubmit({
      name: values.name.trim(),
      description: values.description.trim(),
      frequencyType: values.frequencyType,
      intervalNumber: Number(values.intervalNumber),
      command: values.command.trim(),
      enabled: values.enabled,
    });
  }

  function resetForm() {
    setValues(getInitialValues(editingJob));
    setTouched({});
  }

  return (
    <section className="panel p-6 sm:p-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.22em] text-ink-500 dark:text-slate-400">
            1. Create Cron Job
          </p>
          <h2 className="mt-2 text-2xl font-bold tracking-tight text-ink-900 dark:text-white">
            {editingJob ? "Edit job" : "Create a new job"}
          </h2>
          <p className="mt-2 max-w-2xl text-sm text-ink-700 dark:text-slate-300">
            Jobs run after the selected interval from the moment they are created,
            updated, or resumed. By default the backend only permits allowlisted
            executables for safer local use.
          </p>
        </div>

        {editingJob ? (
          <button type="button" className="btn-ghost" onClick={onCancelEdit}>
            Cancel edit
          </button>
        ) : null}
      </div>

      <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
        <div className="grid gap-5 lg:grid-cols-2">
          <div>
            <label className="text-sm font-medium text-ink-900 dark:text-white">
              Job Name
            </label>
            <input
              className="field mt-2"
              value={values.name}
              onChange={(event) => updateField("name", event.target.value)}
              onBlur={() => touchField("name")}
              placeholder="Nightly health check"
            />
            {touched.name && errors.name ? (
              <p className="mt-2 flex items-center gap-2 text-sm text-ember-700 dark:text-ember-200">
                <AlertCircle className="h-4 w-4" />
                {errors.name}
              </p>
            ) : null}
          </div>

          <div>
            <label className="text-sm font-medium text-ink-900 dark:text-white">
              Interval Number
            </label>
            <input
              type="number"
              min="1"
              step="1"
              className="field mt-2"
              value={values.intervalNumber}
              onChange={(event) => updateField("intervalNumber", event.target.value)}
              onBlur={() => touchField("intervalNumber")}
            />
            {touched.intervalNumber && errors.intervalNumber ? (
              <p className="mt-2 flex items-center gap-2 text-sm text-ember-700 dark:text-ember-200">
                <AlertCircle className="h-4 w-4" />
                {errors.intervalNumber}
              </p>
            ) : null}
          </div>
        </div>

        <div>
          <label className="text-sm font-medium text-ink-900 dark:text-white">
            Optional Description
          </label>
          <textarea
            rows="3"
            className="field mt-2"
            value={values.description}
            onChange={(event) => updateField("description", event.target.value)}
            placeholder="Describe what this job does and why it exists."
          />
        </div>

        <div>
          <p className="text-sm font-medium text-ink-900 dark:text-white">
            Frequency Type
          </p>
          <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {FREQUENCY_TYPES.map((frequencyType) => (
              <label
                key={frequencyType}
                className={`flex cursor-pointer items-center justify-between rounded-2xl border px-4 py-3 text-sm transition ${
                  values.frequencyType === frequencyType
                    ? "border-mist-400 bg-mist-50 text-mist-900 dark:border-mist-500 dark:bg-mist-500/10 dark:text-mist-100"
                    : "border-ink-100 bg-white/70 text-ink-800 dark:border-slate-700 dark:bg-slate-950/50 dark:text-slate-200"
                }`}
              >
                <span>{frequencyType}</span>
                <input
                  type="radio"
                  className="h-4 w-4 accent-current"
                  checked={values.frequencyType === frequencyType}
                  onChange={() => updateField("frequencyType", frequencyType)}
                />
              </label>
            ))}
          </div>
        </div>

        <div>
          <label className="text-sm font-medium text-ink-900 dark:text-white">
            Command to Run
          </label>
          <textarea
            rows="4"
            className="field mt-2 font-mono text-sm"
            value={values.command}
            onChange={(event) => updateField("command", event.target.value)}
            onBlur={() => touchField("command")}
            placeholder='node scripts/demo-success.js'
          />
          {touched.command && errors.command ? (
            <p className="mt-2 flex items-center gap-2 text-sm text-ember-700 dark:text-ember-200">
              <AlertCircle className="h-4 w-4" />
              {errors.command}
            </p>
          ) : null}
          <p className="mt-2 text-xs text-ink-500 dark:text-slate-400">
            The backend rejects shell operators and dangerous executables. By
            default only allowlisted commands are accepted.
          </p>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-ink-100 bg-white/60 px-4 py-3 dark:border-white/10 dark:bg-slate-950/50">
          <div>
            <p className="text-sm font-medium text-ink-900 dark:text-white">
              Enable Job
            </p>
            <p className="mt-1 text-xs text-ink-500 dark:text-slate-400">
              Disabled jobs stay in the dashboard but do not execute until resumed.
            </p>
          </div>

          <button
            type="button"
            className={`relative inline-flex h-8 w-16 items-center rounded-full transition ${
              values.enabled ? "bg-mist-500" : "bg-slate-300 dark:bg-slate-700"
            }`}
            onClick={() => updateField("enabled", !values.enabled)}
            aria-pressed={values.enabled}
          >
            <span
              className={`inline-block h-6 w-6 rounded-full bg-white shadow transition ${
                values.enabled ? "translate-x-9" : "translate-x-1"
              }`}
            />
          </button>
        </div>

        <CronExpressionPreview
          preview={preview}
          onToast={(message) =>
            onToast?.({
              title: "Copied to clipboard",
              description: message,
              tone: "success",
            })
          }
        />

        <div className="flex flex-wrap gap-3">
          <button type="submit" className="btn-primary" disabled={saving}>
            <Save className="h-4 w-4" />
            {saving ? "Saving…" : editingJob ? "Save Changes" : "Create Job"}
          </button>
          <button type="button" className="btn-secondary" onClick={resetForm}>
            <RotateCcw className="h-4 w-4" />
            Reset
          </button>
        </div>
      </form>
    </section>
  );
}
