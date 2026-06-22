import { useEffect, useRef } from "react";
import type { AppData } from "../types";

export function useAutoSave(data: AppData | null, delay = 250): void {
  const firstRender = useRef(true);

  useEffect(() => {
    if (!data) return;
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    const timer = window.setTimeout(() => void window.timeTracker.save(data), delay);
    return () => window.clearTimeout(timer);
  }, [data, delay]);
}
