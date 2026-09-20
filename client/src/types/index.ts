// DropTalk TypeScript Domain Models & Interfaces

export type RoomType = 'public' | 'private' | 'ephemeral';

export type UserRole = 'owner' | 'moderator' | 'member';

export type CallType = 'voice' | 'video';
export type CallStatus = 'completed' | 'missed' | 'rejected' | 'cancelled';

export interface CustomStatus {
  emoji?: string;
  text?: string;
}

export interface NotificationSettings {
  groupNotifications?: boolean;
  directNotifications?: boolean;
  backgroundSync?: boolean;
}

export interface User {
  id: string;
  _id?: string;
  username: string;
  name?: string;
  email: string;
  profileImage?: string;
  needsUsername?: boolean;
  googleId?: string;
  customStatus?: CustomStatus;
  notificationSettings?: NotificationSettings;
  createdAt?: string;
  updatedAt?: string;
}

export interface RoomMember {
  user: string;
  username?: string;
  name?: string;
  profileImage?: string;
  role: UserRole;
  joinedAt?: string;
  muted?: boolean;
}

export interface EncryptedKeyEntry {
  user: string;
  key: string;
  keyId?: string;
}

export interface PendingRequest {
  user: string;
  requestedAt: string;
}

export interface BannedUser {
  user: string;
  bannedAt: string;
  bannedBy?: string;
}

export interface Room {
  id: string;
  _id?: string;
  name: string;
  createdBy?: string;
  type: RoomType;
  isDM?: boolean;
  dmStatus?: 'pending' | 'accepted';
  dmInitiator?: string;
  topic?: string;
  category?: string;
  slowMode?: number;
  expiresAt?: string;
  members?: RoomMember[];
  encryptedKeys?: EncryptedKeyEntry[];
  pendingRequests?: PendingRequest[];
  bannedUsers?: BannedUser[];
  pinnedMessages?: string[];
  lastMessage?: Message;
  memberCount?: number;
  unreadCount?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface Attachment {
  url: string;
  filename: string;
  fileType: 'image' | 'video' | 'audio' | 'document';
  mimeType?: string;
  size?: number;
}

export interface Reaction {
  emoji: string;
  users: string[];
}

export interface ForwardedFrom {
  senderUsername: string;
  roomName: string;
}

export interface Message {
  id: string;
  _id?: string;
  room: string;
  sender: User | string;
  senderUsername?: string;
  senderName?: string;
  senderProfileImage?: string;
  clientMsgId?: string;
  text: string;
  attachments?: Attachment[];
  parentMessage?: string | Message;
  replyTo?: string;
  replyToData?: {
    id?: string;
    senderUsername?: string;
    text?: string;
  };
  deleted?: boolean;
  deletedBy?: string;
  deletedFor?: string[];
  reported?: boolean;
  edited?: boolean;
  editedAt?: string;
  forwardedFrom?: ForwardedFrom;
  mentions?: string[];
  reactions?: Reaction[];
  createdAt?: string;
  updatedAt?: string;
  encrypted?: boolean;
  iv?: string;
  keyId?: string;
}

export interface CallLog {
  id: string;
  _id?: string;
  caller: User | string;
  receiver?: User | string;
  room?: Room | string;
  type: CallType;
  status: CallStatus;
  durationSeconds?: number;
  startedAt?: string;
  endedAt?: string;
  createdAt?: string;
}

export interface NotificationItem {
  id: string;
  _id?: string;
  user: string;
  actor?: User;
  type: 'mention' | 'dm' | 'reaction' | 'system' | 'channel';
  title: string;
  message: string;
  link?: string;
  roomId?: string;
  messageId?: string;
  read: boolean;
  createdAt?: string;
}

export interface PresenceEntry {
  status: 'online' | 'idle' | 'dnd' | 'offline';
  currentRoom?: string;
  lastSeen?: string | number;
}

export interface TypingUser {
  userId: string;
  username: string;
}

export interface ReadReceipt {
  userId: string;
  lastReadMessageId: string;
  timestamp?: number;
}

export interface DMConversation {
  id: string;
  room: Room;
  partner: User;
  lastMessage?: Message;
  unreadCount?: number;
  status: 'pending' | 'accepted';
  isInitiator: boolean;
}
