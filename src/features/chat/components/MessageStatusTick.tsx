import React from 'react';

interface MessageStatusTickProps {
  status?: 'sending' | 'sent' | 'delivered' | 'read' | string;
  readReceiptsEnabled?: boolean;
}

export const MessageStatusTick: React.FC<MessageStatusTickProps> = ({
  status = 'sent',
  readReceiptsEnabled = true,
}) => {
  // If user disabled read receipts, double blue tick is suppressed into double grey tick
  const isRead = status === 'read' && readReceiptsEnabled !== false;
  const isDelivered = status === 'delivered' || (status === 'read' && readReceiptsEnabled === false);

  if (status === 'sending') {
    // Clock icon for optimistic sending state
    return (
      <span title="Sending...">
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="wa-tick-grey inline-block ml-1 opacity-70"
        >
          <circle cx="12" cy="12" r="10" />
          <polyline points="12 6 12 12 16 14" />
        </svg>
      </span>
    );
  }

  if (isRead) {
    // Double Blue Checkmark (#53bdeb)
    return (
      <span title="Read">
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#53bdeb"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="wa-tick-blue inline-block ml-1"
        >
          <path d="M18 6L7 17l-5-5" />
          <path d="M22 10l-7.5 7.5-2-2" />
        </svg>
      </span>
    );
  }

  if (isDelivered) {
    // Double Grey Checkmark
    return (
      <span title="Delivered">
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="wa-tick-grey inline-block ml-1 opacity-70"
        >
          <path d="M18 6L7 17l-5-5" />
          <path d="M22 10l-7.5 7.5-2-2" />
        </svg>
      </span>
    );
  }

  // Default: Single Grey Checkmark (Sent)
  return (
    <span title="Sent">
      <svg
        width="15"
        height="15"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="wa-tick-grey inline-block ml-1 opacity-70"
      >
        <polyline points="20 6 9 17 4 12" />
      </svg>
    </span>
  );
};

export default MessageStatusTick;
