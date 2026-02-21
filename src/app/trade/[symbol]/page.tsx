'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';

interface OrderBookLevel {
  price: string;
  quantity: string;
}

interface Order {
  id: string;
  symbol: string;
  side: string;
  type: string;
  price: string | null;
  amount: string;
  filled: string;
  remaining: string;
  status: string;
  createdAt: string;
}

interface Trade {
  id: string;
  price: string;
  amount: string;
  createdAt: string;
  buyerUserId: string;
  sellerUserId: string;
}

export default function TradePage() {
  const params = useParams();
  const router = useRouter();
  const symbol = (params.symbol as string) || 'BTC_USDT';
  const [baseCurrency, quoteCurrency] = symbol.split('_');

  const [token, setToken] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'limit' | 'market'>('limit');
  const [side, setSide] = useState<'buy' | 'sell'>('buy');
  const [price, setPrice] = useState('');
  const [amount, setAmount] = useState('');
  const [bids, setBids] = useState<string[][]>([]);
  const [asks, setAsks] = useState<string[][]>([]);
  const [openOrders, setOpenOrders] = useState<Order[]>([]);
  const [orderHistory, setOrderHistory] = useState<Order[]>([]);
  const [recentTrades, setRecentTrades] = useState<Trade[]>([]);
  const [balances, setBalances] = useState<Record<string, string>>({});
  const [error, setError] = useState('');
  const [orderTabActive, setOrderTabActive] = useState<'open' | 'history'>('open');
  const [loading, setLoading] = useState(true);
  const [ticker, setTicker] = useState({ lastPrice: '--', change24h: '0', high24h: '--', low24h: '--', volume24h: '0' });
  const [pairInfo, setPairInfo] = useState<any>(null);

  useEffect(() => {
    const t = localStorage.getItem('accessToken');
    setToken(t);
  }, []);

  const fetchData = useCallback(async () => {
    try {
      // Fetch depth
      const depthRes = await fetch(`/api/v1/market/depth/${symbol}?limit=15`);
      if (depthRes.ok) {
        const depthData = await depthRes.json();
        setBids(depthData.data?.bids || []);
        setAsks(depthData.data?.asks || []);
      }

      // Fetch pair info
      const pairRes = await fetch(`/api/v1/market/pairs/${symbol}`);
      if (pairRes.ok) {
        const pairData = await pairRes.json();
        setPairInfo(pairData.data);
      }

      // Fetch recent trades
      const tradesRes = await fetch(`/api/v1/market/trades/${symbol}`);
      if (tradesRes.ok) {
        const tradesData = await tradesRes.json();
        setRecentTrades(tradesData.data || []);
      }

      if (token) {
        // Fetch balances
        const balRes = await fetch('/api/v1/wallet/balances', {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (balRes.ok) {
          const balData = await balRes.json();
          const bals: Record<string, string> = {};
          for (const b of balData.data || []) {
            bals[b.currency] = b.available;
          }
          setBalances(bals);
        }

        // Fetch open orders
        const openRes = await fetch(`/api/v1/orders?symbol=${symbol}&status=new`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (openRes.ok) {
          const openData = await openRes.json();
          setOpenOrders((openData.data || []).filter((o: Order) => o.status === 'new' || o.status === 'partially_filled'));
        }

        // Fetch order history
        const histRes = await fetch(`/api/v1/orders?symbol=${symbol}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (histRes.ok) {
          const histData = await histRes.json();
          setOrderHistory((histData.data || []).filter((o: Order) => o.status === 'filled' || o.status === 'cancelled'));
        }
      }

      setLoading(false);
    } catch (err) {
      setLoading(false);
    }
  }, [symbol, token]);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 3000);
    return () => clearInterval(interval);
  }, [fetchData]);

  const handleSubmit = async () => {
    setError('');
    if (!token) {
      router.push('/login');
      return;
    }

    const orderData: any = { symbol, side, type: activeTab, amount };
    if (activeTab === 'limit') {
      orderData.price = price;
    }

    try {
      const res = await fetch('/api/v1/orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(orderData),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Order failed');
        return;
      }

      setPrice('');
      setAmount('');
      fetchData();
    } catch (err) {
      setError('Order placement failed');
    }
  };

  const handleCancel = async (orderId: string) => {
    if (!token) return;
    try {
      await fetch(`/api/v1/orders/${orderId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      fetchData();
    } catch (err) {
      console.error('Cancel failed');
    }
  };

  const total = price && amount ? (Number(price) * Number(amount)).toFixed(2) : '0.00';
  const availableBalance = side === 'buy' ? balances[quoteCurrency] || '0' : balances[baseCurrency] || '0';

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-primary)', color: 'var(--text-primary)' }}>
      {/* Demo Banner */}
      <div style={{
        background: '#2a1a00',
        padding: '6px 16px',
        textAlign: 'center',
        fontSize: '13px',
        color: 'var(--yellow)',
        borderBottom: '1px solid var(--border)',
      }}>
        Demo Exchange — No real funds
      </div>

      {/* Trading pair header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '24px',
        padding: '12px 16px',
        borderBottom: '1px solid var(--border)',
        background: 'var(--bg-secondary)',
      }}>
        <div style={{ cursor: 'pointer' }}>
          <span style={{ fontSize: '18px', fontWeight: 'bold' }}>
            {baseCurrency}/{quoteCurrency}
          </span>
        </div>
        <div className="mono" style={{ fontFamily: "'JetBrains Mono', 'Fira Code', monospace", fontVariantNumeric: 'tabular-nums' }}>
          <span style={{ fontSize: '20px', fontWeight: 'bold', color: 'var(--green)' }}>
            {ticker.lastPrice}
          </span>
        </div>
        <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
          <span>24h Change: </span>
          <span style={{ color: Number(ticker.change24h) >= 0 ? 'var(--green)' : 'var(--red)' }}>
            {ticker.change24h}%
          </span>
        </div>
        <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
          24h High: <span className="mono" style={{ fontFamily: "'JetBrains Mono', monospace" }}>{ticker.high24h}</span>
        </div>
        <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
          24h Low: <span className="mono" style={{ fontFamily: "'JetBrains Mono', monospace" }}>{ticker.low24h}</span>
        </div>
        <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
          Volume: <span className="mono" style={{ fontFamily: "'JetBrains Mono', monospace" }}>{ticker.volume24h}</span>
        </div>
      </div>

      {/* Main layout */}
      <div style={{ display: 'flex', gap: '1px', background: 'var(--border)' }}>
        {/* Chart panel */}
        <div className="panel" style={{ flex: '0 0 55%', background: 'var(--bg-primary)', padding: '16px', minHeight: '400px', borderRight: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
            {['1m', '5m', '15m', '30m', '1H', '4H', '1D', '1W'].map(interval => (
              <button key={interval} role="tab" style={{
                padding: '4px 8px', background: 'var(--bg-tertiary)', border: 'none',
                color: 'var(--text-secondary)', borderRadius: '4px', cursor: 'pointer', fontSize: '12px',
              }}>
                {interval}
              </button>
            ))}
          </div>
          {loading ? (
            <div className="skeleton" style={{ width: '100%', height: '300px', background: 'var(--bg-secondary)', borderRadius: '8px', animation: 'pulse 2s infinite' }} />
          ) : (
            <div style={{ height: '300px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-tertiary)' }}>
              Chart placeholder — TradingView integration
            </div>
          )}
        </div>

        {/* Order book */}
        <div className="panel" style={{ flex: '0 0 20%', background: 'var(--bg-primary)', padding: '12px', borderRight: '1px solid var(--border)' }}>
          <h3 style={{ fontSize: '14px', marginBottom: '8px', color: 'var(--text-secondary)' }}>Order Book</h3>
          
          {/* Asks */}
          <div style={{ fontSize: '12px', fontFamily: "'JetBrains Mono', monospace", fontVariantNumeric: 'tabular-nums' }}>
            {asks.length === 0 && !loading && (
              <div style={{ color: 'var(--text-tertiary)', padding: '8px 0', textAlign: 'center' }}>No orders</div>
            )}
            {[...asks].reverse().slice(0, 10).map((ask, i) => (
              <div key={i} className="number" style={{
                display: 'flex', justifyContent: 'space-between', padding: '2px 0',
                position: 'relative', cursor: 'pointer',
              }}
              onClick={() => setPrice(ask[0])}
              >
                <span style={{ color: 'var(--red)', zIndex: 1 }}>{Number(ask[0]).toFixed(2)}</span>
                <span style={{ color: 'var(--text-secondary)', zIndex: 1 }}>{Number(ask[1]).toFixed(6)}</span>
                <div style={{
                  position: 'absolute', right: 0, top: 0, bottom: 0,
                  background: 'rgba(246, 70, 93, 0.1)',
                  width: `${Math.min(100, Number(ask[1]) * 100)}%`,
                }} />
              </div>
            ))}
          </div>

          {/* Spread */}
          <div style={{ padding: '6px 0', textAlign: 'center', fontSize: '14px', fontWeight: 'bold', fontFamily: "'JetBrains Mono', monospace" }}>
            {asks.length > 0 && bids.length > 0 ? (
              <span style={{ color: 'var(--text-primary)' }}>
                {(Number(asks[0][0]) - Number(bids[0][0])).toFixed(2)}
              </span>
            ) : '--'}
          </div>

          {/* Bids */}
          <div style={{ fontSize: '12px', fontFamily: "'JetBrains Mono', monospace", fontVariantNumeric: 'tabular-nums' }}>
            {bids.slice(0, 10).map((bid, i) => (
              <div key={i} className="number" style={{
                display: 'flex', justifyContent: 'space-between', padding: '2px 0',
                position: 'relative', cursor: 'pointer',
              }}
              onClick={() => setPrice(bid[0])}
              >
                <span style={{ color: 'var(--green)', zIndex: 1 }}>{Number(bid[0]).toFixed(2)}</span>
                <span style={{ color: 'var(--text-secondary)', zIndex: 1 }}>{Number(bid[1]).toFixed(6)}</span>
                <div style={{
                  position: 'absolute', right: 0, top: 0, bottom: 0,
                  background: 'rgba(14, 203, 129, 0.1)',
                  width: `${Math.min(100, Number(bid[1]) * 100)}%`,
                }} />
              </div>
            ))}
          </div>
        </div>

        {/* Order form */}
        <div className="panel" style={{ flex: '0 0 25%', background: 'var(--bg-primary)', padding: '16px' }}>
          {/* Limit/Market tabs */}
          <div style={{ display: 'flex', gap: '0', marginBottom: '16px' }}>
            <button
              role="tab"
              onClick={() => setActiveTab('limit')}
              style={{
                flex: 1, padding: '8px', border: 'none', cursor: 'pointer',
                background: activeTab === 'limit' ? 'var(--bg-tertiary)' : 'transparent',
                color: activeTab === 'limit' ? 'var(--text-primary)' : 'var(--text-secondary)',
                borderBottom: activeTab === 'limit' ? '2px solid var(--yellow)' : '2px solid transparent',
                fontSize: '14px', fontWeight: '600',
              }}
            >
              Limit
            </button>
            <button
              role="tab"
              onClick={() => setActiveTab('market')}
              style={{
                flex: 1, padding: '8px', border: 'none', cursor: 'pointer',
                background: activeTab === 'market' ? 'var(--bg-tertiary)' : 'transparent',
                color: activeTab === 'market' ? 'var(--text-primary)' : 'var(--text-secondary)',
                borderBottom: activeTab === 'market' ? '2px solid var(--yellow)' : '2px solid transparent',
                fontSize: '14px', fontWeight: '600',
              }}
            >
              Market
            </button>
          </div>

          {/* Buy/Sell toggle */}
          <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
            <button
              role="button"
              onClick={() => setSide('buy')}
              style={{
                flex: 1, padding: '10px', border: 'none', borderRadius: '6px', cursor: 'pointer',
                background: side === 'buy' ? 'var(--green)' : 'var(--bg-tertiary)',
                color: side === 'buy' ? '#fff' : 'var(--text-secondary)',
                fontSize: '14px', fontWeight: '600',
              }}
            >
              Buy
            </button>
            <button
              role="button"
              onClick={() => setSide('sell')}
              style={{
                flex: 1, padding: '10px', border: 'none', borderRadius: '6px', cursor: 'pointer',
                background: side === 'sell' ? 'var(--red)' : 'var(--bg-tertiary)',
                color: side === 'sell' ? '#fff' : 'var(--text-secondary)',
                fontSize: '14px', fontWeight: '600',
              }}
            >
              Sell
            </button>
          </div>

          <>
              {/* Available balance */}
              <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '12px' }}>
                Available: <span className="number mono" style={{ fontFamily: "'JetBrains Mono', monospace" }}>{token ? Number(availableBalance).toFixed(4) : '0.0000'}</span> {side === 'buy' ? quoteCurrency : baseCurrency}
              </div>

              {/* Price input (limit only) */}
              {activeTab === 'limit' && (
                <div style={{ marginBottom: '12px' }}>
                  <label style={{ fontSize: '12px', color: 'var(--text-tertiary)', marginBottom: '4px', display: 'block' }}>
                    Price ({quoteCurrency})
                  </label>
                  <div style={{ display: 'flex', alignItems: 'center' }}>
                    <button onClick={() => setPrice(String(Math.max(0, Number(price) - 1)))} aria-label="decrement" style={{
                      padding: '8px 12px', background: 'var(--bg-tertiary)', border: '1px solid var(--border)',
                      color: 'var(--text-primary)', cursor: 'pointer', borderRadius: '6px 0 0 6px',
                    }}>−</button>
                    <input
                      type="text"
                      placeholder="Price"
                      value={price}
                      onChange={(e) => setPrice(e.target.value)}
                      style={{
                        flex: 1, padding: '8px', background: 'var(--bg-primary)',
                        border: '1px solid var(--border)', color: 'var(--text-primary)',
                        fontSize: '14px', textAlign: 'center', fontFamily: "'JetBrains Mono', monospace",
                      }}
                    />
                    <button onClick={() => setPrice(String(Number(price) + 1))} aria-label="increment" style={{
                      padding: '8px 12px', background: 'var(--bg-tertiary)', border: '1px solid var(--border)',
                      color: 'var(--text-primary)', cursor: 'pointer', borderRadius: '0 6px 6px 0',
                    }}>+</button>
                  </div>
                </div>
              )}

              {/* Amount input */}
              <div style={{ marginBottom: '12px' }}>
                <label style={{ fontSize: '12px', color: 'var(--text-tertiary)', marginBottom: '4px', display: 'block' }}>
                  Amount ({baseCurrency})
                </label>
                <input
                  type="text"
                  placeholder="Amount"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  style={{
                    width: '100%', padding: '8px', background: 'var(--bg-primary)',
                    border: '1px solid var(--border)', borderRadius: '6px', color: 'var(--text-primary)',
                    fontSize: '14px', fontFamily: "'JetBrains Mono', monospace",
                  }}
                />
              </div>

              {/* Percentage slider */}
              <div style={{ display: 'flex', gap: '4px', marginBottom: '12px' }}>
                {[25, 50, 75, 100].map(pct => (
                  <button key={pct} onClick={() => {
                    const avail = Number(availableBalance);
                    if (side === 'buy' && price) {
                      setAmount(String((avail * pct / 100 / Number(price)).toFixed(6)));
                    } else {
                      setAmount(String((avail * pct / 100).toFixed(6)));
                    }
                  }} style={{
                    flex: 1, padding: '4px', background: 'var(--bg-tertiary)', border: '1px solid var(--border)',
                    color: 'var(--text-secondary)', borderRadius: '4px', cursor: 'pointer', fontSize: '12px',
                  }}>
                    {pct}%
                  </button>
                ))}
              </div>

              {/* Total */}
              {activeTab === 'limit' && (
                <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '8px' }}>
                  Total: <span className="mono" style={{ fontFamily: "'JetBrains Mono', monospace" }}>{total}</span> {quoteCurrency}
                </div>
              )}

              {/* Fee estimate */}
              <div style={{ fontSize: '12px', color: 'var(--text-tertiary)', marginBottom: '12px' }}>
                Est. Fee: ~{(Number(total) * 0.001).toFixed(4)} {quoteCurrency}
              </div>

              {error && (
                <div role="alert" style={{ color: 'var(--red)', fontSize: '13px', marginBottom: '8px' }}>{error}</div>
              )}

              <button
                onClick={token ? handleSubmit : () => router.push('/login')}
                style={{
                  width: '100%', padding: '12px', border: 'none', borderRadius: '6px',
                  background: !token ? 'var(--yellow)' : side === 'buy' ? 'var(--green)' : 'var(--red)',
                  color: !token ? '#0B0E11' : '#fff', fontSize: '16px', fontWeight: '600', cursor: 'pointer',
                }}
              >
                {!token ? 'Login to Trade' : side === 'buy' ? `Buy ${baseCurrency}` : `Sell ${baseCurrency}`}
              </button>
            </>
        </div>
      </div>

      {/* Recent Trades panel */}
      <div style={{
        display: 'flex',
        gap: '1px',
        background: 'var(--border)',
        borderTop: '1px solid var(--border)',
      }}>
        <div className="section" style={{ flex: 1, background: 'var(--bg-primary)', padding: '12px' }}>
          <h3 style={{ fontSize: '14px', marginBottom: '8px', color: 'var(--text-secondary)' }}>Recent Trades</h3>
          <div style={{ fontSize: '12px', fontFamily: "'JetBrains Mono', monospace", fontVariantNumeric: 'tabular-nums' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-tertiary)', padding: '4px 0', borderBottom: '1px solid var(--border)' }}>
              <span>Price</span><span>Amount</span><span>Time</span>
            </div>
            {recentTrades.length === 0 && (
              <div style={{ color: 'var(--text-tertiary)', padding: '16px 0', textAlign: 'center' }}>No trades yet</div>
            )}
            {recentTrades.slice(0, 20).map((t, i) => (
              <div key={i} className="number" style={{ display: 'flex', justifyContent: 'space-between', padding: '2px 0' }}>
                <span style={{ color: 'var(--green)' }}>{Number(t.price).toFixed(2)}</span>
                <span>{Number(t.amount).toFixed(6)}</span>
                <span style={{ color: 'var(--text-tertiary)' }}>{new Date(t.createdAt).toLocaleTimeString()}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Open Orders / Order History */}
      <div style={{ borderTop: '1px solid var(--border)', background: 'var(--bg-primary)', padding: '12px 16px' }}>
        <div style={{ display: 'flex', gap: '16px', marginBottom: '12px' }}>
          <button
            role="tab"
            onClick={() => setOrderTabActive('open')}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              color: orderTabActive === 'open' ? 'var(--text-primary)' : 'var(--text-secondary)',
              fontSize: '14px', fontWeight: '600',
              borderBottom: orderTabActive === 'open' ? '2px solid var(--yellow)' : '2px solid transparent',
              paddingBottom: '4px',
            }}
          >
            Open Orders ({openOrders.length})
          </button>
          <button
            role="tab"
            onClick={() => setOrderTabActive('history')}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              color: orderTabActive === 'history' ? 'var(--text-primary)' : 'var(--text-secondary)',
              fontSize: '14px', fontWeight: '600',
              borderBottom: orderTabActive === 'history' ? '2px solid var(--yellow)' : '2px solid transparent',
              paddingBottom: '4px',
            }}
          >
            Order History
          </button>
        </div>

        {orderTabActive === 'open' && (
          <div>
            {openOrders.length === 0 && (
              <div style={{ color: 'var(--text-tertiary)', padding: '20px 0', textAlign: 'center' }}>
                No open orders. Place an order to get started.
              </div>
            )}
            {openOrders.length > 0 && (
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                <thead>
                  <tr style={{ color: 'var(--text-tertiary)', borderBottom: '1px solid var(--border)' }}>
                    <th style={{ textAlign: 'left', padding: '6px' }}>Pair</th>
                    <th style={{ textAlign: 'left', padding: '6px' }}>Type</th>
                    <th style={{ textAlign: 'left', padding: '6px' }}>Side</th>
                    <th style={{ textAlign: 'right', padding: '6px' }}>Price</th>
                    <th style={{ textAlign: 'right', padding: '6px' }}>Amount</th>
                    <th style={{ textAlign: 'right', padding: '6px' }}>Filled</th>
                    <th style={{ textAlign: 'center', padding: '6px' }}>Status</th>
                    <th style={{ textAlign: 'center', padding: '6px' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {openOrders.map(order => (
                    <tr key={order.id} style={{ borderBottom: '1px solid var(--border)' }}>
                      <td style={{ padding: '6px' }}>{order.symbol.replace('_', '/')}</td>
                      <td style={{ padding: '6px' }}>{order.type}</td>
                      <td style={{ padding: '6px', color: order.side === 'buy' ? 'var(--green)' : 'var(--red)' }}>{order.side}</td>
                      <td style={{ padding: '6px', textAlign: 'right', fontFamily: "'JetBrains Mono', monospace" }}>{order.price || '-'}</td>
                      <td style={{ padding: '6px', textAlign: 'right', fontFamily: "'JetBrains Mono', monospace" }}>{Number(order.amount).toFixed(6)}</td>
                      <td style={{ padding: '6px', textAlign: 'right', fontFamily: "'JetBrains Mono', monospace" }}>{Number(order.filled).toFixed(6)}</td>
                      <td style={{ padding: '6px', textAlign: 'center' }}>
                        <span className="badge" style={{
                          padding: '2px 8px', borderRadius: '4px', fontSize: '12px',
                          background: 'rgba(252, 213, 53, 0.1)', color: 'var(--yellow)',
                        }}>
                          {order.status}
                        </span>
                      </td>
                      <td style={{ padding: '6px', textAlign: 'center' }}>
                        <button
                          onClick={() => handleCancel(order.id)}
                          style={{
                            padding: '4px 12px', background: 'var(--bg-tertiary)', border: '1px solid var(--border)',
                            color: 'var(--red)', borderRadius: '4px', cursor: 'pointer', fontSize: '12px',
                          }}
                        >
                          Cancel
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {orderTabActive === 'history' && (
          <div>
            {orderHistory.length === 0 && (
              <div style={{ color: 'var(--text-tertiary)', padding: '20px 0', textAlign: 'center' }}>
                No order history yet.
              </div>
            )}
            {orderHistory.length > 0 && (
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                <thead>
                  <tr style={{ color: 'var(--text-tertiary)', borderBottom: '1px solid var(--border)' }}>
                    <th style={{ textAlign: 'left', padding: '6px' }}>Pair</th>
                    <th style={{ textAlign: 'left', padding: '6px' }}>Type</th>
                    <th style={{ textAlign: 'left', padding: '6px' }}>Side</th>
                    <th style={{ textAlign: 'right', padding: '6px' }}>Price</th>
                    <th style={{ textAlign: 'right', padding: '6px' }}>Amount</th>
                    <th style={{ textAlign: 'right', padding: '6px' }}>Filled</th>
                    <th style={{ textAlign: 'center', padding: '6px' }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {orderHistory.map(order => (
                    <tr key={order.id} style={{ borderBottom: '1px solid var(--border)' }}>
                      <td style={{ padding: '6px' }}>{order.symbol.replace('_', '/')}</td>
                      <td style={{ padding: '6px' }}>{order.type}</td>
                      <td style={{ padding: '6px', color: order.side === 'buy' ? 'var(--green)' : 'var(--red)' }}>{order.side}</td>
                      <td style={{ padding: '6px', textAlign: 'right', fontFamily: "'JetBrains Mono', monospace" }}>{order.price || '-'}</td>
                      <td style={{ padding: '6px', textAlign: 'right', fontFamily: "'JetBrains Mono', monospace" }}>{Number(order.amount).toFixed(6)}</td>
                      <td style={{ padding: '6px', textAlign: 'right', fontFamily: "'JetBrains Mono', monospace" }}>{Number(order.filled).toFixed(6)}</td>
                      <td style={{ padding: '6px', textAlign: 'center' }}>
                        <span className="badge" style={{
                          padding: '2px 8px', borderRadius: '4px', fontSize: '12px',
                          background: order.status === 'filled' ? 'rgba(14, 203, 129, 0.1)' : 'rgba(132, 142, 156, 0.1)',
                          color: order.status === 'filled' ? 'var(--green)' : 'var(--text-secondary)',
                        }}>
                          {order.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
