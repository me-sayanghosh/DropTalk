import { useState, useEffect } from 'react';
import { api } from '../../../shared/utils/api';

export default function PinnedMessagesModal({
  isOpen,
  roomId,
  onClose,
  pinnedMessages = [],
  allMessages = [],
  onUnpin,
  onJumpToMessage,
}) {
  const [fetchedPinned, setFetchedPinned] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (!isOpen || !roomId) {
      setFetchedPinned([]);
      return;
    }
    setLoading(true);
    api.get(`/rooms/${roomId}/pinned`)
      .then((res) => {
        if (res.data?.messages) {
          setFetchedPinned(res.data.messages);
        }
      })
      .catch((err) => console.warn('Failed to load pinned messages:', err))
      .finally(() => setLoading(false));
  }, [isOpen, roomId]);

  if (!isOpen) return null;

  // Resolve pinned message objects
  const localDocs = pinnedMessages
    .map((id) => allMessages.find((m) => m.id === id || m._id === id))
    .filter(Boolean);

  const pinnedDocs = fetchedPinned.length > 0 ? fetchedPinned : localDocs;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-card pinned-modal" role="dialog" aria-modal="true" aria-label="Pinned Messages" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
              <line x1="12" y1="17" x2="12" y2="22"/>
              <path d="M5 17h14l-1.5-6H6.5L5 17z"/>
              <path d="M9 11V5a3 3 0 0 1 6 0v6"/>
            </svg>
            Pinned Messages ({pinnedDocs.length})
          </h3>
          <button className="modal-close" onClick={onClose} title="Close">&times;</button>
        </div>

        <div className="pinned-list">
          {pinnedDocs.length === 0 ? (
            <div className="pinned-empty">No pinned messages in this channel yet.</div>
          ) : (
            pinnedDocs.map((msg) => (
              <div key={msg.id} className="pinned-item">
                <div className="pinned-item-body" onClick={() => { onJumpToMessage(msg.id); onClose(); }}>
                  <div className="pinned-item-header">
                    <span className="pinned-sender">@{msg.sender?.username || 'User'}</span>
                    <span className="pinned-time">{new Date(msg.createdAt).toLocaleDateString()}</span>
                  </div>
                  <p className="pinned-text">{msg.text || '[Attachment]'}</p>
                </div>
                <button
                  className="pinned-unpin-btn"
                  onClick={() => {
                    const targetId = msg.id || msg._id;
                    onUnpin(targetId);
                    setFetchedPinned((prev) => prev.filter((m) => (m.id || m._id) !== targetId));
                  }}
                  title="Unpin message"
                >
                  Unpin
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
