import { useMemo, useState } from "react";
import { getSession, signIn, signOut, signUp } from "./authService";
import AuthContext from "./context";

export function AuthProvider({ children }) {
  const [user, setUser] = useState(getSession());

  const value = useMemo(
    () => ({
      user,
      isAuthenticated: Boolean(user),
      login: (payload) => {
        const result = signIn(payload);
        if (result.ok) setUser(result.session);
        return result;
      },
      register: (payload) => {
        const result = signUp(payload);
        if (result.ok) setUser(result.session);
        return result;
      },
      logout: () => {
        signOut();
        setUser(null);
      },
    }),
    [user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
