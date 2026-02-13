export type User = {
  id: string;
  display_name: string;
  phone: string;
  profile_pic: string | null;
  timezone: string;
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
  recent_user_id: string;
  delivered_date: Date | null;
  read_date: Date | null;
  recent_content: string;
  unread_messages: number;
}

export type GroupChat = {
  id: string;
  name: string;
  image: string | null;
  recent_user_id: string;
  recent_user_display_name: string;
  recent_content: string;
  unread_messages: number;
  // Add other group chat properties as needed
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
  direct_message: DirectMessage | null;
  group_chat: GroupChat | null;
}

type MessageType =
  | "text"
  | "voice"
  | "emoji"
  | "status-reply";

export type DirectMessageChats = {
  id: string;
  direct_message_id: string;
  user: string;
  reply: null;
  content: string;
  files: [];
  type: MessageType;
  depth: number | null;
  delivered_date: Date | null;
  read_date: Date | null;
  forwarded: boolean;
  edited: boolean;
  deleted: boolean;
  timestamp: Date;
}

export type DirectMessageChatsResults = {
  results: DirectMessageChats[]
}

export type GroupMessageChats = {
  id: string;
  groupchat_id: string;
  user: User,
  type: MessageType;
  contact_name: string,
  reply: {} | null,
  content: string,
  files: [
    {
      caption: string,
      file: string
    }
  ],
  depth: number | null,
  forwarded: boolean,
  edited: boolean,
  deleted: boolean,
  timestamp: Date
}

export type GroupMessageChatsResults = {
  results: GroupMessageChats[]
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


