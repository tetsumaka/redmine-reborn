import { ipcRenderer } from "electron";
import { IPC_CHANNELS } from "./channels";
import type { IpcChannels } from "src/shared/types";

export function invokeIpc<Method extends keyof IpcChannels>(
  method: Method,
  ...args: IpcChannels[Method]["args"]
): IpcChannels[Method]["return"] {
  return ipcRenderer.invoke(IPC_CHANNELS[method], ...args);
}
