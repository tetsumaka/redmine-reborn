const { spawn } = require("node:child_process");
const fs = require("node:fs");

const electron = require("electron");
const environment = { ...process.env };
delete environment.ELECTRON_RUN_AS_NODE;

const isWsl = process.platform === "linux" && (
  Boolean(process.env.WSL_DISTRO_NAME) ||
  fs.readFileSync("/proc/version", "utf8").toLowerCase().includes("microsoft")
);

const chromiumArguments = isWsl
  ? [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
      "--ozone-platform=x11",
      "--disable-gpu",
      "--disable-gpu-compositing",
      "--enable-logging=stderr",
      "--v=1"
    ]
  : [];

if (isWsl) {
  environment.ELECTRON_ENABLE_LOGGING = "1";
  environment.ELECTRON_ENABLE_STACK_DUMPING = "1";
  environment.ELECTRON_OZONE_PLATFORM_HINT = "x11";
  const status = fs.readFileSync("/proc/self/status", "utf8");
  const seccomp = /^Seccomp:\s+(\d+)$/m.exec(status)?.[1];
  const noNewPrivileges = /^NoNewPrivs:\s+(\d+)$/m.exec(status)?.[1];
  if (seccomp === "2" && noNewPrivileges === "1") {
    console.warn(
      "Внимание: процесс запущен под seccomp с NoNewPrivs. " +
      "Такая среда может завершать Chromium сигналом SIGTRAP."
    );
  }
}

const child = spawn(electron, [...chromiumArguments, "."], {
  env: environment,
  stdio: "inherit",
  windowsHide: false
});

child.on("error", (error) => {
  console.error(`Не удалось запустить Electron: ${error.message}`);
  process.exitCode = 1;
});

child.on("exit", (code, signal) => {
  if (signal) console.error(`Electron завершился по сигналу ${signal}`);
  process.exitCode = code ?? 1;
});
