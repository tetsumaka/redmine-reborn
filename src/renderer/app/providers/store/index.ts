import { configureStore } from "@reduxjs/toolkit";
import { appDataReducer } from "src/renderer/entities/app-data";
import { monthToolbarReducer } from "src/renderer/features/select-month-period";
import { toastReducer } from "src/renderer/features/show-toast";

export const store = configureStore({
  reducer: {
    appData: appDataReducer,
    monthToolbar: monthToolbarReducer,
    toast: toastReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
