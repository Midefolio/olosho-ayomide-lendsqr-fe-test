// store/index.ts
import { configureStore } from '@reduxjs/toolkit';
import adminUserReducer from './adminUserSlice';
import userReducer from './tableDataSlice';

export const store = configureStore({
  reducer: {
    adminUser: adminUserReducer,
    user: userReducer
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
