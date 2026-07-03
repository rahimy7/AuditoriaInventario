import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import { api, setApiToken } from "@/lib/api";
import type { User, UserRole } from "@/lib/types";

export type { User, UserRole };

interface AuthContextValue {
  user: User | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  isLoading: true,
  login: async () => false,
  logout: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Restore a persisted session (token = user id) and prime the API client.
  useEffect(() => {
    Promise.all([AsyncStorage.getItem("auth_token"), AsyncStorage.getItem("auth_user")]).then(([token, raw]) => {
      if (token) setApiToken(token);
      if (raw) setUser(JSON.parse(raw));
      setIsLoading(false);
    });
  }, []);

  const login = useCallback(async (email: string, password: string): Promise<boolean> => {
    try {
      const { token, user: userObj } = await api.login(email, password);
      setApiToken(token);
      await AsyncStorage.multiSet([
        ["auth_token", token],
        ["auth_user", JSON.stringify(userObj)],
      ]);
      setUser(userObj);
      return true;
    } catch {
      return false;
    }
  }, []);

  const logout = useCallback(async () => {
    setApiToken(null);
    await AsyncStorage.multiRemove(["auth_token", "auth_user"]);
    setUser(null);
  }, []);

  return <AuthContext.Provider value={{ user, isLoading, login, logout }}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
