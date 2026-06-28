import { useEffect } from "react";
import type { ToastMessage } from "src/renderer/store/toastSlice";

export function Toast({
  message,
  onClose,
}: {
  message: ToastMessage | null;
  onClose: () => void;
}) {
  useEffect(() => {
    if (!message) return;
    const timer = window.setTimeout(onClose, 4500);
    return () => window.clearTimeout(timer);
  }, [message, onClose]);

  if (!message) return null;
  return (
    <div
      className={`fixed bottom-7 right-7 z-20 max-w-xl rounded-lg border px-4 py-3 text-sm font-semibold text-zinc-50 shadow-2xl shadow-black/50 ${message.type === "error" ? "border-red-400/60 bg-red-800" : "border-emerald-400/50 bg-emerald-700"}`}
    >
      {message.text}
    </div>
  );
}
