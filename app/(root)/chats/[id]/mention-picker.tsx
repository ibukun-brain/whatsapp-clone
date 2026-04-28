"use client";

import React from "react";
import Image from "next/image";
import { Users } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { GroupMember } from "@/types";

export type MentionPickerSelection =
    | { type: "user"; member: GroupMember }
    | { type: "all" };

interface MentionPickerProps {
    members: GroupMember[];
    query: string;
    onSelect: (selection: MentionPickerSelection) => void;
    leftOffset: number;
    /** When false (e.g. DMs), the '@all' entry and members list are hidden — only the Meta AI header shows. */
    showAll?: boolean;
}

const isPhoneOnlyName = (name: string | undefined | null): boolean =>
    !!name && /^\+\d+$/.test(name.replaceAll(" ", ""));

// Wraps the substring of `text` that matches `query` (case-insensitive) in a
// bold span. First match only — that's where the user is targeting.
const highlightMatch = (text: string, query: string): React.ReactNode => {
    if (!query) return text;
    const idx = text.toLowerCase().indexOf(query.toLowerCase());
    if (idx === -1) return text;
    return (
        <>
            {text.slice(0, idx)}
            <span className="font-bold text-[#111b21]">{text.slice(idx, idx + query.length)}</span>
            {text.slice(idx + query.length)}
        </>
    );
};

export const MentionPicker = React.memo(function MentionPicker({
    members,
    query,
    onSelect,
    leftOffset,
    showAll = true,
}: MentionPickerProps) {
    const filtered = React.useMemo(() => {
        const q = query.toLowerCase().trim();
        if (!q) return members;
        return members.filter((m) => {
            const name = m.name?.toLowerCase() ?? "";
            const display = m.user?.display_name?.toLowerCase() ?? "";
            const phone = m.user?.phone?.toLowerCase() ?? "";
            return name.includes(q) || display.includes(q) || phone.includes(q);
        });
    }, [members, query]);

    // The @all row appears only when the prop allows it AND the current query
    // matches "all" (empty query, or 'a'/'al'/'all').
    const allMatchesQuery = !query || "all".startsWith(query.toLowerCase());
    const showAllRow = showAll && allMatchesQuery;
    const isEmpty = !showAllRow && filtered.length === 0;

    return (
        <div
            style={{ left: leftOffset }}
            className="absolute bottom-full w-[300px] max-h-[250px] flex flex-col bg-white rounded-2xl border border-[#e9edef] overflow-hidden z-30 animate-in fade-in slide-in-from-bottom-2 duration-150"
        >
            {/* Meta AI header — always visible at the very top */}
            <div className="flex items-center gap-3 px-4 py-3 border-b border-[#f0f2f5] cursor-pointer hover:bg-[#f5f6f6] transition-colors">
                <div className="w-9 h-9 rounded-full overflow-hidden shrink-0 bg-[#f0f2f5]">
                    <Image
                        src="/images/metaAI.png"
                        alt="Meta AI"
                        width={36}
                        height={36}
                        className="w-full h-full object-cover"
                        unoptimized
                    />
                </div>
                <span className="text-xs text-[#667781] text-center">
                    You can mention the assistant to ask a question
                </span>
            </div>

            {/* Scrollable members list */}
            <div className="flex-1 min-h-0 overflow-y-auto">
                {showAllRow && (
                    <button
                        type="button"
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => onSelect({ type: "all" })}
                        className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-[#f5f6f6] cursor-pointer transition-colors text-left"
                    >
                        <div className="h-9 w-9 shrink-0 rounded-full bg-accent-primary flex items-center justify-center text-white">
                            <Users size={18} />
                        </div>
                        <div className="flex flex-col min-w-0 flex-1">
                            <span className="text-[14.5px] text-[#111b21] truncate">
                                {highlightMatch("all", query)}
                            </span>
                            <span className="text-[12.5px] text-[#667781] truncate">
                                Notify everyone
                            </span>
                        </div>
                    </button>
                )}

                {isEmpty && (showAll || members.length > 0) ? (
                    <div className="px-4 py-3 text-[13.5px] text-[#667781]">
                        No matches found
                    </div>
                ) : (
                    filtered.map((member) => {
                        const phoneAsName = isPhoneOnlyName(member.name);
                        const avatar = member.user?.profile_pic ?? undefined;
                        const fallbackChar = (
                            member.user?.display_name ||
                            member.name ||
                            "?"
                        )
                            .slice(0, 1)
                            .toUpperCase();

                        return (
                            <button
                                key={member.id}
                                type="button"
                                onMouseDown={(e) => e.preventDefault()}
                                onClick={() => onSelect({ type: "user", member })}
                                className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-[#f5f6f6] cursor-pointer transition-colors text-left"
                            >
                                <Avatar className="h-9 w-9 shrink-0">
                                    <AvatarImage src={avatar} />
                                    <AvatarFallback className="text-[13px] bg-[#dfe5e7]">
                                        {fallbackChar}
                                    </AvatarFallback>
                                </Avatar>
                                <div className="flex flex-col min-w-0 flex-1">
                                    {phoneAsName ? (
                                        <>
                                            <span className="text-[14.5px] text-[#111b21] truncate">
                                                {highlightMatch(member.user?.display_name ?? "", query)}
                                            </span>
                                            <span className="text-[12.5px] text-[#667781] truncate">
                                                {highlightMatch(member.user?.phone ?? "", query)}
                                            </span>
                                        </>
                                    ) : (
                                        <span className="text-[14.5px] text-[#111b21] truncate">
                                            {highlightMatch(member.name ?? "", query)}
                                        </span>
                                    )}
                                </div>
                            </button>
                        );
                    })
                )}
            </div>
        </div>
    );
});
