import { create } from "zustand";

interface TypingState {
    /** chatId → isTyping */
    typingChats: Record<string, boolean>;
    setTyping: (chatId: string, isTyping: boolean) => void;
}

export const useTypingStore = create<TypingState>((set) => ({
    typingChats: {},
    setTyping: (chatId, isTyping) =>
        set((state) => ({
            typingChats: { ...state.typingChats, [chatId]: isTyping },
        })),
}));
