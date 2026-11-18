const { spawn } = require("node:child_process");
const path = require("node:path");

const environment = { ...process.env };
delete environment.ELECTRON_RUN_AS_NODE;
const cli = path.join(__dirname, "../node_modules/electron-vite/bin/electron-vite.js");
const child = spawn(process.execPath, [cli, ...process.argv.slice(2)], { env: environment, stdio: "inherit", windowsHide: true });
child.on("error", () => { console.error("Не удалось запустить Electron"); process.exitCode = 1; });
child.on("exit", (code) => { process.exitCode = code ?? 1; });
