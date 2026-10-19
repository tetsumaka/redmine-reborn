import type { AppData } from "src/shared/types";
import { useEffect, useRef } from "react";
import { api } from "src/renderer/shared/api/api";

export function useAutoSave(data: AppData | null, delay = 250): void {
  const firstRender = useRef(true);

  useEffect(() => {
    if (!data) return;
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    const timer = window.setTimeout(() => void api().save(data), delay);
    return () => window.clearTimeout(timer);
  }, [data, delay]);
}
