import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { Employee } from "../types";
import type { RoleName } from "../lib/constants";

interface AuthState {
  user: Employee | null;
  token: string | null;
  isAuthenticated: boolean;

  // Actions
  login: (user: Employee, token: string) => void;
  logout: () => void;
  setUser: (user: Employee) => void;

  // Role helpers
  hasRole: (role: RoleName) => boolean;
  hasAnyRole: (roles: RoleName[]) => boolean;
  isAdmin: () => boolean;
  isAssetManager: () => boolean;
  isDepartmentHead: () => boolean;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isAuthenticated: false,

      login: (user, token) => {
        localStorage.setItem("af_token", token);
        localStorage.setItem("af_user", JSON.stringify(user));
        set({ user, token, isAuthenticated: true });
      },

      logout: () => {
        localStorage.removeItem("af_token");
        localStorage.removeItem("af_user");
        set({ user: null, token: null, isAuthenticated: false });
      },

      setUser: (user) => set({ user }),

      hasRole: (role) => get().user?.role === role,
      hasAnyRole: (roles) => roles.includes(get().user?.role as RoleName),
      isAdmin: () => get().user?.role === "admin",
      isAssetManager: () =>
        ["admin", "asset_manager"].includes(get().user?.role ?? ""),
      isDepartmentHead: () =>
        ["admin", "department_head"].includes(get().user?.role ?? ""),
    }),
    {
      name: "af_auth",
      storage: createJSONStorage(() => localStorage),
      // Only persist token + user, not derived helpers
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);
