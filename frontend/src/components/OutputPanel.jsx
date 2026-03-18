import { useState, useEffect } from 'react';

export default function OutputPanel({ script, isLoading, error, creatorVoice }) {
  const [copied, setCopied] = useState(false);
  const [rating, setRating] = useState(0);
  const [hovered, setHovered] = useState(0);
  const [submitted, setSubmitted] = useState(false);
  const [feedbackNote, setFeedbackNote] = useState('');
  const [showAdditionalFeedback, setShowAdditionalFeedback] = useState(false);
  const [additionalFeedback, setAdditionalFeedback] = useState('');

  useEffect(() => { setRating(0); setSubmitted(false); setFeedbackNote(''); setShowAdditionalFeedback(false); setAdditionalFeedback(''); }, [script]);

  const handleRating = async (stars) => {
    setRating(stars);
    if (stars > 3) {
      setSubmitted(true);
      try {
        await fetch(`${import.meta.env.VITE_API_URL}/api/feedback`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ scriptId: Date.now(), rating: stars, script, creatorVoice }),
        });
      } catch { /* silent fail */ }
    }
  };

  const handleSubmitAdditional = async () => {
    const note = additionalFeedback;
    setAdditionalFeedback('');
    setShowAdditionalFeedback(false);
    try {
      await fetch(`${import.meta.env.VITE_API_URL}/api/feedback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scriptId: Date.now(), rating, script, creatorVoice, additionalFeedback: note }),
      });
    } catch { /* silent fail */ }
  };

  const handleSubmitNote = async () => {
    setSubmitted(true);
    try {
      await fetch(`${import.meta.env.VITE_API_URL}/api/feedback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scriptId: Date.now(), rating, script, creatorVoice, feedbackNote }),
      });
    } catch { /* silent fail */ }
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(script);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback for older browsers
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
    try { parsedScript = JSON.parse(script); } catch { /* fall through to plain text */ }
  }

  const SECTIONS = [
    { key: 'hook',  label: 'HOOK',  color: '#f59e0b' },
    { key: 'intro', label: 'INTRO', color: '#7c6bff' },
    { key: 'body',  label: 'BODY',  color: '#3b82f6' },
    { key: 'close', label: 'CLOSE', color: '#4ade80' },
  ];

  return (
    <div
      style={{
        background: '#1a1a1a',
        border: '1px solid #2e2e2e',
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
          borderBottom: '1px solid #2e2e2e',
        }}
      >
        <span style={{ fontSize: '12px', fontWeight: '600', color: '#888', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
          Generated Script
        </span>
        {script && (
          <button
            onClick={handleCopy}
            style={{
              padding: '6px 14px',
              background: copied ? '#1a3a2a' : '#242424',
              color: copied ? '#4ade80' : '#ccc',
              border: `1px solid ${copied ? '#4ade80' : '#3a3a3a'}`,
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
              color: '#444',
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
            <p style={{ fontSize: '14px' }}>Your script will appear here</p>
          </div>
        )}

        {error && (
          <div
            style={{
              background: '#1f1010',
              border: '1px solid #5a2020',
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
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#888', fontSize: '14px' }}>
            <span
              style={{
                display: 'inline-block',
                width: '2px',
                height: '16px',
                background: '#7c6bff',
                verticalAlign: 'text-bottom',
                animation: 'blink 0.8s step-end infinite',
              }}
            />
            Generating your script...
          </div>
        )}

        {!isLoading && !error && parsedScript && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
            {SECTIONS.map(({ key, label, color }) => {
              const items = parsedScript[key];
              if (!items?.length) return null;
              return (
                <div key={key}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
                    <div style={{ width: '3px', height: '16px', background: color, borderRadius: '2px' }} />
                    <span style={{ fontSize: '11px', fontWeight: '700', color, letterSpacing: '0.1em' }}>{label}</span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {items.map((item, i) => (
                      <div key={i} style={{ background: '#111', border: '1px solid #2a2a2a', borderRadius: '8px', padding: '14px 16px' }}>
                        <p style={{ fontSize: '15px', color: '#f0f0f0', lineHeight: '1.65', margin: '0 0 10px 0' }}>{item.talking_point}</p>
                        <div style={{ height: '1px', background: '#2a2a2a', margin: '0 0 10px 0' }} />
                        <p style={{ fontSize: '12px', color: '#888', margin: 0, lineHeight: '1.5' }}>
                          <span style={{ color: '#7c6bff', fontWeight: '600' }}>📷 Visual: </span>
                          <em>{item.visual}</em>
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
              color: '#e8e8e8',
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
            borderTop: '1px solid #2e2e2e',
            padding: '14px 24px',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            flexWrap: 'wrap',
          }}
        >
          <span style={{ fontSize: '12px', color: '#888' }}>How did this script perform?</span>
          {submitted ? (
            <>
              <span style={{ fontSize: '12px', color: '#4ade80' }}>
                Thanks! We'll use this to improve future scripts.
              </span>
              {!showAdditionalFeedback && (
                <button
                  onClick={() => setShowAdditionalFeedback(true)}
                  style={{
                    padding: '4px 12px',
                    background: 'none',
                    color: '#888',
                    border: '1px solid #3a3a3a',
                    borderRadius: '6px',
                    fontSize: '12px',
                    cursor: 'pointer',
                  }}
                >
                  Add More Feedback
                </button>
              )}
              {showAdditionalFeedback && (
                <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '8px' }}>
                  <textarea
                    value={additionalFeedback}
                    onChange={(e) => setAdditionalFeedback(e.target.value)}
                    placeholder="How did it perform? Views, engagement, conversions, what worked, what didn't..."
                    rows={3}
                    style={{
                      background: '#0f0f0f',
                      border: '1px solid #2e2e2e',
                      borderRadius: '6px',
                      color: '#f0f0f0',
                      padding: '8px 10px',
                      fontSize: '12px',
                      resize: 'vertical',
                      lineHeight: '1.6',
                    }}
                  />
                  <button
                    onClick={handleSubmitAdditional}
                    style={{
                      alignSelf: 'flex-end',
                      padding: '8px 14px',
                      background: '#7c6bff',
                      color: '#fff',
                      border: 'none',
                      borderRadius: '6px',
                      fontSize: '12px',
                      fontWeight: '600',
                      cursor: 'pointer',
                    }}
                  >
                    Submit
                  </button>
                </div>
              )}
            </>
          ) : (
            [1, 2, 3, 4, 5].map((s) => (
              <button
                key={s}
                onClick={() => handleRating(s)}
                onMouseEnter={() => setHovered(s)}
                onMouseLeave={() => setHovered(0)}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: '22px',
                  color: s <= (hovered || rating) ? '#f59e0b' : '#3a3a3a',
                  transition: 'color 0.1s',
                  padding: '0 2px',
                }}
              >
                ★
              </button>
            ))
          )}
          {rating > 0 && rating <= 3 && !submitted && (
            <div style={{ width: '100%', display: 'flex', gap: '8px', marginTop: '8px' }}>
              <input
                type="text"
                value={feedbackNote}
                onChange={(e) => setFeedbackNote(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSubmitNote()}
                placeholder="What felt off? (optional)"
                style={{
                  flex: 1,
                  background: '#0f0f0f',
                  border: '1px solid #2e2e2e',
                  borderRadius: '6px',
                  color: '#f0f0f0',
                  padding: '8px 10px',
                  fontSize: '12px',
                }}
              />
              <button
                onClick={handleSubmitNote}
                style={{
                  padding: '8px 14px',
                  background: '#7c6bff',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '12px',
                  fontWeight: '600',
                  cursor: 'pointer',
                }}
              >
                Send
              </button>
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
