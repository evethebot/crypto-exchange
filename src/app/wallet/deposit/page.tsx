'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';

function CurrencyCombobox({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (v: string) => void;
  options: string[];
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <div
        role="combobox"
        aria-expanded={open}
        aria-label="Select coin"
        tabIndex={0}
        onClick={() => setOpen(!open)}
        style={{
          width: '100%',
          padding: '10px 12px',
          background: 'var(--bg-primary)',
          border: '1px solid var(--border)',
          borderRadius: '6px',
          color: 'var(--text-primary)',
          fontSize: '14px',
          cursor: 'pointer',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          boxSizing: 'border-box',
        }}
      >
        <span>{value}</span>
        <span style={{ color: 'var(--text-tertiary)', fontSize: '12px' }}>▼</span>
      </div>
      {open && (
        <div
          role="listbox"
          style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            right: 0,
            background: 'var(--bg-secondary)',
            border: '1px solid var(--border)',
            borderRadius: '6px',
            marginTop: '4px',
            zIndex: 100,
            overflow: 'hidden',
          }}
        >
          {options.map((opt) => (
            <div
              key={opt}
              role="option"
              aria-selected={opt === value}
              onClick={() => {
                onChange(opt);
                setOpen(false);
              }}
              style={{
                padding: '10px 12px',
                cursor: 'pointer',
                background: opt === value ? 'var(--bg-tertiary)' : 'transparent',
                color: 'var(--text-primary)',
                fontSize: '14px',
              }}
            >
              {opt}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

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
            Coin
          </label>
          <CurrencyCombobox
            value={currency}
            onChange={setCurrency}
            options={['USDT', 'BTC', 'ETH', 'DOGE', 'XRP']}
          />
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
