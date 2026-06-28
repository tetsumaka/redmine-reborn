import { createSlice, type PayloadAction } from "@reduxjs/toolkit";

export type ToastType = "ok" | "error";

export type ToastMessage = {
  id: number;
  text: string;
  type: ToastType;
};

type ToastState = {
  message: ToastMessage | null;
};

type ShowToastPayload = {
  text: string;
  type?: ToastType;
};

const initialState: ToastState = {
  message: null,
};

const toastSlice = createSlice({
  name: "toast",
  initialState,
  reducers: {
    showToast: {
      reducer(state, action: PayloadAction<ToastMessage>) {
        state.message = action.payload;
      },
      prepare({ text, type: type = "ok" }: ShowToastPayload) {
        return {
          payload: {
            id: Date.now(),
            text,
            type,
          },
        };
      },
    },
    hideToast(state) {
      state.message = null;
    },
  },
});

export const { showToast, hideToast } = toastSlice.actions;
export const toastReducer = toastSlice.reducer;
