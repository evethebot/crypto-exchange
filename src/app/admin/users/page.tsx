'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface User {
  id: string;
  email: string;
  role: string;
  status: string;
  createdAt: string;
}

export default function AdminUsersPage() {
  const router = useRouter();
  const [users, setUsers] = useState<User[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;

  const fetchUsers = async (query?: string) => {
    if (!token) return;
    setLoading(true);
    try {
      const url = query ? `/api/v1/admin/users?search=${encodeURIComponent(query)}` : '/api/v1/admin/users';
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.status === 403) {
        router.push('/');
        return;
      }
      const data = await res.json();
      if (data.success) {
        setUsers(data.data || []);
      }
    } catch {
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchUsers(search);
  };

  const handleToggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleSelectAll = () => {
    if (selectedIds.size === users.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(users.map(u => u.id)));
    }
  };

  return (
    <div>
      <h1 style={{ color: 'var(--text-primary)', marginBottom: '24px', fontSize: '24px' }}>
        User Management
      </h1>

      {/* Search */}
      <form onSubmit={handleSearch} style={{ marginBottom: '20px', display: 'flex', gap: '8px' }}>
        <input
          type="text"
          placeholder="Search by email..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{
            flex: 1,
            maxWidth: '400px',
            padding: '10px 14px',
            background: 'var(--bg-secondary)',
            border: '1px solid var(--border)',
            borderRadius: '6px',
            color: 'var(--text-primary)',
            fontSize: '14px',
          }}
        />
        <button type="submit" aria-label="Find users" style={{
          padding: '10px 20px',
          background: 'var(--yellow)',
          color: '#0B0E11',
          border: 'none',
          borderRadius: '6px',
          fontSize: '14px',
          fontWeight: 600,
          cursor: 'pointer',
        }}>
          🔍 Go
        </button>
      </form>

      {/* User Table */}
      <div style={{
        background: 'var(--bg-secondary)',
        borderRadius: '8px',
        border: '1px solid var(--border)',
        overflow: 'hidden',
      }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border)' }}>
              <th style={{ textAlign: 'left', padding: '12px 16px', color: 'var(--text-tertiary)', fontWeight: 500 }}>
                <input
                  type="checkbox"
                  checked={selectedIds.size === users.length && users.length > 0}
                  onChange={handleSelectAll}
                />
              </th>
              <th style={{ textAlign: 'left', padding: '12px 16px', color: 'var(--text-tertiary)', fontWeight: 500 }}>Email</th>
              <th style={{ textAlign: 'left', padding: '12px 16px', color: 'var(--text-tertiary)', fontWeight: 500 }}>Role</th>
              <th style={{ textAlign: 'left', padding: '12px 16px', color: 'var(--text-tertiary)', fontWeight: 500 }}>Status</th>
              <th style={{ textAlign: 'left', padding: '12px 16px', color: 'var(--text-tertiary)', fontWeight: 500 }}>Created</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr
                key={user.id}
                onClick={() => setSelectedUser(user)}
                style={{
                  borderBottom: '1px solid var(--border)',
                  cursor: 'pointer',
                  background: selectedUser?.id === user.id ? 'var(--bg-tertiary)' : 'transparent',
                }}
              >
                <td style={{ padding: '12px 16px' }}>
                  <input
                    type="checkbox"
                    checked={selectedIds.has(user.id)}
                    onChange={() => handleToggleSelect(user.id)}
                    onClick={(e) => e.stopPropagation()}
                  />
                </td>
                <td style={{ padding: '12px 16px', color: 'var(--text-primary)' }}>{user.email}</td>
                <td style={{ padding: '12px 16px', color: 'var(--text-secondary)' }}>{user.role}</td>
                <td style={{ padding: '12px 16px' }}>
                  <span style={{
                    padding: '2px 8px',
                    borderRadius: '4px',
                    fontSize: '12px',
                    fontWeight: 600,
                    background: user.status === 'active' ? 'rgba(14,203,129,0.1)' : 'rgba(246,70,93,0.1)',
                    color: user.status === 'active' ? 'var(--green)' : 'var(--red)',
                  }}>
                    {user.status}
                  </span>
                </td>
                <td style={{ padding: '12px 16px', color: 'var(--text-tertiary)' }}>
                  {new Date(user.createdAt).toLocaleDateString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* User Detail Panel */}
      {selectedUser && (
        <div style={{
          background: 'var(--bg-secondary)',
          borderRadius: '8px',
          padding: '20px',
          marginTop: '16px',
          border: '1px solid var(--border)',
        }}>
          <h3 style={{ color: 'var(--text-primary)', marginBottom: '12px', fontSize: '16px' }}>
            User Profile
          </h3>
          <div style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>
            <p><strong>Email:</strong> {selectedUser.email}</p>
            <p><strong>Role:</strong> {selectedUser.role}</p>
            <p><strong>Status:</strong> {selectedUser.status}</p>
            <p><strong>Balance:</strong> Loading...</p>
          </div>
        </div>
      )}
    </div>
  );
}
