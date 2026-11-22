import { useEffect } from 'react';

export default function UserProfileCard({
  user,
  isOnline,
  onClose,
  onStartDM,
  onMention,
  onStartCall,
  currentUserId,
}) {
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  if (!user) return null;

  const initial = (user.username || 'U')[0].toUpperCase();
  const name = user.name || user.username;
  const isSelf = currentUserId && (String(user.id || user._id) === String(currentUserId));

  return (
    <div className="user-card-backdrop" onClick={onClose}>
      <div className="user-card-modal" role="dialog" aria-modal="true" aria-label="User Profile" onClick={(e) => e.stopPropagation()}>
        {/* Banner header */}
        <div className="user-card-banner">
          <button className="user-card-close-btn" onClick={onClose} title="Close">&times;</button>
        </div>

        {/* Avatar badge */}
        <div className="user-card-avatar-wrap">
          {user.profileImage ? (
            <img src={user.profileImage} alt={user.username} className="user-card-avatar" />
          ) : (
            <div className="user-card-avatar-fallback">{initial}</div>
          )}
          <span className={`user-card-status-dot ${isOnline ? 'online' : 'offline'}`} />
        </div>

        {/* Details */}
        <div className="user-card-details">
          <h2 className="user-card-name">{name}</h2>
          <span className="user-card-handle">@{user.username}</span>

          {/* Custom Status Chip */}
          {user.customStatus?.text && (
            <div className="user-card-custom-status">
              <span className="status-emoji">{user.customStatus.emoji || '💬'}</span>
              <span className="status-text">{user.customStatus.text}</span>
            </div>
          )}

          <div className="user-card-meta">
            <span className="meta-badge">
              <span className={`dot ${isOnline ? 'online' : 'offline'}`} />
              {isOnline ? 'Active Now' : 'Offline'}
            </span>
            <span className="meta-badge e2ee">E2EE Ready 🔒</span>
          </div>

          {/* Action buttons */}
          <div className="user-card-actions">
            {onStartDM && !isSelf && (
              <button
                className="user-card-btn primary"
                onClick={() => {
                  onStartDM(user.id || user._id);
                  onClose();
                }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                </svg>
                Direct Message
              </button>
            )}

            {onStartCall && !isSelf && (
              <>
                <button
                  className="user-card-btn secondary call-voice-btn"
                  onClick={() => {
                    onStartCall(String(user.id || user._id), false, user);
                    onClose();
                  }}
                  title="Start Voice Call"
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
                  </svg>
                  Voice
                </button>
                <button
                  className="user-card-btn secondary call-video-btn"
                  onClick={() => {
                    onStartCall(String(user.id || user._id), true, user);
                    onClose();
                  }}
                  title="Start Video Call"
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                    <polygon points="23 7 16 12 23 17 23 7" />
                    <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
                  </svg>
                  Video
                </button>
              </>
            )}

            {onMention && (
              <button
                className="user-card-btn secondary"
                onClick={() => {
                  onMention(user.username);
                  onClose();
                }}
              >
                @ Mention
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
