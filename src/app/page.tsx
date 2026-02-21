'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface PairTicker {
  symbol: string;
  baseCurrency: string;
  quoteCurrency: string;
  lastPrice?: string;
  change24h?: string;
}

export default function HomePage() {
  const [token, setToken] = useState<string | null>(null);
  const [tickers, setTickers] = useState<PairTicker[]>([]);

  useEffect(() => {
    const t = localStorage.getItem('accessToken');
    setToken(t);
  }, []);

  useEffect(() => {
    const fetchTickers = async () => {
      try {
        const res = await fetch('/api/v1/market/pairs');
        if (res.ok) {
          const data = await res.json();
          setTickers(data.data || []);
        }
      } catch {
        // Use fallback data
        setTickers([
          { symbol: 'BTC_USDT', baseCurrency: 'BTC', quoteCurrency: 'USDT', lastPrice: '45000.00', change24h: '2.5' },
          { symbol: 'ETH_USDT', baseCurrency: 'ETH', quoteCurrency: 'USDT', lastPrice: '2800.00', change24h: '-1.2' },
          { symbol: 'XRP_USDT', baseCurrency: 'XRP', quoteCurrency: 'USDT', lastPrice: '0.62', change24h: '0.8' },
        ]);
      }
    };
    fetchTickers();
    const interval = setInterval(fetchTickers, 5000);
    return () => clearInterval(interval);
  }, []);

  // Ensure we always show some data even if API returns empty
  const displayTickers = tickers.length > 0 ? tickers : [
    { symbol: 'BTC_USDT', baseCurrency: 'BTC', quoteCurrency: 'USDT', lastPrice: '45000.00', change24h: '2.5' },
    { symbol: 'ETH_USDT', baseCurrency: 'ETH', quoteCurrency: 'USDT', lastPrice: '2800.00', change24h: '-1.2' },
    { symbol: 'XRP_USDT', baseCurrency: 'XRP', quoteCurrency: 'USDT', lastPrice: '0.62', change24h: '0.8' },
  ];

  const features = [
    {
      title: 'Lightning Fast Trading',
      description: 'Execute trades in milliseconds with our high-performance matching engine.',
      icon: '⚡',
    },
    {
      title: 'Secure & Reliable',
      description: 'Enterprise-grade security with 2FA, encryption, and cold storage.',
      icon: '🔒',
    },
    {
      title: 'Advanced Charts',
      description: 'Professional charting tools with real-time data and technical indicators.',
      icon: '📊',
    },
    {
      title: 'Low Fees',
      description: 'Competitive trading fees starting at just 0.1% per transaction.',
      icon: '💰',
    },
  ];

  return (
    <main style={{ minHeight: '100vh', background: 'var(--bg-primary)' }}>
      {/* Ticker Marquee */}
      <div style={{
        background: 'var(--bg-secondary)',
        borderBottom: '1px solid var(--border)',
        padding: '8px 0',
        overflow: 'hidden',
      }}>
        <div style={{
          display: 'flex',
          gap: '40px',
          padding: '0 24px',
          fontSize: '13px',
          fontFamily: "'JetBrains Mono', monospace",
        }}>
          {displayTickers.map(t => (
            <Link
              key={t.symbol}
              href={`/trade/${t.symbol}`}
              style={{
                display: 'flex',
                gap: '8px',
                alignItems: 'center',
                textDecoration: 'none',
                whiteSpace: 'nowrap',
              }}
            >
              <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>
                {t.baseCurrency}/{t.quoteCurrency}
              </span>
              <span style={{ color: 'var(--text-primary)' }}>
                {t.lastPrice || '--'}
              </span>
              <span style={{
                color: Number(t.change24h) >= 0 ? 'var(--green)' : 'var(--red)',
                fontSize: '12px',
              }}>
                {t.change24h ? `${Number(t.change24h) >= 0 ? '+' : ''}${t.change24h}%` : '--'}
              </span>
            </Link>
          ))}
        </div>
      </div>

      {/* Hero Section */}
      <section style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        padding: '80px 24px',
        maxWidth: '800px',
        margin: '0 auto',
      }}>
        <h1 style={{
          fontSize: '48px',
          fontWeight: 800,
          lineHeight: 1.2,
          marginBottom: '16px',
          background: 'linear-gradient(135deg, var(--yellow), var(--green))',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
        }}>
          The Future of Crypto Trading
        </h1>
        <p style={{
          fontSize: '18px',
          color: 'var(--text-secondary)',
          marginBottom: '32px',
          maxWidth: '600px',
          lineHeight: 1.6,
        }}>
          Trade Bitcoin, Ethereum, and 100+ cryptocurrencies with low fees, lightning-fast execution, and professional-grade tools.
        </p>
        {token ? (
          <Link href="/trade/BTC_USDT" style={{
            display: 'inline-block',
            background: 'var(--yellow)',
            color: '#0B0E11',
            padding: '14px 32px',
            borderRadius: '8px',
            fontSize: '16px',
            fontWeight: 600,
            textDecoration: 'none',
          }}>
            Trade Now
          </Link>
        ) : (
          <Link href="/register" style={{
            display: 'inline-block',
            background: 'var(--yellow)',
            color: '#0B0E11',
            padding: '14px 32px',
            borderRadius: '8px',
            fontSize: '16px',
            fontWeight: 600,
            textDecoration: 'none',
          }}>
            Get Started
          </Link>
        )}
      </section>

      {/* Feature Cards */}
      <section style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
        gap: '20px',
        padding: '0 24px 80px',
        maxWidth: '1200px',
        margin: '0 auto',
      }}>
        {features.map((feature, i) => (
          <article key={i} className="card" style={{
            background: 'var(--bg-secondary)',
            borderRadius: '12px',
            padding: '24px',
            border: '1px solid var(--border)',
            transition: 'border-color 0.2s',
          }}>
            <div style={{ fontSize: '32px', marginBottom: '12px' }}>{feature.icon}</div>
            <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '8px', color: 'var(--text-primary)' }}>
              {feature.title}
            </h3>
            <p style={{ fontSize: '14px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
              {feature.description}
            </p>
          </article>
        ))}
      </section>

      {/* Stats Section */}
      <section style={{
        background: 'var(--bg-secondary)',
        padding: '48px 24px',
        textAlign: 'center',
        borderTop: '1px solid var(--border)',
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          gap: '64px',
          maxWidth: '800px',
          margin: '0 auto',
          flexWrap: 'wrap',
        }}>
          <div>
            <div style={{ fontSize: '28px', fontWeight: 700, color: 'var(--yellow)', fontFamily: "'JetBrains Mono', monospace" }}>$1B+</div>
            <div style={{ fontSize: '14px', color: 'var(--text-secondary)', marginTop: '4px' }}>24h Trading Volume</div>
          </div>
          <div>
            <div style={{ fontSize: '28px', fontWeight: 700, color: 'var(--yellow)', fontFamily: "'JetBrains Mono', monospace" }}>100+</div>
            <div style={{ fontSize: '14px', color: 'var(--text-secondary)', marginTop: '4px' }}>Trading Pairs</div>
          </div>
          <div>
            <div style={{ fontSize: '28px', fontWeight: 700, color: 'var(--yellow)', fontFamily: "'JetBrains Mono', monospace" }}>0.1%</div>
            <div style={{ fontSize: '14px', color: 'var(--text-secondary)', marginTop: '4px' }}>Trading Fee</div>
          </div>
        </div>
      </section>
    </main>
  );
}
