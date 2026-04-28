import Dexie, { Table } from 'dexie';
import { Chat, UserSettings, User, Contact, DirectMessageChats, GroupMessageChats, GroupMember, DMGroupsInCommon, GroupMessageChatRecipients } from '../types';

export type SeenMention = {
    message_id: string;
    offset: number;
    chat_id: string;
    seen_at: Date;
};

export class WhatsappCloneDB extends Dexie {
    chatlist!: Table<Chat, string>;
    usersettings!: Table<UserSettings, number>;
    user!: Table<User, string>;
    contact!: Table<Contact, string>;
    dmgroupincommon!: Table<DMGroupsInCommon, string>;
    directmessagechats!: Table<DirectMessageChats, string>;
    groupmessagechats!: Table<GroupMessageChats, string>;
    groupmessagechatrecipients!: Table<GroupMessageChatRecipients, string>;
    groupmembers!: Table<GroupMember, string>;
    seenmentions!: Table<SeenMention, [string, number]>;

    constructor() {
        super('WhatsappCloneDB');
        this.version(9).stores({
            chatlist: 'id, name, timestamp', // id is primary key
            usersettings: '++id', // Singleton store, usually id=1
            user: 'id', // user id is primary key
            contact: 'id, contact_name, contact_phone_number', // contact id is primary key
            directmessagechats: 'id, timestamp, direct_message_id, client_msg_id', // id is primary key
            groupmessagechats: 'id, timestamp, groupchat_id, client_msg_id', // id is primary key
            groupmessagechatrecipients: 'id, message_id, read_date, delivered_date', // id is primary key
            groupmembers: 'id, groupchat_id', // id is primary key, indexed by group_id
            dmgroupincommon: '[direct_message_id+id]', // Compound primary key
        });
        this.version(10).stores({
            seenmentions: '[message_id+offset], message_id, chat_id',
        });
    }
}

export const db = new WhatsappCloneDB();

// Persist that the current user has seen one or more mentions. Each row is
// keyed by [message_id+offset] so multiple mentions in the same bubble are
// tracked independently. bulkPut is idempotent on the compound key.
export async function markMentionsSeen(
    entries: { message_id: string; offset: number; chat_id: string }[]
): Promise<void> {
    if (entries.length === 0) return;
    const now = new Date();
    await db.seenmentions.bulkPut(entries.map((e) => ({ ...e, seen_at: now })));
}

// Wipe every table in the local DB. Used when switching accounts (login/signup)
// so the new session doesn't see stale data from a previous user.
export async function clearLocalDb(): Promise<void> {
    await db.transaction("rw", db.tables, () =>
        Promise.all(db.tables.map((t) => t.clear()))
    );
}

