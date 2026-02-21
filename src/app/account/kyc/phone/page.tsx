'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function KYCPhonePage() {
  const router = useRouter();
  const [token, setToken] = useState<string | null>(null);
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [codeSent, setCodeSent] = useState(false);
  const [verified, setVerified] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const t = localStorage.getItem('accessToken');
    if (!t) {
      router.push('/login');
      return;
    }
    setToken(t);
  }, [router]);

  const handleSendCode = async () => {
    if (!phone) return;
    setCodeSent(true);
  };

  const handleVerify = async () => {
    if (!code) return;
    setError('');

    try {
      const res = await fetch('/api/v1/auth/kyc/verify-phone', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ phone, code }),
      });
      const data = await res.json();
      if (data.success) {
        setVerified(true);
      } else {
        setError(data.error || 'Verification failed');
      }
    } catch {
      setError('Verification failed');
    }
  };

  if (!token) return null;

  if (verified) {
    return (
      <div style={{
        maxWidth: '600px',
        margin: '0 auto',
        padding: '40px 20px',
        textAlign: 'center',
      }}>
        <div style={{ fontSize: '48px', marginBottom: '16px' }}>✅</div>
        <h1 style={{ color: 'var(--text-primary)', marginBottom: '8px' }}>Level 1 Verified</h1>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '24px' }}>
          Your phone has been verified successfully. You are now approved for Level 1.
        </p>
        <button
          onClick={() => router.push('/account/kyc')}
          style={{
            padding: '10px 24px',
            background: 'var(--yellow)',
            color: '#0B0E11',
            border: 'none',
            borderRadius: '6px',
            fontSize: '14px',
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          Back to KYC
        </button>
      </div>
    );
  }

  return (
    <div style={{
      maxWidth: '600px',
      margin: '0 auto',
      padding: '40px 20px',
    }}>
      <h1 style={{ color: 'var(--text-primary)', marginBottom: '8px', fontSize: '24px' }}>
        Phone Verification
      </h1>
      <p style={{ color: 'var(--text-secondary)', marginBottom: '32px', fontSize: '14px' }}>
        Verify your phone number to upgrade to KYC Level 1
      </p>

      <div style={{
        background: 'var(--bg-secondary)',
        borderRadius: '8px',
        padding: '24px',
        border: '1px solid var(--border)',
      }}>
        <div style={{ marginBottom: '16px' }}>
          <label style={{ display: 'block', color: 'var(--text-secondary)', marginBottom: '6px', fontSize: '13px' }}>
            Phone Number
          </label>
          <div style={{ display: 'flex', gap: '8px' }}>
            <input
              type="tel"
              placeholder="Phone number"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              style={{
                flex: 1,
                padding: '10px 14px',
                background: 'var(--bg-primary)',
                border: '1px solid var(--border)',
                borderRadius: '6px',
                color: 'var(--text-primary)',
                fontSize: '14px',
              }}
            />
            <button
              onClick={handleSendCode}
              disabled={!phone}
              style={{
                padding: '10px 16px',
                background: codeSent ? 'var(--bg-tertiary)' : 'var(--yellow)',
                color: codeSent ? 'var(--text-secondary)' : '#0B0E11',
                border: 'none',
                borderRadius: '6px',
                fontSize: '13px',
                cursor: 'pointer',
              }}
            >
              {codeSent ? 'Resend' : 'Send Code'}
            </button>
          </div>
        </div>

        <div style={{ marginBottom: '20px' }}>
          <label style={{ display: 'block', color: 'var(--text-secondary)', marginBottom: '6px', fontSize: '13px' }}>
            Verification Code
          </label>
          <input
            type="text"
            placeholder="Verification code"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            style={{
              width: '100%',
              padding: '10px 14px',
              background: 'var(--bg-primary)',
              border: '1px solid var(--border)',
              borderRadius: '6px',
              color: 'var(--text-primary)',
              fontSize: '14px',
            }}
          />
        </div>

        {error && <p style={{ color: 'var(--red)', fontSize: '13px', marginBottom: '12px' }}>{error}</p>}

        <button
          onClick={handleVerify}
          disabled={!code}
          style={{
            width: '100%',
            padding: '12px',
            background: 'var(--yellow)',
            color: '#0B0E11',
            border: 'none',
            borderRadius: '6px',
            fontSize: '14px',
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          Verify
        </button>
      </div>
    </div>
  );
}
