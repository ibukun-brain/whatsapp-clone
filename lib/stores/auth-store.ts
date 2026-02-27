import { createStore } from "zustand/vanilla";
import { createJSONStorage, persist, StateStorage } from "zustand/middleware";
import { AuthState } from "../../types";
import { db } from "../indexdb";
import { tokenManager } from "../token-manager";
import { axiosInstance } from "../axios";

// Default initial state
export const defaultAuthState: Omit<AuthState, "setAuth" | "logout" | "checkSession"> = {
  isAuthenticated: false,
  accessToken: null,
};

// Custom Dexie storage for Zustand
// We keep this structure but make it no-op for now as we don't persist auth state 
// (we rely on tokenManager and checkSession on load).
const dexieStorage: StateStorage = {
  getItem: async (name: string): Promise<string | null> => {
    return null;
  },
  setItem: async (name: string, value: string): Promise<void> => {
    // No-op
  },
  removeItem: async (name: string): Promise<void> => {
    // No-op
  },
};

// Store factory function for per-route usage
export const createAuthStore = (
  initState: Partial<Omit<AuthState, "setAuth" | "logout" | "checkSession">> = {}
) => {
  const store = createStore<AuthState>()(
    persist(
      (set, get) => ({
        ...defaultAuthState,
        ...initState,
        setAuth: (token: string) => {
          set({ isAuthenticated: true, accessToken: token });
          tokenManager.setToken(token);
          document.cookie = `access_token=${token}; path=/; SameSite=Lax`;
        },
        logout: () => {
          set({ isAuthenticated: false, accessToken: null });
          tokenManager.setToken(null);
          document.cookie = "access_token=; path=/; max-age=0";
          // Clear other stores on logout
          db.chatlist.clear();
          db.usersettings.clear();
          // We don't delete from auth table as we aren't using it.
        },
        checkSession: async () => {
          try {
            const { data } = await axiosInstance.post("/auth/jwt/refresh/");
            set({ accessToken: data.access, isAuthenticated: true });
            tokenManager.setToken(data.access);
            document.cookie = `access_token=${data.access}; path=/; SameSite=Lax`;
          } catch (error) {
            // If refresh fails, we are not authenticated
            set({ accessToken: null, isAuthenticated: false });
            tokenManager.setToken(null);
            document.cookie = "access_token=; path=/; max-age=0";
          }
        },
      }),
      {
        name: "auth-storage",
        storage: createJSONStorage(() => dexieStorage),
        skipHydration: true,
        partialize: (state) => ({
          // No persistence for auth store
        } as AuthState),
      }
    )
  );

  // Subscribe to token manager changes (e.g. from refresh interceptor)
  tokenManager.subscribe((newToken) => {
    const currentState = store.getState();
    if (currentState.accessToken !== newToken) {
      store.setState({ accessToken: newToken });
    }
  });

  return store;
};

// Type export for the store
export type AuthStore = ReturnType<typeof createAuthStore>;
