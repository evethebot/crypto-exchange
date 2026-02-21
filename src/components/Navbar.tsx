'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function Navbar() {
  const pathname = usePathname();
  const [token, setToken] = useState<string | null>(null);
  const [darkMode, setDarkMode] = useState(true);

  useEffect(() => {
    const t = localStorage.getItem('accessToken');
    setToken(t);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    setToken(null);
    window.location.href = '/';
  };

  const toggleTheme = () => {
    setDarkMode(!darkMode);
    // Toggle class on html element
    if (darkMode) {
      document.documentElement.classList.remove('dark');
      document.documentElement.classList.add('light');
    } else {
      document.documentElement.classList.remove('light');
      document.documentElement.classList.add('dark');
    }
  };

  const isActive = (path: string) => {
    if (path === '/markets') return pathname === '/markets';
    if (path === '/trade') return pathname.startsWith('/trade');
    if (path === '/wallet') return pathname.startsWith('/wallet');
    if (path === '/orders') return pathname.startsWith('/orders');
    return false;
  };

  const linkStyle = (path: string): React.CSSProperties => ({
    color: isActive(path) ? 'var(--yellow)' : 'var(--text-secondary)',
    textDecoration: 'none',
    fontSize: '14px',
    fontWeight: 500,
    padding: '8px 12px',
    borderRadius: '6px',
    transition: 'color 0.2s',
  });

  return (
    <nav style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      zIndex: 1000,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 24px',
      height: '56px',
      background: 'var(--bg-secondary)',
      borderBottom: '1px solid var(--border)',
    }}>
      {/* Left: Logo + Nav links */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <Link href="/" aria-label="CryptoExchange Logo" style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          textDecoration: 'none',
          marginRight: '16px',
        }}>
          <span style={{
            fontSize: '20px',
            fontWeight: 700,
            color: 'var(--yellow)',
            letterSpacing: '-0.5px',
          }}>
            CryptoExchange
          </span>
        </Link>

        <Link href="/markets" style={linkStyle('/markets')}>Markets</Link>
        <Link href="/trade/BTC_USDT" style={linkStyle('/trade')}>Trade</Link>
      </div>

      {/* Right: Auth or User menu */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <button
          onClick={toggleTheme}
          aria-label={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
          style={{
            background: 'var(--bg-tertiary)',
            border: '1px solid var(--border)',
            borderRadius: '6px',
            padding: '6px 10px',
            cursor: 'pointer',
            color: 'var(--text-secondary)',
            fontSize: '16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {darkMode ? '☀️' : '🌙'}
        </button>

        {token ? (
          <>
            <Link href="/wallet" style={linkStyle('/wallet')}>Wallet</Link>
            <Link href="/orders" style={linkStyle('/orders')}>Orders</Link>
            <button
              onClick={handleLogout}
              style={{
                background: 'var(--bg-tertiary)',
                border: '1px solid var(--border)',
                borderRadius: '6px',
                padding: '8px 16px',
                cursor: 'pointer',
                color: 'var(--text-secondary)',
                fontSize: '14px',
              }}
            >
              Logout
            </button>
          </>
        ) : (
          <>
            <Link href="/login" style={{
              color: 'var(--text-primary)',
              textDecoration: 'none',
              fontSize: '14px',
              fontWeight: 500,
              padding: '8px 16px',
              borderRadius: '6px',
              border: '1px solid var(--border)',
            }}>
              Log In
            </Link>
            <Link href="/register" style={{
              background: 'var(--yellow)',
              color: '#0B0E11',
              textDecoration: 'none',
              fontSize: '14px',
              fontWeight: 600,
              padding: '8px 16px',
              borderRadius: '6px',
            }}>
              Register
            </Link>
          </>
        )}
      </div>
    </nav>
  );
}
