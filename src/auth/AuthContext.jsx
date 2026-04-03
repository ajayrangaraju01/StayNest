
import { useMemo, useState } from "react";
import {
  getSession,
  resetPassword,
  sendLoginOtp,
  sendPasswordResetOtp,
  sendRegistrationOtp,
  signIn,
  signInWithOtp,
  signOut,
  signUp,
} from "./authService";
import AuthContext from "./context";

export function AuthProvider({ children }) {
  const [user, setUser] = useState(getSession());

  const value = useMemo(
    () => ({
      user,
      isAuthenticated: Boolean(user),
      login: async (payload) => {
        const result = await signIn(payload);
        if (result.ok) setUser(result.session);
        return result;
      },
      register: async (payload) => {
        const result = await signUp(payload);
        if (result.ok) setUser(result.session);
        return result;
      },
      loginWithOtp: async (payload) => {
        const result = await signInWithOtp(payload);
        if (result.ok) setUser(result.session);
        return result;
      },
      sendLoginOtp,
      sendPasswordResetOtp,
      sendRegistrationOtp,
      resetPassword,
      logout: () => {
        signOut();
        setUser(null);
      },
    }),
    [user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
