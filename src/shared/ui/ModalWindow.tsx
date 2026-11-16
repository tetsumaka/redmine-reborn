import { forwardRef, type ReactNode, type SyntheticEvent } from "react";

type ModalWindowProps = {
  children: ReactNode;
  onCancel?: (event: SyntheticEvent<HTMLDialogElement>) => void;
  onClose?: () => void;
  ariaLabel?: string;
};

export const ModalWindow = forwardRef<HTMLDialogElement, ModalWindowProps>(
  ({ children, onCancel, onClose, ariaLabel }, ref) => (
    <dialog
      ref={ref}
      onCancel={onCancel}
      onClose={onClose}
      aria-label={ariaLabel}
      className={`
        fixed left-1/2 top-1/2 max-h-[calc(100vh-40px)]
        w-[min(760px,calc(100vw-40px))] -translate-x-1/2
        -translate-y-1/2 overflow-auto rounded-lg border border-zinc-700
        bg-zinc-900 p-0 text-zinc-100 shadow-2xl shadow-black/70
        backdrop:bg-black/75 backdrop:backdrop-blur-sm
      `}
    >
      {children}
    </dialog>
  ),
);

ModalWindow.displayName = "ModalWindow";
