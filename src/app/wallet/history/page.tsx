'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface Transaction {
  id: string;
  type: string;
  currency: string;
  amount: string;
  status: string;
  createdAt: string;
  address?: string;
  network?: string;
  txHash?: string;
}

export default function TransactionHistoryPage() {
  const router = useRouter();
  const [token, setToken] = useState<string | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [filter, setFilter] = useState<'all' | 'deposit' | 'withdrawal'>('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const t = localStorage.getItem('accessToken');
    if (!t) {
      router.push('/login');
      return;
    }
    setToken(t);
  }, [router]);

  useEffect(() => {
    if (!token) return;
    
    const fetchTransactions = async () => {
      try {
        // Fetch both deposits and withdrawals
        const [depsRes, wdrsRes] = await Promise.all([
          fetch('/api/v1/wallet/deposits', {
            headers: { Authorization: `Bearer ${token}` },
          }),
          fetch('/api/v1/wallet/withdrawals', {
            headers: { Authorization: `Bearer ${token}` },
          }),
        ]);

        const depsData = await depsRes.json();
        const wdrsData = await wdrsRes.json();

        const deps = (depsData.data || []).map((d: any) => ({
          ...d,
          type: 'deposit',
        }));
        const wdrs = (wdrsData.data || []).map((w: any) => ({
          ...w,
          type: 'withdrawal',
        }));

        const all = [...deps, ...wdrs].sort(
          (a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
        setTransactions(all);
      } catch (err) {
        console.error('Failed to fetch transactions');
      }
      setLoading(false);
    };

    fetchTransactions();
  }, [token]);

  const filtered =
    filter === 'all'
      ? transactions
      : transactions.filter((t) => t.type === filter);

  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'var(--bg-primary)',
        color: 'var(--text-primary)',
        padding: '24px',
        maxWidth: '1000px',
        margin: '0 auto',
      }}
    >
      <h1 style={{ fontSize: '24px', fontWeight: '700', marginBottom: '24px' }}>
        Transaction History
      </h1>

      {/* Filter Tabs */}
      <div
        style={{
          display: 'flex',
          gap: '8px',
          marginBottom: '20px',
        }}
      >
        {(['all', 'deposit', 'withdrawal'] as const).map((tab) => (
          <button
            key={tab}
            role="tab"
            onClick={() => setFilter(tab)}
            style={{
              padding: '8px 16px',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              background:
                filter === tab ? 'var(--bg-tertiary)' : 'transparent',
              color:
                filter === tab
                  ? 'var(--text-primary)'
                  : 'var(--text-secondary)',
              fontSize: '14px',
              fontWeight: '500',
              textTransform: 'capitalize',
            }}
          >
            {tab === 'all' ? 'All' : tab === 'deposit' ? 'Deposits' : 'Withdrawals'}
          </button>
        ))}
      </div>

      {/* Transactions Table */}
      <div
        style={{
          background: 'var(--bg-secondary)',
          borderRadius: '12px',
          border: '1px solid var(--border)',
          overflow: 'hidden',
        }}
      >
        {loading && (
          <div
            style={{
              padding: '40px',
              textAlign: 'center',
              color: 'var(--text-tertiary)',
            }}
          >
            Loading...
          </div>
        )}

        {!loading && filtered.length === 0 && (
          <div
            style={{
              padding: '40px',
              textAlign: 'center',
              color: 'var(--text-tertiary)',
            }}
          >
            No transactions found.
          </div>
        )}

        {!loading && filtered.length > 0 && (
          <table
            style={{
              width: '100%',
              borderCollapse: 'collapse',
              fontSize: '14px',
            }}
          >
            <thead>
              <tr
                style={{
                  borderBottom: '1px solid var(--border)',
                  color: 'var(--text-tertiary)',
                  fontSize: '12px',
                }}
              >
                <th style={{ textAlign: 'left', padding: '12px 16px' }}>
                  Type
                </th>
                <th style={{ textAlign: 'left', padding: '12px 16px' }}>
                  Currency
                </th>
                <th style={{ textAlign: 'right', padding: '12px 16px' }}>
                  Amount
                </th>
                <th style={{ textAlign: 'center', padding: '12px 16px' }}>
                  Status
                </th>
                <th style={{ textAlign: 'right', padding: '12px 16px' }}>
                  Date
                </th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((tx) => (
                <tr
                  key={`${tx.type}-${tx.id}`}
                  style={{ borderBottom: '1px solid var(--border)' }}
                >
                  <td style={{ padding: '12px 16px' }}>
                    <span
                      style={{
                        color:
                          tx.type === 'deposit'
                            ? 'var(--green)'
                            : 'var(--red)',
                        fontWeight: '500',
                        textTransform: 'capitalize',
                      }}
                    >
                      {tx.type}
                    </span>
                  </td>
                  <td style={{ padding: '12px 16px', fontWeight: '600' }}>
                    {tx.currency}
                  </td>
                  <td
                    style={{
                      padding: '12px 16px',
                      textAlign: 'right',
                      fontFamily: "'JetBrains Mono', monospace",
                    }}
                  >
                    {tx.type === 'deposit' ? '+' : '-'}
                    {Number(tx.amount).toFixed(4)}
                  </td>
                  <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                    <span
                      style={{
                        padding: '2px 10px',
                        borderRadius: '4px',
                        fontSize: '12px',
                        background:
                          tx.status === 'completed'
                            ? 'rgba(14, 203, 129, 0.1)'
                            : 'rgba(252, 213, 53, 0.1)',
                        color:
                          tx.status === 'completed'
                            ? 'var(--green)'
                            : 'var(--yellow)',
                      }}
                    >
                      {tx.status}
                    </span>
                  </td>
                  <td
                    style={{
                      padding: '12px 16px',
                      textAlign: 'right',
                      color: 'var(--text-secondary)',
                      fontSize: '13px',
                    }}
                  >
                    {new Date(tx.createdAt).toLocaleString()}
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
