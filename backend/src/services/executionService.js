import { spawn } from "node:child_process";
import path from "node:path";

import { STATUS } from "@cron-dashboard/shared";
import { parse as parseCommandLine } from "shell-quote";

import { env } from "../config/env.js";
import { AppError } from "../utils/appError.js";

const BLOCKED_EXECUTABLES = new Set([
  "chmod",
  "chown",
  "dd",
  "diskutil",
  "format",
  "halt",
  "mkfs",
  "poweroff",
  "reboot",
  "rm",
  "shutdown",
  "sudo",
  "su",
]);

function appendChunk(state, chunk, label) {
  const text = chunk.toString("utf8");

  if (state.size >= env.maxOutputBytes) {
    state.truncated = true;
    return;
  }

  const remaining = env.maxOutputBytes - state.size;
  const sliced = Buffer.from(text).subarray(0, remaining).toString("utf8");
  state.size += Buffer.byteLength(sliced);
  state.value += sliced;

  if (sliced.length < text.length) {
    state.truncated = true;
  }

  if (state.truncated && !state.value.includes("[output truncated]")) {
    state.value += `\n[${label} output truncated]\n`;
  }
}

function buildCombinedOutput(stdout, stderr) {
  const sections = [];

  if (stdout) {
    sections.push(`STDOUT\n${stdout}`);
  }

  if (stderr) {
    sections.push(`STDERR\n${stderr}`);
  }

  return sections.join("\n\n").trim();
}

function truncatePreview(value, maxLength = 320) {
  if (!value) {
    return "";
  }

  return value.length > maxLength ? `${value.slice(0, maxLength)}…` : value;
}

function parseCommand(command) {
  const parsed = parseCommandLine(command ?? "");

  if (!parsed.length) {
    throw new AppError(400, "Command is required.");
  }

  if (parsed.some((token) => typeof token === "object")) {
    throw new AppError(
      400,
      "Shell operators and environment substitutions are not allowed.",
    );
  }

  const [executable, ...args] = parsed.map((token) => String(token));
  const executableName = path.basename(executable).toLowerCase();

  if (!executableName) {
    throw new AppError(400, "Command executable could not be determined.");
  }

  if (BLOCKED_EXECUTABLES.has(executableName)) {
    throw new AppError(
      400,
      `The executable "${executableName}" is blocked for safety.`,
    );
  }

  if (
    !env.allowUnsafeCommands &&
    !env.allowedExecutables.includes(executableName)
  ) {
    throw new AppError(
      400,
      `The executable "${executableName}" is not in the allowlist. Update ALLOWED_EXECUTABLES or enable ALLOW_UNSAFE_COMMANDS for local-only experimentation.`,
    );
  }

  return {
    executable,
    args,
  };
}

export function validateCommandInput(command) {
  return parseCommand(command);
}

export class ExecutionService {
  validateCommand(command) {
    return validateCommandInput(command);
  }

  async executeJob(job) {
    const { executable, args } = parseCommand(job.command);
    const startedAt = new Date();
    const stdoutState = { value: "", size: 0, truncated: false };
    const stderrState = { value: "", size: 0, truncated: false };
    const timeoutMs = job.timeout_ms ?? env.defaultCommandTimeoutMs;

    return new Promise((resolve) => {
      let finished = false;
      let timedOut = false;

      // Commands are executed without a shell so operators like `;`, `&&`,
      // pipes, and env interpolation never get a chance to run.
      const child = spawn(executable, args, {
        cwd: env.commandWorkdir,
        env: process.env,
        shell: false,
      });

      const stopTimer = setTimeout(() => {
        timedOut = true;
        child.kill("SIGTERM");
        setTimeout(() => child.kill("SIGKILL"), 5_000).unref();
      }, timeoutMs);

      const finalize = (exitCode, signal, errorMessage = "") => {
        if (finished) {
          return;
        }

        finished = true;
        clearTimeout(stopTimer);

        const finishedAt = new Date();
        const durationMs = finishedAt.getTime() - startedAt.getTime();

        if (errorMessage) {
          appendChunk(stderrState, Buffer.from(errorMessage), "stderr");
        }

        if (timedOut) {
          appendChunk(
            stderrState,
            Buffer.from(`Process timed out after ${timeoutMs}ms.`),
            "stderr",
          );
        }

        if (signal && !timedOut) {
          appendChunk(
            stderrState,
            Buffer.from(`Process exited with signal ${signal}.`),
            "stderr",
          );
        }

        // We keep stdout and stderr separate for the log viewer while also
        // storing a combined preview for the dashboard table.
        const stdout = stdoutState.value.trim();
        const stderr = stderrState.value.trim();
        const combinedOutput = buildCombinedOutput(stdout, stderr);
        const resolvedExitCode = timedOut ? 124 : exitCode ?? 1;
        const status = resolvedExitCode === 0 ? STATUS.SUCCESS : STATUS.FAILED;

        resolve({
          started_at: startedAt.toISOString(),
          finished_at: finishedAt.toISOString(),
          duration_ms: durationMs,
          exit_code: resolvedExitCode,
          status,
          stdout,
          stderr,
          combined_output: combinedOutput,
          output_preview: truncatePreview(combinedOutput),
        });
      };

      child.stdout.on("data", (chunk) => appendChunk(stdoutState, chunk, "stdout"));
      child.stderr.on("data", (chunk) => appendChunk(stderrState, chunk, "stderr"));
      child.on("error", (error) => finalize(1, null, error.message));
      child.on("close", (code, signal) => finalize(code, signal));
    });
  }
}
