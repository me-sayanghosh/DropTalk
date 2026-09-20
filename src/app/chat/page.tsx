import React from 'react';
import Protected from '../../shared/components/Protected';
import Chat from '../../features/chat/pages/Chat';

export default function ChatPage() {
  return (
    <Protected>
      <Chat />
    </Protected>
  );
}
