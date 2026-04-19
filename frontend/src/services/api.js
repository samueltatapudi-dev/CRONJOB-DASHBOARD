import axios from "axios";

const client = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? "http://localhost:4000",
  headers: {
    "Content-Type": "application/json",
  },
});

function unwrap(response) {
  return response.data.data;
}

export function getApiErrorMessage(error, fallback = "Request failed.") {
  return (
    error?.response?.data?.error?.message ??
    error?.message ??
    fallback
  );
}

export const api = {
  async getJobs() {
    return unwrap(await client.get("/api/jobs"));
  },

  async getJob(jobId) {
    return unwrap(await client.get(`/api/jobs/${jobId}`));
  },

  async createJob(payload) {
    return unwrap(await client.post("/api/jobs", payload));
  },

  async updateJob(jobId, payload) {
    return unwrap(await client.put(`/api/jobs/${jobId}`, payload));
  },

  async deleteJob(jobId) {
    return unwrap(await client.delete(`/api/jobs/${jobId}`));
  },

  async runJob(jobId) {
    return unwrap(await client.post(`/api/jobs/${jobId}/run`));
  },

  async enableJob(jobId) {
    return unwrap(await client.post(`/api/jobs/${jobId}/enable`));
  },

  async disableJob(jobId) {
    return unwrap(await client.post(`/api/jobs/${jobId}/disable`));
  },

  async getJobLogs(jobId, limit = 25) {
    return unwrap(await client.get(`/api/jobs/${jobId}/logs?limit=${limit}`));
  },

  async getLog(logId) {
    return unwrap(await client.get(`/api/logs/${logId}`));
  },

  async getStats() {
    return unwrap(await client.get("/api/stats"));
  },

  async getHealth() {
    return unwrap(await client.get("/api/health"));
  },
};
