import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import type { AppData, Entry, Settings } from "src/renderer/types";

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
    addEntry(state, action: PayloadAction<Entry>) {
      if (!state.data) return;
      state.data.entries.unshift(action.payload);
    },
    deleteEntry(state, action: PayloadAction<string>) {
      if (!state.data) return;
      state.data.entries = state.data.entries.filter(
        (entry) => entry.id !== action.payload,
      );
    },
    setSettings(state, action: PayloadAction<Settings>) {
      if (!state.data) return;
      state.data.settings = action.payload;
    },
  },
});

export const { setAppData, addEntry, deleteEntry, setSettings } =
  appDataSlice.actions;
export const appDataReducer = appDataSlice.reducer;
