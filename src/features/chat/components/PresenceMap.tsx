interface PresenceEntry {
  status?: string;
  currentRoom?: string;
  username?: string;
  customStatus?: { emoji?: string; text?: string };
  [key: string]: unknown;
}

interface Room {
  id: string;
  name: string;
}

export default function PresenceMap({ presenceMap, currentUserId, rooms = [] }: {
  presenceMap: Record<string, PresenceEntry>;
  currentUserId: string;
  rooms?: Room[];
}) {
  const entries = Object.entries(presenceMap).filter(
    ([userId, pres]) => userId !== currentUserId && pres && pres.status !== 'offline'
  );

  const roomNameMap: Record<string, string> = {};
  for (const r of rooms) {
    roomNameMap[r.id] = r.name;
  }

  if (entries.length === 0) {
    return (
      <div className="presence-map">
        <h3>Online Users</h3>
        <div className="presence-empty">No other users online</div>
      </div>
    );
  }

  const grouped: Record<string, Array<{ userId: string } & PresenceEntry>> = {};
  for (const [userId, pres] of entries) {
    const room = pres.currentRoom || 'lobby';
    if (!grouped[room]) grouped[room] = [];
    grouped[room].push({ userId, ...pres });
  }

  return (
    <div className="presence-map">
      <h3>Online Users ({entries.length})</h3>
      {Object.entries(grouped).map(([roomName, users]) => (
        <div key={roomName} className="presence-group">
          <div className="presence-room-label">
            {roomName === 'lobby' ? 'In lobby' : `In #${roomNameMap[roomName] || roomName}`}
          </div>
          <ul>
            {users.map((u) => {
              const statusClass = u.status === 'away' ? 'away' : u.status === 'dnd' ? 'dnd' : 'online';
              return (
                <li key={u.userId} className="presence-user">
                  <span className={`presence-dot ${statusClass}`}></span>
                  <span className="presence-username">{u.username || u.userId.slice(0, 8)}</span>
                  {u.customStatus?.emoji && (
                    <span className="presence-custom-status" title={u.customStatus?.text || ''}>
                      {u.customStatus.emoji}
                    </span>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </div>
  );
}
