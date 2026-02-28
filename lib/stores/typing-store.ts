import { create } from "zustand";

export type userTypingType = {
    id: string;
    phone?: string;
    displayName?: string,
    image?: string;
}

interface TypingState {
    /**
     * chatId → array of users currently typing.
     * DMs: at most one entry. Group chats: multiple entries.
     * Using an array (not a Set) because objects compare by reference in Sets.
     */
    typingChats: Record<string, userTypingType[]>;
    /** DM: add or remove a single user by their ID */
    setUserTyping: (chatId: string, userId: string, isTyping: boolean) => void;
    /** Group: replace the entire typing list with the backend's authoritative snapshot */
    setGroupTyping: (chatId: string, userTyping: userTypingType[]) => void;
}

// Stable empty array reference — used as fallback to avoid creating a new array each render
export const EMPTY_TYPING: userTypingType[] = [];

export const useTypingStore = create<TypingState>((set) => ({
    typingChats: {},

    setUserTyping: (chatId, userId, isTyping) =>
        set((state) => {
            const current = state.typingChats[chatId] ?? [];
            if (isTyping) {
                // Add only if not already present
                if (current.some((u) => u.id === userId)) return state;
                return { typingChats: { ...state.typingChats, [chatId]: [...current, { id: userId }] } };
            } else {
                return {
                    typingChats: {
                        ...state.typingChats,
                        [chatId]: current.filter((u) => u.id !== userId),
                    },
                };
            }
        }),

    setGroupTyping: (chatId, userTyping) =>
        set((state) => ({
            typingChats: { ...state.typingChats, [chatId]: userTyping },
        })),
}));
