'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function DepositPage() {
  const router = useRouter();
  const [currency, setCurrency] = useState('USDT');
  const [amount, setAmount] = useState('');
  const [status, setStatus] = useState<'idle' | 'confirming' | 'completed'>('idle');
  const [confirmations, setConfirmations] = useState(0);
  const [error, setError] = useState('');
  const [token, setToken] = useState('');

  useEffect(() => {
    const t = localStorage.getItem('accessToken');
    if (!t) {
      router.push('/login');
      return;
    }
    setToken(t);
  }, [router]);

  const handleDeposit = async () => {
    setError('');
    if (!amount || Number(amount) <= 0) {
      setError('Please enter a valid amount');
      return;
    }

    setStatus('confirming');
    setConfirmations(1);

    // Simulate confirmation progress
    await new Promise(r => setTimeout(r, 800));
    setConfirmations(2);
    await new Promise(r => setTimeout(r, 800));
    setConfirmations(3);
    await new Promise(r => setTimeout(r, 400));

    try {
      const res = await fetch('/api/v1/wallet/deposit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ currency, amount }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Deposit failed');
        setStatus('idle');
        return;
      }

      setStatus('completed');
    } catch (err) {
      setError('Deposit failed');
      setStatus('idle');
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--bg-primary)',
      padding: '40px 20px',
    }}>
      <div style={{
        maxWidth: '500px',
        margin: '0 auto',
        background: 'var(--bg-secondary)',
        borderRadius: '12px',
        padding: '32px',
        border: '1px solid var(--border)',
      }}>
        <h1 style={{ color: 'var(--text-primary)', marginBottom: '24px', fontSize: '24px' }}>
          Deposit
        </h1>

        <div style={{ marginBottom: '16px' }}>
          <label style={{ display: 'block', color: 'var(--text-secondary)', marginBottom: '6px', fontSize: '14px' }}>
            Currency
          </label>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {['USDT', 'BTC', 'ETH', 'DOGE', 'XRP'].map(c => (
              <button
                key={c}
                type="button"
                onClick={() => setCurrency(c)}
                style={{
                  padding: '8px 16px',
                  background: currency === c ? 'var(--yellow)' : 'var(--bg-primary)',
                  color: currency === c ? '#0B0E11' : 'var(--text-primary)',
                  border: `1px solid ${currency === c ? 'var(--yellow)' : 'var(--border)'}`,
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: currency === c ? '600' : '400',
                }}
              >
                {c}
              </button>
            ))}
          </div>
        </div>

        <div style={{ marginBottom: '20px' }}>
          <label style={{ display: 'block', color: 'var(--text-secondary)', marginBottom: '6px', fontSize: '14px' }}>
            Amount
          </label>
          <input
            type="number"
            placeholder="Amount"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            disabled={status !== 'idle'}
            style={{
              width: '100%',
              padding: '12px 16px',
              background: 'var(--bg-primary)',
              border: '1px solid var(--border)',
              borderRadius: '6px',
              color: 'var(--text-primary)',
              fontSize: '14px',
            }}
          />
        </div>

        {error && (
          <p style={{ color: 'var(--red)', fontSize: '13px', marginBottom: '12px' }}>{error}</p>
        )}

        {status === 'confirming' && (
          <div style={{ marginBottom: '16px', textAlign: 'center' }}>
            <div style={{ color: 'var(--yellow)', fontSize: '16px', marginBottom: '8px' }}>
              Confirming {confirmations}/3
            </div>
            <div style={{ display: 'flex', gap: '4px', justifyContent: 'center' }}>
              {[1, 2, 3].map(i => (
                <div key={i} style={{
                  width: '40px', height: '6px', borderRadius: '3px',
                  background: i <= confirmations ? 'var(--green)' : 'var(--bg-tertiary)',
                  transition: 'background 0.3s',
                }} />
              ))}
            </div>
          </div>
        )}

        {status === 'completed' && (
          <div style={{ marginBottom: '16px', textAlign: 'center' }}>
            <div style={{ color: 'var(--green)', fontSize: '18px', fontWeight: 'bold' }}>
              Completed
            </div>
            <div style={{ color: 'var(--text-secondary)', fontSize: '14px', marginTop: '4px' }}>
              {amount} {currency} deposited successfully
            </div>
          </div>
        )}

        <button
          onClick={status === 'completed' ? () => { setStatus('idle'); setAmount(''); } : handleDeposit}
          disabled={status === 'confirming'}
          style={{
            width: '100%',
            padding: '12px',
            background: status === 'completed' ? 'var(--bg-tertiary)' : 'var(--yellow)',
            color: status === 'completed' ? 'var(--text-primary)' : '#0B0E11',
            border: 'none',
            borderRadius: '6px',
            fontSize: '16px',
            fontWeight: '600',
            cursor: status === 'confirming' ? 'not-allowed' : 'pointer',
            opacity: status === 'confirming' ? 0.7 : 1,
          }}
        >
          {status === 'completed' ? 'Make Another Deposit' : status === 'confirming' ? 'Please wait...' : 'Deposit'}
        </button>
      </div>
    </div>
  );
}
