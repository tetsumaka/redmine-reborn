import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import { pad } from "src/renderer/shared/lib/date";

function currentPeriodKey(): string {
  const now = new Date();
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}`;
}

type MonthToolbarState = {
  selectedPeriodKey: string;
};

const initialState: MonthToolbarState = {
  selectedPeriodKey: currentPeriodKey(),
};

const monthToolbarSlice = createSlice({
  name: "monthToolbar",
  initialState,
  reducers: {
    setSelectedPeriodKey(state, action: PayloadAction<string>) {
      state.selectedPeriodKey = action.payload;
    },
  },
});

export const { setSelectedPeriodKey } = monthToolbarSlice.actions;
export const monthToolbarReducer = monthToolbarSlice.reducer;
