'use client';

import React from 'react';

export interface BauhausLoadingScreenProps {
  title?: string;
  subtitle?: string;
  stamp?: string;
}

export const BauhausLoadingScreen: React.FC<BauhausLoadingScreenProps> = ({
  title = 'DROPTALK WORKSPACE',
  subtitle = 'ESTABLISHING ENCRYPTED SESSION // PLEASE WAIT',
  stamp = 'BOOTSTRAP',
}) => {
  return (
    <div
      className="bauhaus-fullscreen-loader"
      role="status"
      aria-live="polite"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        width: '100%',
        height: '100%',
        minHeight: '100dvh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#F4F1EA',
        fontFamily: "'Outfit', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
        padding: '1.5rem',
        boxSizing: 'border-box',
        zIndex: 99999,
      }}
    >
      <div
        className="bauhaus-loader-card"
        style={{
          width: '100%',
          maxWidth: '440px',
          backgroundColor: '#FFFFFF',
          border: '3px solid #121212',
          boxShadow: '8px 8px 0px 0px #121212',
          borderRadius: '0px',
          padding: '2.5rem 2rem',
          textAlign: 'center',
          position: 'relative',
          overflow: 'hidden',
          boxSizing: 'border-box',
        }}
      >
        {/* Top Decorative Geometric Tri-Color Strip */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: '6px',
            display: 'flex',
          }}
        >
          <div style={{ flex: 1, backgroundColor: '#D02020' }} />
          <div style={{ flex: 1, backgroundColor: '#1040C0' }} />
          <div style={{ flex: 1, backgroundColor: '#F0C020' }} />
        </div>

        {/* Animated Bouncing Bauhaus Shapes */}
        <div
          className="bauhaus-loading-shapes"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '14px',
            marginBottom: '1.75rem',
            marginTop: '0.5rem',
          }}
        >
          <span
            className="shape-circle"
            style={{
              width: '26px',
              height: '26px',
              borderRadius: '50%',
              backgroundColor: '#D02020',
              border: '3px solid #121212',
              boxShadow: '2px 2px 0px #121212',
              display: 'inline-block',
            }}
          />
          <span
            className="shape-square"
            style={{
              width: '26px',
              height: '26px',
              backgroundColor: '#1040C0',
              border: '3px solid #121212',
              boxShadow: '2px 2px 0px #121212',
              display: 'inline-block',
            }}
          />
          <span
            className="shape-triangle"
            style={{
              width: 0,
              height: 0,
              borderLeft: '14px solid transparent',
              borderRight: '14px solid transparent',
              borderBottom: '26px solid #F0C020',
              display: 'inline-block',
              filter: 'drop-shadow(2px 2px 0px #121212)',
            }}
          />
        </div>

        {/* Bauhaus Stamp */}
        <div
          className="bauhaus-stamp"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            padding: '3px 8px',
            backgroundColor: '#121212',
            color: '#FFFFFF',
            fontSize: '0.72rem',
            fontWeight: 800,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            marginBottom: '1rem',
          }}
        >
          <span style={{ color: '#F0C020' }}>00 //</span>
          <span>{stamp}</span>
        </div>

        {/* Main Title */}
        <h2
          className="bauhaus-loading-title"
          style={{
            fontSize: '1.4rem',
            fontWeight: 900,
            letterSpacing: '-0.02em',
            margin: '0 0 0.5rem 0',
            color: '#121212',
            textTransform: 'uppercase',
          }}
        >
          {title}
        </h2>

        {/* Subtitle */}
        <p
          className="bauhaus-loading-subtitle"
          style={{
            fontSize: '0.76rem',
            fontWeight: 700,
            color: '#555555',
            letterSpacing: '0.06em',
            margin: '0 auto 1.75rem auto',
            maxWidth: '340px',
            lineHeight: 1.4,
            textTransform: 'uppercase',
          }}
        >
          {subtitle}
        </p>

        {/* Animated Progress Bar */}
        <div
          className="bauhaus-loading-progress-bar"
          style={{
            width: '100%',
            maxWidth: '280px',
            height: '8px',
            backgroundColor: '#E0E0E0',
            border: '2px solid #121212',
            overflow: 'hidden',
            margin: '0 auto',
            position: 'relative',
          }}
        >
          <div
            className="bauhaus-loading-progress-inner"
            style={{
              height: '100%',
              width: '40%',
              backgroundColor: '#D02020',
            }}
          />
        </div>
      </div>
    </div>
  );
};

export default BauhausLoadingScreen;
