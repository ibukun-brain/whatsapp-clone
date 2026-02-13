import Dexie, { Table } from 'dexie';
import { Chat, UserSettings, User, Contact, DirectMessageChats, GroupMessageChats } from '../types';

export class WhatsappCloneDB extends Dexie {
    chatlist!: Table<Chat, string>;
    usersettings!: Table<UserSettings, number>;
    user!: Table<User, string>;
    contact!: Table<Contact, string>;
    directmessagechats!: Table<DirectMessageChats, string>;
    groupmessagechats!: Table<GroupMessageChats, string>;

    constructor() {
        super('WhatsappCloneDB');
        this.version(7).stores({
            chatlist: 'id, name, timestamp', // id is primary key
            usersettings: '++id', // Singleton store, usually id=1
            user: 'id', // user id is primary key
            contact: 'id, contact_name, contact_phone_number', // contact id is primary key
            directmessagechats: 'id, timestamp', // id is primary key
            groupmessagechats: 'id, timestamp', // id is primary key
        });
    }
}

export const db = new WhatsappCloneDB();
