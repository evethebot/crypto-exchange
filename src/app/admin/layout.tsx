'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const sidebarLinks = [
  { href: '/admin', label: 'Dashboard', icon: '📊' },
  { href: '/admin/users', label: 'Users', icon: '👥' },
  { href: '/admin/pairs', label: 'Trading Pairs', icon: '💱' },
  { href: '/admin/kyc', label: 'KYC Queue', icon: '🔍' },
  { href: '/admin/audit-logs', label: 'Audit Logs', icon: '📋' },
  { href: '/admin/withdrawals', label: 'Withdrawals', icon: '💸' },
  { href: '/admin/orders', label: 'Orders', icon: '📝' },
  { href: '/admin/config', label: 'Settings', icon: '⚙️' },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div style={{ display: 'flex', minHeight: 'calc(100vh - 56px)' }}>
      {/* Sidebar */}
      <aside style={{
        width: '240px',
        background: 'var(--bg-secondary)',
        borderRight: '1px solid var(--border)',
        padding: '16px 0',
        flexShrink: 0,
      }}>
        <div style={{ padding: '0 16px 16px', borderBottom: '1px solid var(--border)', marginBottom: '8px' }}>
          <h2 style={{ color: 'var(--text-primary)', fontSize: '16px', fontWeight: 600, margin: 0 }}>
            Admin Panel
          </h2>
        </div>
        <nav>
          {sidebarLinks.map((link) => {
            const isActive = pathname === link.href || (link.href !== '/admin' && pathname.startsWith(link.href));
            return (
              <Link
                key={link.href}
                href={link.href}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  padding: '10px 20px',
                  color: isActive ? 'var(--yellow)' : 'var(--text-secondary)',
                  textDecoration: 'none',
                  fontSize: '14px',
                  fontWeight: isActive ? 600 : 400,
                  background: isActive ? 'var(--bg-tertiary)' : 'transparent',
                  borderLeft: isActive ? '3px solid var(--yellow)' : '3px solid transparent',
                  transition: 'all 0.15s',
                }}
              >
                {link.icon} {link.label}
              </Link>
            );
          })}
        </nav>
      </aside>

      {/* Main Content */}
      <main style={{ flex: 1, padding: '24px', overflow: 'auto' }}>
        {children}
      </main>
    </div>
  );
}
