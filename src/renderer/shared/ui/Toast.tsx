import { useEffect } from "react";

type ToastType = "ok" | "error";

type ToastMessage = {
  id: number;
  text: string;
  type: ToastType;
};

type ToastProps = {
  messages: ToastMessage[];
  onClose: (id: number) => void;
};

function ToastItem({
  message,
  onClose,
}: {
  message: ToastMessage;
  onClose: (id: number) => void;
}) {
  useEffect(() => {
    const timer = window.setTimeout(() => onClose(message.id), 4500);
    return () => window.clearTimeout(timer);
  }, [message.id, onClose]);

  return (
    <div
      className={`rounded-lg border px-4 py-3 text-sm font-semibold text-zinc-50 shadow-2xl shadow-black/50 ${
        message.type === "error"
          ? "border-red-400/60 bg-red-800"
          : "border-emerald-400/50 bg-emerald-700"
      }`}
    >
      {message.text}
    </div>
  );
}

export function Toast({ messages, onClose }: ToastProps) {
  if (messages.length === 0) return null;

  return (
    <div className="fixed bottom-7 right-7 z-20 flex w-full max-w-xl flex-col gap-2">
      {messages.map((message) => (
        <ToastItem key={message.id} message={message} onClose={onClose} />
      ))}
    </div>
  );
}
