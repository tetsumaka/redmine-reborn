import type { AppData, AppSettings, TimeEntry, CustomIssueFilter } from "src/shared/types";
import { createSlice, type PayloadAction } from "@reduxjs/toolkit";

type AppDataState = {
  data: AppData | null;
};

const initialState: AppDataState = {
  data: null,
};

const appDataSlice = createSlice({
  name: "appData",
  initialState,
  reducers: {
    setAppData(state, action: PayloadAction<AppData>) {
      state.data = action.payload;
    },
    addEntry(state, action: PayloadAction<TimeEntry>) {
      if (!state.data) return;
      state.data.entries.unshift(action.payload);
    },
    deleteEntry(state, action: PayloadAction<string>) {
      if (!state.data) return;
      state.data.entries = state.data.entries.filter(
        (entry) => entry.id !== action.payload,
      );
    },
    setSettings(state, action: PayloadAction<AppSettings>) {
      if (!state.data) return;
      state.data.settings = action.payload;
    },
    setCustomFilters(state, action: PayloadAction<CustomIssueFilter[]>) {
      if (!state.data) return;
      state.data.customFilters = action.payload;
    },
  },
});

export const { setAppData, addEntry, deleteEntry, setSettings, setCustomFilters } =
  appDataSlice.actions;
export const appDataReducer = appDataSlice.reducer;
