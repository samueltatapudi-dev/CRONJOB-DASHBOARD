import { spawn } from "node:child_process";

function runCommand(command, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      stdio: "inherit",
      shell: false,
    });

    child.on("error", reject);
    child.on("exit", (code, signal) => {
      if (code === 0) {
        resolve();
        return;
      }

      reject(
        new Error(
          signal == null
            ? `${command} ${args.join(" ")} exited with code ${code}.`
            : `${command} ${args.join(" ")} exited with signal ${signal}.`,
        ),
      );
    });
  });
}

async function restoreBackendNativeModules() {
  try {
    await runCommand("npm", ["run", "rebuild:backend:native"]);
  } catch (error) {
    console.error(
      "Failed to restore backend native modules for the local Node runtime.",
      error,
    );
    process.exitCode = 1;
  }
}

const electronBuilderArgs = process.argv.slice(2);

if (electronBuilderArgs.length === 0) {
  console.error("Expected electron-builder arguments, for example: --dir");
  process.exit(1);
}

let buildFailed = false;

try {
  await runCommand("npm", ["run", "build"]);
  await runCommand("npm", ["run", "rebuild:desktop:native"]);
  await runCommand("npx", ["electron-builder", ...electronBuilderArgs]);
} catch (error) {
  buildFailed = true;
  console.error("Desktop packaging failed.", error);
} finally {
  await restoreBackendNativeModules();
}

if (buildFailed) {
  process.exit(1);
}
