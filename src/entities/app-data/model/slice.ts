import type { AppData } from "src/entities/app-data/model/types";
import type { AppSettings } from "src/entities/settings/@x/app-data";
import type { TimeEntry } from "src/entities/time-entry/@x/app-data";
import type { CustomIssueFilter } from "src/entities/issue-filter/@x/app-data";
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
