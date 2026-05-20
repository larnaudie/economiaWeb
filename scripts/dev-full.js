import { spawn } from "node:child_process";

const processes = [];

function run(name, command) {
  const child = spawn(command, {
    cwd: process.cwd(),
    shell: true,
    stdio: "inherit",
  });

  child.on("exit", (code) => {
    if (code && !shuttingDown) {
      console.error(`[${name}] salio con codigo ${code}`);
      shutdown(code);
    }
  });

  processes.push(child);
}

let shuttingDown = false;

function shutdown(code = 0) {
  if (shuttingDown) return;
  shuttingDown = true;

  for (const child of processes) {
    if (!child.killed) {
      child.kill();
    }
  }

  setTimeout(() => process.exit(code), 250);
}

process.on("SIGINT", () => shutdown(0));
process.on("SIGTERM", () => shutdown(0));

run("api", "npm run dev:api");
run("frontend", "npm run dev:frontend");
