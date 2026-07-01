import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { createContext, useCallback, useContext, useEffect, useState } from "react";

export type UserRole = "auxiliar" | "supervisor" | "gerente";

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  warehouse?: string;
  avatar?: string;
}

const MOCK_USERS: (User & { password: string })[] = [
  { id: "u1", name: "María García", email: "auxiliar@inv.com", password: "1234", role: "auxiliar", warehouse: "Almacén Central" },
  { id: "u2", name: "Juan Pérez", email: "auxiliar2@inv.com", password: "1234", role: "auxiliar", warehouse: "Almacén Norte" },
  { id: "u3", name: "Carlos López", email: "supervisor@inv.com", password: "1234", role: "supervisor", warehouse: "Almacén Central" },
  { id: "u4", name: "Laura Rodríguez", email: "supervisor2@inv.com", password: "1234", role: "supervisor", warehouse: "Almacén Norte" },
  { id: "u5", name: "Ana Martínez", email: "gerente@inv.com", password: "1234", role: "gerente" },
];

export const ALL_USERS: User[] = MOCK_USERS.map(({ password: _p, ...u }) => u);

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

  useEffect(() => {
    AsyncStorage.getItem("auth_user").then((raw) => {
      if (raw) setUser(JSON.parse(raw));
      setIsLoading(false);
    });
  }, []);

  const login = useCallback(async (email: string, password: string): Promise<boolean> => {
    const found = MOCK_USERS.find(
      (u) => u.email.toLowerCase() === email.toLowerCase() && u.password === password
    );
    if (!found) return false;
    const { password: _p, ...userObj } = found;
    await AsyncStorage.setItem("auth_user", JSON.stringify(userObj));
    setUser(userObj);
    return true;
  }, []);

  const logout = useCallback(async () => {
    await AsyncStorage.removeItem("auth_user");
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
