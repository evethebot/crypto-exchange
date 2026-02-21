'use client';

import { useState, useEffect } from 'react';

export default function AdminAuditLogsPage() {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    if (!token) return;

    fetch('/api/v1/admin/audit-logs', {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(res => res.json())
      .then(data => {
        if (data.success) setLogs(data.data || []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <h1 style={{ color: 'var(--text-primary)', marginBottom: '24px', fontSize: '24px' }}>
        Audit Logs
      </h1>

      <div style={{
        background: 'var(--bg-secondary)',
        borderRadius: '8px',
        padding: '20px',
        border: '1px solid var(--border)',
      }}>
        {loading ? (
          <p style={{ color: 'var(--text-secondary)' }}>Loading...</p>
        ) : logs.length === 0 ? (
          <p style={{ color: 'var(--text-secondary)', textAlign: 'center', padding: '40px 0' }}>
            No audit log entries yet
          </p>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)' }}>
                <th style={{ textAlign: 'left', padding: '12px', color: 'var(--text-tertiary)' }}>Action</th>
                <th style={{ textAlign: 'left', padding: '12px', color: 'var(--text-tertiary)' }}>User</th>
                <th style={{ textAlign: 'left', padding: '12px', color: 'var(--text-tertiary)' }}>Details</th>
                <th style={{ textAlign: 'left', padding: '12px', color: 'var(--text-tertiary)' }}>Time</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log: any, i: number) => (
                <tr key={i} style={{ borderBottom: '1px solid var(--border)' }}>
                  <td style={{ padding: '12px', color: 'var(--text-primary)' }}>{log.action}</td>
                  <td style={{ padding: '12px', color: 'var(--text-secondary)' }}>{log.userId}</td>
                  <td style={{ padding: '12px', color: 'var(--text-secondary)' }}>{log.details}</td>
                  <td style={{ padding: '12px', color: 'var(--text-tertiary)' }}>{log.createdAt}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
