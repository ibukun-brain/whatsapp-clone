import { createStore } from "zustand/vanilla";
import { createJSONStorage, persist, StateStorage } from "zustand/middleware";
import { UserState } from "../../types";
import { db } from "../indexdb";

// Default initial state
export const defaultUserState: Omit<UserState, "setUser" | "clearUser"> = {
    user: null,
};

// Custom Dexie storage for UserStore
const dexieStorage: StateStorage = {
    getItem: async (name: string): Promise<string | null> => {
        try {
            // We retrieve the first user found in the DB.
            // In a single-user client app, this usually corresponds to the logged-in user.
            const users = await db.user.toArray();
            if (users.length > 0) {
                const user = users[0];
                return JSON.stringify({
                    state: {
                        user: user,
                    }
                });
            }
            return null;
        } catch (error) {
            console.error("Error reading from IndexedDB (User):", error);
            return null;
        }
    },
    setItem: async (name: string, value: string): Promise<void> => {
        try {
            const parsed = JSON.parse(value);
            const state = parsed.state;
            const user = state.user;

            if (user && user.id) {
                // Store using the user's ID (defined in schema as primary key)
                await db.user.put(user);
            }
        } catch (error) {
            console.error("Error writing to IndexedDB (User):", error);
        }
    },
    removeItem: async (name: string): Promise<void> => {
        // When removing the item from storage (e.g. clear), we clear the user table
        await db.user.clear();
    },
};

export const createUserStore = (
    initState: Partial<Omit<UserState, "setUser" | "clearUser">> = {}
) => {
    return createStore<UserState>()(
        persist(
            (set) => ({
                ...defaultUserState,
                ...initState,
                setUser: (user) => set({ user }),
                clearUser: () => {
                    set({ user: null });
                    db.user.clear();
                },
            }),
            {
                name: "user-storage",
                storage: createJSONStorage(() => dexieStorage),
                skipHydration: true,
            }
        )
    );
};

export type UserStore = ReturnType<typeof createUserStore>;
