import { create } from "zustand";

interface GlobalWsState {
    /**
     * Reference to sendJsonMessage from the global ws://…/ws/chats/ socket.
     * Null until the GlobalWsProvider mounts and sets it.
     */
    sendMessage: ((msg: object) => void) | null;
    setSendMessage: (fn: (msg: object) => void) => void;
}

export const useGlobalWsStore = create<GlobalWsState>((set) => ({
    sendMessage: null,
    setSendMessage: (fn) => set({ sendMessage: fn }),
}));
