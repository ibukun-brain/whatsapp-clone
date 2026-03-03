"use client";

import React from "react";
import useWebSocket from "react-use-websocket";
import { useGlobalWsStore } from "@/lib/stores/global-ws-store";
import { useTypingStore, userTypingType } from "@/lib/stores/typing-store";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/indexdb";

/**
 * GlobalWsProvider
 *
 * Owns the persistent ws://…/ws/chats/ multiplex socket.
 * Handles:
 *  - Typing indicator events → typing-store
 *  - (future) unread count updates → IndexedDB chatlist
 *  - (future) status updates → IndexedDB chatlist
 *
 * Exposes sendJsonMessage to the rest of the app via useGlobalWsStore.
 */
export function GlobalWsProvider({ children }: { children: React.ReactNode }) {
    const WS_URL = "ws://localhost:8000/ws/chats/";
    const { sendJsonMessage, lastJsonMessage } = useWebSocket(WS_URL, {
        shouldReconnect: () => true,
    });

    const setSendMessage = useGlobalWsStore((s) => s.setSendMessage);
    const setUserTyping = useTypingStore((s) => s.setUserTyping);
    const setGroupTyping = useTypingStore((s) => s.setGroupTyping);

    const currentUser = useLiveQuery(
        async () => await db.user.toCollection().first()
    );

    // Register sendJsonMessage in the global store so any component can use it
    React.useEffect(() => {
        setSendMessage(sendJsonMessage);
    }, [sendJsonMessage, setSendMessage]);

    // Handle all incoming messages on the global socket
    React.useEffect(() => {
        if (!lastJsonMessage) return;
        console.log("[global-ws]", lastJsonMessage);

        const msg = lastJsonMessage as {
            type?: string;
            // Typing indicator fields
            chatType?: string;
            chatId?: string;
            isTyping?: boolean;
            userTypingId?: string;       // directmessage
            userTyping?: userTypingType[]; // groupchat
        };

        // ── Typing indicator ────────────────────────────────────────────
        if (msg.chatId && typeof msg.isTyping === "boolean") {
            if (msg.chatType === "groupchat" && msg.userTyping != null) {
                const withoutSelf = msg.userTyping.filter(
                    (u) => !(currentUser && u.id === currentUser.id)
                );
                setGroupTyping(msg.chatId, withoutSelf);
            } else if (msg.chatType === "directmessage" && msg.userTypingId != null) {
                if (currentUser && msg.userTypingId === currentUser.id) return;
                setUserTyping(msg.chatId, msg.userTypingId, msg.isTyping);
            }
            return;
        }

        // ── Future: unread count / status updates ───────────────────────
        // if (msg.type === "unread") { ... }
        // if (msg.type === "status") { ... }

    }, [lastJsonMessage, setUserTyping, setGroupTyping, currentUser]);

    return <>{children}</>;
}
