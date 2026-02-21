'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function ProfilePage() {
  const router = useRouter();
  const [token, setToken] = useState<string | null>(null);
  const [email, setEmail] = useState('');
  const [nickname, setNickname] = useState('');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    const t = localStorage.getItem('accessToken');
    if (!t) {
      router.push('/login');
      return;
    }
    setToken(t);

    // Fetch profile
    fetch('/api/v1/auth/profile', {
      headers: { Authorization: `Bearer ${t}` },
    })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setEmail(data.data.email || '');
          setNickname(data.data.nickname || '');
        }
      })
      .catch(() => {});
  }, [router]);

  const handleSave = async () => {
    setSaving(true);
    setMessage('');
    try {
      const res = await fetch('/api/v1/auth/profile', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ nickname }),
      });
      if (res.ok) {
        setMessage('Profile updated successfully');
      }
    } catch {
      setMessage('Failed to update');
    } finally {
      setSaving(false);
    }
  };

  if (!token) return null;

  return (
    <div style={{
      maxWidth: '800px',
      margin: '0 auto',
      padding: '40px 20px',
    }}>
      <h1 style={{ color: 'var(--text-primary)', marginBottom: '32px', fontSize: '24px' }}>
        Profile
      </h1>

      <div style={{
        background: 'var(--bg-secondary)',
        borderRadius: '8px',
        padding: '24px',
        border: '1px solid var(--border)',
      }}>
        <div style={{ marginBottom: '20px' }}>
          <label style={{ display: 'block', color: 'var(--text-secondary)', marginBottom: '6px', fontSize: '13px' }}>
            Email
          </label>
          <div style={{
            padding: '10px 14px',
            background: 'var(--bg-primary)',
            border: '1px solid var(--border)',
            borderRadius: '6px',
            color: 'var(--text-primary)',
            fontSize: '14px',
          }}>
            {email}
          </div>
        </div>

        <div style={{ marginBottom: '20px' }}>
          <label htmlFor="nickname" style={{ display: 'block', color: 'var(--text-secondary)', marginBottom: '6px', fontSize: '13px' }}>
            Nickname
          </label>
          <input
            id="nickname"
            type="text"
            placeholder="Nickname"
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
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

        {message && (
          <p style={{ color: 'var(--green)', fontSize: '13px', marginBottom: '12px' }}>{message}</p>
        )}

        <button
          onClick={handleSave}
          disabled={saving}
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
          {saving ? 'Saving...' : 'Save Changes'}
        </button>
      </div>
    </div>
  );
}
