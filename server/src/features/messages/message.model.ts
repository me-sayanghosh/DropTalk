import mongoose from 'mongoose';

const messageSchema = new mongoose.Schema(
  {
    room: { type: mongoose.Schema.Types.ObjectId, ref: 'Room', required: true, index: true },
    sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    clientMsgId: { type: String, default: null },
    text: { type: String, default: '', maxlength: 2000 },
    attachments: [
      {
        url: { type: String, required: true },
        filename: { type: String, required: true },
        fileType: { type: String, enum: ['image', 'video', 'audio', 'document'], default: 'document' },
        mimeType: { type: String, default: '' },
        size: { type: Number, default: 0 },
      },
    ],
    parentMessage: { type: mongoose.Schema.Types.ObjectId, ref: 'Message', default: null },
    deleted: { type: Boolean, default: false },
    deletedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    replyTo: { type: mongoose.Schema.Types.ObjectId, ref: 'Message', default: null },
    deletedFor: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    reported: { type: Boolean, default: false },
    edited: { type: Boolean, default: false },
    editedAt: { type: Date, default: null },
    forwardedFrom: {
      senderUsername: { type: String, default: null },
      roomName: { type: String, default: null },
    },
    mentions: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    reactions: [
      {
        emoji: { type: String, required: true },
        users: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
      },
    ],
    deliveryStatus: { type: String, enum: ['sent', 'delivered', 'read'], default: 'sent' },
    deliveredAt: { type: Date, default: null },
    readAt: { type: Date, default: null },
    readBy: [
      {
        user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        readAt: { type: Date, default: Date.now },
      },
    ],
    expiresAt: { type: Date, default: null },
    isVoiceNote: { type: Boolean, default: false },
    voiceDuration: { type: Number, default: 0 },
    voiceWaveform: [{ type: Number }],
    isForwarded: { type: Boolean, default: false },
    forwardedCount: { type: Number, default: 0 },
    location: {
      latitude: { type: Number, default: null },
      longitude: { type: Number, default: null },
      name: { type: String, default: '' },
      address: { type: String, default: '' },
    },
    caption: { type: String, default: '' },
  },
  { timestamps: true }
);

messageSchema.index({ room: 1, parentMessage: 1, createdAt: 1 });
messageSchema.index({ clientMsgId: 1 }, { unique: true, sparse: true, partialFilterExpression: { clientMsgId: { $ne: null } } });
messageSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

messageSchema.methods.toClient = function () {
  const isPopulated = this.sender && typeof this.sender === 'object' && this.sender._id;
  const senderId = isPopulated
    ? this.sender._id.toString()
    : this.sender?.toString
    ? this.sender.toString()
    : String(this.sender || '');
  const senderUsername = isPopulated ? (this.sender.username || null) : null;
  const senderObj = isPopulated
    ? {
        id: senderId,
        username: this.sender.username || 'User',
        profileImage: this.sender.profileImage || '',
      }
    : undefined;

  return {
    id: this._id.toString(),
    roomId: this.room.toString(),
    senderId,
    sender: senderObj,
    senderUsername,
    clientMsgId: this.clientMsgId || null,
    text: this.text || '',
    attachments: this.attachments || [],
    parentMessage: this.parentMessage ? this.parentMessage.toString() : null,
    replyTo: this.replyTo ? this.replyTo.toString() : null,
    deleted: this.deleted,
    deletedFor: this.deletedFor ? this.deletedFor.map((u) => u.toString()) : [],
    reported: this.reported,
    edited: !!this.edited,
    editedAt: this.editedAt || null,
    forwardedFrom: this.forwardedFrom || null,
    mentions: (this.mentions || []).map((u) => u.toString()),
    reactions: (this.reactions || []).map((r) => ({
      emoji: r.emoji,
      users: r.users.map((u) => u.toString()),
    })),
    deliveryStatus: this.deliveryStatus || 'sent',
    deliveredAt: this.deliveredAt || null,
    readAt: this.readAt || null,
    readBy: (this.readBy || []).map((rb) => ({
      user: rb.user ? rb.user.toString() : '',
      readAt: rb.readAt,
    })),
    expiresAt: this.expiresAt || null,
    isVoiceNote: !!this.isVoiceNote,
    voiceDuration: this.voiceDuration || 0,
    voiceWaveform: this.voiceWaveform || [],
    isForwarded: !!this.isForwarded,
    forwardedCount: this.forwardedCount || 0,
    location: this.location?.latitude != null ? this.location : null,
    caption: this.caption || '',
    createdAt: this.createdAt,
  };
};

export const Message = mongoose.model('Message', messageSchema);
