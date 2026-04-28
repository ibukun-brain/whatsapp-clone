// types/mentions.ts

/**
 * Sentinel value for @all mentions on the wire.
 * Backend recognizes this and creates a mention with mention_type='all'.
 */
export const ALL_MENTION_SENTINEL = '__ALL__' as const;

export type MentionType = 'user' | 'all';

/**
 * Reference to a picked group member. `id` is the GroupMember row id
 * (the membership row) and `user_id` is the underlying user id.
 */
export interface MentionMember {
  id: string;
  user_id: string;
}

/**
 * Outbound mention payload (frontend -> backend).
 * Wire format — only the GroupMember row id is sent. The backend resolves
 * the underlying user from there.
 */
export interface MentionInput {
  member_id: string;
  name: string;     // name as rendered in the composer; used for offset verification
  offset: number;           // 0-indexed character position of '@' in content
  length: number;           // length of the rendered span including '@'
}

/**
 * Inbound mention payload (backend -> frontend).
 * What you receive in API responses and WebSocket broadcasts.
 */
export interface Mention {
  mention_type: MentionType;
  member: MentionMember | null;   // null when mention_type === 'all'
  name: string;     // current display name (or 'all' for @all)
  offset: number;
  length: number;
}

/**
 * In-memory composer state. Tracks each mention picked from the dropdown
 * and remembers `name` for offset drift detection on edits.
 * `member` is null for `@all` mentions.
 */
export interface ComposerMention {
  mention_type: MentionType;
  member: MentionMember | null;
  name: string;
  offset: number;
  length: number;
}

/**
 * A group member as represented in the mention picker dropdown.
 * Use SPECIAL_ALL_MEMBER for the @all entry.
 */
export interface MentionableMember {
  id: string;               // user UUID, or ALL_MENTION_SENTINEL
  name: string;
  avatar_url?: string | null;
  is_special?: boolean;     // true for @all, false/undefined for real users
}

export const SPECIAL_ALL_MEMBER: MentionableMember = {
  id: ALL_MENTION_SENTINEL,
  name: 'all',
  is_special: true,
};

/**
 * Active @-query state in the composer.
 * Set when the user has typed `@...` and is browsing the picker.
 */
export interface MentionQuery {
  query: string;            // text after the '@', used to filter members
  startIndex: number;       // index of '@' in the textarea content
}

// ---------- Type guards ----------

export function isAllMention(m: Mention): boolean {
  return m.mention_type === 'all';
}

export function isUserMention(m: Mention): m is Mention & { member: MentionMember } {
  return m.mention_type === 'user' && m.member !== null;
}

// ---------- Conversion helpers ----------

/**
 * Strip composer-only fields and produce the wire payload.
 */
export function toMentionInput(m: ComposerMention): MentionInput {
  return {
    member_id: m.member ? m.member.id : ALL_MENTION_SENTINEL,
    name: m.name,
    offset: m.offset,
    length: m.length,
  };
}