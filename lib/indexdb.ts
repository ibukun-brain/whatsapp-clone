import Dexie, { Table } from 'dexie';
import { Chat, UserSettings, User, Contact, DirectMessageChats, GroupMessageChats, GroupMember, DMGroupsInCommon, GroupMessageChatRecipients } from '../types';

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

    constructor() {
        super('WhatsappCloneDB');
        this.version(8).stores({
            chatlist: 'id, name, timestamp', // id is primary key
            usersettings: '++id', // Singleton store, usually id=1
            user: 'id', // user id is primary key
            contact: 'id, contact_name, contact_phone_number', // contact id is primary key
            directmessagechats: 'id, timestamp, direct_message_id', // id is primary key
            groupmessagechats: 'id, timestamp, groupchat_id', // id is primary key
            groupmessagechatrecipients: 'id, message_id, read_date, delivered_date', // id is primary key
            groupmembers: 'id, groupchat_id', // id is primary key, indexed by group_id
            dmgroupincommon: '[direct_message_id+id]', // Compound primary key
        });
    }
}

export const db = new WhatsappCloneDB();

