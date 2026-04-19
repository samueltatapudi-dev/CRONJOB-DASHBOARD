import { mkdtemp, mkdir, writeFile } from "node:fs/promises";
import os from "node:os";
import { join } from "node:path";
import assert from "node:assert/strict";

const tempRoot = await mkdtemp(join(os.tmpdir(), "cron-dashboard-desktop-"));
const staticDir = join(tempRoot, "static");
const databasePath = join(tempRoot, "data", "cron-dashboard.sqlite");

await mkdir(staticDir, { recursive: true });
await writeFile(
  join(staticDir, "index.html"),
  "<!doctype html><html><body><div id=\"root\">desktop smoke</div></body></html>",
  "utf8",
);

process.env.HOST = "127.0.0.1";
process.env.PORT = "0";
process.env.CLIENT_ORIGIN = "http://127.0.0.1:5173";
process.env.STATIC_DIR = staticDir;
process.env.DATABASE_PATH = databasePath;
process.env.SEED_DEMO_DATA = "false";
process.env.COMMAND_WORKDIR = process.cwd();

const { startServer, stopServer } = await import("../backend/src/server.js");

const runtime = await startServer();

try {
  const healthResponse = await fetch(`${runtime.url}/api/health`);
  assert.equal(healthResponse.status, 200);
  const healthPayload = await healthResponse.json();
  assert.equal(healthPayload.success, true);
  assert.equal(healthPayload.data.status, "ok");

  const frontendResponse = await fetch(runtime.url);
  assert.equal(frontendResponse.status, 200);
  const frontendMarkup = await frontendResponse.text();
  assert.match(frontendMarkup, /desktop smoke/i);

  const createJobResponse = await fetch(`${runtime.url}/api/jobs`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      name: "Desktop smoke job",
      description: "Validates packaged-style API flows.",
      frequencyType: "Minutes",
      intervalNumber: 30,
      command: "date",
      enabled: false,
    }),
  });

  assert.equal(createJobResponse.status, 201);
  const createdJobPayload = await createJobResponse.json();
  const jobId = createdJobPayload.data.id;
  assert.equal(createdJobPayload.success, true);

  const runResponse = await fetch(`${runtime.url}/api/jobs/${jobId}/run`, {
    method: "POST",
  });
  assert.equal(runResponse.status, 202);

  let latestLogs = [];

  for (let attempt = 0; attempt < 20; attempt += 1) {
    await new Promise((resolve) => setTimeout(resolve, 250));

    const logsResponse = await fetch(`${runtime.url}/api/jobs/${jobId}/logs?limit=5`);
    assert.equal(logsResponse.status, 200);
    const logsPayload = await logsResponse.json();
    latestLogs = logsPayload.data;

    if (latestLogs.length > 0) {
      break;
    }
  }

  assert.ok(latestLogs.length > 0, "Expected at least one execution log.");
  assert.equal(latestLogs[0].exit_code, 0);

  console.log("Desktop smoke test passed.");
} finally {
  await stopServer();
}
