import { useEffect } from "react";

export type ToastMessage = { id: number; text: string; kind: "ok" | "error" };

export function Toast({ message, onClose }: { message: ToastMessage | null; onClose: () => void }) {
  useEffect(() => {
    if (!message) return;
    const timer = window.setTimeout(onClose, 4500);
    return () => window.clearTimeout(timer);
  }, [message, onClose]);

  if (!message) return null;
  return <div className={`toast show ${message.kind}`}>{message.text}</div>;
}
