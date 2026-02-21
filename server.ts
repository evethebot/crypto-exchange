import { createServer } from 'http';
import next from 'next';
import { parse } from 'url';
import { WebSocketServer, WebSocket } from 'ws';
import { db } from './src/lib/db';
import { orders, trades, tradingPairs, wallets } from './src/lib/db/schema';
import { eq, and, sql, desc } from 'drizzle-orm';
import jwt from 'jsonwebtoken';

const dev = process.env.NODE_ENV !== 'production';
const hostname = '0.0.0.0';
const port = parseInt(process.env.PORT || '3000', 10);

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

interface ClientState {
  ws: WebSocket;
  subscriptions: Set<string>;
  userId?: string;
  isAlive: boolean;
}

const clients = new Set<ClientState>();

// Channel data helpers
async function getDepthData(symbol: string, limit: number = 20) {
  try {
    const bidsRaw = await db.execute(sql`
      SELECT price, SUM(remaining::numeric) as amount
      FROM orders
      WHERE symbol = ${symbol} AND side = 'buy' AND status IN ('new', 'partially_filled')
      GROUP BY price ORDER BY price::numeric DESC LIMIT ${limit}
    `);
    
    const asksRaw = await db.execute(sql`
      SELECT price, SUM(remaining::numeric) as amount
      FROM orders
      WHERE symbol = ${symbol} AND side = 'sell' AND status IN ('new', 'partially_filled')
      GROUP BY price ORDER BY price::numeric ASC LIMIT ${limit}
    `);

    return {
      bids: bidsRaw.map((r: any) => [String(r.price), String(r.amount)]),
      asks: asksRaw.map((r: any) => [String(r.price), String(r.amount)]),
    };
  } catch {
    return { bids: [], asks: [] };
  }
}

async function getTickerData(symbol: string) {
  try {
    const [latestTrade] = await db
      .select()
      .from(trades)
      .where(eq(trades.symbol, symbol))
      .orderBy(desc(trades.createdAt))
      .limit(1);

    return {
      symbol,
      lastPrice: latestTrade?.price || '0',
      volume24h: '0',
      high24h: latestTrade?.price || '0',
      low24h: latestTrade?.price || '0',
      change24h: '0',
      changePercent24h: '0',
    };
  } catch {
    return {
      symbol,
      lastPrice: '0',
      volume24h: '0',
      high24h: '0',
      low24h: '0',
      change24h: '0',
      changePercent24h: '0',
    };
  }
}

async function getAllTickerData() {
  try {
    const pairs = await db.select().from(tradingPairs).where(eq(tradingPairs.isActive, true));
    const tickers = await Promise.all(pairs.map(p => getTickerData(p.symbol)));
    return tickers;
  } catch {
    return [];
  }
}

function handleMessage(client: ClientState, raw: string) {
  try {
    const msg = JSON.parse(raw);
    const { method, params, id } = msg;

    switch (method) {
      case 'PING':
        client.ws.send(JSON.stringify({ id, result: 'ok', method: 'PONG' }));
        break;

      case 'SUBSCRIBE':
        handleSubscribe(client, params || [], id);
        break;

      case 'UNSUBSCRIBE':
        if (params) {
          for (const ch of params) {
            client.subscriptions.delete(ch);
          }
        }
        client.ws.send(JSON.stringify({ id, result: 'ok' }));
        break;

      case 'AUTH':
        handleAuth(client, params, id);
        break;

      default:
        client.ws.send(JSON.stringify({ id, error: 'unknown_method' }));
    }
  } catch (e) {
    // Ignore parse errors
  }
}

function handleAuth(client: ClientState, params: any, id: number) {
  try {
    const token = Array.isArray(params) ? params[0] : params?.token;
    if (!token) {
      client.ws.send(JSON.stringify({ id, error: 'missing_token' }));
      return;
    }
    const secret = process.env.JWT_SECRET || 'dev-jwt-secret-change-in-production';
    const decoded = jwt.verify(token, secret) as any;
    client.userId = decoded.userId;
    client.ws.send(JSON.stringify({ id, result: 'ok' }));
  } catch {
    client.ws.send(JSON.stringify({ id, error: 'invalid_token' }));
  }
}

async function handleSubscribe(client: ClientState, params: string[], id: number) {
  for (const channel of params) {
    // Check if it's a private channel
    if (channel === 'orders' || channel === 'balances' || channel.startsWith('orders@') || channel.startsWith('balances@')) {
      if (!client.userId) {
        client.ws.send(JSON.stringify({ id, error: 'auth_required', message: 'Private channel requires authentication' }));
        return;
      }
    }

    client.subscriptions.add(channel);

    // Send immediate snapshot for some channels
    if (channel.startsWith('depth@')) {
      const parts = channel.split('@');
      const symbol = parts[1];
      const limit = parseInt(parts[2] || '20');
      const data = await getDepthData(symbol, limit);
      client.ws.send(JSON.stringify({
        channel: `depth@${symbol}`,
        data,
      }));
    } else if (channel.startsWith('ticker@')) {
      const parts = channel.split('@');
      const symbol = parts[1];
      if (symbol === 'ALL') {
        const tickers = await getAllTickerData();
        client.ws.send(JSON.stringify({
          channel: 'ticker@ALL',
          data: tickers,
        }));
      } else {
        const data = await getTickerData(symbol);
        client.ws.send(JSON.stringify({
          channel: `ticker@${symbol}`,
          data,
        }));
      }
    }
  }

  client.ws.send(JSON.stringify({ id, result: 'ok' }));
}

// Broadcast to subscribers of a channel
export function broadcast(channel: string, data: any) {
  const message = JSON.stringify({ channel, data });
  for (const client of clients) {
    if (client.ws.readyState === WebSocket.OPEN && client.subscriptions.has(channel)) {
      client.ws.send(message);
    }
  }
}

// Make broadcast available globally for the matching engine
(globalThis as any).__wsBroadcast = broadcast;

app.prepare().then(() => {
  const server = createServer(async (req, res) => {
    try {
      const parsedUrl = parse(req.url!, true);
      await handle(req, res, parsedUrl);
    } catch (err) {
      console.error('Error handling request:', err);
      res.statusCode = 500;
      res.end('Internal Server Error');
    }
  });

  const wss = new WebSocketServer({ noServer: true });

  server.on('upgrade', (request, socket, head) => {
    const { pathname } = parse(request.url!, true);
    
    if (pathname === '/ws') {
      wss.handleUpgrade(request, socket, head, (ws) => {
        wss.emit('connection', ws, request);
      });
    } else {
      // Let Next.js handle HMR WebSocket etc.
      // Don't destroy the socket - let it pass through
    }
  });

  wss.on('connection', (ws) => {
    const client: ClientState = {
      ws,
      subscriptions: new Set(),
      isAlive: true,
    };
    clients.add(client);

    ws.on('message', (data) => {
      handleMessage(client, data.toString());
    });

    ws.on('close', () => {
      clients.delete(client);
    });

    ws.on('pong', () => {
      client.isAlive = true;
    });
  });

  // Heartbeat - check for dead connections
  const heartbeat = setInterval(() => {
    for (const client of clients) {
      if (!client.isAlive) {
        client.ws.terminate();
        clients.delete(client);
        continue;
      }
      client.isAlive = false;
      client.ws.ping();
    }
  }, 30000);

  wss.on('close', () => {
    clearInterval(heartbeat);
  });

  server.listen(port, () => {
    console.log(`> Ready on http://localhost:${port}`);
  });
});
