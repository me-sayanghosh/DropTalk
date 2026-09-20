/**
 * Ultra-Fast Client-Side Cache Manager
 * Handles In-Memory & LocalStorage dual caching for User Profiles, Avatars,
 * Latest Messages, Rooms, and DM Conversations.
 */
import { User, Room, Message, DMConversation } from '../../types';

interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

const MEMORY_CACHE = {
  profiles: new Map<string, CacheEntry<User>>(),
  messages: new Map<string, CacheEntry<Message[]>>(),
  rooms: null as Room[] | null,
  conversations: null as DMConversation[] | null,
  images: new Set<string>(),
};

const CACHE_KEYS = {
  PROFILES: 'chatapp_cache_profiles',
  MESSAGES_PREFIX: 'chatapp_cache_msgs_',
  ROOMS: 'chatapp_cache_rooms',
  CONVERSATIONS: 'chatapp_cache_conversations',
};

const PROFILE_TTL_MS = 30 * 60 * 1000; // 30 minutes
const MESSAGES_TTL_MS = 60 * 60 * 1000; // 1 hour

export const cacheManager = {
  /**
   * Get cached user profile by userId
   */
  getUserProfile(userId?: string | null): User | null {
    if (!userId) return null;

    // 1. Check memory cache first
    const memItem = MEMORY_CACHE.profiles.get(userId);
    if (memItem && Date.now() < memItem.expiresAt) {
      return memItem.data;
    }

    // 2. Fallback to localStorage
    if (typeof window !== 'undefined') {
      try {
        const raw = localStorage.getItem(`${CACHE_KEYS.PROFILES}_${userId}`);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (Date.now() < parsed.expiresAt) {
            MEMORY_CACHE.profiles.set(userId, parsed);
            return parsed.data;
          }
        }
      } catch (e) {
        /* ignore */
      }
    }

    return null;
  },

  /**
   * Set user profile in cache
   */
  setUserProfile(userId: string, profileData: User, ttlMs: number = PROFILE_TTL_MS): void {
    if (!userId || !profileData) return;
    const expiresAt = Date.now() + ttlMs;
    const entry: CacheEntry<User> = { data: profileData, expiresAt };

    MEMORY_CACHE.profiles.set(userId, entry);

    // Preload profile image if present
    if (profileData.profileImage) {
      this.preloadImage(profileData.profileImage);
    }

    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(`${CACHE_KEYS.PROFILES}_${userId}`, JSON.stringify(entry));
      } catch (e) {
        /* storage quota catch */
      }
    }
  },

  /**
   * Get cached room or DM messages
   */
  getRoomMessages(roomId?: string | null): Message[] | null {
    if (!roomId) return null;

    // 1. Check memory cache
    const memItem = MEMORY_CACHE.messages.get(roomId);
    if (memItem && Date.now() < memItem.expiresAt) {
      return memItem.data;
    }

    // 2. Check localStorage
    if (typeof window !== 'undefined') {
      try {
        const raw = localStorage.getItem(`${CACHE_KEYS.MESSAGES_PREFIX}${roomId}`);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (Date.now() < parsed.expiresAt) {
            MEMORY_CACHE.messages.set(roomId, parsed);
            return parsed.data;
          }
        }
      } catch (e) {
        /* ignore */
      }
    }

    return null;
  },

  /**
   * Set room or DM messages in cache (keeps latest 50 messages)
   */
  setRoomMessages(roomId: string, messages: Message[], ttlMs: number = MESSAGES_TTL_MS): void {
    if (!roomId || !Array.isArray(messages)) return;
    const sliced = messages.slice(-50);
    const expiresAt = Date.now() + ttlMs;
    const entry: CacheEntry<Message[]> = { data: sliced, expiresAt };

    MEMORY_CACHE.messages.set(roomId, entry);

    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(`${CACHE_KEYS.MESSAGES_PREFIX}${roomId}`, JSON.stringify(entry));
      } catch (e) {
        /* storage quota catch */
      }
    }
  },

  /**
   * Append a single new message to room cache
   */
  appendRoomMessage(roomId: string, newMsg: Message): void {
    const existing = this.getRoomMessages(roomId) || [];
    if (existing.some((m) => m.id === newMsg.id)) return;
    const updated = [...existing, newMsg];
    this.setRoomMessages(roomId, updated);
  },

  /**
   * Get cached channel rooms
   */
  getRoomsCache(): Room[] | null {
    if (MEMORY_CACHE.rooms) return MEMORY_CACHE.rooms;
    if (typeof window !== 'undefined') {
      try {
        const raw = localStorage.getItem(CACHE_KEYS.ROOMS);
        if (raw) {
          MEMORY_CACHE.rooms = JSON.parse(raw);
          return MEMORY_CACHE.rooms;
        }
      } catch (e) {
        /* ignore */
      }
    }
    return null;
  },

  /**
   * Set channel rooms cache
   */
  setRoomsCache(rooms: Room[]): void {
    if (!Array.isArray(rooms)) return;
    MEMORY_CACHE.rooms = rooms;
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(CACHE_KEYS.ROOMS, JSON.stringify(rooms));
      } catch (e) {
        /* ignore */
      }
    }
  },

  /**
   * Get cached DM conversations
   */
  getConversationsCache(): DMConversation[] | null {
    if (MEMORY_CACHE.conversations) return MEMORY_CACHE.conversations;
    if (typeof window !== 'undefined') {
      try {
        const raw = localStorage.getItem(CACHE_KEYS.CONVERSATIONS);
        if (raw) {
          MEMORY_CACHE.conversations = JSON.parse(raw);
          return MEMORY_CACHE.conversations;
        }
      } catch (e) {
        /* ignore */
      }
    }
    return null;
  },

  /**
   * Set DM conversations cache
   */
  setConversationsCache(convos: DMConversation[]): void {
    if (!Array.isArray(convos)) return;
    MEMORY_CACHE.conversations = convos;
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(CACHE_KEYS.CONVERSATIONS, JSON.stringify(convos));
      } catch (e) {
        /* ignore */
      }
    }
  },

  /**
   * Preload an image URL into browser memory cache for 0 flicker rendering
   */
  preloadImage(src?: string | null): void {
    if (!src || MEMORY_CACHE.images.has(src)) return;
    if (typeof window !== 'undefined') {
      const img = new Image();
      img.src = src;
      MEMORY_CACHE.images.add(src);
    }
  },

  /**
   * Clear all memory & localStorage cache
   */
  clearAll(): void {
    MEMORY_CACHE.profiles.clear();
    MEMORY_CACHE.messages.clear();
    MEMORY_CACHE.rooms = null;
    MEMORY_CACHE.conversations = null;
    MEMORY_CACHE.images.clear();

    if (typeof window !== 'undefined') {
      try {
        Object.keys(localStorage).forEach((key) => {
          if (key.startsWith('chatapp_cache_')) {
            localStorage.removeItem(key);
          }
        });
      } catch (e) {
        /* ignore */
      }
    }
  },
};
