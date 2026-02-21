'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface TradingPair {
  id: string;
  symbol: string;
  baseCurrency: string;
  quoteCurrency: string;
  status: string;
  makerFeeBps: number;
  takerFeeBps: number;
  minAmount: string;
  pricePrecision: number;
}

export default function AdminPairsPage() {
  const router = useRouter();
  const [pairs, setPairs] = useState<TradingPair[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingPair, setEditingPair] = useState<TradingPair | null>(null);
  const [formData, setFormData] = useState({
    symbol: '',
    baseCurrency: '',
    quoteCurrency: '',
    makerFeeBps: '10',
    takerFeeBps: '10',
    pricePrecision: '2',
  });

  const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;

  const fetchPairs = async () => {
    if (!token) return;
    try {
      const res = await fetch('/api/v1/admin/pairs', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) {
        setPairs(data.data || []);
      }
    } catch {
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPairs();
  }, []);

  const handleAddPair = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    try {
      await fetch('/api/v1/admin/pairs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          symbol: formData.symbol,
          baseCurrency: formData.baseCurrency,
          quoteCurrency: formData.quoteCurrency,
          makerFeeBps: Number(formData.makerFeeBps),
          takerFeeBps: Number(formData.takerFeeBps),
        }),
      });
      setShowAddForm(false);
      fetchPairs();
    } catch {}
  };

  const handleEditPair = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !editingPair) return;
    try {
      await fetch(`/api/v1/admin/pairs/${editingPair.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          makerFeeBps: Number(formData.makerFeeBps),
          takerFeeBps: Number(formData.takerFeeBps),
        }),
      });
      setEditingPair(null);
      fetchPairs();
    } catch {}
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h1 style={{ color: 'var(--text-primary)', fontSize: '24px', margin: 0 }}>
          Trading Pairs
        </h1>
        <button
          onClick={() => {
            setShowAddForm(true);
            setEditingPair(null);
            setFormData({ symbol: '', baseCurrency: '', quoteCurrency: '', makerFeeBps: '10', takerFeeBps: '10', pricePrecision: '2' });
          }}
          style={{
            padding: '10px 20px',
            background: 'var(--yellow)',
            color: '#0B0E11',
            border: 'none',
            borderRadius: '6px',
            fontSize: '14px',
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          Add New Pair
        </button>
      </div>

      {/* Add/Edit Form */}
      {(showAddForm || editingPair) && (
        <div style={{
          background: 'var(--bg-secondary)',
          borderRadius: '8px',
          padding: '20px',
          marginBottom: '20px',
          border: '1px solid var(--border)',
        }}>
          <h3 style={{ color: 'var(--text-primary)', marginBottom: '16px', fontSize: '16px' }}>
            {editingPair ? 'Edit Pair' : 'Create New Pair'}
          </h3>
          <form onSubmit={editingPair ? handleEditPair : handleAddPair} style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', alignItems: 'flex-end' }}>
            {!editingPair && (
              <>
                <div>
                  <label htmlFor="pairSymbol" style={{ display: 'block', color: 'var(--text-secondary)', marginBottom: '4px', fontSize: '12px' }}>Trading Pair</label>
                  <input
                    id="pairSymbol"
                    placeholder="e.g. SOL_USDT"
                    value={formData.symbol}
                    onChange={(e) => setFormData({ ...formData, symbol: e.target.value })}
                    style={{
                      padding: '8px 12px',
                      background: 'var(--bg-primary)',
                      border: '1px solid var(--border)',
                      borderRadius: '6px',
                      color: 'var(--text-primary)',
                      fontSize: '14px',
                    }}
                  />
                </div>
                <div>
                  <label htmlFor="baseCurrency" style={{ display: 'block', color: 'var(--text-secondary)', marginBottom: '4px', fontSize: '12px' }}>Base Currency</label>
                  <input
                    id="baseCurrency"
                    placeholder="Base (e.g. SOL)"
                    value={formData.baseCurrency}
                    onChange={(e) => setFormData({ ...formData, baseCurrency: e.target.value })}
                    style={{
                      padding: '8px 12px',
                      background: 'var(--bg-primary)',
                      border: '1px solid var(--border)',
                      borderRadius: '6px',
                      color: 'var(--text-primary)',
                      fontSize: '14px',
                    }}
                  />
                </div>
                <div>
                  <label htmlFor="quoteCurrency" style={{ display: 'block', color: 'var(--text-secondary)', marginBottom: '4px', fontSize: '12px' }}>Quote Currency</label>
                  <input
                    id="quoteCurrency"
                    placeholder="Quote (e.g. USDT)"
                    value={formData.quoteCurrency}
                    onChange={(e) => setFormData({ ...formData, quoteCurrency: e.target.value })}
                    style={{
                      padding: '8px 12px',
                      background: 'var(--bg-primary)',
                      border: '1px solid var(--border)',
                      borderRadius: '6px',
                      color: 'var(--text-primary)',
                      fontSize: '14px',
                    }}
                  />
                </div>
              </>
            )}
            <div>
              <label htmlFor="makerFee" style={{ display: 'block', color: 'var(--text-secondary)', marginBottom: '4px', fontSize: '12px' }}>Maker Fee (bps)</label>
              <input
                id="makerFee"
                placeholder="Fee"
                value={formData.makerFeeBps}
                onChange={(e) => setFormData({ ...formData, makerFeeBps: e.target.value })}
                style={{
                  padding: '8px 12px',
                  background: 'var(--bg-primary)',
                  border: '1px solid var(--border)',
                  borderRadius: '6px',
                  color: 'var(--text-primary)',
                  fontSize: '14px',
                  width: '100px',
                }}
              />
            </div>
            <div>
              <label htmlFor="takerFee" style={{ display: 'block', color: 'var(--text-secondary)', marginBottom: '4px', fontSize: '12px' }}>Taker Fee (bps)</label>
              <input
                id="takerFee"
                placeholder="Fee"
                value={formData.takerFeeBps}
                onChange={(e) => setFormData({ ...formData, takerFeeBps: e.target.value })}
                style={{
                  padding: '8px 12px',
                  background: 'var(--bg-primary)',
                  border: '1px solid var(--border)',
                  borderRadius: '6px',
                  color: 'var(--text-primary)',
                  fontSize: '14px',
                  width: '100px',
                }}
              />
            </div>
            {editingPair && (
              <div>
                <label htmlFor="precision" style={{ display: 'block', color: 'var(--text-secondary)', marginBottom: '4px', fontSize: '12px' }}>Precision</label>
                <input
                  id="precision"
                  placeholder="Precision"
                  value={formData.pricePrecision}
                  onChange={(e) => setFormData({ ...formData, pricePrecision: e.target.value })}
                  style={{
                    padding: '8px 12px',
                    background: 'var(--bg-primary)',
                    border: '1px solid var(--border)',
                    borderRadius: '6px',
                    color: 'var(--text-primary)',
                    fontSize: '14px',
                    width: '100px',
                  }}
                />
              </div>
            )}
            <button type="submit" style={{
              padding: '8px 20px',
              background: 'var(--yellow)',
              color: '#0B0E11',
              border: 'none',
              borderRadius: '6px',
              fontSize: '14px',
              fontWeight: 600,
              cursor: 'pointer',
              height: '38px',
            }}>
              {editingPair ? 'Update' : 'Create'}
            </button>
            <button
              type="button"
              onClick={() => { setShowAddForm(false); setEditingPair(null); }}
              style={{
                padding: '8px 20px',
                background: 'var(--bg-tertiary)',
                color: 'var(--text-secondary)',
                border: '1px solid var(--border)',
                borderRadius: '6px',
                fontSize: '14px',
                cursor: 'pointer',
                height: '38px',
              }}
            >
              Cancel
            </button>
          </form>
        </div>
      )}

      {/* Pairs Table */}
      <div style={{
        background: 'var(--bg-secondary)',
        borderRadius: '8px',
        border: '1px solid var(--border)',
        overflow: 'hidden',
      }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border)' }}>
              <th style={{ textAlign: 'left', padding: '12px 16px', color: 'var(--text-tertiary)', fontWeight: 500 }}>Symbol</th>
              <th style={{ textAlign: 'left', padding: '12px 16px', color: 'var(--text-tertiary)', fontWeight: 500 }}>Base / Quote</th>
              <th style={{ textAlign: 'left', padding: '12px 16px', color: 'var(--text-tertiary)', fontWeight: 500 }}>Status</th>
              <th style={{ textAlign: 'right', padding: '12px 16px', color: 'var(--text-tertiary)', fontWeight: 500 }}>Maker Fee</th>
              <th style={{ textAlign: 'right', padding: '12px 16px', color: 'var(--text-tertiary)', fontWeight: 500 }}>Taker Fee</th>
              <th style={{ textAlign: 'center', padding: '12px 16px', color: 'var(--text-tertiary)', fontWeight: 500 }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {pairs.map((pair) => (
              <tr key={pair.id} style={{ borderBottom: '1px solid var(--border)' }}>
                <td style={{ padding: '12px 16px', color: 'var(--text-primary)', fontWeight: 600 }}>
                  {pair.symbol}
                </td>
                <td style={{ padding: '12px 16px', color: 'var(--text-secondary)' }}>
                  {pair.baseCurrency} / {pair.quoteCurrency}
                </td>
                <td style={{ padding: '12px 16px' }}>
                  <span style={{
                    padding: '2px 8px',
                    borderRadius: '4px',
                    fontSize: '12px',
                    fontWeight: 600,
                    background: pair.status === 'active' ? 'rgba(14,203,129,0.1)' : 'rgba(246,70,93,0.1)',
                    color: pair.status === 'active' ? 'var(--green)' : 'var(--red)',
                  }}>
                    {pair.status === 'active' ? 'Active' : pair.status}
                  </span>
                </td>
                <td style={{ padding: '12px 16px', textAlign: 'right', color: 'var(--text-secondary)' }}>
                  {pair.makerFeeBps} bps
                </td>
                <td style={{ padding: '12px 16px', textAlign: 'right', color: 'var(--text-secondary)' }}>
                  {pair.takerFeeBps} bps
                </td>
                <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                  <button
                    onClick={() => {
                      setEditingPair(pair);
                      setShowAddForm(false);
                      setFormData({
                        symbol: pair.symbol,
                        baseCurrency: pair.baseCurrency,
                        quoteCurrency: pair.quoteCurrency,
                        makerFeeBps: String(pair.makerFeeBps),
                        takerFeeBps: String(pair.takerFeeBps),
                        pricePrecision: String(pair.pricePrecision || 2),
                      });
                    }}
                    style={{
                      padding: '4px 12px',
                      background: 'var(--bg-tertiary)',
                      color: 'var(--text-secondary)',
                      border: '1px solid var(--border)',
                      borderRadius: '4px',
                      fontSize: '12px',
                      cursor: 'pointer',
                    }}
                  >
                    Edit
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
