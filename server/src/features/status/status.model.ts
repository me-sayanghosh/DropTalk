import mongoose from 'mongoose';

const statusSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    mediaUrl: { type: String, required: true },
    mediaType: { type: String, enum: ['image', 'video'], default: 'image' },
    caption: { type: String, default: '', maxlength: 500 },
    viewers: [
      {
        user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        viewedAt: { type: Date, default: Date.now },
      },
    ],
    expiresAt: {
      type: Date,
      default: () => new Date(Date.now() + 24 * 60 * 60 * 1000),
    },
  },
  { timestamps: true }
);

statusSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

statusSchema.methods.toClient = function () {
  const isPopulated = this.user && typeof this.user === 'object' && this.user._id;
  const userObj = isPopulated
    ? {
        id: this.user._id.toString(),
        username: this.user.username || 'User',
        name: this.user.name || this.user.username || 'User',
        profileImage: this.user.profileImage || '',
      }
    : { id: this.user ? this.user.toString() : '' };

  return {
    id: this._id.toString(),
    user: userObj,
    mediaUrl: this.mediaUrl,
    mediaType: this.mediaType || 'image',
    caption: this.caption || '',
    viewers: (this.viewers || []).map((v: any) => ({
      user: v.user && typeof v.user === 'object' && v.user._id
        ? {
            id: v.user._id.toString(),
            username: v.user.username,
            name: v.user.name,
            profileImage: v.user.profileImage,
          }
        : v.user ? v.user.toString() : '',
      viewedAt: v.viewedAt,
    })),
    expiresAt: this.expiresAt,
    createdAt: this.createdAt,
  };
};

export const Status = mongoose.model('Status', statusSchema);
