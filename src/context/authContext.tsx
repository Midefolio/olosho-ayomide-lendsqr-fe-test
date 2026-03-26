/* eslint-disable react-refresh/only-export-components */
/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable @typescript-eslint/no-explicit-any */

import { createContext, type ReactNode, useEffect } from "react";
import { useDispatch } from "react-redux";
import { notifyError } from "../utils/useutils";
import { CURRENT_USER_API } from "../apis";
import { db } from "../utils/dexieDB";
import { setCurrentUser } from "../states/adminUserSlice";
import { makeRequest } from "../utils/fetcher";

export const UserContext = createContext<any>(undefined);

export const UserContextProvider = ({ children }: { children: ReactNode }) => {
  const dispatch = useDispatch();

  const getCurrentAdminUser = async (token?: any) => {
    const CachedUser = await db.cached_data.get(`admin_user_details`);
    if (CachedUser) { dispatch(setCurrentUser(CachedUser)) }
    const { res, error } = await makeRequest("GET", CURRENT_USER_API, null, () => { }, token, null, "urlencoded");
    if (res) {
      dispatch(setCurrentUser(res?.data))
      await db.cached_data.put(res?.data, `admin_user_details`);
    }

    if (error) {
      notifyError(error)
    }
  }

  


 useEffect(() => {
  const token = localStorage.getItem('auth_token')
  if (token) {
    getCurrentAdminUser(token)
  }
}, [])


  return (
    <UserContext.Provider
      value={{
        getCurrentAdminUser
        ,
      }}
    >
      {children}
    </UserContext.Provider>
  );
};
