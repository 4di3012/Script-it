import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase.js';

export default function ScriptHistory({ refreshTrigger, onLoad }) {
  const [scripts, setScripts] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  useEffect(() => {
    if (isOpen) fetchScripts();
  }, [isOpen, refreshTrigger]);

  async function fetchScripts() {
    const { data } = await supabase
      .from('scripts')
      .select('id, created_at, product_name, script')
      .order('created_at', { ascending: false })
      .limit(20);
    if (data) setScripts(data);
  }

  async function deleteScript(id) {
    setDeletingId(id);
    await supabase.from('scripts').delete().eq('id', id);
    setScripts((prev) => prev.filter((s) => s.id !== id));
    setDeletingId(null);
  }

  async function loadScript(id) {
    const { data } = await supabase
      .from('scripts')
      .select('*')
      .eq('id', id)
      .single();
    if (!data) return;
    onLoad({
      inputs: {
        referenceScript: data.reference_script ?? '',
        productName: data.product_name ?? '',
        productDescription: data.product_description ?? '',
        keyBenefits: data.key_benefits ?? '',
        targetAudience: data.target_audience ?? '',
      },
      script: data.script,
    });
    setIsOpen(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  return (
    <div style={{ borderTop: '1px solid #1e1e1e', marginTop: '8px' }}>
      {/* Toggle button */}
      <button
        type="button"
        onClick={() => setIsOpen((o) => !o)}
        style={{
          width: '100%',
          padding: '14px 32px',
          background: 'none',
          border: 'none',
          color: '#888',
          fontSize: '13px',
          fontWeight: '500',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          cursor: 'pointer',
          transition: 'color 0.15s',
        }}
        onMouseEnter={(e) => (e.currentTarget.style.color = '#f0f0f0')}
        onMouseLeave={(e) => (e.currentTarget.style.color = '#888')}
      >
        <span style={{ fontSize: '11px', transition: 'transform 0.2s', display: 'inline-block', transform: isOpen ? 'rotate(90deg)' : 'rotate(0deg)' }}>▶</span>
        Script History
        {scripts.length > 0 && isOpen && (
          <span style={{ marginLeft: 'auto', fontSize: '12px', color: '#555' }}>
            {scripts.length} saved
          </span>
        )}
      </button>

      {/* History list */}
      {isOpen && (
        <div style={{ padding: '0 32px 32px' }}>
          {scripts.length === 0 ? (
            <p style={{ fontSize: '13px', color: '#555', padding: '12px 0' }}>
              No saved scripts yet — generate one and it'll appear here.
            </p>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '12px' }}>
              {scripts.map((s) => (
                <HistoryCard
                  key={s.id}
                  script={s}
                  isDeleting={deletingId === s.id}
                  onLoad={() => loadScript(s.id)}
                  onDelete={() => deleteScript(s.id)}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function HistoryCard({ script, isDeleting, onLoad, onDelete }) {
  const date = new Date(script.created_at).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
  });
  const preview = script.script.slice(0, 120).trimEnd() + '…';

  return (
    <div style={{
      background: '#1a1a1a',
      border: '1px solid #2e2e2e',
      borderRadius: '10px',
      padding: '16px',
      display: 'flex',
      flexDirection: 'column',
      gap: '10px',
      opacity: isDeleting ? 0.4 : 1,
      transition: 'opacity 0.2s',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
        <p style={{ fontSize: '13px', fontWeight: '600', color: '#f0f0f0', lineHeight: '1.4' }}>
          {script.product_name}
        </p>
        <button
          type="button"
          onClick={onDelete}
          disabled={isDeleting}
          title="Delete"
          style={{
            background: 'none',
            border: 'none',
            color: '#555',
            fontSize: '14px',
            cursor: 'pointer',
            padding: '2px 4px',
            flexShrink: 0,
            lineHeight: 1,
            transition: 'color 0.15s',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.color = '#f87171')}
          onMouseLeave={(e) => (e.currentTarget.style.color = '#555')}
        >
          ✕
        </button>
      </div>

      <p style={{ fontSize: '12px', color: '#555', lineHeight: '1.5' }}>{preview}</p>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'auto' }}>
        <span style={{ fontSize: '11px', color: '#444' }}>{date}</span>
        <button
          type="button"
          onClick={onLoad}
          style={{
            padding: '5px 12px',
            background: '#242424',
            border: '1px solid #3a3a3a',
            borderRadius: '6px',
            color: '#ccc',
            fontSize: '12px',
            fontWeight: '500',
            cursor: 'pointer',
            transition: 'background 0.15s, color 0.15s',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.background = '#7c6bff'; e.currentTarget.style.color = '#fff'; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = '#242424'; e.currentTarget.style.color = '#ccc'; }}
        >
          Load →
        </button>
      </div>
    </div>
  );
}
