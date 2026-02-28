"use client"

import React from "react"
import { ChevronIcon, MenuIcon, SearchIcon, VideoCallIcon } from "@/components/icons/chats-icon"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { DirectMessageName, GroupMember, GroupMemberResults } from "@/types"
import { cn } from "@/lib/utils"

type DirectMessageUserInfo = {
    name: DirectMessageName,
    userId: string,
    image: string
}

type GroupMessageUserInfo = {
    groupId: string,
    name: string,
    image: string
}

const ChatHeader = ({ directMessageUserInfo, groupMessageInfo, onOpenInfo, groupMembers, isTyping }: {
    directMessageUserInfo: DirectMessageUserInfo | null,
    groupMessageInfo: GroupMessageUserInfo | null,
    onOpenInfo?: () => void,
    groupMembers?: GroupMember[],
isTyping?: boolean,
}) => {
    const [showContactHint, setShowContactHint] = React.useState(true)
    const [showGroupHint, setShowGroupHint] = React.useState(true)

    React.useEffect(() => {
        const timer = setTimeout(() => setShowContactHint(false), 2000)
        return () => clearTimeout(timer)
    }, [])

    React.useEffect(() => {
        const timer = setTimeout(() => setShowGroupHint(false), 2000)
        return () => clearTimeout(timer)
    }, [])

    const groupMemberNames = (groupMembers ?? []).map(member => member.name).join(', ')

    return (
        <header
            onClick={onOpenInfo}
            className="flex items-center justify-between px-4 py-[10px] bg-white border-l z-10 cursor-pointer"
        >
            <div className={cn("flex items-start gap-3", !showContactHint && "items-center")}>
                {directMessageUserInfo && groupMessageInfo === null && (
                    <>
                        <Avatar className="h-10 w-10">
                            <AvatarImage src={directMessageUserInfo?.image || undefined} />
                            <AvatarFallback className="text-sm bg-[#dfe5e7]">{directMessageUserInfo?.name?.display_name?.slice(0, 2).toUpperCase()}</AvatarFallback>
                        </Avatar>
                        <div className="flex flex-col">
                            <span className="text-[16px] font-normal text-[#111b21]">
                                {directMessageUserInfo?.name?.contact_name}
                            </span>
                            {isTyping ? (
                                <span className="text-[12px] font-normal text-[#00a884]">
                                    Typing…
                                </span>
                            ) : showContactHint && (
                                <span className="text-[12px] font-normal text-[#54656f]">
                                    Click here for contact info
                                </span>
                            )}
                        </div>
                    </>
                )}
                {groupMessageInfo && directMessageUserInfo === null && (
                    <>
                        <Avatar className="h-10 w-10">
                            <AvatarImage src={groupMessageInfo?.image || undefined} />
                            <AvatarFallback className="text-sm bg-[#dfe5e7]">HN</AvatarFallback>
                        </Avatar>
                        <div className="flex flex-col">
                            <span className="text-[16px] font-normal text-[#111b21]">
                                {groupMessageInfo?.name}
                            </span>
                            <span className="text-[12px] font-normal text-[#54656f]">
                                {showGroupHint ? 'Click here to view group info' : groupMemberNames || 'Loading members...'}
                            </span>
                        </div>
                    </>
                )}
            </div>
            <div className="flex items-center gap-1">
                {/* Video Call with dropdown */}
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <button className="flex items-center gap-0.5 px-3 py-1.5 rounded-full hover:bg-[#e9edef] transition-colors border border-[#d1d7db] cursor-pointer">
                            <VideoCallIcon
                                style={{ width: "20px", height: "20px" }}
                                className="text-[#54656f]"
                            />
                            <span className="text-[14px] text-[#54656f] font-normal">
                                Call
                            </span>
                            <ChevronIcon
                                style={{ width: "16px", height: "16px" }}
                                className="text-[#54656f]"
                            />
                        </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-[160px]">
                        <DropdownMenuItem>Audio call</DropdownMenuItem>
                        <DropdownMenuItem>Video call</DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>

                {/* Search */}
                <button className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-[#e9edef] transition-colors cursor-pointer">
                    <SearchIcon
                        style={{ width: "20px", height: "20px" }}
                        className="text-[#54656f]"
                    />
                </button>

                {/* Menu */}
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <button className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-[#e9edef] transition-colors cursor-pointer">
                            <MenuIcon
                                style={{ width: "24px", height: "24px" }}
                                className="text-[#54656f]"
                            />
                        </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-[200px]">
                        <DropdownMenuItem onClick={onOpenInfo}>Contact info</DropdownMenuItem>
                        <DropdownMenuItem>Select messages</DropdownMenuItem>
                        <DropdownMenuItem>Close chat</DropdownMenuItem>
                        <DropdownMenuItem>Mute notifications</DropdownMenuItem>
                        <DropdownMenuItem>Disappearing messages</DropdownMenuItem>
                        <DropdownMenuItem>Clear chat</DropdownMenuItem>
                        <DropdownMenuItem>Delete chat</DropdownMenuItem>
                        <DropdownMenuItem>Block</DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>
        </header>
    )
}

export default ChatHeader

