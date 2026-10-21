import type { AppData, AppSettings, TimeEntry, CustomIssueFilter, IssueFilter, IssueTableColumn } from "src/shared/types";
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
    setIssueTableColumns(state, action: PayloadAction<{ filter: IssueFilter; columns: IssueTableColumn[] | null }>) {
      if (!state.data) return;
      const { filter, columns } = action.payload;
      if (columns === null) delete state.data.issueTableColumns[filter];
      else state.data.issueTableColumns[filter] = columns;
    },
  },
});

export const { setAppData, addEntry, deleteEntry, setSettings, setCustomFilters, setIssueTableColumns } =
  appDataSlice.actions;
export const appDataReducer = appDataSlice.reducer;
