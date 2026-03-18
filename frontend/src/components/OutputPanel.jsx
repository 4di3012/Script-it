import { useState, useEffect } from 'react';

export default function OutputPanel({ script, isLoading, error, creatorVoice }) {
  const [copied, setCopied] = useState(false);
  const [rating, setRating] = useState(0);
  const [hovered, setHovered] = useState(0);
  const [feedbackNote, setFeedbackNote] = useState('');
  const [thankYou, setThankYou] = useState(false);

  useEffect(() => {
    setRating(0);
    setFeedbackNote('');
    setThankYou(false);
  }, [script]);

  const handleSubmitFeedback = async () => {
    const note = feedbackNote;
    setFeedbackNote('');
    setThankYou(true);
    try {
      await fetch(`${import.meta.env.VITE_API_URL}/api/feedback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scriptId: Date.now(), rating, script, creatorVoice, feedbackNote: note }),
      });
    } catch { /* silent fail */ }
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(script);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      const el = document.createElement('textarea');
      el.value = script;
      document.body.appendChild(el);
      el.select();
      document.execCommand('copy');
      document.body.removeChild(el);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const isEmpty = !script && !isLoading && !error;

  let parsedScript = null;
  if (script && !isLoading) {
    try {
      const cleanScript = script.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      parsedScript = JSON.parse(cleanScript);
    } catch { /* fall through to plain text */ }
  }

  const SECTIONS = [
    { key: 'hook',  label: 'Hook',  color: '#c9a84c', cardBg: 'linear-gradient(135deg, #1a1608 0%, #110f05 100%)' },
    { key: 'intro', label: 'Intro', color: '#6c8fff', cardBg: 'linear-gradient(135deg, #0e1020 0%, #0a0c18 100%)' },
    { key: 'body',  label: 'Body',  color: '#7db87d', cardBg: 'linear-gradient(135deg, #0e180e 0%, #0a120a 100%)' },
    { key: 'close', label: 'Close', color: '#c97878', cardBg: 'linear-gradient(135deg, #1a0e0e 0%, #120a0a 100%)' },
  ];

  return (
    <div
      style={{
        background: '#131210',
        border: '1px solid #2a2620',
        borderRadius: '10px',
        display: 'flex',
        flexDirection: 'column',
        minHeight: '400px',
        overflow: 'hidden',
      }}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '14px 18px',
          borderBottom: '1px solid #2a2620',
        }}
      >
        <span style={{ fontSize: '11px', fontWeight: '600', color: '#c9a84c', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
          Generated Script
        </span>
        {script && (
          <button
            onClick={handleCopy}
            style={{
              padding: '6px 14px',
              background: copied ? '#0f1a10' : '#1c1a17',
              color: copied ? '#4ade80' : '#7a7268',
              border: `1px solid ${copied ? '#4ade80' : '#2a2620'}`,
              borderRadius: '6px',
              fontSize: '12px',
              fontWeight: '600',
              transition: 'all 0.15s',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            {copied ? '✓ Copied' : '⎘ Copy'}
          </button>
        )}
      </div>

      {/* Content */}
      <div style={{ flex: 1, padding: '20px 24px', overflowY: 'auto' }}>
        {isEmpty && (
          <div
            style={{
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#2a2620',
              textAlign: 'center',
              gap: '12px',
            }}
          >
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
              <line x1="16" y1="13" x2="8" y2="13" />
              <line x1="16" y1="17" x2="8" y2="17" />
              <polyline points="10 9 9 9 8 9" />
            </svg>
            <p style={{ fontSize: '14px', color: '#3a3530' }}>Your script will appear here</p>
          </div>
        )}

        {error && (
          <div
            style={{
              background: '#180e0e',
              border: '1px solid #4a2020',
              borderRadius: '8px',
              padding: '14px 16px',
              color: '#f87171',
              fontSize: '13px',
            }}
          >
            {error}
          </div>
        )}

        {isLoading && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#7a7268', fontSize: '14px' }}>
            <span
              style={{
                display: 'inline-block',
                width: '2px',
                height: '16px',
                background: '#c9a84c',
                verticalAlign: 'text-bottom',
                animation: 'blink 0.8s step-end infinite',
              }}
            />
            Generating your script…
          </div>
        )}

        {!isLoading && !error && parsedScript && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
            {SECTIONS.map(({ key, label, color, cardBg }, sectionIndex) => {
              const items = parsedScript[key];
              if (!items?.length) return null;
              return (
                <div
                  key={key}
                  style={{
                    animation: 'fadeInUp 0.45s ease forwards',
                    animationDelay: `${sectionIndex * 0.08}s`,
                    opacity: 0,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
                    <div style={{ width: '3px', height: '14px', background: color, borderRadius: '2px' }} />
                    <span style={{ fontSize: '10px', fontWeight: '700', color, letterSpacing: '0.14em', textTransform: 'uppercase' }}>{label}</span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {items.map((item, i) => (
                      <div
                        key={i}
                        style={{
                          background: cardBg,
                          border: '1px solid #2a2620',
                          borderLeft: `2px solid ${color}33`,
                          borderRadius: '8px',
                          padding: '14px 16px',
                          boxShadow: '0 2px 16px rgba(0,0,0,0.5)',
                          animation: 'fadeInUp 0.4s ease forwards',
                          animationDelay: `${sectionIndex * 0.08 + i * 0.05}s`,
                          opacity: 0,
                        }}
                      >
                        <p style={{ fontSize: '15px', color: '#f0ece6', lineHeight: '1.7', margin: '0 0 10px 0', fontWeight: '400' }}>{item.talking_point}</p>
                        <div style={{ height: '1px', background: '#2a2620', margin: '0 0 10px 0' }} />
                        <p style={{ fontSize: '12px', color: '#5a5248', margin: 0, lineHeight: '1.5', fontStyle: 'italic' }}>
                          <span style={{ color, fontWeight: '600', fontStyle: 'normal' }}>📷 </span>
                          {item.visual}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {!isLoading && !error && !parsedScript && script && (
          <pre
            style={{
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
              fontFamily: 'inherit',
              fontSize: '14px',
              lineHeight: '1.8',
              color: '#f0ece6',
              margin: 0,
            }}
          >
            {script}
          </pre>
        )}
      </div>

      {script && !isLoading && (
        <div
          style={{
            borderTop: '1px solid #2a2620',
            padding: '16px 24px',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
          }}
        >
          {/* Stars */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '12px', color: '#5a5248' }}>How did this script perform?</span>
            {[1, 2, 3, 4, 5].map((s) => (
              <button
                key={s}
                onClick={() => setRating(s)}
                onMouseEnter={() => setHovered(s)}
                onMouseLeave={() => setHovered(0)}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: '22px',
                  color: s <= (hovered || rating) ? '#c9a84c' : '#2a2620',
                  filter: s <= (hovered || rating) ? 'drop-shadow(0 0 6px rgba(201,168,76,0.6))' : 'none',
                  transition: 'color 0.1s, filter 0.1s',
                  padding: '0 2px',
                }}
              >
                ★
              </button>
            ))}
          </div>

          {/* Feedback textarea — appears after any star is clicked */}
          {rating > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <label style={{ fontSize: '11px', fontWeight: '600', color: '#c9a84c', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                Feedback (optional)
              </label>
              <textarea
                value={feedbackNote}
                onChange={(e) => setFeedbackNote(e.target.value)}
                placeholder="What worked, what didn't, how did the visuals feel, how did it perform..."
                rows={3}
                style={{
                  background: '#0d0d0d',
                  border: '1px solid #2a2620',
                  borderRadius: '6px',
                  color: '#f0ece6',
                  padding: '8px 10px',
                  fontSize: '12px',
                  resize: 'vertical',
                  lineHeight: '1.6',
                  fontFamily: 'inherit',
                  transition: 'border-color 0.2s',
                }}
                onFocus={(e) => (e.target.style.borderColor = '#c9a84c')}
                onBlur={(e) => (e.target.style.borderColor = '#2a2620')}
              />
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <button
                  onClick={handleSubmitFeedback}
                  style={{
                    alignSelf: 'flex-start',
                    padding: '8px 16px',
                    background: '#6c63ff',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '6px',
                    fontSize: '12px',
                    fontWeight: '600',
                    cursor: 'pointer',
                  }}
                >
                  Submit Feedback
                </button>
                {thankYou && (
                  <span style={{ fontSize: '12px', color: '#4ade80' }}>Thanks!</span>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      <style>{`
        @keyframes blink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0; }
        }
      `}</style>
    </div>
  );
}
