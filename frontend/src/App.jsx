import { useState } from 'react';
import { flushSync } from 'react-dom';
import InputForm from './components/InputForm.jsx';
import OutputPanel from './components/OutputPanel.jsx';
// import ScriptHistory from './components/ScriptHistory.jsx';
import { supabase } from './lib/supabase.js';

const INITIAL_VALUES = {
  referenceScript: '',
  productName: '',
  productDescription: '',
  keyBenefits: '',
  targetAudience: '',
  creatorVoice: '',
};

export default function App() {
  const [values, setValues] = useState(INITIAL_VALUES);
  const [script, setScript] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [historySaveCount, setHistorySaveCount] = useState(0);

  const handleChange = (key, value) => {
    setValues((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = async () => {
    flushSync(() => {
      setScript('');
      setError('');
      setIsLoading(true);
    });

    let accumulated = '';

    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      });

      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json.error || `Server error ${res.status}`);
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop();

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          const payload = line.slice(6).trim();
          if (payload === '[DONE]') break;

          try {
            const parsed = JSON.parse(payload);
            if (parsed.error) {
              setError(parsed.error);
              setIsLoading(false);
              return;
            }
            if (parsed.text) {
              accumulated += parsed.text;
              setScript((prev) => prev + parsed.text);
            }
          } catch {
            // ignore malformed lines
          }
        }
      }

      // Auto-save to Supabase once streaming completes
      if (accumulated) {
        await supabase.from('scripts').insert({
          product_name: values.productName,
          target_audience: values.targetAudience,
          product_description: values.productDescription,
          key_benefits: values.keyBenefits,
          reference_script: values.referenceScript,
          script: accumulated,
        });
        setHistorySaveCount((n) => n + 1);
      }
    } catch (err) {
      setError(err.message || 'Something went wrong. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLoadHistory = ({ inputs, script }) => {
    setValues(inputs);
    setScript(script);
    setError('');
  };

  return (
    <div style={{ minHeight: '100vh', background: '#0f0f0f' }}>
      {/* Header */}
      <header
        style={{
          borderBottom: '1px solid #1e1e1e',
          padding: '18px 32px',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
        }}
      >
        <svg
          width="28"
          height="28"
          viewBox="0 0 28 28"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          style={{ flexShrink: 0 }}
        >
          {/* Open book */}
          <path d="M4 20V9C4 9 9 7.5 14 9C19 7.5 24 9 24 9V20C19 18.5 14 20 14 20C14 20 9 18.5 4 20Z" stroke="#a78bfa" strokeWidth="1.5" strokeLinejoin="round" fill="#1a1530"/>
          <line x1="14" y1="9" x2="14" y2="20" stroke="#a78bfa" strokeWidth="1.5"/>
          {/* Feather quill */}
          <path d="M20 5C20 5 23 7 22 11C21 14 17 15.5 15.5 14.5" stroke="white" strokeWidth="1.2" strokeLinecap="round"/>
          <path d="M20 5C18 7 16 10 15.5 14.5" stroke="#a78bfa" strokeWidth="1" strokeLinecap="round"/>
          <line x1="15.5" y1="14.5" x2="14.5" y2="17" stroke="white" strokeWidth="1" strokeLinecap="round"/>
        </svg>
        <h1 style={{ fontSize: '18px', fontWeight: '700', color: '#f0f0f0' }}>
          Script It
        </h1>
        <span style={{ color: '#555', fontSize: '13px', marginLeft: '4px' }}>
          — video ad scripts that mirror what works
        </span>
      </header>

      {/* Main layout */}
      <main
        style={{
          maxWidth: '1200px',
          margin: '0 auto',
          padding: '40px 32px',
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '32px',
          alignItems: 'start',
        }}
      >
        {/* Left: Input */}
        <div>
          <h2 style={{ fontSize: '15px', fontWeight: '600', color: '#ccc', marginBottom: '20px' }}>
            Your inputs
          </h2>
          <InputForm
            values={values}
            onChange={handleChange}
            onSubmit={handleSubmit}
            isLoading={isLoading}
          />
        </div>

        {/* Right: Output */}
        <div>
          <h2 style={{ fontSize: '15px', fontWeight: '600', color: '#ccc', marginBottom: '20px' }}>
            Output
          </h2>
          <OutputPanel script={script} isLoading={isLoading} error={error} creatorVoice={values.creatorVoice} />
        </div>
      </main>

      {/* History — full width below the grid */}
      {/* <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        <ScriptHistory
          refreshTrigger={historySaveCount}
          onLoad={handleLoadHistory}
        />
      </div> */}

      {/* Responsive styles */}
      <style>{`
        @media (max-width: 768px) {
          main {
            grid-template-columns: 1fr !important;
            padding: 24px 16px !important;
          }
        }
      `}</style>
    </div>
  );
}
