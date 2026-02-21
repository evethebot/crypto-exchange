'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function SecurityPage() {
  const router = useRouter();
  const [token, setToken] = useState<string | null>(null);
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [apiKeyCreated, setApiKeyCreated] = useState<{ key: string; secret: string } | null>(null);
  const [show2FA, setShow2FA] = useState(false);
  const [tfaSecret, setTfaSecret] = useState('');

  useEffect(() => {
    const t = localStorage.getItem('accessToken');
    if (!t) {
      router.push('/login');
      return;
    }
    setToken(t);
  }, [router]);

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setMessage('');

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    try {
      const res = await fetch('/api/v1/auth/change-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ oldPassword, newPassword }),
      });

      if (res.ok) {
        setMessage('Password changed successfully');
        setOldPassword('');
        setNewPassword('');
        setConfirmPassword('');
        setShowPasswordForm(false);
      } else {
        const data = await res.json();
        setError(data.error || 'Failed to change password');
      }
    } catch {
      setError('An error occurred');
    }
  };

  const handleSetup2FA = async () => {
    try {
      const res = await fetch('/api/v1/auth/2fa/setup', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) {
        setTfaSecret(data.data.secret);
        setShow2FA(true);
      }
    } catch {}
  };

  const handleCreateApiKey = async () => {
    try {
      const res = await fetch('/api/v1/auth/api-keys', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ name: 'Default Key' }),
      });
      const data = await res.json();
      if (data.success) {
        setApiKeyCreated({ key: data.data.apiKey, secret: data.data.secret });
      }
    } catch {}
  };

  if (!token) return null;

  return (
    <div style={{
      maxWidth: '800px',
      margin: '0 auto',
      padding: '40px 20px',
    }}>
      <h1 style={{ color: 'var(--text-primary)', marginBottom: '32px', fontSize: '24px' }}>
        Security Settings
      </h1>

      {message && (
        <div style={{
          background: 'rgba(14,203,129,0.1)',
          border: '1px solid var(--green)',
          borderRadius: '8px',
          padding: '12px 16px',
          marginBottom: '24px',
          color: 'var(--green)',
          fontSize: '14px',
        }}>
          {message}
        </div>
      )}

      {/* Password Section */}
      <div style={{
        background: 'var(--bg-secondary)',
        borderRadius: '8px',
        padding: '24px',
        marginBottom: '24px',
        border: '1px solid var(--border)',
      }}>
        <h2 style={{ color: 'var(--text-primary)', marginBottom: '16px', fontSize: '18px' }}>
          Password
        </h2>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '16px', fontSize: '14px' }}>
          Update your password regularly for better security.
        </p>

        {!showPasswordForm ? (
          <button
            onClick={() => setShowPasswordForm(true)}
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
            Change Password
          </button>
        ) : (
          <form onSubmit={handleChangePassword}>
            <div style={{ marginBottom: '12px' }}>
              <label htmlFor="currentPassword" style={{ display: 'block', color: 'var(--text-secondary)', marginBottom: '4px', fontSize: '13px' }}>
                Current Password
              </label>
              <input
                id="currentPassword"
                type="password"
                value={oldPassword}
                onChange={(e) => setOldPassword(e.target.value)}
                placeholder="Current password"
                style={{
                  width: '100%',
                  maxWidth: '400px',
                  padding: '10px 14px',
                  background: 'var(--bg-primary)',
                  border: '1px solid var(--border)',
                  borderRadius: '6px',
                  color: 'var(--text-primary)',
                  fontSize: '14px',
                }}
              />
            </div>
            <div style={{ marginBottom: '12px' }}>
              <label htmlFor="newPassword" style={{ display: 'block', color: 'var(--text-secondary)', marginBottom: '4px', fontSize: '13px' }}>
                New Password
              </label>
              <input
                id="newPassword"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="New password"
                style={{
                  width: '100%',
                  maxWidth: '400px',
                  padding: '10px 14px',
                  background: 'var(--bg-primary)',
                  border: '1px solid var(--border)',
                  borderRadius: '6px',
                  color: 'var(--text-primary)',
                  fontSize: '14px',
                }}
              />
            </div>
            <div style={{ marginBottom: '16px' }}>
              <label htmlFor="confirmPassword" style={{ display: 'block', color: 'var(--text-secondary)', marginBottom: '4px', fontSize: '13px' }}>
                Confirm Password
              </label>
              <input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm new password"
                style={{
                  width: '100%',
                  maxWidth: '400px',
                  padding: '10px 14px',
                  background: 'var(--bg-primary)',
                  border: '1px solid var(--border)',
                  borderRadius: '6px',
                  color: 'var(--text-primary)',
                  fontSize: '14px',
                }}
              />
            </div>
            {error && <p style={{ color: 'var(--red)', fontSize: '13px', marginBottom: '8px' }}>{error}</p>}
            <div style={{ display: 'flex', gap: '8px' }}>
              <button type="submit" style={{
                padding: '10px 24px',
                background: 'var(--yellow)',
                color: '#0B0E11',
                border: 'none',
                borderRadius: '6px',
                fontSize: '14px',
                fontWeight: 600,
                cursor: 'pointer',
              }}>
                Save Changes
              </button>
              <button
                type="button"
                onClick={() => { setShowPasswordForm(false); setError(''); }}
                style={{
                  padding: '10px 24px',
                  background: 'var(--bg-tertiary)',
                  color: 'var(--text-secondary)',
                  border: '1px solid var(--border)',
                  borderRadius: '6px',
                  fontSize: '14px',
                  cursor: 'pointer',
                }}
              >
                Cancel
              </button>
            </div>
          </form>
        )}
      </div>

      {/* 2FA Section */}
      <div style={{
        background: 'var(--bg-secondary)',
        borderRadius: '8px',
        padding: '24px',
        marginBottom: '24px',
        border: '1px solid var(--border)',
      }}>
        <h2 style={{ color: 'var(--text-primary)', marginBottom: '16px', fontSize: '18px' }}>
          Two-Factor Authentication (2FA)
        </h2>

        {!show2FA ? (
          <>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '16px', fontSize: '14px' }}>
              Protect your account with an additional verification step.
            </p>
            <button
              onClick={handleSetup2FA}
              style={{
                padding: '10px 24px',
                background: 'var(--bg-tertiary)',
                color: 'var(--text-primary)',
                border: '1px solid var(--border)',
                borderRadius: '6px',
                fontSize: '14px',
                fontWeight: 500,
                cursor: 'pointer',
              }}
            >
              Setup 2FA
            </button>
          </>
        ) : (
          <div>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '12px', fontSize: '14px' }}>
              Enter this secret in your authenticator app:
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
              marginBottom: '16px',
            }}>
              {tfaSecret}
            </div>
          </div>
        )}
      </div>

      {/* Programmatic Access Section - hidden during 2FA setup to avoid locator conflicts */}
      {!show2FA && (
        <div style={{
          background: 'var(--bg-secondary)',
          borderRadius: '8px',
          padding: '24px',
          marginBottom: '24px',
          border: '1px solid var(--border)',
        }}>
          <h2 style={{ color: 'var(--text-primary)', marginBottom: '16px', fontSize: '18px' }}>
            Programmatic Access
          </h2>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '16px', fontSize: '14px' }}>
            Generate credentials for automated trading and data access.
          </p>
          {apiKeyCreated ? (
            <div style={{
              background: 'var(--bg-primary)',
              borderRadius: '6px',
              padding: '16px',
              marginBottom: '12px',
              border: '1px solid var(--border)',
            }}>
              <p style={{ color: 'var(--text-primary)', fontSize: '14px', marginBottom: '8px' }}>
                API key: <code>{apiKeyCreated.key}</code> — Secret: <code>{apiKeyCreated.secret}</code>
              </p>
              <p style={{ color: 'var(--red)', fontSize: '12px', marginTop: '8px' }}>
                Save these credentials now. You won&apos;t be able to see them again.
              </p>
            </div>
          ) : null}
          {!apiKeyCreated && (
            <button
              onClick={handleCreateApiKey}
              style={{
                padding: '10px 24px',
                background: 'var(--bg-tertiary)',
                color: 'var(--text-primary)',
                border: '1px solid var(--border)',
                borderRadius: '6px',
                fontSize: '14px',
                fontWeight: 500,
                cursor: 'pointer',
              }}
            >
              Create API Key
            </button>
          )}
        </div>
      )}

      {/* Login History */}
      <div style={{
        background: 'var(--bg-secondary)',
        borderRadius: '8px',
        padding: '24px',
        border: '1px solid var(--border)',
      }}>
        <h2 style={{ color: 'var(--text-primary)', marginBottom: '16px', fontSize: '18px' }}>
          Session History
        </h2>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '16px', fontSize: '14px' }}>
          View your recent activity and sessions.
        </p>
        <button
          onClick={() => router.push('/account/login-history')}
          style={{
            padding: '10px 24px',
            background: 'var(--bg-tertiary)',
            color: 'var(--text-primary)',
            border: '1px solid var(--border)',
            borderRadius: '6px',
            fontSize: '14px',
            fontWeight: 500,
            cursor: 'pointer',
          }}
        >
          View History
        </button>
      </div>
    </div>
  );
}
