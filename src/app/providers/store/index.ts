import { saveAppData } from "src/entities/app-data";
import { configureStore, type Middleware } from "@reduxjs/toolkit";
import { appDataReducer } from "src/entities/app-data";
import { monthToolbarReducer } from "src/features/select-month-period";
import { toastReducer } from "src/features/show-toast";
import { showToast } from "src/features/show-toast";
import type { AppData } from "src/entities/app-data";

// Start saving on each edit, without a debounce that loses the last edit on navigation.
const persistEdits: Middleware<object, { appData: { data: AppData | null } }> = (store) => (next) => (action) => {
  const previous = store.getState().appData.data;
  const output = next(action);
  const current = store.getState().appData.data;
  const type = (action as { type?: string }).type;
  if (current && previous !== current && type !== "appData/setAppData") {
    void saveAppData(current).catch((error: unknown) => {
      store.dispatch(showToast({ text: `Не удалось сохранить данные: ${error instanceof Error ? error.message : String(error)}`, type: "error" }));
    });
  }
  return output;
};

export const store = configureStore({
  reducer: {
    appData: appDataReducer,
    monthToolbar: monthToolbarReducer,
    toast: toastReducer,
  },
  middleware: (defaults) => defaults().concat(persistEdits),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

declare global {
  interface AppStoreTypes {
    state: RootState;
    dispatch: AppDispatch;
  }
}
