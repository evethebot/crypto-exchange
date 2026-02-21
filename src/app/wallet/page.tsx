'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface Balance {
  currency: string;
  available: string;
  frozen: string;
}

export default function WalletPage() {
  const router = useRouter();
  const [token, setToken] = useState<string | null>(null);
  const [balances, setBalances] = useState<Balance[]>([]);
  const [hideSmall, setHideSmall] = useState(false);
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
    fetch('/api/v1/wallet/balances', {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((d) => {
        setBalances(d.data || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [token]);

  const totalValue = balances.reduce((sum, b) => {
    const val = Number(b.available) + Number(b.frozen);
    // Rough estimate: BTC ~50000, ETH ~2800, others ~1
    if (b.currency === 'BTC') return sum + val * 50000;
    if (b.currency === 'ETH') return sum + val * 2800;
    return sum + val;
  }, 0);

  const filteredBalances = hideSmall
    ? balances.filter((b) => Number(b.available) + Number(b.frozen) > 0.001)
    : balances;

  const hasBalances = balances.some(
    (b) => Number(b.available) + Number(b.frozen) > 0
  );

  // Simple donut chart using SVG
  const chartData = balances
    .map((b) => ({
      currency: b.currency,
      value:
        b.currency === 'BTC'
          ? (Number(b.available) + Number(b.frozen)) * 50000
          : b.currency === 'ETH'
            ? (Number(b.available) + Number(b.frozen)) * 2800
            : Number(b.available) + Number(b.frozen),
    }))
    .filter((d) => d.value > 0);

  const chartColors = ['#FCD535', '#0ECB81', '#F6465D', '#1E80FF', '#848E9C'];

  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'var(--bg-primary)',
        color: 'var(--text-primary)',
        padding: '24px',
        maxWidth: '1200px',
        margin: '0 auto',
      }}
    >
      <h1 style={{ fontSize: '24px', fontWeight: '700', marginBottom: '24px' }}>
        Wallet Overview
      </h1>

      {/* Total Balance */}
      <div
        style={{
          background: 'var(--bg-secondary)',
          borderRadius: '12px',
          padding: '24px',
          marginBottom: '24px',
          border: '1px solid var(--border)',
          display: 'flex',
          alignItems: 'center',
          gap: '32px',
          flexWrap: 'wrap',
        }}
      >
        <div style={{ flex: 1, minWidth: '200px' }}>
          <div
            style={{
              fontSize: '14px',
              color: 'var(--text-secondary)',
              marginBottom: '8px',
            }}
          >
            Estimated Total Balance
          </div>
          <div
            style={{
              fontSize: '32px',
              fontWeight: '700',
              fontFamily: "'JetBrains Mono', monospace",
              color: 'var(--yellow)',
            }}
          >
            ${totalValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div style={{ marginTop: '16px', display: 'flex', gap: '8px' }}>
            <Link
              href="/wallet/deposit"
              style={{
                display: 'inline-block',
                background: 'var(--yellow)',
                color: '#0B0E11',
                padding: '10px 24px',
                borderRadius: '6px',
                fontWeight: '600',
                fontSize: '14px',
                textDecoration: 'none',
              }}
            >
              Deposit
            </Link>
            <Link
              href="/wallet/withdraw"
              style={{
                display: 'inline-block',
                background: 'var(--bg-tertiary)',
                color: 'var(--text-primary)',
                padding: '10px 24px',
                borderRadius: '6px',
                fontWeight: '600',
                fontSize: '14px',
                textDecoration: 'none',
                border: '1px solid var(--border)',
              }}
            >
              Withdraw
            </Link>
          </div>
        </div>

        {/* Donut Chart */}
        {chartData.length > 0 && (
          <svg width="150" height="150" viewBox="0 0 150 150">
            {(() => {
              const total = chartData.reduce((s, d) => s + d.value, 0);
              let cumAngle = 0;
              return chartData.map((d, i) => {
                const angle = (d.value / total) * 360;
                const startAngle = cumAngle;
                cumAngle += angle;
                const r = 60;
                const cx = 75,
                  cy = 75;
                const startRad = ((startAngle - 90) * Math.PI) / 180;
                const endRad = ((startAngle + angle - 90) * Math.PI) / 180;
                const largeArc = angle > 180 ? 1 : 0;
                const x1 = cx + r * Math.cos(startRad);
                const y1 = cy + r * Math.sin(startRad);
                const x2 = cx + r * Math.cos(endRad);
                const y2 = cy + r * Math.sin(endRad);
                if (chartData.length === 1) {
                  return (
                    <circle
                      key={i}
                      cx={cx}
                      cy={cy}
                      r={r}
                      fill="none"
                      stroke={chartColors[i % chartColors.length]}
                      strokeWidth="20"
                    />
                  );
                }
                return (
                  <path
                    key={i}
                    d={`M ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2}`}
                    fill="none"
                    stroke={chartColors[i % chartColors.length]}
                    strokeWidth="20"
                  />
                );
              });
            })()}
          </svg>
        )}
      </div>

      {/* Hide Small Balances Toggle */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          marginBottom: '16px',
        }}
      >
        <label
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            cursor: 'pointer',
            fontSize: '14px',
            color: 'var(--text-secondary)',
          }}
        >
          <input
            type="checkbox"
            checked={hideSmall}
            onChange={(e) => setHideSmall(e.target.checked)}
            aria-label="Hide small balances"
            style={{ cursor: 'pointer' }}
          />
          Hide small balances
        </label>
      </div>

      {/* No balances state */}
      {!loading && !hasBalances && (
        <div
          style={{
            textAlign: 'center',
            padding: '48px 24px',
            color: 'var(--text-tertiary)',
          }}
        >
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>💰</div>
          <div style={{ fontSize: '16px', marginBottom: '8px' }}>
            No assets yet. Get started by making a deposit.
          </div>
          <Link
            href="/wallet/deposit"
            style={{
              display: 'inline-block',
              marginTop: '12px',
              background: 'var(--yellow)',
              color: '#0B0E11',
              padding: '10px 24px',
              borderRadius: '6px',
              fontWeight: '600',
              fontSize: '14px',
              textDecoration: 'none',
            }}
          >
            Deposit Now
          </Link>
        </div>
      )}

      {/* Asset List */}
      {hasBalances && (
        <div
          style={{
            background: 'var(--bg-secondary)',
            borderRadius: '12px',
            border: '1px solid var(--border)',
            overflow: 'hidden',
          }}
        >
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
                  Asset
                </th>
                <th style={{ textAlign: 'right', padding: '12px 16px' }}>
                  Available
                </th>
                <th style={{ textAlign: 'right', padding: '12px 16px' }}>
                  Frozen
                </th>
                <th style={{ textAlign: 'right', padding: '12px 16px' }}>
                  Total
                </th>
                <th style={{ textAlign: 'center', padding: '12px 16px' }}>
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredBalances.map((b) => (
                <tr
                  key={b.currency}
                  style={{ borderBottom: '1px solid var(--border)' }}
                >
                  <td
                    style={{
                      padding: '12px 16px',
                      fontWeight: '600',
                    }}
                  >
                    {b.currency}
                  </td>
                  <td
                    style={{
                      padding: '12px 16px',
                      textAlign: 'right',
                      fontFamily: "'JetBrains Mono', monospace",
                    }}
                  >
                    {Number(b.available).toFixed(8)}
                  </td>
                  <td
                    style={{
                      padding: '12px 16px',
                      textAlign: 'right',
                      fontFamily: "'JetBrains Mono', monospace",
                      color: 'var(--text-secondary)',
                    }}
                  >
                    {Number(b.frozen).toFixed(8)}
                  </td>
                  <td
                    style={{
                      padding: '12px 16px',
                      textAlign: 'right',
                      fontFamily: "'JetBrains Mono', monospace",
                    }}
                  >
                    {(Number(b.available) + Number(b.frozen)).toFixed(8)}
                  </td>
                  <td
                    style={{
                      padding: '12px 16px',
                      textAlign: 'center',
                    }}
                  >
                    <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                      <Link
                        href="/wallet/deposit"
                        style={{
                          color: 'var(--yellow)',
                          textDecoration: 'none',
                          fontSize: '13px',
                          fontWeight: '500',
                        }}
                      >
                        Deposit
                      </Link>
                      <Link
                        href="/wallet/withdraw"
                        style={{
                          color: 'var(--text-secondary)',
                          textDecoration: 'none',
                          fontSize: '13px',
                          fontWeight: '500',
                        }}
                      >
                        Withdraw
                      </Link>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
