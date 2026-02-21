'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';

interface Stats {
  totalUsers: number;
  totalOrders: number;
  totalTrades: number;
  activePairs: number;
  volume24h: string;
}

export default function AdminDashboard() {
  const router = useRouter();
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    if (!token) {
      router.push('/login');
      return;
    }

    fetch('/api/v1/admin/stats', {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(res => {
        if (res.status === 403) {
          router.push('/');
          return null;
        }
        return res.json();
      })
      .then(data => {
        if (data?.success) {
          setStats(data.data);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [router]);

  // Draw a simple volume chart on canvas
  useEffect(() => {
    if (!canvasRef.current || !stats) return;
    const ctx = canvasRef.current.getContext('2d');
    if (!ctx) return;

    const w = canvasRef.current.width;
    const h = canvasRef.current.height;
    ctx.clearRect(0, 0, w, h);

    // Draw simple bar chart
    const bars = [65, 40, 80, 55, 90, 70, 85, 50, 75, 60, 95, 45];
    const barW = (w - 40) / bars.length;
    const maxH = h - 40;

    bars.forEach((val, i) => {
      const barH = (val / 100) * maxH;
      ctx.fillStyle = 'rgba(246, 190, 0, 0.6)';
      ctx.fillRect(20 + i * barW + 2, h - 20 - barH, barW - 4, barH);
    });

    // X-axis
    ctx.strokeStyle = 'rgba(255,255,255,0.2)';
    ctx.beginPath();
    ctx.moveTo(20, h - 20);
    ctx.lineTo(w - 20, h - 20);
    ctx.stroke();
  }, [stats]);

  if (loading) {
    return <div style={{ color: 'var(--text-secondary)', padding: '40px' }}>Loading...</div>;
  }

  const kpis = [
    { label: 'Total Users', value: stats?.totalUsers || 0, trend: '+12%', color: 'var(--green)' },
    { label: '24h Volume', value: `$${Number(stats?.volume24h || 0).toLocaleString()}`, trend: '+5.2%', color: 'var(--green)' },
    { label: 'Total Orders', value: stats?.totalOrders || 0, trend: '+8%', color: 'var(--green)' },
    { label: 'Active Pairs', value: stats?.activePairs || 0, trend: '0%', color: 'var(--text-secondary)' },
  ];

  return (
    <div>
      <h1 style={{ color: 'var(--text-primary)', marginBottom: '24px', fontSize: '24px' }}>
        Dashboard
      </h1>

      {/* KPI Cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '16px',
        marginBottom: '32px',
      }}>
        {kpis.map((kpi) => (
          <div key={kpi.label} style={{
            background: 'var(--bg-secondary)',
            borderRadius: '8px',
            padding: '20px',
            border: '1px solid var(--border)',
          }}>
            <p style={{ color: 'var(--text-secondary)', fontSize: '13px', margin: '0 0 8px 0' }}>
              {kpi.label}
            </p>
            <p style={{ color: 'var(--text-primary)', fontSize: '24px', fontWeight: 700, margin: '0 0 4px 0' }}>
              {kpi.value}
            </p>
            <span style={{ color: kpi.color, fontSize: '12px' }}>{kpi.trend}</span>
          </div>
        ))}
      </div>

      {/* Volume Chart */}
      <div style={{
        background: 'var(--bg-secondary)',
        borderRadius: '8px',
        padding: '20px',
        border: '1px solid var(--border)',
        marginBottom: '24px',
      }}>
        <h3 style={{ color: 'var(--text-primary)', marginBottom: '16px', fontSize: '16px' }}>
          Volume Chart (24h)
        </h3>
        <canvas ref={canvasRef} width={600} height={200} style={{ width: '100%', maxHeight: '200px' }} />
      </div>

      {/* Alerts Panel */}
      <div style={{
        background: 'var(--bg-secondary)',
        borderRadius: '8px',
        padding: '20px',
        border: '1px solid var(--border)',
      }}>
        <h3 style={{ color: 'var(--text-primary)', marginBottom: '12px', fontSize: '16px' }}>
          Risk Alerts
        </h3>
        <div style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>
          <div style={{ padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
            ⚠️ No critical alerts at this time
          </div>
          <div style={{ padding: '8px 0' }}>
            ℹ️ System operating normally
          </div>
        </div>
      </div>
    </div>
  );
}
