import { useDeferredValue, useEffect, useRef, useState } from "react";

import { api, getApiErrorMessage } from "../services/api.js";
import { formatDateTime, sortJobs } from "../utils/format.js";
import { useTheme } from "../hooks/useTheme.js";
import { useToast } from "../components/ToastProvider.jsx";
import { ConfirmDeleteDialog } from "../components/ConfirmDeleteDialog.jsx";
import { CreateCronJobForm } from "../components/CreateCronJobForm.jsx";
import { DashboardStats } from "../components/DashboardStats.jsx";
import { EmptyState } from "../components/EmptyState.jsx";
import { Header } from "../components/Header.jsx";
import { JobTable } from "../components/JobTable.jsx";
import { LogsModal } from "../components/LogsModal.jsx";
import { SearchAndFilterBar } from "../components/SearchAndFilterBar.jsx";

const PAGE_SIZE = 6;

export function DashboardPage() {
  const { theme, toggleTheme } = useTheme();
  const { pushToast } = useToast();
  const formRef = useRef(null);
  const [jobs, setJobs] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [savingJob, setSavingJob] = useState(false);
  const [deletingJob, setDeletingJob] = useState(false);
  const [editingJob, setEditingJob] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [logsJob, setLogsJob] = useState(null);
  const [logs, setLogs] = useState([]);
  const [logsLoading, setLogsLoading] = useState(false);
  const [logsRefreshing, setLogsRefreshing] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [sortBy, setSortBy] = useState("next_run_at");
  const [page, setPage] = useState(1);
  const [lastUpdated, setLastUpdated] = useState(null);
  const deferredSearch = useDeferredValue(search);

  async function loadDashboard({ silent = false } = {}) {
    if (!silent) {
      setRefreshing(true);
    }

    try {
      const [jobsResponse, statsResponse] = await Promise.all([
        api.getJobs(),
        api.getStats(),
      ]);

      setJobs(jobsResponse);
      setStats(statsResponse);
      setLastUpdated(new Date().toISOString());
    } catch (error) {
      pushToast({
        title: "Could not refresh the dashboard",
        description: getApiErrorMessage(error),
        tone: "error",
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  async function loadLogs(jobId, { silent = false } = {}) {
    if (!jobId) {
      return;
    }

    if (silent) {
      setLogsRefreshing(true);
    } else {
      setLogsLoading(true);
    }

    try {
      const logsResponse = await api.getJobLogs(jobId, 25);
      setLogs(logsResponse);
    } catch (error) {
      pushToast({
        title: "Could not load logs",
        description: getApiErrorMessage(error),
        tone: "error",
      });
    } finally {
      setLogsLoading(false);
      setLogsRefreshing(false);
    }
  }

  useEffect(() => {
    void loadDashboard();

    const intervalId = window.setInterval(() => {
      void loadDashboard({ silent: true });
    }, 5000);

    return () => window.clearInterval(intervalId);
  }, []);

  useEffect(() => {
    if (!logsJob) {
      return undefined;
    }

    void loadLogs(logsJob.id);

    const intervalId = window.setInterval(() => {
      void loadLogs(logsJob.id, { silent: true });
    }, 5000);

    return () => window.clearInterval(intervalId);
  }, [logsJob]);

  useEffect(() => {
    setPage(1);
  }, [deferredSearch, statusFilter, sortBy]);

  const filteredJobs = jobs.filter((job) => {
    const matchesSearch =
      !deferredSearch.trim() ||
      `${job.name} ${job.description ?? ""} ${job.command}`
        .toLowerCase()
        .includes(deferredSearch.trim().toLowerCase());

    const matchesStatus =
      statusFilter === "All" || job.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const sortedJobs = sortJobs(filteredJobs, sortBy);
  const pageCount = Math.max(1, Math.ceil(sortedJobs.length / PAGE_SIZE));
  const paginatedJobs = sortedJobs.slice(
    (page - 1) * PAGE_SIZE,
    page * PAGE_SIZE,
  );

  useEffect(() => {
    setPage((currentPage) => Math.min(currentPage, pageCount));
  }, [pageCount]);

  async function handleSubmitJob(payload) {
    setSavingJob(true);

    try {
      if (editingJob) {
        await api.updateJob(editingJob.id, payload);
        pushToast({
          title: "Job updated",
          description: `${payload.name} was saved and rescheduled from now.`,
          tone: "success",
        });
      } else {
        await api.createJob(payload);
        pushToast({
          title: "Job created",
          description: `${payload.name} is now available in the dashboard.`,
          tone: "success",
        });
      }

      setEditingJob(null);
      await loadDashboard({ silent: true });
    } catch (error) {
      pushToast({
        title: editingJob ? "Update failed" : "Create failed",
        description: getApiErrorMessage(error),
        tone: "error",
      });
    } finally {
      setSavingJob(false);
    }
  }

  async function handleRunNow(job) {
    try {
      await api.runJob(job.id);
      pushToast({
        title: "Execution started",
        description: `${job.name} was queued for immediate execution.`,
        tone: "success",
      });
      await loadDashboard({ silent: true });
      if (logsJob?.id === job.id) {
        await loadLogs(job.id, { silent: true });
      }
    } catch (error) {
      pushToast({
        title: "Could not start the job",
        description: getApiErrorMessage(error),
        tone: "error",
      });
    }
  }

  async function handleToggleEnabled(job) {
    try {
      if (job.enabled) {
        await api.disableJob(job.id);
        pushToast({
          title: "Job paused",
          description: `${job.name} will stay in the dashboard without running.`,
          tone: "info",
        });
      } else {
        await api.enableJob(job.id);
        pushToast({
          title: "Job resumed",
          description: `${job.name} is scheduled again from the current time.`,
          tone: "success",
        });
      }

      await loadDashboard({ silent: true });
    } catch (error) {
      pushToast({
        title: "Could not change job state",
        description: getApiErrorMessage(error),
        tone: "error",
      });
    }
  }

  function handleEdit(job) {
    setEditingJob(job);
    formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  async function handleDeleteConfirmed() {
    if (!deleteTarget) {
      return;
    }

    setDeletingJob(true);

    try {
      await api.deleteJob(deleteTarget.id);
      pushToast({
        title: "Job deleted",
        description: `${deleteTarget.name} and its logs were removed.`,
        tone: "success",
      });
      setDeleteTarget(null);
      if (editingJob?.id === deleteTarget.id) {
        setEditingJob(null);
      }
      if (logsJob?.id === deleteTarget.id) {
        setLogsJob(null);
        setLogs([]);
      }
      await loadDashboard({ silent: true });
    } catch (error) {
      pushToast({
        title: "Delete failed",
        description: getApiErrorMessage(error),
        tone: "error",
      });
    } finally {
      setDeletingJob(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-7xl flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8">
      <Header
        theme={theme}
        onToggleTheme={toggleTheme}
        onRefresh={() => void loadDashboard()}
        refreshing={refreshing}
        lastUpdated={formatDateTime(lastUpdated, "Waiting for first refresh")}
      />

      <DashboardStats stats={stats} loading={loading} />

      <div ref={formRef}>
        <CreateCronJobForm
          jobs={jobs}
          editingJob={editingJob}
          saving={savingJob}
          onSubmit={handleSubmitJob}
          onCancelEdit={() => setEditingJob(null)}
          onToast={pushToast}
        />
      </div>

      <SearchAndFilterBar
        search={search}
        statusFilter={statusFilter}
        sortBy={sortBy}
        onSearchChange={setSearch}
        onStatusChange={setStatusFilter}
        onSortChange={setSortBy}
      />

      {loading ? (
        <div className="panel p-8 text-sm text-ink-700 dark:text-slate-300">
          Loading jobs and dashboard stats…
        </div>
      ) : filteredJobs.length === 0 ? (
        <EmptyState
          title="No jobs match the current view"
          description="Create your first cron job or change the active search and filter controls."
        />
      ) : (
        <JobTable
          jobs={paginatedJobs}
          totalCount={filteredJobs.length}
          page={page}
          pageCount={pageCount}
          onPageChange={setPage}
          onRunNow={handleRunNow}
          onToggleEnabled={handleToggleEnabled}
          onEdit={handleEdit}
          onDelete={setDeleteTarget}
          onViewLogs={(job) => setLogsJob(job)}
          onToast={pushToast}
        />
      )}

      <LogsModal
        open={Boolean(logsJob)}
        job={logsJob}
        logs={logs}
        loading={logsLoading}
        refreshing={logsRefreshing}
        onClose={() => {
          setLogsJob(null);
          setLogs([]);
        }}
        onRefresh={() => void loadLogs(logsJob?.id)}
        onToast={pushToast}
      />

      <ConfirmDeleteDialog
        open={Boolean(deleteTarget)}
        job={deleteTarget}
        deleting={deletingJob}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => void handleDeleteConfirmed()}
      />
    </main>
  );
}
