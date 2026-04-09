import { MediaFile, MediaStatus } from "./mediaTypes";

export type DeletedInfo = {
  message_id?: string;
  file_id?: string;
  delete_type: "for_me" | "for_everyone";
  deleted_by: string;
}

export type User = {
  id: string;
  display_name: string;
  phone: string;
  profile_pic: string | null;
  timezone: string;
  bio: string | null
  color_code: string,
  unread_messages: number
}

export type AuthState = {
  isAuthenticated: boolean;
  accessToken: null | string;
  setAuth: (token: string) => void;
  logout: () => void;
  checkSession: () => Promise<void>;
}

export type UserState = {
  user: User | null;
  setUser: (user: User) => void;
  clearUser: () => void;
}

// ... existing types ...



export type DirectMessage = {
  id: string;
  image: string | null;
  bio?: string;
  phone?: string;
  dm_user_id: string;
  recent_user_id: string;
  delivered_date: Date | null;
  read_date: Date | null;
  recent_content: string;
  recent_content_id: string;
  recent_files?: MediaFile[];
  recent_message_type?: string;
  unread_messages: number;
  last_seen: Date | null;
  is_online?: boolean;
  name: {
    contact_name: string,
    display_name: string
  }
  recent_voice_message?: string;
  recent_voice_message_duration?: string;
  recent_deleted?: DeletedInfo
}

export type GroupChat = {
  id: string;
  name: string;
  image: string | null;
  receipt: "sent" | "delivered" | "read" | "failed",
  recent_user_id: string;
  recent_user_display_name: string;
  recent_content: string;
  recent_content_id: string;
  recent_files?: MediaFile[];
  recent_message_type?: string;
  unread_messages: number;
  online_users?: number;
  recent_voice_message?: string;
  recent_voice_message_duration?: string;
  recent_deleted?: DeletedInfo
}

export type GroupChatSettings = {
  "send_new_message": boolean;
  "approve_new_members": boolean;
}

export type GroupChatDetail = {
  id: string;
  name: string;
  image: string | null;
  created_at: Date | null;
  bio?: string
  settings: GroupChatSettings

}

export type DirectMessageName = {
  contact_name: string
  display_name: string
}

export type Chat = {
  id: string;
  chat_type: "directmessage" | "group_chat";
  name: string | DirectMessageName;
  favourite: boolean;
  isPinned: boolean;
  timestamp: Date;
  draft?: {
    text: string;
    timestamp: Date;
    voiceBlob?: Blob;
    voiceDuration?: number;
    voiceMimeType?: string;
  } | null;
  direct_message: DirectMessage | null;
  group_chat: GroupChat | null;
}

type MessageType =
  | "text"
  | "voice_recording"
  | "emoji"
  | "document"
  | "status-reply"
  | "media";

export type Attachment = {
  id: string;
  file_url: string;
  thumbnail_url: string | null;
  file_name: string;
  file_size: number;
  file_type: string;
  page_count: number;
};

export type DirectMessageChats = {
  id: string;
  direct_message_id: string;
  user: string;
  reply: null;
  content: string;
  type: MessageType;
  depth: number | null;
  delivered_date?: Date;
  read_date?: Date;
  forwarded: boolean;
  edited: boolean;
  timestamp: Date;
  isOptimistic?: boolean;
  client_msg_id?: string;
  status?: 'pending' | 'sent' | 'failed' | 'processing' | 'uploading'; // Added top-level status
  files?: MediaFile[];
  voice_message?: string;
  voice_message_duration?: string;
  voice_message_blob?: Blob;
  voice_message_file_id?: string;
  uploadStatus?: MediaStatus;
  attachments?: Attachment[];
  deleted?: {
    message_id: string,
    delete_type: "for_me" | "for_everyone",
    deleted_by: string
  }
}

export type DMGroupsInCommon = Omit<GroupChat, "bio" | "created_at" | "settings"> & {
  direct_message_id: string,
  members_contact: string[]
}

export type DMGroupsInCommonResults = {
  results: DMGroupsInCommon[]
}
export type DirectMessageChatsResults = {
  results: DirectMessageChats[]
}
export type WSData = {
  group_id: string,
  groupchat_messages: GroupMessageChats,
  groupchat_message_recipients: GroupMessageChatRecipients[]
  online_users: number
}
export type GroupMessageChats = {
  id: string;
  groupchat_id: string;
  user: User & {
    contact_name?: string;
    contact_id?: string
  };
  type: MessageType;
  reply?: {} | null;
  content: string;
  depth: number | null;
  forwarded: boolean;
  edited: boolean;
  timestamp: Date;
  receipt: "sent" | "delivered" | "read" | "failed";
  status?: 'pending' | 'sent' | 'failed' | 'processing' | 'uploading';
  isOptimistic?: boolean;
  client_msg_id?: string;
  files?: import("./mediaTypes").MediaFile[];
  voice_message?: string;
  voice_message_duration?: string;
  voice_message_blob?: Blob;
  voice_message_file_id?: string;
  uploadStatus?: import("./mediaTypes").MediaStatus;
  attachments?: Attachment[];
  deleted?: {
    message_id: string,
    delete_type: "for_me" | "for_everyone",
    deleted_by: string
  }
}

export type GroupMessageChatRecipients = {
  id: string,
  message_id: string,
  receipt: "sent" | "delivered" | "read";
  user: {
    "id": string,
    "profile_pic": string,
    "bio": string,
    "display_name": string,
    "phone": string
  },
  contact_name: string,
  read_date: Date | null,
  delivered_date: Date
}

export type GroupMessageChatsResults = {
  results: GroupMessageChats[]
}

export type GroupMember = {
  id: string;
  groupchat_id: string;
  groupchat: GroupChatDetail,
  name: string; // name refers to the contact name saved by the user
  user: User & {
    direct_message_id: string
  } | null;
  role: "member" | "admin";
}

export type GroupMemberResults = {
  results: GroupMember[]
}


export type ChatResults = {
  results: Chat[]
}

export type Contact = {
  id: string;
  contact_name: string;
  contact_user: {
    id: string;
    profile_pic: string | null;
    bio: string | null;
  };
  contact_phone_number: string;
  direct_message_id: string;
}

export type ContactResults = {
  results: Contact[]
}



export type UserSettings = {
  id?: number;
  push_notification: boolean;
  theme: "auto" | "light" | "dark";
}


