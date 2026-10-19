import { createSlice, type PayloadAction } from "@reduxjs/toolkit";

export type ToastType = "ok" | "error";

export type ToastMessage = {
  id: number;
  text: string;
  type: ToastType;
};

type ToastState = {
  messages: ToastMessage[];
};

type ShowToastPayload = {
  text: string;
  type?: ToastType;
};

const initialState: ToastState = {
  messages: [],
};

const maxToastMessages = 3;

const toastSlice = createSlice({
  name: "toast",
  initialState,
  reducers: {
    showToast: {
      reducer(state, action: PayloadAction<ToastMessage>) {
        state.messages = [...state.messages, action.payload].slice(
          -maxToastMessages,
        );
      },
      prepare({ text, type: type = "ok" }: ShowToastPayload) {
        return {
          payload: {
            id: Date.now() + Math.random(),
            text,
            type,
          },
        };
      },
    },
    hideToast(state, action: PayloadAction<number>) {
      state.messages = state.messages.filter(
        (message) => message.id !== action.payload,
      );
    },
  },
});

export const { showToast, hideToast } = toastSlice.actions;
export const toastReducer = toastSlice.reducer;
