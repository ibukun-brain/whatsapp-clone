import { useRef, useEffect, useCallback } from "react";

// Module-level cache for scroll positions across component mounts
const scrollPositionsCache: Record<string, number> = {};

/**
 * useScrollManager
 *
 * Manages all scroll-related behaviour for the chat container:
 *
 *  1. **Scroll restoration** — When switching chats, restores the cached
 *     scrollTop position so you pick up where you left off.
 *  2. **Scroll-to-unread** — If the chat has an unread banner, scrolls there
 *     instead of restoring the cache.
 *  3. **Scroll-to-bottom** — Falls back to scroll-to-bottom when there's no
 *     cached position and no unread messages.
 *  4. **Auto-scroll on new messages** — If the user is already near the bottom,
 *     incoming messages smoothly scroll the view down.
 *  5. **Prepend scroll preservation** — Saves/restores scrollHeight when older
 *     messages are prepended, preventing layout jumps.
 *  6. **Position caching** — Writes scrollTop to the module-level cache on
 *     every scroll event so the position survives chat switches.
 */
export function useScrollManager({
    chatId,
    messagesLength,
    scrollToFirstUnread,
    hasUnreadBanner,
}: {
    chatId: string;
    messagesLength: number;
    scrollToFirstUnread: (container: HTMLDivElement | null) => boolean;
    hasUnreadBanner: boolean;
}) {
    const scrollContainerRef = useRef<HTMLDivElement>(null);
    const bottomAnchorRef = useRef<HTMLDivElement>(null);

    // Track which chatId has had its initial scroll applied
    const hasRestoredScrollRef = useRef<string | null>(null);
    const hasScrolledToUnreadRef = useRef<string | null>(null);

    // Track previous scrollHeight for prepend preservation
    const prevScrollHeightRef = useRef<number>(0);
    const prevMessagesLengthRef = useRef<number>(0);

    // ── Cache scroll position on every scroll event ───────────────────
    const handleScroll = useCallback(() => {
        if (scrollContainerRef.current) {
            scrollPositionsCache[chatId] = scrollContainerRef.current.scrollTop;
        }
    }, [chatId]);

    // ── Initial scroll: unread → cache → bottom ──────────────────────
    useEffect(() => {
        if (messagesLength === 0) return;

        // Only run once per chatId
        if (hasRestoredScrollRef.current === chatId) {
            // Handle auto-scroll on new messages when already initialised
            if (scrollContainerRef.current) {
                const container = scrollContainerRef.current;
                const isNearBottom =
                    container.scrollHeight -
                        container.scrollTop -
                        container.clientHeight <
                    150;
                if (isNearBottom) {
                    bottomAnchorRef.current?.scrollIntoView({
                        behavior: "smooth",
                    });
                }
            }
            return;
        }

        // Use rAF to ensure the DOM has painted before measuring
        requestAnimationFrame(() => {
            const container = scrollContainerRef.current;
            if (!container) return;

            // Priority 1: Scroll to unread banner
            if (
                hasUnreadBanner &&
                hasScrolledToUnreadRef.current !== chatId
            ) {
                // Give the banner element a frame to mount
                requestAnimationFrame(() => {
                    const scrolled = scrollToFirstUnread(container);
                    if (scrolled) {
                        hasScrolledToUnreadRef.current = chatId;
                        hasRestoredScrollRef.current = chatId;
                    }
                });
                return;
            }

            // Priority 2: Restore cached position
            if (scrollPositionsCache[chatId] !== undefined) {
                container.scrollTop = scrollPositionsCache[chatId];
                hasRestoredScrollRef.current = chatId;
                return;
            }

            // Priority 3: Scroll to bottom
            container.scrollTop = container.scrollHeight;
            hasRestoredScrollRef.current = chatId;
        });
    }, [chatId, messagesLength, hasUnreadBanner, scrollToFirstUnread]);

    // ── Preserve scroll position when older messages are prepended ─────
    useEffect(() => {
        const container = scrollContainerRef.current;
        if (!container) return;

        const currentLength = messagesLength;
        const prevLength = prevMessagesLengthRef.current;

        // Only adjust if messages were prepended (length grew and we had messages before)
        if (prevLength > 0 && currentLength > prevLength) {
            const heightDelta =
                container.scrollHeight - prevScrollHeightRef.current;

            // If new messages were added at the top (scrollTop would be near 0),
            // shift scroll position by the height difference to maintain position
            if (container.scrollTop < 100 && heightDelta > 0) {
                container.scrollTop += heightDelta;
            }
        }

        // Always track for next render
        prevScrollHeightRef.current = container.scrollHeight;
        prevMessagesLengthRef.current = currentLength;
    }, [messagesLength]);

    // ── Reset refs when chatId changes ────────────────────────────────
    useEffect(() => {
        return () => {
            // Cleanup: remember to reset when switching chats
            prevScrollHeightRef.current = 0;
            prevMessagesLengthRef.current = 0;
        };
    }, [chatId]);

    // ── Smooth scroll to bottom (e.g. after sending a message) ────────
    const scrollToBottom = useCallback((smooth = true) => {
        setTimeout(() => {
            bottomAnchorRef.current?.scrollIntoView({
                behavior: smooth ? "smooth" : "instant",
            });
        }, 50);
    }, []);

    // ── Scroll to message ID (e.g. for reply navigation) ──────────────
    const scrollToMessageId = useCallback((msgId: string) => {
        let element = document.getElementById(`msg-${msgId}`);
        
        // Fallback: search for synth grouped message bubbles that contain this ID
        if (!element) {
            element = document.querySelector(`[data-grouped-ids*="${msgId}"]`);
        }

        if (element && scrollContainerRef.current) {
            const container = scrollContainerRef.current;
            const elementRect = element.getBoundingClientRect();
            const containerRect = container.getBoundingClientRect();
            
            // Calculate position relative to container
            const relativeTop = element.offsetTop;
            
            // Scroll with some padding at the top
            container.scrollTo({
                top: relativeTop - 100,
                behavior: 'smooth'
            });

            return element;
        }
        return null;
    }, []);

    return {
        scrollContainerRef,
        bottomAnchorRef,
        handleScroll,
        scrollToBottom,
        scrollToMessageId,
    };
}
