"use client";

import React from "react";
import useWebSocket from "react-use-websocket";
import { useGlobalWsStore } from "@/lib/stores/global-ws-store";
import { useTypingStore, userTypingType } from "@/lib/stores/typing-store";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/indexdb";
import { Chat, DirectMessageChats, GroupMessageChatRecipients, GroupMessageChats, User } from "@/types";

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
    const setUserRecording = useTypingStore((s) => s.setUserRecording);
    const setGroupRecording = useTypingStore((s) => s.setGroupRecording);

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
        const msg = lastJsonMessage as {
            type?: string;
            action?: string;
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
                read_by?: string
                read?: boolean
                direct_message_id?: string,
                groupchat_id?: string,
                read_date?: Date,
                message?: DirectMessageChats | GroupMessageChats | any
                dm_delivery_broadcast?: {
                    "direct_message_id": string,
                    "delivered_date": Date,
                }[],
                recipients: GroupMessageChatRecipients[]
                updated_recipients: GroupMessageChatRecipients[]
                deleted?: any;
                files?: any[];
                [key: string]: any;
            };
            chat?: Chat; // Handle cases where chat is at root
            // Typing indicator fields
            chatType?: string;
            chatId?: string;
            isTyping?: boolean;
            userTypingId?: string;       // directmessage
            userTyping?: userTypingType[]; // groupchat
            isRecording?: boolean;
            userRecordingId?: string;       // directmessage
            userRecording?: userTypingType[]; // groupchat
        };

        if (msg.type === "message_delivery_broadcast") {
            const dm_delivery_broadcasts = msg.data?.dm_delivery_broadcast!;
            const recipients = msg.data?.recipients!;

            if (recipients.length > 0) {
                // Update the delivery date (receipt) of the message
                const updateGroupChatMessageReceipt = async () => {
                    try {
                        // await db.transaction('rw', db.groupmessagechatrecipients, db.groupmessagechats, db.chatlist, async () => {
                        const updateDeliveredReceipt = async () => {
                            try {
                                await db.transaction('rw', db.groupmessagechatrecipients, db.groupmessagechats, db.chatlist, async () => {
                                    for (const recipient of recipients) {
                                        // Update recipient table as well
                                        // groupmessagechatrecipients
                                        // get direct_message by id
                                        const messagesToUpdate = await db.groupmessagechats
                                            .filter(m => m.id === recipient.message_id)
                                            .toArray();

                                        // Update directmessages to delivered
                                        for (const message of messagesToUpdate) {
                                            await db.groupmessagechats.update(message.id, {
                                                receipt: recipient.receipt
                                            });
                                            // Update chatlist recent message delivered_date
                                            const chat = await db.chatlist.filter(c => c.group_chat?.recent_content_id === recipient.message_id).first();
                                            if (chat?.group_chat) {
                                                await db.chatlist.update(chat.id, {
                                                    group_chat: {
                                                        ...chat.group_chat,
                                                        receipt: recipient.receipt
                                                    }
                                                });
                                            }
                                            if (message.user.id == currentUser?.id) {
                                                const existingRecipient = await db.groupmessagechatrecipients.get(recipient.id);
                                                if (existingRecipient) {
                                                    await db.groupmessagechatrecipients.update(existingRecipient.id, {
                                                        receipt: recipient.receipt,
                                                        delivered_date: recipient.delivered_date ? new Date(recipient.delivered_date) : new Date()
                                                    });
                                                } else {
                                                    await db.groupmessagechatrecipients.put({
                                                        ...recipient,
                                                        delivered_date: recipient.delivered_date ? new Date(recipient.delivered_date) : new Date(),
                                                        read_date: recipient.read_date ? new Date(recipient.read_date) : null
                                                    });
                                                }
                                            }

                                        }
                                    }
                                });
                            } catch (error) {
                                console.error("Failed to update delivered date via WS", error);
                            }
                        };
                        updateDeliveredReceipt();
                        // });
                    } catch (error) {
                        console.error("Failed to update delivered date via WS", error);
                    }
                };
                updateGroupChatMessageReceipt();
            }


            if (dm_delivery_broadcasts.length > 0) {
                // Update the delivery date of the message
                const updateDirectMessageDeliveredDates = async () => {
                    try {
                        await db.transaction('rw', db.directmessagechats, db.chatlist, async () => {
                            const updateDeliveredDates = async () => {
                                try {
                                    await db.transaction('rw', db.directmessagechats, db.chatlist, async () => {
                                        for (const { direct_message_id, delivered_date } of dm_delivery_broadcasts) {
                                            // get direct_message by id
                                            const messagesToUpdate = await db.directmessagechats
                                                .filter(m => m.direct_message_id === direct_message_id && !m.delivered_date)
                                                .toArray();
                                            // Update directmessages to delivered
                                            for (const message of messagesToUpdate) {
                                                await db.directmessagechats.update(message.id, {
                                                    delivered_date: delivered_date ? new Date(delivered_date) : new Date()
                                                });
                                                // Update chatlist recent message delivered_date
                                                const chat = await db.chatlist.filter(c => c.direct_message?.id === direct_message_id).first();
                                                if (chat?.direct_message) {
                                                    await db.chatlist.update(chat.id, {
                                                        direct_message: {
                                                            ...chat.direct_message,
                                                            delivered_date: delivered_date ? new Date(delivered_date) : new Date()
                                                        }
                                                    });
                                                }

                                            }
                                        }
                                    });
                                } catch (error) {
                                    console.error("Failed to update delivered date via WS", error);
                                }
                            };
                            updateDeliveredDates();
                        });
                    } catch (error) {
                        console.error("Failed to update delivered date via WS", error);
                    }
                };
                updateDirectMessageDeliveredDates();
            }
        }

        if (msg.type === "dm_chat_message_read" && msg.data?.read && msg.data?.direct_message_id) {
            const { direct_message_id, read_by, read_date } = msg.data;
            const isMe = read_by === currentUser?.id;
            const userData = msg.data?.user

            const updateReadDate = async () => {
                try {
                    // 1. Update directmessagechats table
                    await db.transaction('rw', db.directmessagechats, async () => {
                        const messagesToUpdate = await db.directmessagechats
                            .filter(m => m.direct_message_id === direct_message_id && m.user !== read_by && !m.read_date)
                            .toArray();

                        for (const message of messagesToUpdate) {
                            await db.directmessagechats.update(message.id, {
                                read_date: read_date ? new Date(read_date) : new Date()
                            });
                        }
                    });

                    // 2. Update chatlist table
                    await db.transaction('rw', db.chatlist, async () => {
                        const chat = await db.chatlist.filter(c => c.direct_message?.id === direct_message_id).first();
                        if (chat?.direct_message) {
                            const updateData: any = {
                                direct_message: {
                                    ...chat.direct_message,
                                }
                            };

                            if (isMe) {
                                // If I read the messages, clear the unread count
                                updateData.direct_message.unread_messages = 0;
                            } else if (chat.direct_message.recent_user_id !== read_by) {
                                // If the other person read MY messages, update the read_date (blue ticks)
                                updateData.direct_message.read_date = read_date ? new Date(read_date) : new Date();
                            }

                            await db.chatlist.update(chat.id, updateData);
                        }
                    });
                    // 3 Update user's unread_messages count in IndexedDB
                    if (userData?.id && typeof userData?.unread_messages === 'number') {
                        await db.user.update(userData.id, {
                            unread_messages: userData.unread_messages,
                        });
                    }
                } catch (error) {
                    console.error("Failed to update read date via WS", error);
                }
            };
            updateReadDate();
        }
        if (msg.type === "groupchat_message_read" && msg.data?.recipients && msg.data?.groupchat_id) {
            const { recipients, groupchat_id, read_by } = msg.data;
            const receipt = recipients ? recipients[0].receipt : "sent"
            const userData = msg.data?.user
            const isMe = read_by === currentUser?.id;
            const updateReadDate = async () => {
                try {
                    // 1. Create new row in groupmessagerecipient table
                    await db.transaction('rw', db.groupmessagechatrecipients, db.groupmessagechats, async () => {
                        // await db.groupmessagechatrecipients.bulkUpdate(recipients)
                        for (const recipient of recipients) {
                            const messageToUpdate = await db.groupmessagechats.filter(m => {
                                return m.groupchat_id === groupchat_id && m.id === recipient.message_id && m.user.id === currentUser?.id;
                            }).toArray();
                            for (const message of messageToUpdate) {
                                await db.groupmessagechats.update(message.id, {
                                    receipt: recipient.receipt
                                });
                                if (message.user.id === currentUser?.id) {
                                    const existingRecipient = await db.groupmessagechatrecipients.get(recipient.id);
                                    if (existingRecipient) {
                                        await db.groupmessagechatrecipients.update(existingRecipient.id, {
                                            receipt: recipient.receipt,
                                            read_date: recipient.read_date ? new Date(recipient.read_date) : new Date()
                                        });
                                    } else {
                                        await db.groupmessagechatrecipients.put({
                                            ...recipient,
                                            read_date: recipient.read_date ? new Date(recipient.read_date) : new Date(),
                                            delivered_date: recipient.delivered_date ? new Date(recipient.delivered_date) : new Date()
                                        });
                                    }
                                }
                            }
                        }
                    });

                    // 2. Update chatlist table
                    await db.transaction('rw', db.chatlist, async () => {
                        const chat = await db.chatlist.filter(c => c.group_chat?.id === groupchat_id).first();
                        if (chat?.group_chat) {
                            const updatedGroupChat = { ...chat.group_chat };

                            if (chat.group_chat.recent_user_id === currentUser?.id || isMe) {
                                // If I read the messages, clear the unread count
                                updatedGroupChat.unread_messages = 0;
                            }
                            updatedGroupChat.receipt = receipt
                            await db.chatlist.update(chat.id, {
                                group_chat: updatedGroupChat
                            });
                        }
                    });
                    // 3 Update user's unread_messages count in IndexedDB
                    if (userData?.id && typeof userData?.unread_messages === 'number') {
                        await db.user.update(userData.id, {
                            unread_messages: userData.unread_messages,
                        });
                    }
                } catch (error) {
                    console.error("Failed to update read date via WS", error);
                }
            };
            updateReadDate();
        }

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
            // send an event to set every unread messages o delivered status when the user is online
            // only send this event if currentuser is not the online user
            const fetchUnreadMessages = async () => {
                const unreadGroupChatMessage = await db.groupmessagechats.filter((message) => message.receipt === "sent" && !message.isOptimistic).toArray()
                const unreadGroupChatMessageIds = unreadGroupChatMessage.map((message) => message.id)
                const unreadDM = await db.directmessagechats.filter((message) => !message.delivered_date && !message.isOptimistic).toArray()
                const unreadDMIds = unreadDM.map((message) => message.id)

                sendJsonMessage({
                    type: "send_chat_message_delivery_broadcast",
                    data: {
                        onlineUserId: user_id,
                        unreadGroupChatMessageIds, // Sends unread group messages id to be updated as delivered
                        unreadDMIds // Send unread direct messages id to be updated as delivered
                    }

                })
            }

            updateOnlineStatus();
            fetchUnreadMessages()

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

            const updateMessage = async () => {
                try {
                    const message = msg.data?.message;
                    const directMessageId = msg.data?.direct_message_id
                    const groupChatId = msg.data?.groupchat_id

                    if (!message) return;

                    if (directMessageId) {
                        const directChatMessage = message as DirectMessageChats;
                        if (!directChatMessage.id) {
                            console.warn("Received direct message without ID:", directChatMessage);
                            return;
                        }

                        // Clean up any optimistic messages that match the content and user, or client_msg_id
                        await db.directmessagechats
                            .where('direct_message_id').equals(directMessageId)
                            .and(m => {
                                const isOptimistic = m.isOptimistic === true;
                                const isSameUser = m.user === currentUser?.id;
                                const isSameClientMsgId = directChatMessage.client_msg_id && m.client_msg_id === directChatMessage.client_msg_id;
                                const isSameContent = m.content === directChatMessage.content;
                                return isOptimistic && isSameUser && (isSameClientMsgId || isSameContent);
                            })
                            .delete();

                        const existing = await db.directmessagechats.get(directChatMessage.id);
                        const chat = await db.chatlist.filter(c =>
                            (c.direct_message?.id === directMessageId)
                        ).first();

                        if (chat) {
                            if (existing) {
                                console.log('Updating existing direct message:', directChatMessage.id);
                                
                                // Merge files: preserve local blob URLs for existing files, 
                                // but update their properties (like 'deleted') from the server.
                                const mergedFiles = (directChatMessage.files || []).map(newFile => {
                                    const oldFile = existing.files?.find(f => f.file_id === newFile.file_id);
                                    return {
                                        ...newFile,
                                        media_url: oldFile?.media_url || newFile.media_url,
                                        preview_url: oldFile?.preview_url || newFile.preview_url,
                                        file_blob: oldFile?.file_blob || newFile.file_blob,
                                    };
                                });

                                await db.directmessagechats.put({
                                    ...existing,
                                    ...directChatMessage,
                                    files: mergedFiles,
                                    isOptimistic: false,
                                });
                            } else {
                                console.log('Inserting new direct message:', directChatMessage.id);
                                await db.directmessagechats.put(directChatMessage);
                            }
                        }
                    } else if (groupChatId) {
                        const groupChatMessage = message as GroupMessageChats;
                        if (!groupChatMessage.id) {
                            console.warn("Received group message without ID:", groupChatMessage);
                            return;
                        }

                        // Clean up any optimistic messages that match the content and user, or client_msg_id
                        await db.groupmessagechats
                            .where('groupchat_id').equals(groupChatId)
                            .and(m => {
                                const mUserId = typeof m.user === 'object' && m.user !== null ? (m.user as User).id : (m.user as unknown as string);
                                const isOptimistic = m.isOptimistic === true;
                                const isSameUser = mUserId === currentUser?.id;
                                const isSameClientMsgId = groupChatMessage.client_msg_id && m.client_msg_id === groupChatMessage.client_msg_id;
                                const isSameContent = m.content === groupChatMessage.content;
                                return isOptimistic && isSameUser && (isSameClientMsgId || isSameContent);
                            })
                            .delete();

                        const existing = await db.groupmessagechats.get(groupChatMessage.id);
                        const chat = await db.chatlist.filter(c =>
                            (c.group_chat?.id === groupChatId)
                        ).first();

                        if (chat) {
                            if (existing) {
                                console.log('Updating existing group message:', groupChatMessage.id);

                                // Merge files logic
                                const mergedFiles = (groupChatMessage.files || []).map(newFile => {
                                    const oldFile = existing.files?.find(f => f.file_id === newFile.file_id);
                                    return {
                                        ...newFile,
                                        media_url: oldFile?.media_url || newFile.media_url,
                                        preview_url: oldFile?.preview_url || newFile.preview_url,
                                        file_blob: oldFile?.file_blob || newFile.file_blob,
                                    };
                                });

                                await db.groupmessagechats.put({
                                    ...existing,
                                    ...groupChatMessage,
                                    files: mergedFiles,
                                    isOptimistic: false,
                                });
                            } else {
                                console.log('Inserting new group message:', groupChatMessage.id);
                                await db.groupmessagechats.put(groupChatMessage);
                            }
                        }
                    }
                } catch (error) {
                    console.error("Failed to update message via WS", error);
                }
            }
            updateMessage();
            return;
        }

        // ── Deletion handler ──────────────────────────────────────────
        if (msg.type === "handle_user_chatlist_update" && msg.action === "delete") {
            const updateDeletion = async () => {
                try {
                    const messageId = msg.data?.message?.id || msg.data?.direct_message_id || msg.data?.groupchat_id;
                    if (!messageId) return;

                    const isDM = !!msg.data?.direct_message_id;
                    const table = isDM ? db.directmessagechats : db.groupmessagechats;
                    
                    const existing = await table.get(messageId);
                    if (existing) {
                        await table.update(messageId, {
                            deleted: msg.data?.message?.deleted || msg.data?.deleted,
                            files: msg.data?.message?.files || msg.data?.files || existing.files
                        });
                    }
                } catch (error) {
                    console.error("Failed to process deletion via WS", error);
                }
            };
            updateDeletion();
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
        // ── Recording indicator ────────────────────────────────────────────
        if (msg.chatId && typeof msg.isRecording === "boolean") {
            if (msg.type === "recording" && msg.chatType === "groupchat" && msg.userRecording != null) {
                // Use the latest value from the live query without triggering effects
                db.user.toCollection().first().then(user => {
                    const withoutSelf = msg.userRecording!.filter(
                        (u) => !(user && u.id === user.id)
                    );
                    setGroupRecording(msg.chatId!, withoutSelf);
                });
            } else if (msg.chatType === "directmessage" && msg.userRecordingId != null) {
                db.user.toCollection().first().then(user => {
                    if (user && msg.userRecordingId === user.id) return;
                    setUserRecording(msg.chatId!, msg.userRecordingId!, msg.isRecording!);
                });
            }
            return;
        }
    }, [lastJsonMessage, setUserTyping, setGroupTyping, setUserRecording, setGroupRecording]);

    return <>{children}</>;
}
