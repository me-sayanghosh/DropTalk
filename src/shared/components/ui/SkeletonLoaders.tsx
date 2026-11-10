import React from 'react';

interface SkeletonBoxProps {
  width?: string | number;
  height?: string | number;
  borderRadius?: string | number;
  className?: string;
}

export function SkeletonBox({ width, height, borderRadius = '8px', className = '' }: SkeletonBoxProps) {
  return (
    <div
      className={`skeleton-loader ${className}`}
      style={{ width, height, borderRadius }}
    />
  );
}

export function MessageSkeleton({ count = 5 }: { count?: number }) {
  return (
    <div className="skeleton-messages-wrapper">
      {Array.from({ length: count }).map((_, i) => {
        const isSelf = i % 2 === 1;
        return (
          <div
            key={i}
            className={`skeleton-msg-row ${isSelf ? 'self' : 'other'}`}
          >
            {!isSelf && <SkeletonBox width="36px" height="36px" borderRadius="50%" />}
            <div className="skeleton-msg-bubble">
              <SkeletonBox width={isSelf ? '140px' : '180px'} height="14px" borderRadius="4px" />
              <SkeletonBox width={isSelf ? '200px' : '260px'} height="12px" borderRadius="4px" />
              <SkeletonBox width="60px" height="10px" borderRadius="4px" />
            </div>
            {isSelf && <SkeletonBox width="36px" height="36px" borderRadius="50%" />}
          </div>
        );
      })}
    </div>
  );
}

export function ChannelSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="skeleton-list">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="skeleton-item-row">
          <SkeletonBox width="28px" height="28px" borderRadius="8px" />
          <div className="skeleton-item-text">
            <SkeletonBox width="70%" height="14px" borderRadius="4px" />
            <SkeletonBox width="40%" height="10px" borderRadius="4px" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function DMSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="skeleton-list">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="skeleton-item-row">
          <SkeletonBox width="40px" height="40px" borderRadius="50%" />
          <div className="skeleton-item-text">
            <SkeletonBox width="60%" height="14px" borderRadius="4px" />
            <SkeletonBox width="85%" height="11px" borderRadius="4px" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function CallLogSkeleton({ count = 5 }: { count?: number }) {
  return (
    <div className="skeleton-list">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="skeleton-call-row">
          <SkeletonBox width="38px" height="38px" borderRadius="50%" />
          <div className="skeleton-call-info">
            <SkeletonBox width="120px" height="14px" borderRadius="4px" />
            <SkeletonBox width="80px" height="10px" borderRadius="4px" />
          </div>
          <SkeletonBox width="60px" height="24px" borderRadius="12px" />
        </div>
      ))}
    </div>
  );
}


