'use client';

import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  showDetails: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null, showDetails: false };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error('[ErrorBoundary] Error caught:', error, errorInfo);
    this.setState({ errorInfo });
  }

  handleReload = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    if (typeof window !== 'undefined') {
      window.location.reload();
    }
  };

  handleGoChannels = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    if (typeof window !== 'undefined') {
      window.location.href = '/channels';
    }
  };

  render(): ReactNode {
    if (this.state.hasError) {
      const errorMsg = this.state.error?.message || 'An unexpected rendering error occurred.';
      const isChunkMismatch =
        errorMsg.includes("reading 'call'") ||
        errorMsg.includes('ChunkLoadError') ||
        errorMsg.includes('Loading chunk') ||
        this.state.error?.name === 'ChunkLoadError';

      return (
        <div
          role="alert"
          style={{
            minHeight: '100vh',
            width: '100vw',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: '#F4F1EA',
            color: '#121212',
            fontFamily: "'Outfit', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
            padding: '1.5rem',
            boxSizing: 'border-box',
          }}
        >
          <div
            style={{
              width: '100%',
              maxWidth: '540px',
              backgroundColor: '#FFFFFF',
              border: '3px solid #121212',
              boxShadow: '8px 8px 0px 0px #121212',
              borderRadius: '0px',
              overflow: 'hidden',
              textAlign: 'center',
            }}
          >
            {/* Top Bauhaus Red Banner */}
            <div
              style={{
                backgroundColor: isChunkMismatch ? '#1040C0' : '#D02020',
                color: '#FFFFFF',
                padding: '10px 16px',
                fontSize: '0.78rem',
                fontWeight: 900,
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                borderBottom: '3px solid #121212',
              }}
            >
              <span>{isChunkMismatch ? '00 // BUNDLE REFRESH REQUIRED' : '00 // SYSTEM ALERT — EXECUTION HALTED'}</span>
              <span style={{ backgroundColor: '#121212', padding: '2px 8px', color: '#F0C020', fontSize: '0.7rem' }}>
                {isChunkMismatch ? 'SYNC' : 'ERROR'}
              </span>
            </div>

            <div style={{ padding: '2.5rem 2rem' }}>
              {/* Bauhaus Bouncing Shapes */}
              <div
                className="bauhaus-loading-shapes"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '14px',
                  marginBottom: '1.75rem',
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

              {/* Title */}
              <h1
                style={{
                  fontSize: '1.65rem',
                  fontWeight: 900,
                  letterSpacing: '-0.02em',
                  textTransform: 'uppercase',
                  margin: '0 0 0.75rem 0',
                  color: '#121212',
                  lineHeight: 1.1,
                }}
              >
                {isChunkMismatch ? 'WORKSPACE UPDATE DETECTED' : 'SOMETHING WENT WRONG'}
              </h1>

              {/* Descriptive Explanatory Paragraph */}
              <p
                style={{
                  fontSize: '0.92rem',
                  lineHeight: 1.55,
                  color: '#4A4A4A',
                  margin: '0 auto 1.75rem auto',
                  maxWidth: '440px',
                  fontWeight: 500,
                }}
              >
                {isChunkMismatch
                  ? 'A new build was compiled in your environment. The browser needs to reload its bundle manifest to resume encrypted chat and WebSockets.'
                  : 'An unhandled exception occurred during UI composition. You can reload the workspace or navigate back to your channels.'}
              </p>

              {/* Error Snippet Box */}
              <div
                style={{
                  backgroundColor: '#F8F7F4',
                  border: '2px solid #121212',
                  padding: '12px 14px',
                  marginBottom: '2rem',
                  textAlign: 'left',
                  fontSize: '0.82rem',
                  fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
                  color: '#D02020',
                  fontWeight: 700,
                  wordBreak: 'break-word',
                  boxShadow: '3px 3px 0px 0px #121212',
                }}
              >
                <div style={{ color: '#121212', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '4px' }}>
                  EXCEPTION PAYLOAD:
                </div>
                {errorMsg}
              </div>

              {/* Action Buttons Group */}
              <div
                style={{
                  display: 'flex',
                  gap: '12px',
                  justifyContent: 'center',
                  flexWrap: 'wrap',
                }}
              >
                <button
                  onClick={this.handleReload}
                  style={{
                    backgroundColor: isChunkMismatch ? '#1040C0' : '#D02020',
                    color: '#FFFFFF',
                    border: '2px solid #121212',
                    boxShadow: '4px 4px 0px 0px #121212',
                    borderRadius: '0px',
                    padding: '12px 24px',
                    fontWeight: 900,
                    fontSize: '0.88rem',
                    textTransform: 'uppercase',
                    letterSpacing: '0.06em',
                    cursor: 'pointer',
                    transition: 'transform 0.1s ease, box-shadow 0.1s ease',
                  }}
                  onMouseDown={(e) => {
                    e.currentTarget.style.transform = 'translate(2px, 2px)';
                    e.currentTarget.style.boxShadow = '2px 2px 0px 0px #121212';
                  }}
                  onMouseUp={(e) => {
                    e.currentTarget.style.transform = 'translate(0px, 0px)';
                    e.currentTarget.style.boxShadow = '4px 4px 0px 0px #121212';
                  }}
                >
                  RELOAD WORKSPACE
                </button>

                <button
                  onClick={this.handleGoChannels}
                  style={{
                    backgroundColor: '#FFFFFF',
                    color: '#121212',
                    border: '2px solid #121212',
                    boxShadow: '4px 4px 0px 0px #121212',
                    borderRadius: '0px',
                    padding: '12px 20px',
                    fontWeight: 900,
                    fontSize: '0.88rem',
                    textTransform: 'uppercase',
                    letterSpacing: '0.06em',
                    cursor: 'pointer',
                  }}
                  onMouseDown={(e) => {
                    e.currentTarget.style.transform = 'translate(2px, 2px)';
                    e.currentTarget.style.boxShadow = '2px 2px 0px 0px #121212';
                  }}
                  onMouseUp={(e) => {
                    e.currentTarget.style.transform = 'translate(0px, 0px)';
                    e.currentTarget.style.boxShadow = '4px 4px 0px 0px #121212';
                  }}
                >
                  RETURN TO CHANNELS
                </button>
              </div>

              {/* Collapsible Error Stack Diagnostics */}
              {this.state.error?.stack && (
                <div style={{ marginTop: '2rem', textAlign: 'left' }}>
                  <button
                    onClick={() => this.setState((prev) => ({ showDetails: !prev.showDetails }))}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#666666',
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                      textDecoration: 'underline',
                      padding: 0,
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                    }}
                  >
                    {this.state.showDetails ? '[-] HIDE DIAGNOSTICS' : '[+] VIEW ERROR DIAGNOSTICS'}
                  </button>

                  {this.state.showDetails && (
                    <pre
                      style={{
                        marginTop: '10px',
                        backgroundColor: '#121212',
                        color: '#38BDF8',
                        padding: '12px',
                        fontSize: '0.72rem',
                        lineHeight: 1.45,
                        overflowX: 'auto',
                        maxHeight: '160px',
                        borderRadius: '0px',
                        border: '2px solid #121212',
                      }}
                    >
                      {this.state.error.stack}
                    </pre>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
