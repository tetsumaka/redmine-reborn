import { ipcMain, type IpcMainInvokeEvent } from "electron";
import { IPC_CHANNELS } from "./channels";
import type { IpcChannels } from "src/shared/types";

export function handleIpc<Method extends keyof IpcChannels>(
  method: Method,
  handler: (
    event: IpcMainInvokeEvent,
    ...args: IpcChannels[Method]["args"]
  ) => IpcChannels[Method]["return"],
): void {
  ipcMain.handle(IPC_CHANNELS[method], (event, ...args) =>
    handler(event, ...(args as IpcChannels[Method]["args"])),
  );
}
