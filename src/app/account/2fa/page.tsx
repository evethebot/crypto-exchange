'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function TwoFactorSetupPage() {
  const router = useRouter();
  const [token, setToken] = useState<string | null>(null);
  const [secret, setSecret] = useState('');
  const [qrDataUrl, setQrDataUrl] = useState('');
  const [code, setCode] = useState('');
  const [verified, setVerified] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const t = localStorage.getItem('accessToken');
    if (!t) {
      router.push('/login');
      return;
    }
    setToken(t);

    // Generate 2FA secret
    fetch('/api/v1/auth/2fa/setup', {
      method: 'POST',
      headers: { Authorization: `Bearer ${t}` },
    })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setSecret(data.data.secret);
          setQrDataUrl(data.data.qrCode || '');
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [router]);

  const handleVerify = async () => {
    try {
      const res = await fetch('/api/v1/auth/2fa/verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ code }),
      });
      const data = await res.json();
      if (data.success) {
        setVerified(true);
      } else {
        setError(data.error || 'Invalid code');
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
        <h1 style={{ color: 'var(--text-primary)', marginBottom: '8px' }}>2FA Enabled</h1>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '24px' }}>
          Two-factor authentication has been enabled for your account.
        </p>
        <button
          onClick={() => router.push('/account/security')}
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
          Back to Security
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
        Setup Two-Factor Authentication
      </h1>
      <p style={{ color: 'var(--text-secondary)', marginBottom: '32px', fontSize: '14px' }}>
        Scan the QR code with your authenticator app (Google Authenticator, Authy, etc.)
      </p>

      {loading ? (
        <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-secondary)' }}>
          Generating secret...
        </div>
      ) : (
        <div style={{
          background: 'var(--bg-secondary)',
          borderRadius: '8px',
          padding: '24px',
          border: '1px solid var(--border)',
        }}>
          {/* QR Code */}
          {qrDataUrl && (
            <div style={{ textAlign: 'center', marginBottom: '20px' }}>
              <img src={qrDataUrl} alt="QR code for 2FA setup" style={{ width: '200px', height: '200px' }} />
            </div>
          )}

          {/* Secret Key */}
          <div style={{ marginBottom: '20px' }}>
            <p style={{ color: 'var(--text-secondary)', fontSize: '13px', marginBottom: '8px' }}>
              Or enter this secret key manually:
            </p>
            <div style={{
              background: 'var(--bg-primary)',
              padding: '12px',
              borderRadius: '6px',
              fontFamily: 'monospace',
              fontSize: '16px',
              color: 'var(--text-primary)',
              wordBreak: 'break-all',
              textAlign: 'center',
              border: '1px solid var(--border)',
            }}>
              {secret}
            </div>
          </div>

          {/* Verification Code */}
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', color: 'var(--text-secondary)', marginBottom: '6px', fontSize: '13px' }}>
              Enter the 6-digit code from your authenticator
            </label>
            <input
              type="text"
              placeholder="000000"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              maxLength={6}
              style={{
                width: '100%',
                padding: '12px 16px',
                background: 'var(--bg-primary)',
                border: '1px solid var(--border)',
                borderRadius: '6px',
                color: 'var(--text-primary)',
                fontSize: '18px',
                textAlign: 'center',
                letterSpacing: '8px',
                fontFamily: 'monospace',
              }}
            />
          </div>

          {error && <p style={{ color: 'var(--red)', fontSize: '13px', marginBottom: '12px' }}>{error}</p>}

          <button
            onClick={handleVerify}
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
            Enable 2FA
          </button>
        </div>
      )}
    </div>
  );
}
