import React from "react";
import type { Mention } from "@/types/mentions";

export const MENTION_SPAN_CLASS = "font-bold text-accent-primary";

// ─── Read-only render: text with @mention spans for bubbles/replies ──
export const renderContentWithMentions = (
    content: string,
    mentions?: Mention[]
): React.ReactNode => {
    if (!content) return content ?? "";
    if (!mentions || mentions.length === 0) return content;

    const valid = mentions
        .filter((m) => m.offset >= 0 && m.length > 0 && m.offset + m.length <= content.length)
        .slice()
        .sort((a, b) => a.offset - b.offset);
    if (valid.length === 0) return content;

    const out: React.ReactNode[] = [];
    let cursor = 0;
    valid.forEach((m, i) => {
        if (m.offset < cursor) return;
        if (m.offset > cursor) out.push(content.slice(cursor, m.offset));
        out.push(
            <span key={`mention-${i}-${m.offset}`} className={MENTION_SPAN_CLASS}>
                {content.slice(m.offset, m.offset + m.length)}
            </span>
        );
        cursor = m.offset + m.length;
    });
    if (cursor < content.length) out.push(content.slice(cursor));
    return out;
};

// ─── Contenteditable editor helpers ──────────────────────────────────
export const getEditorText = (el: HTMLElement | null): string => el?.textContent ?? "";

export const getCursorOffset = (el: HTMLElement | null): number => {
    if (!el) return 0;
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) return 0;
    const range = sel.getRangeAt(0);
    if (!el.contains(range.endContainer)) return 0;
    const pre = range.cloneRange();
    pre.selectNodeContents(el);
    pre.setEnd(range.endContainer, range.endOffset);
    return pre.toString().length;
};

// Returns the current selection's start/end as plain-text offsets within `el`,
// or null if there's no selection inside it. start === end for a collapsed caret.
export const getSelectionOffsetRange = (
    el: HTMLElement | null
): { start: number; end: number } | null => {
    if (!el) return null;
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) return null;
    const range = sel.getRangeAt(0);
    if (!el.contains(range.startContainer) || !el.contains(range.endContainer)) return null;
    const pre = document.createRange();
    pre.selectNodeContents(el);
    pre.setEnd(range.startContainer, range.startOffset);
    const start = pre.toString().length;
    pre.setEnd(range.endContainer, range.endOffset);
    const end = pre.toString().length;
    return { start, end };
};

export const setCursorOffset = (el: HTMLElement | null, offset: number): void => {
    if (!el) return;
    const sel = window.getSelection();
    if (!sel) return;
    let charCount = 0;
    let placed = false;
    const walk = (node: Node) => {
        if (placed) return;
        if (node.nodeType === Node.TEXT_NODE) {
            const len = node.textContent?.length ?? 0;
            if (charCount + len >= offset) {
                const range = document.createRange();
                range.setStart(node, Math.max(0, offset - charCount));
                range.collapse(true);
                sel.removeAllRanges();
                sel.addRange(range);
                placed = true;
                return;
            }
            charCount += len;
        } else {
            for (const child of Array.from(node.childNodes)) {
                walk(child);
                if (placed) return;
            }
        }
    };
    walk(el);
    if (!placed) {
        const range = document.createRange();
        range.selectNodeContents(el);
        range.collapse(false);
        sel.removeAllRanges();
        sel.addRange(range);
    }
};

// Renders plain text into a contenteditable, wrapping the name part of each
// tracked mention in a styled span. Active typing of '@foo' (without a tracked
// entry) stays plain.
export const renderEditorContent = (
    el: HTMLElement,
    text: string,
    mentions: { offset: number; length: number; name: string }[]
): void => {
    el.innerHTML = "";
    const sorted = [...mentions]
        .filter((m) => text.slice(m.offset, m.offset + m.length) === `@${m.name}`)
        .sort((a, b) => a.offset - b.offset);

    let i = 0;
    for (const m of sorted) {
        if (m.offset < i) continue;
        if (m.offset > i) el.appendChild(document.createTextNode(text.slice(i, m.offset)));
        el.appendChild(document.createTextNode("@"));
        const span = document.createElement("span");
        span.className = MENTION_SPAN_CLASS;
        span.textContent = m.name;
        el.appendChild(span);
        i = m.offset + m.length;
    }
    if (i < text.length) el.appendChild(document.createTextNode(text.slice(i)));
};

// Plain-text offset → DOM rect; used to anchor the picker under the '@'.
export const getOffsetRect = (el: HTMLElement, offset: number): DOMRect | null => {
    let charCount = 0;
    let target: { node: Text; pos: number } | null = null;
    const walk = (node: Node) => {
        if (target) return;
        if (node.nodeType === Node.TEXT_NODE) {
            const len = node.textContent?.length ?? 0;
            if (charCount + len >= offset) {
                target = { node: node as Text, pos: offset - charCount };
                return;
            }
            charCount += len;
        } else {
            for (const child of Array.from(node.childNodes)) {
                walk(child);
                if (target) return;
            }
        }
    };
    walk(el);
    if (!target) return null;
    const range = document.createRange();
    const t = target as { node: Text; pos: number };
    range.setStart(t.node, t.pos);
    range.setEnd(t.node, t.pos);
    return range.getBoundingClientRect();
};

// Re-anchors mention offsets to where `@${name}` actually sits in `text`.
// Drops mentions whose span no longer matches.
export const reconcileMentions = <T extends { offset: number; length: number; name: string }>(
    text: string,
    mentions: T[]
): T[] => {
    const used: Array<[number, number]> = [];
    const out: T[] = [];
    for (const m of mentions) {
        const needle = `@${m.name}`;
        let from = 0;
        let idx = -1;
        while (true) {
            const found = text.indexOf(needle, from);
            if (found === -1) break;
            const overlaps = used.some(([s, e]) => found < e && (found + needle.length) > s);
            if (!overlaps) { idx = found; break; }
            from = found + 1;
        }
        if (idx === -1) continue;
        used.push([idx, idx + needle.length]);
        out.push({ ...m, offset: idx, length: needle.length });
    }
    return out;
};
