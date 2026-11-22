import { useState, useEffect } from 'react';
import { api } from '../../../shared/utils/api';

interface AIPanelProps {
  roomId: string;
  roomName?: string;
  onClose: () => void;
  isOpen?: boolean;
}

export default function AIPanel({ roomId, roomName, onClose, isOpen = true }: AIPanelProps) {
  const [summary, setSummary] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  async function fetchSummary() {
    if (!roomId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await api.post(`/ai/${roomId}/summarize`);
      setSummary(res.data.summary || 'No summary generated.');
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || 'Failed to generate summary.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (isOpen && roomId) {
      fetchSummary();
    }
  }, [isOpen, roomId]);

  if (!isOpen) return null;

  async function handleCopy() {
    if (!summary) return;
    try {
      await navigator.clipboard.writeText(summary);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.warn('Clipboard copy failed:', err);
    }
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal-card ai-panel-modal"
        role="dialog"
        aria-modal="true"
        aria-label="AI Conversation Summary"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: '580px', width: '92%' }}
      >
        <div className="modal-header">
          <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '1.2rem' }}>✨</span>
            AI Copilot Summary {roomName ? `· #${roomName}` : ''}
          </h3>
          <button className="modal-close" onClick={onClose} title="Close">&times;</button>
        </div>

        <div className="ai-panel-body" style={{ padding: '16px 0' }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '32px 16px', color: 'var(--color-text-secondary, #64748b)' }}>
              <div className="spinner" style={{ margin: '0 auto 12px' }} />
              <p style={{ margin: 0, fontWeight: 500 }}>Synthesizing conversation with Gemini...</p>
            </div>
          ) : error ? (
            <div style={{ padding: '16px', background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', borderRadius: '8px' }}>
              <p style={{ margin: '0 0 8px', fontWeight: 600 }}>Could not generate summary</p>
              <p style={{ margin: 0, fontSize: '0.9rem' }}>{error}</p>
              <button
                className="button-secondary-pill"
                onClick={fetchSummary}
                style={{ marginTop: '12px', fontSize: '0.85rem' }}
              >
                Retry
              </button>
            </div>
          ) : (
            <div className="ai-summary-content">
              <div
                style={{
                  background: 'var(--color-bg-secondary, rgba(0,0,0,0.03))',
                  border: '1px solid var(--color-border, #e2e8f0)',
                  borderRadius: '8px',
                  padding: '16px',
                  fontSize: '0.95rem',
                  lineHeight: '1.6',
                  whiteSpace: 'pre-wrap',
                }}
              >
                {summary}
              </div>
            </div>
          )}
        </div>

        <div className="modal-actions" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <button
            className="button-secondary-pill"
            onClick={fetchSummary}
            disabled={loading}
          >
            ↻ Regenerate
          </button>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              className="button-secondary-pill"
              onClick={handleCopy}
              disabled={!summary || loading}
            >
              {copied ? '✓ Copied' : 'Copy Summary'}
            </button>
            <button className="button-primary-pill" onClick={onClose}>
              Done
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
