import { useState, useEffect, useRef } from 'react';
import { api } from '../../../shared/utils/api';

interface SuggestionsBarProps {
  roomId: string;
  currentInput?: string;
  onSelectSuggestion: (suggestion: string) => void;
  disabled?: boolean;
}

export default function SuggestionsBar({
  roomId,
  currentInput = '',
  onSelectSuggestion,
  disabled = false,
}: SuggestionsBarProps) {
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!roomId || disabled) {
      setSuggestions([]);
      return;
    }

    const trimmed = currentInput.trim();
    if (trimmed.length < 3) {
      setSuggestions([]);
      return;
    }

    if (debounceRef.current) clearTimeout(debounceRef.current);

    debounceRef.current = setTimeout(async () => {
      try {
        setLoading(true);
        const res = await api.post(`/ai/${roomId}/suggest`, { message: trimmed });
        if (Array.isArray(res.data?.suggestions)) {
          setSuggestions(res.data.suggestions.slice(0, 3));
        }
      } catch {
        // Silently omit smart replies on network or auth errors
        setSuggestions([]);
      } finally {
        setLoading(false);
      }
    }, 700);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [currentInput, roomId, disabled]);

  if (suggestions.length === 0 && !loading) return null;

  return (
    <div
      className="suggestions-bar"
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        padding: '4px 12px',
        fontSize: '0.8rem',
        overflowX: 'auto',
      }}
    >
      <span
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '3px',
          color: 'var(--color-accent, #6366f1)',
          fontWeight: 600,
          whiteSpace: 'nowrap',
          fontSize: '0.75rem',
        }}
      >
        ✨ AI:
      </span>
      {loading ? (
        <span style={{ color: 'var(--color-text-secondary, #94a3b8)', fontStyle: 'italic' }}>
          Thinking...
        </span>
      ) : (
        suggestions.map((s, i) => (
          <button
            key={i}
            type="button"
            className="suggestion-chip"
            onClick={() => {
              onSelectSuggestion(s);
              setSuggestions([]);
            }}
            style={{
              background: 'var(--color-bg-secondary, rgba(0, 0, 0, 0.04))',
              border: '1px solid var(--color-border, #e2e8f0)',
              borderRadius: '12px',
              padding: '2px 10px',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              fontSize: '0.78rem',
              color: 'var(--color-text-primary, #1e293b)',
              transition: 'background 0.15s ease',
            }}
            title="Click to insert suggestion"
          >
            {s}
          </button>
        ))
      )}
    </div>
  );
}
