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
    createUserStore,
    type UserStore,
    defaultUserState,
} from "../stores/user-store";
import { UserState } from "../../types";

export const UserStoreContext = createContext<UserStore | null>(null);

export interface UserStoreProviderProps {
    children: ReactNode;
    initialState?: Partial<Omit<UserState, "setUser" | "clearUser">>;
}

export function UserStoreProvider({
    children,
    initialState,
}: UserStoreProviderProps) {
    const [store] = useState(() =>
        createUserStore({
            ...defaultUserState,
            ...initialState,
        })
    );

    useEffect(() => {
        store.persist.rehydrate();
    }, [store]);

    return (
        <UserStoreContext.Provider value={store}>
            {children}
        </UserStoreContext.Provider>
    );
}

export function useUserStore<T>(selector: (state: UserState) => T): T {
    const store = useContext(UserStoreContext);

    if (!store) {
        throw new Error(
            "useUserStore must be used within a UserStoreProvider."
        );
    }

    return useStore(store, selector);
}
