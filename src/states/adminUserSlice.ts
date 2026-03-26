import { createSlice, type PayloadAction } from '@reduxjs/toolkit';


const initialState: any = {
  currentUser: null,
};

const adminUserSlice = createSlice({
  name: 'user',
  initialState,
  reducers: {
    setCurrentUser: (state, action:PayloadAction<any>) => {
      state.currentUser = action.payload;
    },
  },
});

export const {
    setCurrentUser
} = adminUserSlice.actions;

export default adminUserSlice.reducer;
