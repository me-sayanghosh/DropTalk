import mongoose from 'mongoose';

const userSchema = new mongoose.Schema(
  {
    username: { type: String, required: true, unique: true, trim: true, minlength: 3, maxlength: 24 },
    name: { type: String, trim: true, default: '' },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    profileImage: { type: String, default: '' },
    googleId: { type: String, default: null, sparse: true },
    needsUsername: { type: Boolean, default: false },
    passwordHash: { type: String, required: false },
    refreshTokens: [
      {
        token: { type: String, required: true },
        family: { type: String, default: null },
        createdAt: { type: Date, default: Date.now },
        expiresAt: { type: Date, required: true },
      },
    ],
    revokedTokens: [
      {
        token: { type: String, required: true },
        revokedAt: { type: Date, default: Date.now },
        family: { type: String, default: null },
      },
    ],
    notificationSettings: {
      groupNotifications: { type: Boolean, default: true },
      directNotifications: { type: Boolean, default: true },
      backgroundSync: { type: Boolean, default: true },
    },
    privacySettings: {
      showOnlineStatus: { type: Boolean, default: true },
      showProfilePicture: { type: Boolean, default: true },
      readReceipts: { type: Boolean, default: true },
      lastSeen: { type: String, enum: ['everyone', 'contacts', 'nobody'], default: 'everyone' },
      online: { type: String, enum: ['everyone', 'same_as_last_seen'], default: 'everyone' },
      profilePhoto: { type: String, enum: ['everyone', 'contacts', 'nobody'], default: 'everyone' },
      about: { type: String, enum: ['everyone', 'contacts', 'nobody'], default: 'everyone' },
      disappearingTimer: { type: String, enum: ['off', '24h', '7d', '90d'], default: 'off' },
      blockedUsers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    },
    customStatus: {
      emoji: { type: String, default: '' },
      text: { type: String, default: '' },
    },
  },
  { timestamps: true }
);

userSchema.methods.toClient = function () {
  return {
    id: this._id.toString(),
    username: this.username,
    name: this.name || '',
    email: this.email,
    profileImage: this.profileImage || '',
    needsUsername: !!this.needsUsername,
    googleId: this.googleId || null,
    notificationSettings: this.notificationSettings || {
      groupNotifications: true,
      directNotifications: true,
      backgroundSync: true,
    },
    privacySettings: {
      showOnlineStatus: this.privacySettings?.showOnlineStatus ?? true,
      showProfilePicture: this.privacySettings?.showProfilePicture ?? true,
      readReceipts: this.privacySettings?.readReceipts ?? true,
      lastSeen: this.privacySettings?.lastSeen || 'everyone',
      online: this.privacySettings?.online || 'everyone',
      profilePhoto: this.privacySettings?.profilePhoto || 'everyone',
      about: this.privacySettings?.about || 'everyone',
      disappearingTimer: this.privacySettings?.disappearingTimer || 'off',
      blockedUsers: (this.privacySettings?.blockedUsers || []).map((u: any) =>
        u?._id ? u._id.toString() : (u?.toString ? u.toString() : String(u))
      ),
    },
    customStatus: this.customStatus || { emoji: '', text: '' },
    createdAt: this.createdAt,
  };
};

export const User = mongoose.model('User', userSchema);
