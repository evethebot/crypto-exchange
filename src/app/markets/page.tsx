'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface TradingPair {
  symbol: string;
  baseCurrency: string;
  quoteCurrency: string;
  lastPrice?: string;
  change24h?: string;
  high24h?: string;
  low24h?: string;
  volume24h?: string;
}

export default function MarketsPage() {
  const [pairs, setPairs] = useState<TradingPair[]>([]);
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState<string>('symbol');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPairs = async () => {
      try {
        const res = await fetch('/api/v1/market/pairs');
        if (res.ok) {
          const data = await res.json();
          setPairs(data.data || []);
        }
      } catch (err) {
        console.error('Failed to fetch pairs');
      } finally {
        setLoading(false);
      }
    };
    fetchPairs();
  }, []);

  const filtered = pairs.filter(p =>
    p.symbol.toLowerCase().includes(search.toLowerCase()) ||
    p.baseCurrency.toLowerCase().includes(search.toLowerCase())
  );

  const sorted = [...filtered].sort((a, b) => {
    const aVal = (a as any)[sortBy] || '';
    const bVal = (b as any)[sortBy] || '';
    const cmp = String(aVal).localeCompare(String(bVal), undefined, { numeric: true });
    return sortDir === 'asc' ? cmp : -cmp;
  });

  const handleSort = (field: string) => {
    if (sortBy === field) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortDir('asc');
    }
  };

  return (
    <div style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto' }}>
      <h1 style={{ fontSize: '24px', fontWeight: 700, marginBottom: '16px' }}>Markets</h1>

      <input
        type="text"
        placeholder="Search pairs..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        style={{
          padding: '10px 16px',
          background: 'var(--bg-secondary)',
          border: '1px solid var(--border)',
          borderRadius: '6px',
          color: 'var(--text-primary)',
          fontSize: '14px',
          width: '300px',
          marginBottom: '20px',
          outline: 'none',
        }}
      />

      {loading ? (
        <div style={{ color: 'var(--text-tertiary)', padding: '40px 0', textAlign: 'center' }}>Loading...</div>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
          <thead>
            <tr style={{ color: 'var(--text-tertiary)', borderBottom: '1px solid var(--border)' }}>
              <th onClick={() => handleSort('symbol')} style={{ textAlign: 'left', padding: '10px', cursor: 'pointer' }}>Pair</th>
              <th onClick={() => handleSort('lastPrice')} style={{ textAlign: 'right', padding: '10px', cursor: 'pointer' }}>Last Price</th>
              <th onClick={() => handleSort('change24h')} style={{ textAlign: 'right', padding: '10px', cursor: 'pointer' }}>24h Change</th>
              <th onClick={() => handleSort('volume24h')} style={{ textAlign: 'right', padding: '10px', cursor: 'pointer' }}>24h Volume</th>
              <th style={{ textAlign: 'center', padding: '10px' }}>Action</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map(pair => (
              <tr key={pair.symbol} style={{ borderBottom: '1px solid var(--border)' }}>
                <td style={{ padding: '12px 10px', fontWeight: 600 }}>
                  {pair.baseCurrency}/{pair.quoteCurrency}
                </td>
                <td style={{ padding: '12px 10px', textAlign: 'right', fontFamily: "'JetBrains Mono', monospace" }}>
                  {pair.lastPrice || '--'}
                </td>
                <td style={{
                  padding: '12px 10px',
                  textAlign: 'right',
                  color: Number(pair.change24h) >= 0 ? 'var(--green)' : 'var(--red)',
                  fontFamily: "'JetBrains Mono', monospace",
                }}>
                  {pair.change24h ? `${pair.change24h}%` : '--'}
                </td>
                <td style={{ padding: '12px 10px', textAlign: 'right', fontFamily: "'JetBrains Mono', monospace" }}>
                  {pair.volume24h || '--'}
                </td>
                <td style={{ padding: '12px 10px', textAlign: 'center' }}>
                  <Link href={`/trade/${pair.symbol}`} aria-label={`Open ${pair.baseCurrency}/${pair.quoteCurrency}`} style={{
                    color: 'var(--yellow)',
                    textDecoration: 'none',
                    fontSize: '13px',
                    fontWeight: 500,
                  }}>
                    Details →
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
