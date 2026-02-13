"use client";

import {
  createContext,
  useState,
  useContext,
  useEffect,
  type ReactNode,
} from "react";
import { useStore } from "zustand";
import {
  createAuthStore,
  type AuthStore,
  defaultAuthState,
} from "../stores/auth-store";
import { AuthState } from "../../types";

// Create context for the auth store
export const AuthStoreContext = createContext<AuthStore | null>(null);

// Props for the provider
export interface AuthStoreProviderProps {
  children: ReactNode;
  initialState?: Partial<Omit<AuthState, "setAuth" | "logout">>;
}

/**
 * AuthStoreProvider - Zustand store provider for Next.js
 * 
 * This provider creates a fresh store instance for each route/page.
 * Following Zustand's recommended pattern for Next.js to:
 * - Prevent hydration mismatches
 * - Ensure proper store isolation per request/route
 * - Support SSR safely
 * 
 * Usage:
 * ```tsx
 * // In your layout or page
 * <AuthStoreProvider>
 *   <YourComponent />
 * </AuthStoreProvider>
 * ```
 */
export function AuthStoreProvider({
  children,
  initialState,
}: AuthStoreProviderProps) {
  // Use useState with lazy initializer to create store only once
  const [store] = useState(() =>
    createAuthStore({
      ...defaultAuthState,
      ...initialState,
    })
  );

  // Manually rehydrate the store after mount to prevent render loops
  // Manually rehydrate the store after mount to prevent render loops
  useEffect(() => {
    const init = async () => {
      await store.persist.rehydrate();
      // Check session after rehydration
      await store.getState().checkSession();
    }
    init();
  }, [store]);

  return (
    <AuthStoreContext.Provider value={store}>
      {children}
    </AuthStoreContext.Provider>
  );
}

/**
 * useAuthStore - Hook to access the auth store from context
 * 
 * @param selector - Optional selector function to pick specific state
 * @returns The selected state or the entire auth state
 * 
 * Usage:
 * ```tsx
 * // Get entire state
 * const authState = useAuthStore((s) => s);
 * 
 * // Get specific values with selector
 * const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
 * const user = useAuthStore((state) => state.user);
 * 
 * // Get actions
 * const { setAuth, logout } = useAuthStore((state) => ({
 *   setAuth: state.setAuth,
 *   logout: state.logout,
 * }));
 * ```
 */
export function useAuthStore<T>(selector: (state: AuthState) => T): T {
  const store = useContext(AuthStoreContext);

  if (!store) {
    throw new Error(
      "useAuthStore must be used within an AuthStoreProvider. " +
      "Make sure to wrap your component/page with <AuthStoreProvider>."
    );
  }

  return useStore(store, selector);
}
