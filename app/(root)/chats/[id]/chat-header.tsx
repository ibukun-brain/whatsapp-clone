"use client"

import React from "react"
import { ChevronIcon, MenuIcon, SearchIcon, VideoCallIcon } from "@/components/icons/chats-icon"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { AnimatePresence, motion } from "framer-motion"
import { DirectMessageName, GroupMember } from "@/types"
import { cn, formatDatetime } from "@/lib/utils"

type DirectMessageUserInfo = {
    name: DirectMessageName,
    userId: string,
    image: string,
    lastSeen: Date | null,
    isOnline: boolean
}

type GroupMessageUserInfo = {
    groupId: string,
    name: string,
    image: string,
    onlineUsersCount?: number
}

const ChatHeader = ({ directMessageUserInfo, groupMessageInfo, onOpenInfo, groupMembers, isTyping, timezone }: {
    directMessageUserInfo: DirectMessageUserInfo | null,
    groupMessageInfo: GroupMessageUserInfo | null,
    onOpenInfo?: () => void,
    groupMembers?: GroupMember[],
    isTyping?: boolean,
    timezone?: string,
}) => {
    const [showContactHint, setShowContactHint] = React.useState(true)
    const [showGroupHint, setShowGroupHint] = React.useState(true)
    const [showOnlineCountDelayed, setShowOnlineCountDelayed] = React.useState(false)

    React.useEffect(() => {
        const timer = setTimeout(() => setShowContactHint(false), 2000)
        return () => clearTimeout(timer)
    }, [])

    React.useEffect(() => {
        const timer = setTimeout(() => {
            setShowGroupHint(false)
            // Start the 3s timer for online count AFTER the hint disappears
            const onlineTimer = setTimeout(() => setShowOnlineCountDelayed(true), 3000)
            return () => clearTimeout(onlineTimer)
        }, 2000)
        return () => {
            clearTimeout(timer)
        }
    }, [groupMessageInfo?.groupId]) // Reset when chat changes


    return (
        <header
            onClick={onOpenInfo}
            className="flex items-center justify-between px-4 py-[10px] bg-white border-l border-b z-10 cursor-pointer"
        >
            <div className={cn("flex items-start gap-3", !showContactHint && !showGroupHint && "items-center")}>
                {directMessageUserInfo && groupMessageInfo === null && (
                    <>
                        <Avatar className="h-10 w-10">
                            <AvatarImage src={directMessageUserInfo?.image || undefined} />
                            <AvatarFallback className="text-sm bg-[#dfe5e7]">{directMessageUserInfo?.name?.display_name?.slice(0, 2).toUpperCase()}</AvatarFallback>
                        </Avatar>
                        <div className="flex flex-col h-10 justify-center flex-1 min-w-0">
                            <span className="text-[16px] font-normal text-[#111b21] leading-tight truncate">
                                {directMessageUserInfo?.name?.contact_name}
                            </span>
                            <div className="relative h-4">
                                <AnimatePresence mode="wait">
                                    {isTyping ? (
                                        <motion.span
                                            key="typing"
                                            initial={{ y: 10, opacity: 0 }}
                                            animate={{ y: 0, opacity: 1 }}
                                            exit={{ y: -10, opacity: 0 }}
                                            transition={{ duration: 0.2 }}
                                            className="absolute top-0 left-0 text-[12px] font-normal text-[#00a884] whitespace-nowrap"
                                        >
                                            Typing…
                                        </motion.span>
                                    ) : directMessageUserInfo?.isOnline ? (
                                        <motion.span
                                            key="online"
                                            initial={{ y: 10, opacity: 0 }}
                                            animate={{ y: 0, opacity: 1 }}
                                            exit={{ y: -10, opacity: 0 }}
                                            transition={{ duration: 0.2 }}
                                            className="absolute top-0 left-0 text-[12px] font-normal text-[#00a884] whitespace-nowrap"
                                        >
                                            Online
                                        </motion.span>
                                    ) : showContactHint ? (
                                        <motion.span
                                            key="hint"
                                            initial={{ y: 10, opacity: 0 }}
                                            animate={{ y: 0, opacity: 1 }}
                                            exit={{ y: -10, opacity: 0 }}
                                            transition={{ duration: 0.2 }}
                                            className="absolute top-0 left-0 text-[12px] font-normal text-[#54656f] whitespace-nowrap"
                                        >
                                            Click here for contact info
                                        </motion.span>
                                    ) : directMessageUserInfo?.lastSeen ? (
                                        <motion.span
                                            key="lastSeen"
                                            initial={{ y: 10, opacity: 0 }}
                                            animate={{ y: 0, opacity: 1 }}
                                            exit={{ y: -10, opacity: 0 }}
                                            transition={{ duration: 0.2 }}
                                            className="absolute top-0 left-0 text-[12px] font-normal text-[#54656f] whitespace-nowrap"
                                        >
                                            last seen {formatDatetime(directMessageUserInfo.lastSeen, timezone)}
                                        </motion.span>
                                    ) : null}
                                </AnimatePresence>
                            </div>
                        </div>
                    </>
                )}
                {groupMessageInfo && directMessageUserInfo === null && (
                    <>
                        <Avatar className="h-10 w-10">
                            <AvatarImage src={groupMessageInfo?.image || undefined} />
                            <AvatarFallback className="text-sm bg-[#dfe5e7]">HN</AvatarFallback>
                        </Avatar>
                        <div className="flex flex-col h-10 justify-center flex-1 min-w-0">
                            <span className="text-[16px] font-normal text-[#111b21] leading-tight truncate">
                                {groupMessageInfo?.name}
                            </span>
                            <div className="relative h-4">
                                <AnimatePresence mode="wait">
                                    {isTyping ? (
                                        <motion.span
                                            key="typing"
                                            initial={{ y: 10, opacity: 0 }}
                                            animate={{ y: 0, opacity: 1 }}
                                            exit={{ y: -10, opacity: 0 }}
                                            transition={{ duration: 0.2 }}
                                            className="absolute top-0 left-0 text-[12px] font-normal text-[#00a884] whitespace-nowrap"
                                        >
                                            Typing…
                                        </motion.span>
                                    ) : showGroupHint ? (
                                        <motion.span
                                            key="hint"
                                            initial={{ y: 10, opacity: 0 }}
                                            animate={{ y: 0, opacity: 1 }}
                                            exit={{ y: -10, opacity: 0 }}
                                            transition={{ duration: 0.2 }}
                                            className="absolute top-0 left-0 text-[12px] font-normal text-[#54656f] whitespace-nowrap"
                                        >
                                            Click here for group info
                                        </motion.span>
                                    ) : (showOnlineCountDelayed && groupMessageInfo?.onlineUsersCount && groupMessageInfo.onlineUsersCount > 0) ? (
                                        <motion.span
                                            key="online"
                                            initial={{ y: 10, opacity: 0 }}
                                            animate={{ y: 0, opacity: 1 }}
                                            exit={{ y: -10, opacity: 0 }}
                                            transition={{ duration: 0.2 }}
                                            className="absolute top-0 left-0 text-[12px] font-normal text-[#00a884] whitespace-nowrap"
                                        >
                                            {groupMessageInfo.onlineUsersCount} online
                                        </motion.span>
                                    ) : (
                                        <motion.span
                                            key="members"
                                            initial={{ y: 10, opacity: 0 }}
                                            animate={{ y: 0, opacity: 1 }}
                                            exit={{ y: -10, opacity: 0 }}
                                            transition={{ duration: 0.2 }}
                                            className="absolute top-0 left-0 text-[12px] font-normal text-[#54656f] truncate pr-4"
                                        >
                                            {groupMembers?.map(m => m.name).join(", ")}
                                        </motion.span>
                                    )}
                                </AnimatePresence>
                            </div>
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

