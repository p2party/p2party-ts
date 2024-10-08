import { createSlice } from "@reduxjs/toolkit";

import type { PayloadAction } from "@reduxjs/toolkit";
import type { State } from "../store";

const initialState = false;

const isSettingRemoteAnswerPendingSlice = createSlice({
  name: "isSettingRemoteAnswerPending",
  initialState,
  reducers: {
    setIsSettingRemoteAnswerPending: (
      _state,
      action: PayloadAction<boolean>,
    ) => {
      return action.payload;
    },
  },
});

export const { setIsSettingRemoteAnswerPending } =
  isSettingRemoteAnswerPendingSlice.actions;
export const isSettingRemoteAnswerPendingSelector = (state: State) =>
  state.isSettingRemoteAnswerPending;
export default isSettingRemoteAnswerPendingSlice.reducer;
