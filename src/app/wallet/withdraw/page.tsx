'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

const NETWORKS = ['ERC20', 'TRC20', 'BEP20', 'SOL'];
const FEES: Record<string, number> = {
  ERC20: 5,
  TRC20: 1,
  BEP20: 0.5,
  SOL: 0.01,
};

export default function WithdrawPage() {
  const router = useRouter();
  const [token, setToken] = useState<string | null>(null);
  const [currencies, setCurrencies] = useState<string[]>([]);
  const [currency, setCurrency] = useState('USDT');
  const [address, setAddress] = useState('');
  const [amount, setAmount] = useState('');
  const [network, setNetwork] = useState('ERC20');
  const [status, setStatus] = useState<'idle' | 'pending' | 'processing' | 'confirming' | 'completed' | 'error'>('idle');
  const [error, setError] = useState('');
  const [available, setAvailable] = useState('0');

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
        const bals = d.data || [];
        const names = bals.map((b: any) => b.currency);
        if (names.length > 0) setCurrencies(names);
        else setCurrencies(['BTC', 'ETH', 'USDT', 'XRP']);
        const cur = bals.find((b: any) => b.currency === currency);
        if (cur) setAvailable(cur.available);
      })
      .catch(() => {});
  }, [token, currency]);

  const fee = FEES[network] || 1;
  const receiveAmount = Math.max(0, Number(amount) - fee);

  const handleSubmit = async () => {
    if (!token) return;
    setError('');
    setStatus('pending');

    try {
      // Simulate status progression
      await new Promise((r) => setTimeout(r, 500));
      setStatus('processing');

      const res = await fetch('/api/v1/wallet/withdraw', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ currency, amount, address, network }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Withdrawal failed');
        setStatus('error');
        return;
      }

      setStatus('confirming');
      await new Promise((r) => setTimeout(r, 1000));
      setStatus('completed');
    } catch (err) {
      setError('Withdrawal failed');
      setStatus('error');
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'var(--bg-primary)',
        color: 'var(--text-primary)',
        padding: '24px',
        maxWidth: '600px',
        margin: '0 auto',
      }}
    >
      <h1 style={{ fontSize: '24px', fontWeight: '700', marginBottom: '24px' }}>
        Withdraw
      </h1>

      <div
        style={{
          background: 'var(--bg-secondary)',
          borderRadius: '12px',
          padding: '24px',
          border: '1px solid var(--border)',
        }}
      >
        {/* Currency */}
        <div style={{ marginBottom: '16px' }}>
          <label
            style={{
              fontSize: '13px',
              color: 'var(--text-secondary)',
              display: 'block',
              marginBottom: '6px',
            }}
          >
            Currency
          </label>
          <select
            value={currency}
            onChange={(e) => setCurrency(e.target.value)}
            aria-label="currency"
            style={{
              width: '100%',
              padding: '10px 12px',
              background: 'var(--bg-primary)',
              border: '1px solid var(--border)',
              borderRadius: '6px',
              color: 'var(--text-primary)',
              fontSize: '14px',
            }}
          >
            {currencies.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>

        {/* Network */}
        <div style={{ marginBottom: '16px' }}>
          <label
            style={{
              fontSize: '13px',
              color: 'var(--text-secondary)',
              display: 'block',
              marginBottom: '6px',
            }}
          >
            Network
          </label>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {NETWORKS.map((n) => (
              <button
                key={n}
                onClick={() => setNetwork(n)}
                style={{
                  padding: '8px 16px',
                  borderRadius: '6px',
                  border: `1px solid ${network === n ? 'var(--yellow)' : 'var(--border)'}`,
                  background: network === n ? 'rgba(252, 213, 53, 0.1)' : 'var(--bg-primary)',
                  color: network === n ? 'var(--yellow)' : 'var(--text-secondary)',
                  cursor: 'pointer',
                  fontSize: '13px',
                  fontWeight: '500',
                }}
              >
                {n}
              </button>
            ))}
          </div>
        </div>

        {/* Address */}
        <div style={{ marginBottom: '16px' }}>
          <label
            style={{
              fontSize: '13px',
              color: 'var(--text-secondary)',
              display: 'block',
              marginBottom: '6px',
            }}
          >
            Withdrawal Address
          </label>
          <input
            type="text"
            placeholder="Enter withdrawal address"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            style={{
              width: '100%',
              padding: '10px 12px',
              background: 'var(--bg-primary)',
              border: '1px solid var(--border)',
              borderRadius: '6px',
              color: 'var(--text-primary)',
              fontSize: '14px',
              boxSizing: 'border-box',
            }}
          />
        </div>

        {/* Amount */}
        <div style={{ marginBottom: '16px' }}>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              marginBottom: '6px',
            }}
          >
            <label
              style={{
                fontSize: '13px',
                color: 'var(--text-secondary)',
              }}
            >
              Amount
            </label>
            <span
              style={{
                fontSize: '13px',
                color: 'var(--text-tertiary)',
              }}
            >
              Available: {Number(available).toFixed(4)} {currency}
            </span>
          </div>
          <input
            type="text"
            placeholder="Enter amount"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            style={{
              width: '100%',
              padding: '10px 12px',
              background: 'var(--bg-primary)',
              border: '1px solid var(--border)',
              borderRadius: '6px',
              color: 'var(--text-primary)',
              fontSize: '14px',
              fontFamily: "'JetBrains Mono', monospace",
              boxSizing: 'border-box',
            }}
          />
        </div>

        {/* Fee Info */}
        <div
          style={{
            background: 'var(--bg-primary)',
            borderRadius: '8px',
            padding: '12px',
            marginBottom: '16px',
            fontSize: '13px',
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              marginBottom: '6px',
            }}
          >
            <span style={{ color: 'var(--text-secondary)' }}>
              Network Fee
            </span>
            <span
              style={{
                fontFamily: "'JetBrains Mono', monospace",
                color: 'var(--text-primary)',
              }}
            >
              {fee} {currency}
            </span>
          </div>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
            }}
          >
            <span style={{ color: 'var(--text-secondary)' }}>
              You will receive
            </span>
            <span
              style={{
                fontFamily: "'JetBrains Mono', monospace",
                color: 'var(--green)',
                fontWeight: '600',
              }}
            >
              {receiveAmount.toFixed(4)} {currency}
            </span>
          </div>
        </div>

        {error && (
          <div
            style={{
              color: 'var(--red)',
              fontSize: '13px',
              marginBottom: '12px',
              padding: '8px',
              background: 'rgba(246, 70, 93, 0.1)',
              borderRadius: '6px',
            }}
          >
            {error}
          </div>
        )}

        {/* Status progression */}
        {status !== 'idle' && status !== 'error' && (
          <div
            style={{
              marginBottom: '16px',
              padding: '12px',
              background: 'var(--bg-primary)',
              borderRadius: '8px',
            }}
          >
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '8px' }}>
              {['pending', 'processing', 'confirming', 'completed'].map((step, i) => {
                const stepIndex = ['pending', 'processing', 'confirming', 'completed'].indexOf(status);
                const thisIndex = i;
                const isActive = thisIndex <= stepIndex;
                return (
                  <div key={step} style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1 }}>
                    <div
                      style={{
                        width: '24px',
                        height: '24px',
                        borderRadius: '50%',
                        background: isActive ? 'var(--green)' : 'var(--bg-tertiary)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '12px',
                        color: isActive ? '#fff' : 'var(--text-tertiary)',
                        fontWeight: '600',
                        flexShrink: 0,
                      }}
                    >
                      {isActive && thisIndex < stepIndex ? '✓' : i + 1}
                    </div>
                    {i < 3 && (
                      <div
                        style={{
                          flex: 1,
                          height: '2px',
                          background: thisIndex < stepIndex ? 'var(--green)' : 'var(--bg-tertiary)',
                        }}
                      />
                    )}
                  </div>
                );
              })}
            </div>
            <div style={{ fontSize: '13px', color: 'var(--text-secondary)', textAlign: 'center' }}>
              {status === 'pending' && 'Pending...'}
              {status === 'processing' && 'Processing withdrawal...'}
              {status === 'confirming' && 'Confirming on blockchain...'}
              {status === 'completed' && '✅ Withdrawal completed!'}
            </div>
          </div>
        )}

        <button
          onClick={handleSubmit}
          disabled={status !== 'idle' && status !== 'error' && status !== 'completed'}
          style={{
            width: '100%',
            padding: '12px',
            border: 'none',
            borderRadius: '6px',
            background: 'var(--yellow)',
            color: '#0B0E11',
            fontSize: '16px',
            fontWeight: '600',
            cursor: 'pointer',
            opacity: status !== 'idle' && status !== 'error' && status !== 'completed' ? 0.5 : 1,
          }}
        >
          {status === 'completed' ? 'Withdraw Again' : 'Withdraw'}
        </button>
      </div>
    </div>
  );
}
