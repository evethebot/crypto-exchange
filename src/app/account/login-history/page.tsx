'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface LoginEntry {
  id: string;
  ip: string;
  userAgent: string;
  status: string;
  createdAt: string;
}

export default function LoginHistoryPage() {
  const router = useRouter();
  const [history, setHistory] = useState<LoginEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    if (!token) {
      router.push('/login');
      return;
    }

    fetch('/api/v1/auth/login-history', {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(res => res.json())
      .then(data => {
        if (data.success) setHistory(data.data || []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [router]);

  return (
    <div style={{
      maxWidth: '800px',
      margin: '0 auto',
      padding: '40px 20px',
    }}>
      <h1 style={{ color: 'var(--text-primary)', marginBottom: '32px', fontSize: '24px' }}>
        Login History
      </h1>

      <div style={{
        background: 'var(--bg-secondary)',
        borderRadius: '8px',
        border: '1px solid var(--border)',
        overflow: 'hidden',
      }}>
        {loading ? (
          <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-secondary)' }}>Loading...</div>
        ) : history.length === 0 ? (
          <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-secondary)' }}>
            No login history available
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)' }}>
                <th style={{ textAlign: 'left', padding: '12px 16px', color: 'var(--text-tertiary)', fontWeight: 500 }}>Date</th>
                <th style={{ textAlign: 'left', padding: '12px 16px', color: 'var(--text-tertiary)', fontWeight: 500 }}>IP Address</th>
                <th style={{ textAlign: 'left', padding: '12px 16px', color: 'var(--text-tertiary)', fontWeight: 500 }}>Device</th>
                <th style={{ textAlign: 'left', padding: '12px 16px', color: 'var(--text-tertiary)', fontWeight: 500 }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {history.map((entry) => (
                <tr key={entry.id} style={{ borderBottom: '1px solid var(--border)' }}>
                  <td style={{ padding: '12px 16px', color: 'var(--text-primary)' }}>
                    {new Date(entry.createdAt).toLocaleString()}
                  </td>
                  <td style={{ padding: '12px 16px', color: 'var(--text-secondary)' }}>{entry.ip}</td>
                  <td style={{ padding: '12px 16px', color: 'var(--text-secondary)', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {entry.userAgent}
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <span style={{
                      padding: '2px 8px',
                      borderRadius: '4px',
                      fontSize: '12px',
                      fontWeight: 600,
                      background: entry.status === 'success' ? 'rgba(14,203,129,0.1)' : 'rgba(246,70,93,0.1)',
                      color: entry.status === 'success' ? 'var(--green)' : 'var(--red)',
                    }}>
                      {entry.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
