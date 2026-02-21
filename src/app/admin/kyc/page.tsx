'use client';

import { useState, useEffect } from 'react';

export default function AdminKYCPage() {
  const [queue, setQueue] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    if (!token) return;

    fetch('/api/v1/admin/kyc/queue', {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(res => res.json())
      .then(data => {
        if (data.success) setQueue(data.data || []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <h1 style={{ color: 'var(--text-primary)', marginBottom: '24px', fontSize: '24px' }}>
        KYC Review Queue
      </h1>

      <div style={{
        background: 'var(--bg-secondary)',
        borderRadius: '8px',
        padding: '20px',
        border: '1px solid var(--border)',
      }}>
        {loading ? (
          <p style={{ color: 'var(--text-secondary)' }}>Loading...</p>
        ) : queue.length === 0 ? (
          <p style={{ color: 'var(--text-secondary)', textAlign: 'center', padding: '40px 0' }}>
            No pending KYC reviews
          </p>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)' }}>
                <th style={{ textAlign: 'left', padding: '12px', color: 'var(--text-tertiary)' }}>User</th>
                <th style={{ textAlign: 'left', padding: '12px', color: 'var(--text-tertiary)' }}>Requested Level</th>
                <th style={{ textAlign: 'left', padding: '12px', color: 'var(--text-tertiary)' }}>Status</th>
                <th style={{ textAlign: 'center', padding: '12px', color: 'var(--text-tertiary)' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {queue.map((item: any) => (
                <tr key={item.id} style={{ borderBottom: '1px solid var(--border)' }}>
                  <td style={{ padding: '12px', color: 'var(--text-primary)' }}>{item.email}</td>
                  <td style={{ padding: '12px', color: 'var(--text-secondary)' }}>{item.level}</td>
                  <td style={{ padding: '12px', color: 'var(--text-secondary)' }}>{item.status}</td>
                  <td style={{ padding: '12px', textAlign: 'center' }}>
                    <button style={{
                      padding: '4px 12px',
                      background: 'var(--green)',
                      color: '#fff',
                      border: 'none',
                      borderRadius: '4px',
                      fontSize: '12px',
                      cursor: 'pointer',
                      marginRight: '4px',
                    }}>Approve</button>
                    <button style={{
                      padding: '4px 12px',
                      background: 'var(--red)',
                      color: '#fff',
                      border: 'none',
                      borderRadius: '4px',
                      fontSize: '12px',
                      cursor: 'pointer',
                    }}>Reject</button>
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
