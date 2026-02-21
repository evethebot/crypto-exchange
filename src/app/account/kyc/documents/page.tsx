'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function KYCDocumentsPage() {
  const router = useRouter();
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    const t = localStorage.getItem('accessToken');
    if (!t) {
      router.push('/login');
      return;
    }
    setToken(t);
  }, [router]);

  if (!token) return null;

  return (
    <div style={{ maxWidth: '600px', margin: '0 auto', padding: '40px 20px' }}>
      <h1 style={{ color: 'var(--text-primary)', marginBottom: '8px', fontSize: '24px' }}>
        Identity Verification
      </h1>
      <p style={{ color: 'var(--text-secondary)', marginBottom: '32px', fontSize: '14px' }}>
        Upload your government-issued ID to verify your identity
      </p>

      <div style={{
        background: 'var(--bg-secondary)',
        borderRadius: '8px',
        padding: '24px',
        border: '1px solid var(--border)',
      }}>
        <div style={{ marginBottom: '20px' }}>
          <label htmlFor="documentType" style={{ display: 'block', color: 'var(--text-secondary)', marginBottom: '6px', fontSize: '13px' }}>
            Document Type
          </label>
          <select
            id="documentType"
            aria-label="Document type"
            style={{
              width: '100%',
              padding: '10px 14px',
              background: 'var(--bg-primary)',
              border: '1px solid var(--border)',
              borderRadius: '6px',
              color: 'var(--text-primary)',
              fontSize: '14px',
            }}
          >
            <option value="passport">Passport</option>
            <option value="id_card">National ID Card</option>
            <option value="drivers_license">Driver&apos;s License</option>
          </select>
        </div>

        <div style={{ marginBottom: '20px' }}>
          <label style={{ display: 'block', color: 'var(--text-secondary)', marginBottom: '6px', fontSize: '13px' }}>
            Front of Document
          </label>
          <input type="file" accept="image/*,.pdf" />
        </div>

        <div style={{ marginBottom: '20px' }}>
          <label style={{ display: 'block', color: 'var(--text-secondary)', marginBottom: '6px', fontSize: '13px' }}>
            Back of Document
          </label>
          <input type="file" accept="image/*,.pdf" />
        </div>

        <button style={{
          width: '100%',
          padding: '12px',
          background: 'var(--yellow)',
          color: '#0B0E11',
          border: 'none',
          borderRadius: '6px',
          fontSize: '14px',
          fontWeight: 600,
          cursor: 'pointer',
        }}>
          Submit for Review
        </button>
      </div>
    </div>
  );
}
