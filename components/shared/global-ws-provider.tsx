"use client";

import React from "react";
import useWebSocket from "react-use-websocket";
import { useGlobalWsStore } from "@/lib/stores/global-ws-store";
import { useTypingStore, userTypingType } from "@/lib/stores/typing-store";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/indexdb";
import { Chat } from "@/types";

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
        console.log("[global-ws]", lastJsonMessage)
        const msg = lastJsonMessage as {
            type?: string;
            data?: {
                user?: {
                    "id": string,
                    "unread_messages": number
                }
                chat?: Chat,
                offline_user?: {
                    "user_id": string,
                    "last_seen": Date,
                },
                online_userid?: string
            };
            chat?: Chat; // Handle cases where chat is at root
            // Typing indicator fields
            chatType?: string;
            chatId?: string;
            isTyping?: boolean;
            userTypingId?: string;       // directmessage
            userTyping?: userTypingType[]; // groupchat
        };

        if (msg.type === "dm_online_user" && msg.data?.online_userid) {
            const user_id = msg.data.online_userid;
            const updateOnlineStatus = async () => {
                try {
                    await db.transaction('rw', db.chatlist, async () => {
                        const chatsToUpdate = await db.chatlist
                            .filter(c => c.direct_message?.dm_user_id === user_id)
                            .toArray();

                        for (const chat of chatsToUpdate) {
                            if (chat.direct_message) {
                                await db.chatlist.update(chat.id, {
                                    direct_message: {
                                        ...chat.direct_message,
                                        is_online: true
                                    }
                                });
                            }
                        }
                    });
                } catch (error) {
                    console.error("Failed to update online status", error);
                }
            };
            updateOnlineStatus();
        }

        if (msg.type === "dm_offline_user" && msg.data?.offline_user) {
            const { user_id, last_seen } = msg.data.offline_user;
            const updateOfflineStatus = async () => {
                try {
                    await db.transaction('rw', db.chatlist, async () => {
                        const chatsToUpdate = await db.chatlist
                            .filter(c => c.direct_message?.dm_user_id === user_id)
                            .toArray();

                        for (const chat of chatsToUpdate) {
                            if (chat.direct_message) {
                                await db.chatlist.update(chat.id, {
                                    direct_message: {
                                        ...chat.direct_message,
                                        last_seen: new Date(last_seen),
                                        is_online: false
                                    }
                                });
                            }
                        }
                    });
                } catch (error) {
                    console.error("Failed to update offline status", error);
                }
            };
            updateOfflineStatus();
        }

        if (msg.type === "handle_user_chatlist_update" && msg.data?.chat && msg.data?.user) {
            const chatData = msg.data?.chat || msg.chat;
            const userData = msg.data?.user;
            if (!chatData) return;

            const updateChatList = async () => {
                try {
                    if (!chatData.id) {
                        console.warn("Received chat update without id:", chatData);
                        return;
                    }
                    await db.transaction('rw', db.chatlist, async () => {
                        // 1. Find existing chat to preserve metadata (drafts, isPinned)
                        // Note: We use the most reliable identifiers
                        const existing = await db.chatlist.get(chatData.id) ||
                            await db.chatlist.filter(c =>
                                (!!chatData.direct_message && c.direct_message?.id === chatData.direct_message.id) ||
                                (!!chatData.group_chat && c.group_chat?.id === chatData.group_chat.id)
                            ).first();

                        if (existing) {
                            // If we found a record with a different primary key, remove it to avoid duplicates/conflicts
                            if (existing.id !== chatData.id) {
                                await db.chatlist.delete(existing.id);
                            }

                            await db.chatlist.put({
                                ...existing,
                                ...chatData,
                                id: chatData.id, // Prefer the backend ID
                                draft: existing.draft,
                                isPinned: existing.isPinned,
                            });
                        } else {
                            await db.chatlist.put(chatData);
                        }
                    });

                    // 2. Update user's unread_messages count in IndexedDB
                    if (userData?.id && typeof userData.unread_messages === 'number') {
                        await db.user.update(userData.id, {
                            unread_messages: userData.unread_messages,
                        });
                    }
                } catch (error) {
                    console.error("Failed to update chatlist via WS", error);
                }
            };
            updateChatList();
            return;
        }

        // ── Typing indicator ────────────────────────────────────────────
        if (msg.chatId && typeof msg.isTyping === "boolean") {
            if (msg.type === "typing" && msg.chatType === "groupchat" && msg.userTyping != null) {
                // Use the latest value from the live query without triggering effects
                db.user.toCollection().first().then(user => {
                    const withoutSelf = msg.userTyping!.filter(
                        (u) => !(user && u.id === user.id)
                    );
                    setGroupTyping(msg.chatId!, withoutSelf);
                });
            } else if (msg.chatType === "directmessage" && msg.userTypingId != null) {
                db.user.toCollection().first().then(user => {
                    if (user && msg.userTypingId === user.id) return;
                    setUserTyping(msg.chatId!, msg.userTypingId!, msg.isTyping!);
                });
            }
            return;
        }
    }, [lastJsonMessage, setUserTyping, setGroupTyping]);

    return <>{children}</>;
}
