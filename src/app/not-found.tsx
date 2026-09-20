'use client';

import React from 'react';
import Link from 'next/link';

export default function NotFound() {
  return (
    <div
      style={{
        height: '100vh',
        width: '100vw',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'var(--bg-canvas, #F0F0F0)',
        color: 'var(--text-main, #121212)',
        textAlign: 'center',
        padding: '24px',
      }}
    >
      <div
        style={{
          border: '4px solid var(--border-color, #121212)',
          boxShadow: 'var(--shadow-xl, 8px 8px 0px 0px #121212)',
          backgroundColor: 'var(--panel-bg, #FFFFFF)',
          padding: '40px',
          maxWidth: '500px',
          width: '100%',
        }}
      >
        <h1 style={{ fontSize: '72px', fontWeight: 900, marginBottom: '16px', color: 'var(--primary, #D02020)' }}>
          404
        </h1>
        <h2 style={{ fontSize: '24px', fontWeight: 900, marginBottom: '16px', textTransform: 'uppercase' }}>
          Page Not Found
        </h2>
        <p style={{ marginBottom: '24px', color: 'var(--text-muted, #4A4A4A)' }}>
          The geometric coordinate you are looking for does not exist in this workspace.
        </p>
        <Link href="/" className="bauhaus-btn bauhaus-btn-red">
          Return to Base
        </Link>
      </div>
    </div>
  );
}
