"use client"

import {
    BlockIcon,
    CancelIcon,
    ChevronIcon,
    ClockIcon,
    HeartIcon,
    KeyIcon,
    ListIcon,
    MediaIcon,
    NotificationBellIcon,
    PenIcon,
    PrivacyIcon,
    ReportIcon,
    SearchIcon,
    StarIcon,
    TrashIcon,
    CameraIcon,
    GroupAddIcon,
    LogoutIcon,
    DownloadIcon
} from "@/components/icons/chats-icon"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Switch } from "@/components/ui/switch"
import { DirectMessageName, DMGroupsInCommon, GroupChatDetail, GroupMember, User } from "@/types"
import { db } from "@/lib/indexdb"
import { useLiveQuery } from "dexie-react-hooks";
import { group } from "console"

type DirectMessageUserInfo = {
    name: DirectMessageName,
    userId: string,
    image: string,
    bio?: string,
    phone?: string,
    groupsInCommon?: DMGroupsInCommon[]
}

type GroupMessageUserInfo = {
    groupId: string,
    name: string,
    groupchat?: GroupChatDetail,
    currentUser?: User,
    image: string
}

interface ContactInfoProps {
    onClose: () => void
    directMessageUserInfo?: DirectMessageUserInfo
    groupMessageInfo?: GroupMessageUserInfo
    groupMembers?: GroupMember[]
}

const ContactInfo = ({ onClose, directMessageUserInfo, groupMessageInfo, groupMembers }: ContactInfoProps) => {
    const isDM = !!directMessageUserInfo
    const isGroup = !!groupMessageInfo
    const dmContactName = isDM && directMessageUserInfo?.name?.contact_name && !directMessageUserInfo.name.contact_name.startsWith("+")
        ? directMessageUserInfo.name.contact_name
        : null
    const dmDisplayName = isDM && directMessageUserInfo?.name?.display_name
    const groupName = isGroup && groupMessageInfo?.name
    const image = isDM ? directMessageUserInfo?.image : groupMessageInfo?.image
    const dmBio = isDM && directMessageUserInfo?.bio
    const dmPhone = isDM && directMessageUserInfo?.phone
    const fallback = isDM ? directMessageUserInfo?.name?.display_name?.slice(0, 2).toUpperCase() : "HN"
    const groupchat = groupMessageInfo?.groupchat
    const currentUser = isGroup ? groupMessageInfo?.currentUser : null
    const groupsInCommon = directMessageUserInfo?.groupsInCommon
    const currentUserAsGroupMember = useLiveQuery(
        async () => {
            if (groupchat?.id && currentUser?.id) {
                return await db.groupmembers
                    .where('groupchat_id')
                    .equals(groupchat.id)
                    .filter(member => member.user?.id === currentUser.id)
                    .first();
            }
            return undefined;
        },
        [groupchat?.id, currentUser?.id]
    );
    return (
        <div className="flex flex-col h-full bg-white border-l border-[#d1d7db] w-[500px] shrink-0 overflow-hidden">
            {/* Header */}
            <div className="flex items-center h-[60px] px-4 bg-white shrink-0 border-b border-[#e9edef]">
                <button
                    onClick={onClose}
                    className="p-2 hover:bg-[#d1d7db] rounded-full transition-colors cursor-pointer"
                >
                    <CancelIcon className="w-6 h-6 text-[#54656f]" />
                </button>
                <span className="ml-4 text-[16px] font-medium text-[#111b21]">
                    {isGroup ? "Group info" : "Contact info"}
                </span>
                <div className="flex-1" />
                {isDM && (
                    <button className="p-2 hover:bg-[#d1d7db] rounded-full transition-colors cursor-pointer">
                        <PenIcon className="w-5 h-5 text-[#54656f]" />
                    </button>
                )}
            </div>

            <ScrollArea className="flex-1 min-h-0 bg-white">
                <div className="flex flex-col pb-8 bg-white">
                    {/* Profile Section */}
                    <div className="bg-white px-8 py-8 flex flex-col items-center relative group border-b border-[#f0f2f5]">
                        <div className="relative mb-4">
                            <Avatar className="w-[200px] h-[200px]">
                                <AvatarImage src={image || undefined} className="object-cover" />
                                <AvatarFallback className="text-4xl bg-[#dfe5e7] text-[#54656f]">{fallback}</AvatarFallback>
                            </Avatar>
                            {isGroup && (
                                <div className="absolute inset-0 bg-black/40 rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center cursor-pointer">
                                    <CameraIcon className="w-8 h-8 text-white mb-2" />
                                    <span className="text-white text-[12px] uppercase font-medium text-center px-4">Add group icon</span>
                                </div>
                            )}
                        </div>
                        <div className="flex items-center gap-2 mb-1">
                            <h2 className="text-[24px] font-normal text-[#111b21]">{isDM ? (dmContactName || dmPhone) : groupName}</h2>
                            {isGroup && <PenIcon className="w-5 h-5 text-[#54656f] cursor-pointer" />}
                        </div>
                        {isDM && <span className="text-[16px] text-[#54656f] mb-4 text-center cursor-pointer">{dmContactName ? dmPhone : dmDisplayName}</span>}
                        {isGroup && <span className="text-[16px] text-[#54656f] mb-4">Group · {groupMembers?.length} members</span>}

                        <div className="flex items-center gap-4">
                            {isGroup && (
                                <button className="flex flex-col items-center gap-1 group/btn cursor-pointer">
                                    <div className="p-3 border border-[#d1d7db] rounded-xl group-hover/btn:bg-[#f0f2f5] transition-colors">
                                        <GroupAddIcon className="w-5 h-5 text-[#00a884]" />
                                    </div>
                                    <span className="text-[14px] text-[#00a884] font-normal">Add</span>
                                </button>
                            )}
                            <button className="flex flex-col items-center gap-1 group/btn cursor-pointer">
                                <div className="p-3 border border-[#d1d7db] rounded-xl group-hover/btn:bg-[#f0f2f5] transition-colors">
                                    <SearchIcon className="w-5 h-5 text-[#00a884]" />
                                </div>
                                <span className="text-[14px] text-[#00a884] font-normal">Search</span>
                            </button>
                        </div>
                    </div>

                    {/* About / Description Section */}
                    <div className="bg-white px-8 py-4 border-b border-[#f0f2f5]">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-[14px] text-[#00a884] block font-medium cursor-pointer">
                                {isGroup ? "Add group description" : "About"}
                            </span>
                            {isGroup && <PenIcon className="w-4 h-4 text-[#54656f] cursor-pointer" />}
                        </div>
                        {isDM ? (
                            <p className="text-[16px] text-[#111b21]">{dmBio}</p>
                        ) : (
                            <>
                                <p>{groupchat?.bio}</p>
                                <p className="text-sm text-[#54656f] mt-2">Created on {groupchat?.created_at && new Date(groupchat.created_at).toLocaleDateString()}</p>

                            </>
                        )}
                    </div>

                    {/* Media, links and docs */}
                    <div className="bg-white px-8 py-4 hover:bg-[#f8f9fa] cursor-pointer transition-colors group/media border-b border-[#f0f2f5]">
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-4">
                                <MediaIcon className="w-5 h-5 text-[#54656f]" />
                                <span className="text-[16px] text-[#111b21]">Media, links and docs</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="text-[14px] text-[#54656f]">11</span>
                                <ChevronIcon className="w-4 h-4 text-[#54656f] -rotate-90" />
                            </div>
                        </div>
                        <div className="grid grid-cols-4 gap-2">
                            {[1, 2, 3].map((i) => (
                                <div key={i} className="aspect-square bg-[#dfe5e7] rounded-sm flex items-center justify-center overflow-hidden">
                                    <div className="bg-black/20 p-2 rounded-full">
                                        <DownloadIcon className="w-5 h-5 text-white" />
                                    </div>
                                </div>
                            ))}
                            <div className="aspect-square bg-[#dfe5e7] rounded-sm relative overflow-hidden">
                                <img src="/images/metaAI.png" alt="Meta AI" className="w-full h-full object-cover" />
                                <div className="absolute inset-x-0 bottom-0 bg-linear-to-t from-black/60 to-transparent p-1">
                                    <span className="text-[8px] text-white font-bold uppercase">Meta AI</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Quick Settings */}
                    <div className="bg-white flex flex-col border-b border-[#f0f2f5]">
                        <div className="flex items-center justify-between px-8 py-4 hover:bg-[#f8f9fa] cursor-pointer transition-colors w-full text-left border-b border-[#f0f2f5]">
                            <div className="flex items-center gap-4">
                                <NotificationBellIcon className="w-5 h-5 text-[#54656f]" />
                                <span className="text-[16px] text-[#111b21]">Mute notifications</span>
                            </div>
                            <Switch />
                        </div>

                        {!isDM && (
                            <button className="flex items-center justify-between px-8 py-4 hover:bg-[#f8f9fa] cursor-pointer transition-colors w-full text-left border-b border-[#f0f2f5]">
                                <div className="flex items-center gap-4">
                                    <KeyIcon className="w-5 h-5 text-[#54656f]" />
                                    <div className="flex flex-col">
                                        <span className="text-[16px] text-[#111b21]">Encryption</span>
                                        <span className="text-[13px] text-[#54656f]">Messages are end-to-end encrypted. Click to learn more.</span>
                                    </div>
                                </div>
                            </button>
                        )}

                        <button className="flex items-center justify-between px-8 py-4 hover:bg-[#f8f9fa] cursor-pointer transition-colors w-full text-left border-b border-[#f0f2f5]">
                            <div className="flex items-center gap-4">
                                <ClockIcon className="w-5 h-5 text-[#54656f]" />
                                <div className="flex flex-col">
                                    <span className="text-[16px] text-[#111b21]">Disappearing messages</span>
                                    <span className="text-[13px] text-[#54656f]">Off</span>
                                </div>
                            </div>
                            <ChevronIcon className="w-4 h-4 text-[#54656f] -rotate-90" />
                        </button>

                        <button className="flex items-center justify-between px-8 py-4 hover:bg-[#f8f9fa] cursor-pointer transition-colors w-full text-left">
                            <div className="flex items-center gap-4">
                                <PrivacyIcon className="w-5 h-5 text-[#54656f]" />
                                <div className="flex flex-col">
                                    <span className="text-[16px] text-[#111b21]">Advanced chat privacy</span>
                                    <span className="text-[13px] text-[#54656f]">Off</span>
                                </div>
                            </div>
                            <ChevronIcon className="w-4 h-4 text-[#54656f] -rotate-90" />
                        </button>
                    </div>

                    {/* Members / Groups in Common List */}
                    <div className="bg-white flex flex-col border-b border-[#f0f2f5]">
                        <div className="px-8 py-4 flex items-center justify-between shrink-0">
                            <span className="text-[14px] text-[#54656f]">
                                {isGroup ? `${groupMembers?.length} members` : `${groupsInCommon?.length || 22} groups in common`}
                            </span>
                            {isGroup && <SearchIcon className="w-5 h-5 text-[#54656f] cursor-pointer" />}
                        </div>

                        {(isDM &&
                            <>
                                {groupsInCommon?.map((group) => (
                                    <div key={group?.id} className="flex items-center gap-4 px-8 py-3 hover:bg-[#f8f9fa] cursor-pointer border-t border-[#f0f2f5] group/item">
                                        <Avatar className="w-10 h-10 shrink-0">
                                            <AvatarImage src={group?.image ?? undefined} />
                                            <AvatarFallback className="bg-[#dfe5e7] text-[14px] text-[#54656f]">
                                                {group?.name?.slice(0, 2).toUpperCase()}
                                            </AvatarFallback>
                                        </Avatar>
                                        <div className="flex flex-col flex-1 overflow-hidden">
                                            <div className="flex items-center justify-between gap-2">
                                                <span className="text-[16px] text-[#111b21] truncate font-normal">
                                                    {group?.name}
                                                </span>
                                            </div>
                                            <span className="text-[13px] text-[#54656f] truncate">
                                                {group.members_contact.filter((member) => member !== "You").join(", ")}
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </>
                        )}

                        {/* Group Members */}
                        {isGroup &&
                            <>
                                {/* Current user in group */}
                                <div className="flex items-center gap-4 px-8 py-3 hover:bg-[#f8f9fa] cursor-pointer border-t border-[#f0f2f5] group/item">
                                    <Avatar className="w-10 h-10 shrink-0">
                                        <AvatarImage src={currentUser?.profile_pic ?? undefined} />
                                        <AvatarFallback className="bg-[#dfe5e7] text-[14px] text-[#54656f]">
                                            {currentUser?.display_name?.slice(0, 2).toUpperCase()}
                                        </AvatarFallback>
                                    </Avatar>
                                    <div className="flex flex-col flex-1 overflow-hidden">
                                        <div className="flex items-center justify-between gap-2">
                                            <span className="text-[16px] text-[#111b21] truncate font-normal">
                                                {isGroup ? "You" : currentUser?.display_name}
                                            </span>
                                            {currentUserAsGroupMember?.role === "admin" && (
                                                <span className="text-[11px] text-[#00a884] bg-[#e6ffda] px-1.5 py-0.5 rounded-sm shrink-0">Group admin</span>
                                            )}
                                        </div>
                                        <span className="text-[13px] text-[#54656f] truncate">
                                            {currentUser?.bio}
                                        </span>
                                    </div>
                                </div>
                                {groupMembers?.map((member) => (
                                    <div key={member.id} className="flex items-center gap-4 px-8 py-3 hover:bg-[#f8f9fa] cursor-pointer border-t border-[#f0f2f5] group/item">
                                        <Avatar className="w-10 h-10 shrink-0">
                                            <AvatarImage src={member.user?.profile_pic ?? undefined} />
                                            <AvatarFallback className="bg-[#dfe5e7] text-[14px] text-[#54656f]">
                                                {member.name.slice(0, 2).toUpperCase()}
                                            </AvatarFallback>
                                        </Avatar>
                                        <div className="flex flex-col flex-1 overflow-hidden">
                                            <div className="flex items-center justify-between gap-2">
                                                <span className="text-[16px] text-[#111b21] truncate font-normal">
                                                    {member.name.startsWith("+") ? member.user?.display_name : member.name}
                                                </span>
                                                {member.role === "admin" && (
                                                    <span className="text-[11px] text-[#00a884] bg-[#e6ffda] px-1.5 py-0.5 rounded-sm shrink-0">Group admin</span>
                                                )}
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-[13px] text-[#54656f] truncate">
                                                    {member.user?.bio}
                                                </span>
                                                <span className="text-[13px] text-[#54656f]">
                                                    {member.name.startsWith("+") && member.name}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </>
                        }


                        {isGroup && (groupMembers?.length || 22) > 10 && (
                            <button className="px-8 py-4 text-[#00a884] text-[16px] border-t border-[#f0f2f5] hover:bg-[#f8f9fa] text-left cursor-pointer font-normal">
                                View all ({(groupMembers?.length || 22) - 10} more)
                            </button>
                        )}
                    </div>

                    {/* Actions */}
                    <div className="bg-white flex flex-col">
                        <button className="flex items-center gap-4 px-8 py-4 hover:bg-[#f8f9fa] cursor-pointer transition-colors w-full text-left">
                            <HeartIcon className="w-5 h-5 text-[#54656f]" />
                            <span className="text-[16px] text-[#111b21]">Add to favourites</span>
                        </button>
                        <button className="flex items-center gap-4 px-8 py-4 hover:bg-[#f8f9fa] cursor-pointer transition-colors w-full text-left">
                            <ListIcon className="w-5 h-5 text-[#54656f]" />
                            <span className="text-[16px] text-[#111b21]">Add to list</span>
                        </button>

                        {isGroup ? (
                            <button className="flex items-center gap-4 px-8 py-4 hover:bg-[#f8f9fa] cursor-pointer transition-colors w-full text-left">
                                <LogoutIcon className="w-5 h-5 text-[#ea0038]" />
                                <span className="text-[16px] text-[#ea0038]">Exit group</span>
                            </button>
                        ) : (
                            <button className="flex items-center gap-4 px-8 py-4 hover:bg-[#f8f9fa] cursor-pointer transition-colors w-full text-left">
                                <BlockIcon className="w-5 h-5 text-[#ea0038]" />
                                <span className="text-[16px] text-[#ea0038]">Block {name}</span>
                            </button>
                        )}

                        <button className="flex items-center gap-4 px-8 py-4 hover:bg-[#f8f9fa] cursor-pointer transition-colors w-full text-left">
                            <ReportIcon className="w-5 h-5 text-[#ea0038]" />
                            <span className="text-[16px] text-[#ea0038]">Report {isGroup ? "group" : ""}</span>
                        </button>

                        {!isGroup && (
                            <button className="flex items-center gap-4 px-8 py-4 hover:bg-[#f8f9fa] cursor-pointer transition-colors w-full text-left">
                                <TrashIcon className="w-5 h-5 text-[#ea0038]" />
                                <span className="text-[16px] text-[#ea0038]">Delete chat</span>
                            </button>
                        )}
                    </div>
                </div>
            </ScrollArea>
        </div>
    )
}

export default ContactInfo
