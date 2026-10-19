import type { Api } from "src/shared/types";

declare global {
  interface Window {
    api: Api;
  }
}

export function api(): Api {
  return window.api;
}
