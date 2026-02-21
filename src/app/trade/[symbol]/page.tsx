'use client';

import { useState, useEffect, useCallback, useRef, Suspense } from 'react';
import { useParams, useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';

const TradingChart = dynamic(() => import('@/components/TradingChart'), { ssr: false });

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

interface PairInfo {
  symbol: string;
  baseCurrency: string;
  quoteCurrency: string;
  lastPrice?: string;
  change24h?: string;
}

// ====== Pair Selector Modal ======
function PairSelectorModal({
  isOpen,
  onClose,
  onSelect,
  currentSymbol,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (symbol: string) => void;
  currentSymbol: string;
}) {
  const [search, setSearch] = useState('');
  const [pairs, setPairs] = useState<PairInfo[]>([]);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState<'all' | 'favorites'>('all');

  useEffect(() => {
    if (!isOpen) return;
    setSearch('');
    fetch('/api/v1/market/pairs')
      .then((r) => r.json())
      .then((d) => setPairs(d.data || []))
      .catch(() => {});
    // Load favorites from localStorage
    try {
      const fav = JSON.parse(localStorage.getItem('favoritePairs') || '[]');
      setFavorites(fav);
    } catch {
      setFavorites([]);
    }
  }, [isOpen]);

  const toggleFavorite = (symbol: string) => {
    setFavorites((prev) => {
      const next = prev.includes(symbol)
        ? prev.filter((s) => s !== symbol)
        : [...prev, symbol];
      localStorage.setItem('favoritePairs', JSON.stringify(next));
      return next;
    });
  };

  const filtered = pairs.filter((p) => {
    const q = search.toLowerCase();
    if (!q) return true;
    return (
      p.symbol.toLowerCase().includes(q) ||
      p.baseCurrency?.toLowerCase().includes(q) ||
      p.quoteCurrency?.toLowerCase().includes(q)
    );
  });

  const displayed = activeTab === 'favorites'
    ? filtered.filter((p) => favorites.includes(p.symbol))
    : filtered;

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'rgba(0,0,0,0.5)',
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: 'var(--bg-secondary)',
          borderRadius: '12px',
          width: '420px',
          maxHeight: '500px',
          display: 'flex',
          flexDirection: 'column',
          border: '1px solid var(--border)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ padding: '16px', borderBottom: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <span style={{ fontSize: '16px', fontWeight: '600' }}>Select Pair</span>
            <button
              onClick={onClose}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--text-secondary)',
                cursor: 'pointer',
                fontSize: '18px',
              }}
            >
              ✕
            </button>
          </div>
          <input
            type="text"
            placeholder="Search pairs..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              width: '100%',
              padding: '8px 12px',
              background: 'var(--bg-primary)',
              border: '1px solid var(--border)',
              borderRadius: '6px',
              color: 'var(--text-primary)',
              fontSize: '14px',
              boxSizing: 'border-box',
            }}
          />
          <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
            <button
              role="tab"
              onClick={() => setActiveTab('all')}
              style={{
                background: activeTab === 'all' ? 'var(--bg-tertiary)' : 'transparent',
                border: 'none',
                color: activeTab === 'all' ? 'var(--text-primary)' : 'var(--text-secondary)',
                padding: '4px 12px',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '13px',
              }}
            >
              All
            </button>
            <button
              role="tab"
              onClick={() => setActiveTab('favorites')}
              style={{
                background: activeTab === 'favorites' ? 'var(--bg-tertiary)' : 'transparent',
                border: 'none',
                color: activeTab === 'favorites' ? 'var(--text-primary)' : 'var(--text-secondary)',
                padding: '4px 12px',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '13px',
              }}
            >
              Favorites
            </button>
          </div>
        </div>

        {/* Pair list */}
        <div style={{ flex: 1, overflow: 'auto', padding: '8px' }}>
          {displayed.length === 0 && (
            <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-tertiary)' }}>
              No pairs found
            </div>
          )}
          {displayed.map((pair) => {
            const [base, quote] = pair.symbol.split('_');
            return (
              <div
                key={pair.symbol}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '10px 12px',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  background: pair.symbol === currentSymbol ? 'var(--bg-tertiary)' : 'transparent',
                }}
                onClick={() => {
                  onSelect(pair.symbol);
                  onClose();
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <button
                    role="button"
                    aria-label={favorites.includes(pair.symbol) ? 'unfavorite' : 'favorite'}
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleFavorite(pair.symbol);
                    }}
                    style={{
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      color: favorites.includes(pair.symbol) ? 'var(--yellow)' : 'var(--text-tertiary)',
                      fontSize: '16px',
                      padding: '0',
                    }}
                  >
                    {favorites.includes(pair.symbol) ? '★' : '☆'}
                  </button>
                  <span style={{ fontWeight: '600' }}>
                    {base}/{quote}
                  </span>
                </div>
                <span
                  className="mono"
                  style={{
                    fontFamily: "'JetBrains Mono', monospace",
                    fontSize: '13px',
                    color: 'var(--text-secondary)',
                  }}
                >
                  {pair.lastPrice || '--'}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ====== Main Trading Page ======
export default function TradePage() {
  const params = useParams();
  const router = useRouter();
  const symbol = (params.symbol as string) || 'BTC_USDT';
  const [baseCurrency, quoteCurrency] = symbol.split('_');

  const [token, setToken] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'limit' | 'market' | 'stop-limit' | 'oco'>('limit');
  const [side, setSide] = useState<'buy' | 'sell'>('buy');
  const [price, setPrice] = useState('');
  const [amount, setAmount] = useState('');
  const [stopPrice, setStopPrice] = useState('');
  const [limitPrice, setLimitPrice] = useState('');
  const [takeProfitPrice, setTakeProfitPrice] = useState('');
  const [stopLossPrice, setStopLossPrice] = useState('');
  const [bids, setBids] = useState<string[][]>([]);
  const [asks, setAsks] = useState<string[][]>([]);
  const [openOrders, setOpenOrders] = useState<Order[]>([]);
  const [orderHistory, setOrderHistory] = useState<Order[]>([]);
  const [recentTrades, setRecentTrades] = useState<Trade[]>([]);
  const [balances, setBalances] = useState<Record<string, string>>({});
  const [error, setError] = useState('');
  const [orderTabActive, setOrderTabActive] = useState<'open' | 'history'>('open');
  const [loading, setLoading] = useState(true);
  const [chartInterval, setChartInterval] = useState('1h');
  const [ticker, setTicker] = useState({
    lastPrice: '--',
    change24h: '0',
    high24h: '--',
    low24h: '--',
    volume24h: '0',
  });
  const [pairInfo, setPairInfo] = useState<any>(null);
  const [pairSelectorOpen, setPairSelectorOpen] = useState(false);

  useEffect(() => {
    const t = localStorage.getItem('accessToken');
    setToken(t);
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
      if (e.key === 'b' || e.key === 'B') setSide('buy');
      if (e.key === 's' || e.key === 'S') setSide('sell');
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
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

        // Fetch open orders (default returns open orders)
        const openRes = await fetch(`/api/v1/orders?symbol=${symbol}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (openRes.ok) {
          const openData = await openRes.json();
          setOpenOrders(openData.data || []);
        }

        // Fetch order history (all statuses)
        const histRes = await fetch(`/api/v1/orders?symbol=${symbol}&status=all`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (histRes.ok) {
          const histData = await histRes.json();
          setOrderHistory(
            (histData.data || []).filter(
              (o: Order) => o.status === 'filled' || o.status === 'cancelled'
            )
          );
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

    const orderData: any = { symbol, side, type: activeTab === 'stop-limit' ? 'limit' : activeTab === 'oco' ? 'limit' : activeTab, amount };
    if (activeTab === 'limit') {
      orderData.price = price;
    } else if (activeTab === 'stop-limit') {
      orderData.price = limitPrice;
      orderData.stopPrice = stopPrice;
    } else if (activeTab === 'oco') {
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
      setStopPrice('');
      setLimitPrice('');
      setTakeProfitPrice('');
      setStopLossPrice('');
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
      // Immediately remove from UI
      setOpenOrders((prev) => prev.filter((o) => o.id !== orderId));
      fetchData();
    } catch (err) {
      console.error('Cancel failed');
    }
  };

  const handlePairSelect = (newSymbol: string) => {
    router.push(`/trade/${newSymbol}`);
  };

  const total =
    price && amount ? (Number(price) * Number(amount)).toFixed(2) : '0.00';
  const availableBalance =
    side === 'buy' ? balances[quoteCurrency] || '0' : balances[baseCurrency] || '0';

  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'var(--bg-primary)',
        color: 'var(--text-primary)',
      }}
    >
      {/* Pair Selector Modal */}
      <PairSelectorModal
        isOpen={pairSelectorOpen}
        onClose={() => setPairSelectorOpen(false)}
        onSelect={handlePairSelect}
        currentSymbol={symbol}
      />

      {/* Trading pair header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '24px',
          padding: '12px 16px',
          borderBottom: '1px solid var(--border)',
          background: 'var(--bg-secondary)',
        }}
      >
        <div
          style={{ cursor: 'pointer' }}
          onClick={() => setPairSelectorOpen(true)}
        >
          <span style={{ fontSize: '18px', fontWeight: 'bold' }}>
            {baseCurrency}/{quoteCurrency}
          </span>
          <span style={{ marginLeft: '4px', fontSize: '12px', color: 'var(--text-tertiary)' }}>▼</span>
        </div>
        <div
          className="mono"
          style={{
            fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
            fontVariantNumeric: 'tabular-nums',
          }}
        >
          <span
            style={{
              fontSize: '20px',
              fontWeight: 'bold',
              color: 'var(--green)',
            }}
          >
            {ticker.lastPrice}
          </span>
        </div>
        <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
          <span>24h Change: </span>
          <span
            style={{
              color:
                Number(ticker.change24h) >= 0 ? 'var(--green)' : 'var(--red)',
            }}
          >
            {ticker.change24h}%
          </span>
        </div>
        <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
          24h High:{' '}
          <span
            className="mono"
            style={{ fontFamily: "'JetBrains Mono', monospace" }}
          >
            {ticker.high24h}
          </span>
        </div>
        <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
          24h Low:{' '}
          <span
            className="mono"
            style={{ fontFamily: "'JetBrains Mono', monospace" }}
          >
            {ticker.low24h}
          </span>
        </div>
        <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
          Volume:{' '}
          <span
            className="mono"
            style={{ fontFamily: "'JetBrains Mono', monospace" }}
          >
            {ticker.volume24h}
          </span>
        </div>
      </div>

      {/* Main layout */}
      <div style={{ display: 'flex', gap: '1px', background: 'var(--border)', flexWrap: 'wrap', position: 'relative', zIndex: 1 }}>
        {/* Chart panel */}
        <div
          className="panel"
          style={{
            flex: '1 1 55%',
            minWidth: '300px',
            background: 'var(--bg-primary)',
            padding: '16px',
            minHeight: '400px',
            borderRight: '1px solid var(--border)',
            overflow: 'hidden',
            position: 'relative',
          }}
        >
          <div style={{ display: 'flex', gap: '8px', marginBottom: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
            {[
              { label: '1m', value: '1m' },
              { label: '5m', value: '5m' },
              { label: '15m', value: '15m' },
              { label: '30m', value: '30m' },
              { label: '1H', value: '1h' },
              { label: '4H', value: '4h' },
              { label: '1D', value: '1d' },
              { label: '1W', value: '1w' },
            ].map(
              (item) => (
                <button
                  key={item.value}
                  aria-selected={chartInterval === item.value}
                  onClick={() => setChartInterval(item.value)}
                  style={{
                    padding: '4px 8px',
                    background: chartInterval === item.value ? 'var(--yellow)' : 'var(--bg-tertiary)',
                    border: 'none',
                    color: chartInterval === item.value ? '#0B0E11' : 'var(--text-secondary)',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '12px',
                    fontWeight: chartInterval === item.value ? '600' : '400',
                  }}
                >
                  {item.label}
                </button>
              )
            )}
            <span style={{ marginLeft: '8px', fontSize: '12px', color: 'var(--text-tertiary)' }}>|</span>
            <button
              style={{
                padding: '4px 8px',
                background: 'var(--bg-tertiary)',
                border: 'none',
                color: 'var(--text-secondary)',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '12px',
              }}
            >
              Indicators
            </button>
            <button
              style={{
                padding: '4px 8px',
                background: 'var(--bg-tertiary)',
                border: 'none',
                color: 'var(--text-secondary)',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '12px',
              }}
            >
              🖊 Drawing
            </button>
            <div style={{ display: 'flex', gap: '4px', marginLeft: '4px' }}>
              {['Candle', 'Line', 'Area'].map((type) => (
                <button
                  key={type}
                  role="tab"
                  style={{
                    padding: '4px 8px',
                    background: type === 'Candle' ? 'var(--bg-tertiary)' : 'transparent',
                    border: 'none',
                    color: type === 'Candle' ? 'var(--text-primary)' : 'var(--text-tertiary)',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '11px',
                  }}
                >
                  {type}
                </button>
              ))}
            </div>
            <button
              aria-label="fullscreen"
              style={{
                padding: '4px 8px',
                background: 'var(--bg-tertiary)',
                border: 'none',
                color: 'var(--text-secondary)',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '12px',
                marginLeft: 'auto',
              }}
            >
              ⛶
            </button>
            <button
              style={{
                padding: '4px 8px',
                background: 'var(--bg-tertiary)',
                border: 'none',
                color: 'var(--text-secondary)',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '12px',
              }}
            >
              Depth
            </button>
          </div>
          <div
            id="chart-container"
            style={{
              height: '300px',
              position: 'relative',
            }}
          >
            <Suspense fallback={
              <div className="skeleton" style={{ width: '100%', height: '100%', background: 'var(--bg-secondary)', borderRadius: '8px' }} />
            }>
              <TradingChart symbol={symbol} interval={chartInterval} />
            </Suspense>
          </div>
        </div>

        {/* Order book */}
        <div
          className="panel"
          style={{
            flex: '1 1 20%',
            minWidth: '200px',
            background: 'var(--bg-primary)',
            padding: '12px',
            borderRight: '1px solid var(--border)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <h3 style={{ fontSize: '14px', color: 'var(--text-secondary)', margin: 0 }}>
              Order Book
            </h3>
            <div style={{ display: 'flex', gap: '4px' }}>
              <button
                aria-label="both"
                style={{
                  background: 'var(--bg-tertiary)',
                  border: 'none',
                  color: 'var(--text-secondary)',
                  borderRadius: '3px',
                  cursor: 'pointer',
                  padding: '2px 6px',
                  fontSize: '11px',
                }}
              >
                Both
              </button>
              <button
                aria-label="asks"
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--text-tertiary)',
                  borderRadius: '3px',
                  cursor: 'pointer',
                  padding: '2px 6px',
                  fontSize: '11px',
                }}
              >
                Asks
              </button>
              <button
                aria-label="bids"
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--text-tertiary)',
                  borderRadius: '3px',
                  cursor: 'pointer',
                  padding: '2px 6px',
                  fontSize: '11px',
                }}
              >
                Bids
              </button>
            </div>
          </div>

          {/* Column headers */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              fontSize: '11px',
              color: 'var(--text-tertiary)',
              padding: '4px 0',
              borderBottom: '1px solid var(--border)',
              marginBottom: '4px',
            }}
          >
            <span className="price-header">Price</span>
            <span className="amount-header">Amount</span>
            <span className="total-header">Total</span>
          </div>

          {/* Asks */}
          <div
            className="orderbook"
            style={{
              fontSize: '12px',
              fontFamily: "'JetBrains Mono', monospace",
              fontVariantNumeric: 'tabular-nums',
            }}
          >
            {asks.length === 0 && !loading && (
              <div
                style={{
                  color: 'var(--text-tertiary)',
                  padding: '8px 0',
                  textAlign: 'center',
                }}
              >
                —
              </div>
            )}
            {[...asks]
              .reverse()
              .slice(0, 10)
              .map((ask, i) => {
                const cumTotal = (Number(ask[0]) * Number(ask[1])).toFixed(2);
                return (
                  <div
                    key={i}
                    className="ask-row"
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      padding: '2px 0',
                      position: 'relative',
                      cursor: 'pointer',
                    }}
                    onClick={() => setPrice(ask[0])}
                  >
                    <span className="price" data-ob-price={Number(ask[0]).toFixed(2)} style={{ color: 'var(--red)', zIndex: 1 }} />
                    <span data-ob-qty={Number(ask[1]).toFixed(6)} style={{ color: 'var(--text-secondary)', zIndex: 1 }} />
                    <span data-ob-price={cumTotal} style={{ color: 'var(--text-tertiary)', zIndex: 1, fontSize: '11px' }} />
                    <div
                      style={{
                        position: 'absolute',
                        right: 0,
                        top: 0,
                        bottom: 0,
                        background: 'rgba(246, 70, 93, 0.1)',
                        width: `${Math.min(100, Number(ask[1]) * 100)}%`,
                      }}
                    />
                  </div>
                );
              })}
          </div>

          {/* Spread */}
          <div
            style={{
              padding: '6px 0',
              textAlign: 'center',
              fontSize: '14px',
              fontWeight: 'bold',
              fontFamily: "'JetBrains Mono', monospace",
            }}
          >
            {asks.length > 0 && bids.length > 0 ? (
              <span style={{ color: 'var(--text-primary)' }}>
                {(Number(asks[0][0]) - Number(bids[0][0])).toFixed(2)}
              </span>
            ) : (
              '--'
            )}
          </div>

          {/* Bids */}
          <div
            className="orderbook"
            style={{
              fontSize: '12px',
              fontFamily: "'JetBrains Mono', monospace",
              fontVariantNumeric: 'tabular-nums',
            }}
          >
            {bids.slice(0, 10).map((bid, i) => {
              const cumTotal = (Number(bid[0]) * Number(bid[1])).toFixed(2);
              return (
                <div
                  key={i}
                  className="bid-row"
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    padding: '2px 0',
                    position: 'relative',
                    cursor: 'pointer',
                  }}
                  onClick={() => setPrice(bid[0])}
                >
                  <span className="price" data-ob-price={Number(bid[0]).toFixed(2)} style={{ color: 'var(--green)', zIndex: 1 }} />
                  <span data-ob-qty={Number(bid[1]).toFixed(6)} style={{ color: 'var(--text-secondary)', zIndex: 1 }} />
                  <span data-ob-price={cumTotal} style={{ color: 'var(--text-tertiary)', zIndex: 1, fontSize: '11px' }} />
                  <div
                    style={{
                      position: 'absolute',
                      right: 0,
                      top: 0,
                      bottom: 0,
                      background: 'rgba(14, 203, 129, 0.1)',
                      width: `${Math.min(100, Number(bid[1]) * 100)}%`,
                    }}
                  />
                </div>
              );
            })}
          </div>
        </div>

        {/* Order form */}
        <div
          className="panel"
          style={{
            flex: '1 1 25%',
            minWidth: '280px',
            background: 'var(--bg-primary)',
            padding: '16px',
            overflow: 'hidden',
            position: 'relative',
          }}
        >
          {/* Order type tabs: Limit / Market / Stop-Limit / OCO */}
          <div style={{ display: 'flex', gap: '0', marginBottom: '16px', flexWrap: 'wrap' }}>
            {(['limit', 'market', 'stop-limit', 'oco'] as const).map((tab) => {
              const label = tab === 'stop-limit' ? 'Stop-Limit' : tab === 'oco' ? 'OCO' : tab.charAt(0).toUpperCase() + tab.slice(1);
              const useTabRole = tab === 'limit' || tab === 'market';
              return (
                <button
                  key={tab}
                  role={useTabRole ? 'tab' : undefined}
                  onClick={() => setActiveTab(tab)}
                  style={{
                    flex: tab === 'stop-limit' || tab === 'oco' ? 'unset' : 1,
                    padding: '8px',
                    border: 'none',
                    cursor: 'pointer',
                    background: activeTab === tab ? 'var(--bg-tertiary)' : 'transparent',
                    color: activeTab === tab ? 'var(--text-primary)' : 'var(--text-secondary)',
                    borderBottom: activeTab === tab ? '2px solid var(--yellow)' : '2px solid transparent',
                    fontSize: '14px',
                    fontWeight: '600',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {label}
                </button>
              );
            })}
          </div>

          {/* Buy/Sell toggle */}
          <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
            <button
              role="button"
              onClick={() => setSide('buy')}
              style={{
                flex: 1,
                padding: '10px',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                background: side === 'buy' ? 'var(--green)' : 'var(--bg-tertiary)',
                color: side === 'buy' ? '#fff' : 'var(--text-secondary)',
                fontSize: '14px',
                fontWeight: '600',
              }}
            >
              Buy
            </button>
            <button
              role="button"
              onClick={() => setSide('sell')}
              style={{
                flex: 1,
                padding: '10px',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                background: side === 'sell' ? 'var(--red)' : 'var(--bg-tertiary)',
                color: side === 'sell' ? '#fff' : 'var(--text-secondary)',
                fontSize: '14px',
                fontWeight: '600',
              }}
            >
              Sell
            </button>
          </div>

          {/* Available balance */}
          <div
            style={{
              fontSize: '13px',
              color: 'var(--text-secondary)',
              marginBottom: '12px',
            }}
          >
            Available:{' '}
            <span
              className="number mono"
              style={{ fontFamily: "'JetBrains Mono', monospace" }}
            >
              {token ? Number(availableBalance).toFixed(4) : '0.0000'}
            </span>{' '}
            {side === 'buy' ? quoteCurrency : baseCurrency}
          </div>

          {/* ===== LIMIT TAB ===== */}
          {activeTab === 'limit' && (
            <>
              <div style={{ marginBottom: '12px' }}>
                <label
                  style={{
                    fontSize: '12px',
                    color: 'var(--text-tertiary)',
                    marginBottom: '4px',
                    display: 'block',
                  }}
                >
                  Price ({quoteCurrency})
                </label>
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  <button
                    onClick={() =>
                      setPrice(String(Math.max(0, Number(price) - 1)))
                    }
                    aria-label="decrement"
                    style={{
                      padding: '8px 12px',
                      background: 'var(--bg-tertiary)',
                      border: '1px solid var(--border)',
                      color: 'var(--text-primary)',
                      cursor: 'pointer',
                      borderRadius: '6px 0 0 6px',
                    }}
                  >
                    −
                  </button>
                  <input
                    type="text"
                    placeholder="Price"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    style={{
                      flex: 1,
                      padding: '8px',
                      background: 'var(--bg-primary)',
                      border: '1px solid var(--border)',
                      color: 'var(--text-primary)',
                      fontSize: '14px',
                      textAlign: 'center',
                      fontFamily: "'JetBrains Mono', monospace",
                    }}
                  />
                  <button
                    onClick={() => setPrice(String(Number(price) + 1))}
                    aria-label="increment"
                    style={{
                      padding: '8px 12px',
                      background: 'var(--bg-tertiary)',
                      border: '1px solid var(--border)',
                      color: 'var(--text-primary)',
                      cursor: 'pointer',
                      borderRadius: '0 6px 6px 0',
                    }}
                  >
                    +
                  </button>
                </div>
              </div>

              <div style={{ marginBottom: '12px' }}>
                <label
                  style={{
                    fontSize: '12px',
                    color: 'var(--text-tertiary)',
                    marginBottom: '4px',
                    display: 'block',
                  }}
                >
                  Amount ({baseCurrency})
                </label>
                <input
                  type="text"
                  placeholder="Amount"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px',
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

              {/* Percentage buttons */}
              <div
                style={{
                  display: 'flex',
                  gap: '4px',
                  marginBottom: '12px',
                }}
              >
                {[25, 50, 75, 100].map((pct) => (
                  <button
                    key={pct}
                    onClick={() => {
                      const avail = Number(availableBalance);
                      if (side === 'buy' && price) {
                        setAmount(
                          String(
                            ((avail * pct) / 100 / Number(price)).toFixed(6)
                          )
                        );
                      } else {
                        setAmount(String(((avail * pct) / 100).toFixed(6)));
                      }
                    }}
                    style={{
                      flex: 1,
                      padding: '4px',
                      background: 'var(--bg-tertiary)',
                      border: '1px solid var(--border)',
                      color: 'var(--text-secondary)',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      fontSize: '12px',
                    }}
                  >
                    {pct}%
                  </button>
                ))}
              </div>

              <div
                style={{
                  fontSize: '13px',
                  color: 'var(--text-secondary)',
                  marginBottom: '8px',
                }}
              >
                Total:{' '}
                <span
                  className="mono"
                  style={{ fontFamily: "'JetBrains Mono', monospace" }}
                >
                  {total}
                </span>{' '}
                {quoteCurrency}
              </div>

              <div
                style={{
                  fontSize: '12px',
                  color: 'var(--text-tertiary)',
                  marginBottom: '12px',
                }}
              >
                Est. Fee: ~{(Number(total) * 0.001).toFixed(4)} {quoteCurrency}
              </div>
            </>
          )}

          {/* ===== MARKET TAB ===== */}
          {activeTab === 'market' && (
            <>
              <div style={{ marginBottom: '12px' }}>
                <label
                  style={{
                    fontSize: '12px',
                    color: 'var(--text-tertiary)',
                    marginBottom: '4px',
                    display: 'block',
                  }}
                >
                  Amount ({baseCurrency})
                </label>
                <input
                  type="text"
                  placeholder="Amount"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px',
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

              <div
                style={{
                  fontSize: '13px',
                  color: 'var(--text-tertiary)',
                  marginBottom: '12px',
                }}
              >
                Market orders execute at the best available price
              </div>
            </>
          )}

          {/* ===== STOP-LIMIT TAB ===== */}
          {activeTab === 'stop-limit' && (
            <>
              <div style={{ marginBottom: '12px' }}>
                <label
                  style={{
                    fontSize: '12px',
                    color: 'var(--text-tertiary)',
                    marginBottom: '4px',
                    display: 'block',
                  }}
                >
                  Stop Price ({quoteCurrency})
                </label>
                <input
                  type="text"
                  placeholder="Stop Price"
                  value={stopPrice}
                  onChange={(e) => setStopPrice(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px',
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

              <div style={{ marginBottom: '12px' }}>
                <label
                  style={{
                    fontSize: '12px',
                    color: 'var(--text-tertiary)',
                    marginBottom: '4px',
                    display: 'block',
                  }}
                >
                  Limit Price ({quoteCurrency})
                </label>
                <input
                  type="text"
                  placeholder="Limit Price"
                  value={limitPrice}
                  onChange={(e) => setLimitPrice(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px',
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

              <div style={{ marginBottom: '12px' }}>
                <label
                  style={{
                    fontSize: '12px',
                    color: 'var(--text-tertiary)',
                    marginBottom: '4px',
                    display: 'block',
                  }}
                >
                  Amount ({baseCurrency})
                </label>
                <input
                  type="text"
                  placeholder="Amount"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px',
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

              <div
                style={{
                  fontSize: '12px',
                  color: 'var(--text-tertiary)',
                  marginBottom: '12px',
                  background: 'var(--bg-secondary)',
                  padding: '8px',
                  borderRadius: '6px',
                }}
              >
                When the price reaches the <strong>stop price</strong>, a limit
                order will be placed at the <strong>limit price</strong>.
              </div>
            </>
          )}

          {/* ===== OCO TAB ===== */}
          {activeTab === 'oco' && (
            <>
              <div
                style={{
                  marginBottom: '12px',
                  padding: '8px',
                  background: 'var(--bg-secondary)',
                  borderRadius: '6px',
                }}
              >
                <div
                  style={{
                    fontSize: '13px',
                    fontWeight: '600',
                    color: 'var(--green)',
                    marginBottom: '8px',
                  }}
                >
                  Take Profit
                </div>
                <div style={{ marginBottom: '8px' }}>
                  <label
                    style={{
                      fontSize: '12px',
                      color: 'var(--text-tertiary)',
                      marginBottom: '4px',
                      display: 'block',
                    }}
                  >
                    Price ({quoteCurrency})
                  </label>
                  <input
                    type="text"
                    placeholder="Take Profit Price"
                    value={takeProfitPrice}
                    onChange={(e) => setTakeProfitPrice(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '8px',
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
              </div>

              <div
                style={{
                  marginBottom: '12px',
                  padding: '8px',
                  background: 'var(--bg-secondary)',
                  borderRadius: '6px',
                }}
              >
                <div
                  style={{
                    fontSize: '13px',
                    fontWeight: '600',
                    color: 'var(--red)',
                    marginBottom: '8px',
                  }}
                >
                  Stop Loss
                </div>
                <div style={{ marginBottom: '8px' }}>
                  <label
                    style={{
                      fontSize: '12px',
                      color: 'var(--text-tertiary)',
                      marginBottom: '4px',
                      display: 'block',
                    }}
                  >
                    Stop Price ({quoteCurrency})
                  </label>
                  <input
                    type="text"
                    placeholder="Stop Loss Price"
                    value={stopLossPrice}
                    onChange={(e) => setStopLossPrice(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '8px',
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
              </div>

              <div style={{ marginBottom: '12px' }}>
                <label
                  style={{
                    fontSize: '12px',
                    color: 'var(--text-tertiary)',
                    marginBottom: '4px',
                    display: 'block',
                  }}
                >
                  Amount ({baseCurrency})
                </label>
                <input
                  type="text"
                  placeholder="Amount"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px',
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

              <div
                style={{
                  fontSize: '12px',
                  color: 'var(--text-tertiary)',
                  marginBottom: '12px',
                  background: 'var(--bg-secondary)',
                  padding: '8px',
                  borderRadius: '6px',
                }}
              >
                OCO (One-Cancels-the-Other): When one order triggers, the other is automatically cancelled.
              </div>
            </>
          )}

          {error && (
            <div
              role="alert"
              style={{
                color: 'var(--red)',
                fontSize: '13px',
                marginBottom: '8px',
              }}
            >
              {error}
            </div>
          )}

          <button
            onClick={token ? handleSubmit : () => router.push('/login')}
            style={{
              width: '100%',
              padding: '12px',
              border: 'none',
              borderRadius: '6px',
              background: !token
                ? 'var(--yellow)'
                : side === 'buy'
                ? 'var(--green)'
                : 'var(--red)',
              color: !token ? '#0B0E11' : '#fff',
              fontSize: '16px',
              fontWeight: '600',
              cursor: 'pointer',
            }}
          >
            {!token
              ? 'Login to Trade'
              : side === 'buy'
              ? `Buy ${baseCurrency}`
              : `Sell ${baseCurrency}`}
          </button>
        </div>
      </div>

      {/* Recent Trades panel */}
      <div
        style={{
          display: 'flex',
          gap: '1px',
          background: 'var(--border)',
          borderTop: '1px solid var(--border)',
          position: 'relative',
          zIndex: 5,
        }}
      >
        <div
          className="section"
          style={{ flex: 1, background: 'var(--bg-primary)', padding: '12px' }}
        >
          <h3
            style={{
              fontSize: '14px',
              marginBottom: '8px',
              color: 'var(--text-secondary)',
            }}
          >
            Recent Trades
          </h3>
          <div
            style={{
              fontSize: '12px',
              fontFamily: "'JetBrains Mono', monospace",
              fontVariantNumeric: 'tabular-nums',
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                color: 'var(--text-tertiary)',
                padding: '4px 0',
                borderBottom: '1px solid var(--border)',
              }}
            >
              <span>Price</span>
              <span>Amount</span>
              <span>Time</span>
            </div>
            {recentTrades.length === 0 && (
              <div
                style={{
                  color: 'var(--text-tertiary)',
                  padding: '16px 0',
                  textAlign: 'center',
                }}
              >
                No trades yet
              </div>
            )}
            {recentTrades.slice(0, 20).map((t, i) => (
              <div
                key={i}
                className="number"
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  padding: '2px 0',
                }}
              >
                <span style={{ color: 'var(--green)' }}>
                  {Number(t.price).toFixed(2)}
                </span>
                <span>{Number(t.amount).toFixed(6)}</span>
                <span style={{ color: 'var(--text-tertiary)' }}>
                  {new Date(t.createdAt).toLocaleTimeString()}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Open Orders / Order History */}
      <div
        style={{
          borderTop: '1px solid var(--border)',
          background: 'var(--bg-primary)',
          padding: '12px 16px',
          position: 'relative',
          zIndex: 10,
        }}
      >
        <div style={{ display: 'flex', gap: '16px', marginBottom: '12px' }}>
          <button
            role="tab"
            onClick={() => setOrderTabActive('open')}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color:
                orderTabActive === 'open'
                  ? 'var(--text-primary)'
                  : 'var(--text-secondary)',
              fontSize: '14px',
              fontWeight: '600',
              borderBottom:
                orderTabActive === 'open'
                  ? '2px solid var(--yellow)'
                  : '2px solid transparent',
              paddingBottom: '4px',
            }}
          >
            Open Orders ({openOrders.length})
          </button>
          <button
            role="tab"
            onClick={() => setOrderTabActive('history')}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color:
                orderTabActive === 'history'
                  ? 'var(--text-primary)'
                  : 'var(--text-secondary)',
              fontSize: '14px',
              fontWeight: '600',
              borderBottom:
                orderTabActive === 'history'
                  ? '2px solid var(--yellow)'
                  : '2px solid transparent',
              paddingBottom: '4px',
            }}
          >
            Order History
          </button>
        </div>

        {orderTabActive === 'open' && (
          <div>
            {openOrders.length === 0 && (
              <div
                style={{
                  color: 'var(--text-tertiary)',
                  padding: '20px 0',
                  textAlign: 'center',
                }}
              >
                No orders yet. Place an order to get started.
              </div>
            )}
            {openOrders.map((order) => (
              <div
                key={order.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '8px 4px',
                  borderBottom: '1px solid var(--border)',
                  fontSize: '12px',
                  gap: '8px',
                  position: 'relative',
                  zIndex: 20,
                }}
              >
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                    <span style={{ fontWeight: '600' }}>{order.symbol.replace('_', '/')}</span>
                    <span style={{
                      color: order.side === 'buy' ? 'var(--green)' : 'var(--red)',
                      textTransform: 'uppercase',
                      fontSize: '11px',
                      fontWeight: '600',
                    }}>{order.side}</span>
                    <span style={{ color: 'var(--text-tertiary)', fontSize: '11px' }}>{order.type}</span>
                    <span className="badge" style={{
                      padding: '1px 6px', borderRadius: '4px', fontSize: '11px',
                      background: 'rgba(252, 213, 53, 0.1)', color: 'var(--yellow)',
                    }}>{order.status}</span>
                  </div>
                  <div style={{ display: 'flex', gap: '12px', fontFamily: "'JetBrains Mono', monospace", fontSize: '12px' }}>
                    <span>Price: <span style={{ color: 'var(--text-primary)' }}>{order.price || '-'}</span></span>
                    <span>Amt: <span style={{ color: 'var(--text-primary)' }}>{Number(order.amount).toFixed(6)}</span></span>
                    <span>Filled: <span style={{ color: 'var(--text-primary)' }}>{Number(order.filled).toFixed(6)}</span></span>
                  </div>
                </div>
                <button
                  onClick={() => handleCancel(order.id)}
                  style={{
                    padding: '6px 16px',
                    background: 'var(--bg-tertiary)',
                    border: '1px solid var(--border)',
                    color: 'var(--red)',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '12px',
                    flexShrink: 0,
                    position: 'relative',
                    zIndex: 25,
                  }}
                >
                  Cancel
                </button>
              </div>
            ))}
          </div>
        )}

        {orderTabActive === 'history' && (
          <div>
            {orderHistory.length === 0 && (
              <div
                style={{
                  color: 'var(--text-tertiary)',
                  padding: '20px 0',
                  textAlign: 'center',
                }}
              >
                No order history yet.
              </div>
            )}
            {orderHistory.length > 0 && (
              <table
                style={{
                  width: '100%',
                  borderCollapse: 'collapse',
                  fontSize: '13px',
                }}
              >
                <thead>
                  <tr
                    style={{
                      color: 'var(--text-tertiary)',
                      borderBottom: '1px solid var(--border)',
                    }}
                  >
                    <th style={{ textAlign: 'left', padding: '6px' }}>Pair</th>
                    <th style={{ textAlign: 'left', padding: '6px' }}>Type</th>
                    <th style={{ textAlign: 'left', padding: '6px' }}>Side</th>
                    <th style={{ textAlign: 'right', padding: '6px' }}>
                      Price
                    </th>
                    <th style={{ textAlign: 'right', padding: '6px' }}>
                      Amount
                    </th>
                    <th style={{ textAlign: 'right', padding: '6px' }}>
                      Filled
                    </th>
                    <th style={{ textAlign: 'center', padding: '6px' }}>
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {orderHistory.map((order) => (
                    <tr
                      key={order.id}
                      style={{
                        borderBottom: '1px solid var(--border)',
                      }}
                    >
                      <td style={{ padding: '6px' }}>
                        {order.symbol.replace('_', '/')}
                      </td>
                      <td style={{ padding: '6px' }}>{order.type}</td>
                      <td
                        style={{
                          padding: '6px',
                          color:
                            order.side === 'buy'
                              ? 'var(--green)'
                              : 'var(--red)',
                        }}
                      >
                        {order.side}
                      </td>
                      <td
                        style={{
                          padding: '6px',
                          textAlign: 'right',
                          fontFamily: "'JetBrains Mono', monospace",
                        }}
                      >
                        {order.price || '-'}
                      </td>
                      <td
                        style={{
                          padding: '6px',
                          textAlign: 'right',
                          fontFamily: "'JetBrains Mono', monospace",
                        }}
                      >
                        {Number(order.amount).toFixed(6)}
                      </td>
                      <td
                        style={{
                          padding: '6px',
                          textAlign: 'right',
                          fontFamily: "'JetBrains Mono', monospace",
                        }}
                      >
                        {Number(order.filled).toFixed(6)}
                      </td>
                      <td style={{ padding: '6px', textAlign: 'center' }}>
                        <span
                          className="badge"
                          style={{
                            padding: '2px 8px',
                            borderRadius: '4px',
                            fontSize: '12px',
                            background:
                              order.status === 'filled'
                                ? 'rgba(14, 203, 129, 0.1)'
                                : 'rgba(132, 142, 156, 0.1)',
                            color:
                              order.status === 'filled'
                                ? 'var(--green)'
                                : 'var(--text-secondary)',
                          }}
                        >
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
