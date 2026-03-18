import { useState, useRef, useEffect } from 'react';

const ACCENT = '#c9a84c';
const ACCENT_BTN = '#6c63ff';
const BORDER = '#2a2620';
const MUTED = '#7a7268';

const FIELD_STYLES = {
  width: '100%',
  background: '#0d0d0d',
  border: `1px solid ${BORDER}`,
  borderRadius: '8px',
  color: '#f0ece6',
  padding: '10px 12px',
  resize: 'vertical',
  lineHeight: '1.6',
  fontFamily: 'inherit',
  fontSize: '14px',
  transition: 'border-color 0.2s',
};

const TABS = [
  { id: 'url', label: 'Video URL' },
  { id: 'file', label: 'Drop / Upload' },
  { id: 'text', label: 'Paste Text' },
];

export default function ReferenceScriptInput({ value, onChange }) {
  const [activeTab, setActiveTab] = useState('url');
  const [urlInput, setUrlInput] = useState('');
  const [droppedFile, setDroppedFile] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [error, setError] = useState('');
  const fileInputRef = useRef(null);
  const prevValueRef = useRef(value);

  // When value changes from outside (e.g. history loaded), switch to text tab
  // so the user always sees the reference script that will be used for generation.
  useEffect(() => {
    if (value && value !== prevValueRef.current) {
      setActiveTab('text');
      setError('');
    }
    prevValueRef.current = value;
  }, [value]);

  function switchTab(id) {
    setActiveTab(id);
    setError('');
  }

  async function transcribeUrl() {
    if (!urlInput.trim()) return;

    if (/facebook\.com\/ads\/library/i.test(urlInput)) {
      setError('Facebook Ad Library links don\'t contain direct video audio. Copy the video URL from TikTok or YouTube instead.');
      return;
    }

    setIsTranscribing(true);
    setError('');
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/transcribe/url`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: urlInput.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `Server error ${res.status}`);
      onChange(data.transcript);
      setActiveTab('text');
    } catch (err) {
      setError(err.message);
    } finally {
      setIsTranscribing(false);
    }
  }

  async function transcribeFile(file) {
    setIsTranscribing(true);
    setError('');
    const form = new FormData();
    form.append('video', file);
    try {
      // Do NOT set Content-Type manually — the browser must set the multipart boundary
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/transcribe/file`, {
        method: 'POST',
        body: form,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `Server error ${res.status}`);
      onChange(data.transcript);
      setActiveTab('text');
    } catch (err) {
      setError(err.message);
    } finally {
      setIsTranscribing(false);
    }
  }

  function handleDrop(e) {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) setDroppedFile(file);
  }

  function handleFileSelect(e) {
    const file = e.target.files[0];
    if (file) setDroppedFile(file);
  }

  return (
    <div>
      {/* Label */}
      <label style={{
        display: 'block',
        fontSize: '13px',
        fontWeight: '600',
        color: ACCENT,
        textTransform: 'uppercase',
        letterSpacing: '0.12em',
        marginBottom: '10px',
      }}>
        Reference Script
      </label>

      {/* Tab bar */}
      <div style={{ display: 'flex', borderBottom: `1px solid ${BORDER}`, marginBottom: '16px' }}>
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => switchTab(tab.id)}
            disabled={isTranscribing}
            style={{
              padding: '8px 16px',
              fontSize: '12px',
              fontWeight: '500',
              color: activeTab === tab.id ? '#f0ece6' : MUTED,
              background: 'none',
              border: 'none',
              borderBottom: activeTab === tab.id ? `2px solid ${ACCENT}` : '2px solid transparent',
              marginBottom: '-1px',
              transition: 'color 0.15s',
              cursor: isTranscribing ? 'not-allowed' : 'pointer',
              letterSpacing: '0.02em',
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Loading state */}
      {isTranscribing ? (
        <TranscribingState />
      ) : (
        <>
          {activeTab === 'url' && (
            <UrlTab
              url={urlInput}
              onUrlChange={setUrlInput}
              onTranscribe={transcribeUrl}
            />
          )}

          {activeTab === 'file' && (
            <FileTab
              file={droppedFile}
              isDragging={isDragging}
              fileInputRef={fileInputRef}
              onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
              onFileSelect={handleFileSelect}
              onTranscribe={() => transcribeFile(droppedFile)}
            />
          )}

          {activeTab === 'text' && (
            <textarea
              value={value}
              onChange={(e) => onChange(e.target.value)}
              placeholder="Paste the reference script here..."
              rows={8}
              style={{ ...FIELD_STYLES, minHeight: '160px' }}
              onFocus={(e) => (e.target.style.borderColor = ACCENT)}
              onBlur={(e) => (e.target.style.borderColor = BORDER)}
            />
          )}

          {/* Error display */}
          {error && (
            <div style={{
              marginTop: '10px',
              background: '#180e0e',
              border: '1px solid #4a2020',
              borderRadius: '8px',
              padding: '12px 14px',
              color: '#f87171',
              fontSize: '13px',
            }}>
              {error}
            </div>
          )}

          {/* Show "transcript ready" hint when on URL or file tab with a transcript loaded */}
          {activeTab !== 'text' && value && !error && (
            <p style={{ marginTop: '8px', fontSize: '12px', color: MUTED }}>
              ✓ Transcript ready —{' '}
              <button
                type="button"
                onClick={() => switchTab('text')}
                style={{ background: 'none', border: 'none', color: ACCENT_BTN, fontSize: '12px', cursor: 'pointer', padding: 0 }}
              >
                view and edit
              </button>
            </p>
          )}
        </>
      )}
    </div>
  );
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function TranscribingState() {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '160px',
      gap: '14px',
      color: MUTED,
    }}>
      <div style={{
        width: '28px',
        height: '28px',
        border: `3px solid ${BORDER}`,
        borderTopColor: ACCENT,
        borderRadius: '50%',
        animation: 'transcribe-spin 0.8s linear infinite',
      }} />
      <p style={{ fontSize: '14px' }}>Transcribing video…</p>
      <p style={{ fontSize: '12px', color: '#3a3530' }}>This usually takes 10–30 seconds</p>
      <style>{`@keyframes transcribe-spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

function UrlTab({ url, onUrlChange, onTranscribe }) {
  const hasUrl = url.trim().length > 0;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
      <p style={{ fontSize: '12px', color: '#4a4540' }}>
        Paste a YouTube, TikTok, Instagram Reels, or Facebook video URL.
      </p>
      <div style={{ display: 'flex', gap: '8px' }}>
        <input
          type="url"
          value={url}
          onChange={(e) => onUrlChange(e.target.value)}
          placeholder="https://www.youtube.com/watch?v=..."
          style={{ flex: 1, ...FIELD_STYLES, resize: undefined }}
          onFocus={(e) => (e.target.style.borderColor = ACCENT)}
          onBlur={(e) => (e.target.style.borderColor = BORDER)}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); onTranscribe(); } }}
        />
        <button
          type="button"
          onClick={onTranscribe}
          disabled={!hasUrl}
          style={{
            padding: '10px 18px',
            background: hasUrl ? ACCENT_BTN : '#1c1a17',
            color: hasUrl ? '#fff' : '#4a4540',
            borderRadius: '8px',
            fontWeight: '600',
            fontSize: '13px',
            whiteSpace: 'nowrap',
            transition: 'background 0.15s',
            cursor: hasUrl ? 'pointer' : 'not-allowed',
          }}
        >
          Transcribe →
        </button>
      </div>
    </div>
  );
}

function FileTab({ file, isDragging, fileInputRef, onDragOver, onDragLeave, onDrop, onFileSelect, onTranscribe }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
      {/* Drop zone */}
      <div
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        onClick={() => fileInputRef.current?.click()}
        style={{
          border: `2px dashed ${isDragging ? ACCENT : BORDER}`,
          borderRadius: '10px',
          padding: '36px 24px',
          textAlign: 'center',
          cursor: 'pointer',
          transition: 'border-color 0.15s, background 0.15s',
          background: isDragging ? 'rgba(201, 168, 76, 0.05)' : 'transparent',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '8px',
        }}
      >
        <svg
          width="28" height="28" viewBox="0 0 24 24" fill="none"
          stroke={isDragging ? ACCENT : MUTED}
          strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"
        >
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
          <polyline points="17 8 12 3 7 8" />
          <line x1="12" y1="3" x2="12" y2="15" />
        </svg>
        {file ? (
          <>
            <p style={{ fontSize: '14px', color: '#f0ece6' }}>{file.name}</p>
            <p style={{ fontSize: '12px', color: MUTED }}>
              {(file.size / 1024 / 1024).toFixed(1)} MB — click to change
            </p>
          </>
        ) : (
          <>
            <p style={{ fontSize: '14px', color: isDragging ? ACCENT : MUTED }}>
              Drop a video file here
            </p>
            <p style={{ fontSize: '12px', color: '#3a3530' }}>or click to browse — MP4, MOV, WebM, etc.</p>
          </>
        )}
        <input
          ref={fileInputRef}
          type="file"
          accept="video/*"
          onChange={onFileSelect}
          style={{ display: 'none' }}
        />
      </div>

      {/* Transcribe button — only shown once a file is chosen */}
      {file && (
        <button
          type="button"
          onClick={onTranscribe}
          style={{
            padding: '10px 18px',
            background: ACCENT_BTN,
            color: '#fff',
            borderRadius: '8px',
            fontWeight: '600',
            fontSize: '13px',
            transition: 'background 0.15s',
          }}
        >
          Transcribe →
        </button>
      )}
    </div>
  );
}
