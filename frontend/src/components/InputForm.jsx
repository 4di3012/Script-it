import ReferenceScriptInput from './ReferenceScriptInput.jsx';

const FIELD_STYLES = {
  width: '100%',
  background: '#0f0f0f',
  border: '1px solid #2e2e2e',
  borderRadius: '8px',
  color: '#f0f0f0',
  padding: '10px 12px',
  resize: 'vertical',
  lineHeight: '1.6',
  transition: 'border-color 0.15s',
};

const LABEL_STYLES = {
  display: 'block',
  fontSize: '12px',
  fontWeight: '600',
  color: '#888',
  textTransform: 'uppercase',
  letterSpacing: '0.06em',
  marginBottom: '6px',
};

function Field({ label, hint, children }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      <label style={LABEL_STYLES}>{label}</label>
      {hint && <p style={{ fontSize: '12px', color: '#666', marginBottom: '6px' }}>{hint}</p>}
      {children}
    </div>
  );
}

export default function InputForm({ values, onChange, onSubmit, isLoading }) {
  const handleChange = (key) => (e) => onChange(key, e.target.value);

  const canSubmit = Object.values(values).every((v) => v.trim()) && !isLoading;

  return (
    <form
      onSubmit={(e) => { e.preventDefault(); if (canSubmit) onSubmit(); }}
      style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}
    >
      <ReferenceScriptInput
        value={values.referenceScript}
        onChange={(v) => onChange('referenceScript', v)}
      />

      <div style={{ height: '1px', background: '#2e2e2e' }} />

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
        <Field label="Product Name">
          <input
            type="text"
            value={values.productName}
            onChange={handleChange('productName')}
            placeholder="e.g. Lumi Sleep Mask"
            style={{ ...FIELD_STYLES, resize: undefined }}
            onFocus={(e) => (e.target.style.borderColor = '#7c6bff')}
            onBlur={(e) => (e.target.style.borderColor = '#2e2e2e')}
          />
        </Field>

        <Field label="Target Audience">
          <input
            type="text"
            value={values.targetAudience}
            onChange={handleChange('targetAudience')}
            placeholder="e.g. busy professionals aged 25–40"
            style={{ ...FIELD_STYLES, resize: undefined }}
            onFocus={(e) => (e.target.style.borderColor = '#7c6bff')}
            onBlur={(e) => (e.target.style.borderColor = '#2e2e2e')}
          />
        </Field>
      </div>

      <Field label="What It Does" hint="One or two sentences describing the product's core function.">
        <textarea
          value={values.productDescription}
          onChange={handleChange('productDescription')}
          placeholder="e.g. A weighted sleep mask that blocks light and plays white noise to help you fall asleep faster."
          rows={3}
          style={FIELD_STYLES}
          onFocus={(e) => (e.target.style.borderColor = '#7c6bff')}
          onBlur={(e) => (e.target.style.borderColor = '#2e2e2e')}
        />
      </Field>

      <Field label="Key Benefits" hint="List 3–5 benefits, one per line or comma-separated.">
        <textarea
          value={values.keyBenefits}
          onChange={handleChange('keyBenefits')}
          placeholder="e.g. Fall asleep 2x faster, no more groggy mornings, drug-free, works on flights"
          rows={3}
          style={FIELD_STYLES}
          onFocus={(e) => (e.target.style.borderColor = '#7c6bff')}
          onBlur={(e) => (e.target.style.borderColor = '#2e2e2e')}
        />
      </Field>

      <button
        type="submit"
        disabled={!canSubmit}
        style={{
          padding: '12px 24px',
          background: canSubmit ? '#7c6bff' : '#2e2e2e',
          color: canSubmit ? '#fff' : '#555',
          borderRadius: '8px',
          fontWeight: '600',
          fontSize: '14px',
          transition: 'background 0.15s, transform 0.1s',
          cursor: canSubmit ? 'pointer' : 'not-allowed',
        }}
        onMouseEnter={(e) => { if (canSubmit) e.target.style.background = '#6a58f0'; }}
        onMouseLeave={(e) => { if (canSubmit) e.target.style.background = '#7c6bff'; }}
      >
        {isLoading ? 'Generating…' : 'Generate Script →'}
      </button>
    </form>
  );
}
