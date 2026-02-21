'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

function getPasswordStrength(password: string): { label: string; score: number } {
  let score = 0;
  if (password.length >= 8) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[a-z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;

  if (score <= 2) return { label: 'Weak', score };
  if (score <= 3) return { label: 'Medium', score };
  return { label: 'Strong', score };
}

export default function RegisterPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [error, setError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [loading, setLoading] = useState(false);

  const strength = getPasswordStrength(password);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setPasswordError('');

    if (!email) {
      setError('Email is required');
      return;
    }

    if (password.length < 8) {
      setPasswordError('Password must be at least 8 characters');
      return;
    }
    if (!/[A-Z]/.test(password)) {
      setPasswordError('Password must contain an uppercase letter');
      return;
    }
    if (!/[a-z]/.test(password)) {
      setPasswordError('Password must contain a lowercase letter');
      return;
    }
    if (!/[0-9]/.test(password)) {
      setPasswordError('Password must contain a number');
      return;
    }

    setLoading(true);

    try {
      const res = await fetch('/api/v1/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Registration failed');
        return;
      }

      // Store tokens
      localStorage.setItem('accessToken', data.data.accessToken);
      localStorage.setItem('refreshToken', data.data.refreshToken);

      // Redirect to trade page
      router.push('/trade/BTC_USDT');
    } catch (err) {
      setError('Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'var(--bg-primary)',
      padding: '20px',
    }}>
      <div style={{
        background: 'var(--bg-secondary)',
        borderRadius: '12px',
        padding: '40px',
        width: '100%',
        maxWidth: '420px',
        border: '1px solid var(--border)',
      }}>
        <h1 style={{ color: 'var(--text-primary)', marginBottom: '8px', fontSize: '24px' }}>
          Create Account
        </h1>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '24px', fontSize: '14px' }}>
          Start trading on CryptoExchange
        </p>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', color: 'var(--text-secondary)', marginBottom: '6px', fontSize: '14px' }}>
              Email
            </label>
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={{
                width: '100%',
                padding: '12px 16px',
                background: 'var(--bg-primary)',
                border: '1px solid var(--border)',
                borderRadius: '6px',
                color: 'var(--text-primary)',
                fontSize: '14px',
                outline: 'none',
              }}
            />
          </div>

          <div style={{ marginBottom: '8px' }}>
            <label style={{ display: 'block', color: 'var(--text-secondary)', marginBottom: '6px', fontSize: '14px' }}>
              Password
            </label>
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={{
                width: '100%',
                padding: '12px 16px',
                background: 'var(--bg-primary)',
                border: '1px solid var(--border)',
                borderRadius: '6px',
                color: 'var(--text-primary)',
                fontSize: '14px',
                outline: 'none',
              }}
            />
          </div>

          {password && (
            <div className="strength" style={{ marginBottom: '16px' }}>
              <div style={{
                display: 'flex',
                gap: '4px',
                marginBottom: '4px',
              }}>
                {[1, 2, 3, 4, 5].map((i) => (
                  <div
                    key={i}
                    style={{
                      flex: 1,
                      height: '4px',
                      borderRadius: '2px',
                      background: i <= strength.score
                        ? strength.score <= 2 ? 'var(--red)' : strength.score <= 3 ? 'var(--yellow)' : 'var(--green)'
                        : 'var(--bg-tertiary)',
                    }}
                  />
                ))}
              </div>
              <span style={{
                fontSize: '12px',
                color: strength.score <= 2 ? 'var(--red)' : strength.score <= 3 ? 'var(--yellow)' : 'var(--green)',
              }}>
                {strength.label}
              </span>
            </div>
          )}

          {passwordError && (
            <p style={{ color: 'var(--red)', fontSize: '13px', marginBottom: '12px' }}>
              {passwordError}
            </p>
          )}

          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={termsAccepted}
                onChange={(e) => setTermsAccepted(e.target.checked)}
              />
              <span style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>
                I agree to the Terms of Service
              </span>
            </label>
          </div>

          {error && (
            <p style={{ color: 'var(--red)', fontSize: '13px', marginBottom: '12px' }}>
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              padding: '12px',
              background: 'var(--yellow)',
              color: '#0B0E11',
              border: 'none',
              borderRadius: '6px',
              fontSize: '16px',
              fontWeight: '600',
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.7 : 1,
            }}
          >
            {loading ? 'Creating Account...' : 'Create Account'}
          </button>
        </form>

        <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginTop: '20px', textAlign: 'center' }}>
          Already have an account?{' '}
          <Link href="/login" style={{ color: 'var(--yellow)' }}>Log In</Link>
        </p>
      </div>
    </div>
  );
}
