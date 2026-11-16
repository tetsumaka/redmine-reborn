import { useCallback } from "react";
import { useAppDispatch } from "src/shared/lib/store";
import {
  hideToast,
  showToast,
  type ToastType,
} from "src/features/show-toast/model/slice";

export function useToast() {
  const dispatch = useAppDispatch();

  const notify = useCallback(
    (text: string, kind: ToastType = "ok") => {
      dispatch(showToast({ text, type: kind }));
    },
    [dispatch],
  );

  const close = useCallback(
    (id: number) => {
      dispatch(hideToast(id));
    },
    [dispatch],
  );

  return { notify, close };
}
