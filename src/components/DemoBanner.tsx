'use client';

export default function DemoBanner() {
  return (
    <div style={{
      background: '#2a1a00',
      padding: '6px 16px',
      textAlign: 'center',
      fontSize: '13px',
      color: 'var(--yellow)',
      borderBottom: '1px solid var(--border)',
    }}>
      ⚠️ Demo Exchange — No real funds. For educational purposes only.
    </div>
  );
}
