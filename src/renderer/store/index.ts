import { configureStore } from "@reduxjs/toolkit";
import { appDataReducer } from "./appDataSlice";
import { monthToolbarReducer } from "./monthToolbarSlice";
import { toastReducer } from "./toastSlice";

export const store = configureStore({
  reducer: {
    appData: appDataReducer,
    monthToolbar: monthToolbarReducer,
    toast: toastReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
