import { useRef, useCallback, useMemo } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/indexdb";
import { DirectMessageChats, GroupMessageChats, User } from "@/types";

export type UnreadState = {
    firstUnreadId: string | null;
    unreadCount: number;
};

/**
 * useUnreadMessages
 *
 * Detects the first unread message in a chat using IndexedDB (Dexie).
 * Captures the initial unread state when entering a chat and freezes it
 * so that subsequent read-status updates don't move the banner.
 *
 * Returns:
 *  - `unreadState`: { firstUnreadId, unreadCount } frozen at open-time
 *  - `scrollToFirstUnread`: function that scrolls the container to the unread banner
 *  - `bannerRef`: ref to attach to the UnreadBanner DOM element
 *  - `isUnreadBannerVisible`: whether the banner should render
 */
export function useUnreadMessages({
    chatId,
    currentUserId,
    chatType,
    externalUnreadCount,
}: {
    chatId: string;
    currentUserId: string | undefined;
    chatType: "directmessage" | "groupchat" | null | undefined;
    externalUnreadCount?: number;
}) {
    // Freeze the unread state per chatId — only compute once per visit
    const frozenUnreadRef = useRef<{
        chatId: string;
        chatType: string;
        state: UnreadState;
    } | null>(null);

    const bannerRef = useRef<HTMLDivElement>(null);

    // ── Query last_read_message_id from IndexedDB ──────────────────────
    // For DMs: find the first message from the other person that has no read_date
    // For Groups: find the first message from others with receipt !== "read"
    const dmMessages = useLiveQuery(
        () =>
            chatType === "directmessage"
                ? db.directmessagechats
                    .where("direct_message_id")
                    .equals(chatId)
                    .sortBy("timestamp")
                : [],
        [chatId, chatType]
    );

    const groupMessages = useLiveQuery(
        () =>
            chatType === "groupchat"
                ? db.groupmessagechats
                    .where("groupchat_id")
                    .equals(chatId)
                    .sortBy("timestamp")
                : [],
        [chatId, chatType]
    );
    // Compute the unread state — frozen on first computation per chatId
    const unreadState = useMemo<UnreadState>(() => {
        // If we already computed for this chatId and type, return frozen value
        if (
            frozenUnreadRef.current?.chatId === chatId &&
            frozenUnreadRef.current?.chatType === chatType
        ) {
            return frozenUnreadRef.current.state;
        }

        // If explicitly read (count 0) and we haven't frozen a banner yet,
        // don't bother searching or showing a banner.
        if (externalUnreadCount === 0) {
            return { firstUnreadId: null, unreadCount: 0 };
        }

        if (!currentUserId) return { firstUnreadId: null, unreadCount: 0 };

        let firstUnreadId: string | null = null;
        let unreadCount = 0;

        if (chatType === "directmessage" && dmMessages !== undefined) {
            const unread = dmMessages.filter(
                (msg) => msg.user !== currentUserId && !msg.read_date
            );
            firstUnreadId = unread.length > 0 ? unread[0].id : null;
            unreadCount = unread.length;
        } else if (chatType === "groupchat" && groupMessages !== undefined) {
            const unread = groupMessages.filter((msg) => {
                const msgUserId =
                    typeof msg.user === "object" && msg.user !== null
                        ? (msg.user as User).id
                        : (msg.user as unknown as string);
                return msgUserId !== currentUserId && msg.receipt !== "read";
            });
            firstUnreadId = unread.length > 0 ? unread[0].id : null;
            unreadCount = unread.length;
        } else {
            // Data not loaded yet (or chatType is null/undefined while loading) — don't freeze
            return { firstUnreadId: null, unreadCount: 0 };
        }

        const state = { firstUnreadId, unreadCount };
        // Only freeze if we found unread messages. If 0, keep filtering
        // so we catch up if background sync fills the IndexedDB later.
        if (state.unreadCount > 0) {
            frozenUnreadRef.current = {
                chatId,
                chatType: chatType as string,
                state,
            };
        }
        return state;
    }, [chatId, currentUserId, chatType, dmMessages, groupMessages, externalUnreadCount]);

    // ── Scroll to first unread message ────────────────────────────────
    const scrollToFirstUnread = useCallback(
        (scrollContainer: HTMLDivElement | null) => {
            if (!scrollContainer || !bannerRef.current) return false;

            const containerRect = scrollContainer.getBoundingClientRect();
            const bannerRect = bannerRef.current.getBoundingClientRect();

            // Calculate the banner's offset from the top of the scroll container's content
            const bannerOffsetTop =
                bannerRect.top -
                containerRect.top +
                scrollContainer.scrollTop;

            // Position the banner ~80px below the top of the viewport for visual context
            const targetScroll = bannerOffsetTop - 700;

            scrollContainer.scrollTop = Math.max(0, targetScroll);
            return true;
        },
        []
    );

    // Reset frozen state when chatId OR chatType changes
    if (
        frozenUnreadRef.current &&
        (frozenUnreadRef.current.chatId !== chatId ||
            frozenUnreadRef.current.chatType !== chatType)
    ) {
        frozenUnreadRef.current = null;
    }

    return {
        unreadState,
        scrollToFirstUnread,
        bannerRef,
        isUnreadBannerVisible:
            unreadState.firstUnreadId !== null && unreadState.unreadCount > 0,
    };
}
