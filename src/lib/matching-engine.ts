import Big from 'big.js';
import { db } from './db';
import { orders, trades, wallets, walletTransactions, tradingPairs, orderSequence } from './db/schema';
import { eq, and, sql, asc, desc, gte, lte } from 'drizzle-orm';

// Configure big.js for financial precision
Big.DP = 20; // decimal places for division
Big.RM = Big.roundDown; // round down (conservative for financial)

// ===== Circuit Breaker: halt trading when price moves >15% in 1 minute =====
const CIRCUIT_BREAKER_THRESHOLD = 0.15; // 15%
const CIRCUIT_BREAKER_WINDOW_MS = 60_000; // 1 minute

interface PriceRecord {
  price: number;
  timestamp: number;
}

const recentPrices = new Map<string, PriceRecord[]>();
const circuitBreakerTripped = new Map<string, { trippedAt: number; referencePrice: number; triggerPrice: number }>();

export function recordTradePrice(symbol: string, price: number) {
  const now = Date.now();
  const records = recentPrices.get(symbol) || [];
  records.push({ price, timestamp: now });
  // Keep only last 1 minute of prices
  const cutoff = now - CIRCUIT_BREAKER_WINDOW_MS;
  const filtered = records.filter(r => r.timestamp >= cutoff);
  recentPrices.set(symbol, filtered);
}

export function checkCircuitBreaker(symbol: string, proposedPrice: number): { allowed: boolean; error?: string } {
  const now = Date.now();
  
  // Check if circuit breaker is currently tripped
  const tripped = circuitBreakerTripped.get(symbol);
  if (tripped && now - tripped.trippedAt < CIRCUIT_BREAKER_WINDOW_MS) {
    return { allowed: false, error: `CIRCUIT_BREAKER: Trading halted for ${symbol}. Price moved >15% in 1 minute.` };
  } else if (tripped) {
    // Circuit breaker expired, clear it
    circuitBreakerTripped.delete(symbol);
  }

  const records = recentPrices.get(symbol) || [];
  if (records.length === 0) return { allowed: true };

  const cutoff = now - CIRCUIT_BREAKER_WINDOW_MS;
  const recentRecords = records.filter(r => r.timestamp >= cutoff);
  if (recentRecords.length === 0) return { allowed: true };

  // Reference price = earliest price in the window
  const referencePrice = recentRecords[0].price;
  if (referencePrice === 0) return { allowed: true };

  const change = Math.abs(proposedPrice - referencePrice) / referencePrice;
  
  if (change > CIRCUIT_BREAKER_THRESHOLD) {
    circuitBreakerTripped.set(symbol, { trippedAt: now, referencePrice, triggerPrice: proposedPrice });
    return { allowed: false, error: `CIRCUIT_BREAKER: Price change ${(change * 100).toFixed(1)}% exceeds 15% threshold for ${symbol}` };
  }

  return { allowed: true };
}

export function getCircuitBreakerStatus(symbol: string): { active: boolean; trippedAt?: number; referencePrice?: number; triggerPrice?: number } {
  const tripped = circuitBreakerTripped.get(symbol);
  const now = Date.now();
  if (tripped && now - tripped.trippedAt < CIRCUIT_BREAKER_WINDOW_MS) {
    return { active: true, ...tripped };
  }
  return { active: false };
}

export function resetCircuitBreaker(symbol?: string) {
  if (symbol) {
    circuitBreakerTripped.delete(symbol);
    recentPrices.delete(symbol);
  } else {
    circuitBreakerTripped.clear();
    recentPrices.clear();
  }
}

interface OrderInput {
  userId: string;
  symbol: string;
  side: 'buy' | 'sell';
  type: 'limit' | 'market';
  price?: string;
  amount: string;
}

interface MatchResult {
  orderId: string;
  status: string;
  filled: string;
  remaining: string;
  trades: Array<{
    id: string;
    price: string;
    amount: string;
  }>;
}

const ZERO = new Big('0');
const EPSILON = new Big('0.00000001');
const BPS_DIVISOR = new Big('10000');

async function getNextSeq(): Promise<number> {
  const [result] = await db
    .update(orderSequence)
    .set({ lastSeq: sql`${orderSequence.lastSeq} + 1` })
    .where(eq(orderSequence.id, 1))
    .returning();
  return result.lastSeq;
}

export async function processOrder(input: OrderInput): Promise<MatchResult> {
  const seq = await getNextSeq();
  
  const inputAmount = new Big(input.amount);

  // Create the order
  const [order] = await db.insert(orders).values({
    userId: input.userId,
    symbol: input.symbol,
    side: input.side,
    type: input.type,
    price: input.price || null,
    amount: inputAmount.toFixed(8),
    filled: '0',
    remaining: inputAmount.toFixed(8),
    status: 'new',
    seq,
  }).returning();

  const executedTrades: Array<{ id: string; price: string; amount: string }> = [];
  let filledAmount = ZERO;
  let remainingAmount = inputAmount;

  const isMarket = input.type === 'market';

  if (input.side === 'buy') {
    const matchingOrders = await db
      .select()
      .from(orders)
      .where(and(
        eq(orders.symbol, input.symbol),
        eq(orders.side, 'sell'),
        sql`${orders.status} IN ('new', 'partially_filled')`,
        sql`${orders.userId} != ${input.userId}`,
        isMarket ? sql`true` : lte(orders.price, input.price!),
      ))
      .orderBy(asc(orders.price), asc(orders.seq));

    for (const makerOrder of matchingOrders) {
      if (remainingAmount.lte(EPSILON)) break;

      const makerRemaining = new Big(makerOrder.remaining || '0');
      const tradeAmount = remainingAmount.lt(makerRemaining) ? remainingAmount : makerRemaining;
      const tradePrice = new Big(makerOrder.price!);

      // Circuit breaker check before executing trade
      const cbCheck = checkCircuitBreaker(input.symbol, tradePrice.toNumber());
      if (!cbCheck.allowed) break; // Stop matching, leave remaining as open order

      const [pair] = await db
        .select()
        .from(tradingPairs)
        .where(eq(tradingPairs.symbol, input.symbol))
        .limit(1);

      const makerFeeBps = new Big(pair?.makerFeeBps || 10);
      const takerFeeBps = new Big(pair?.takerFeeBps || 10);
      
      // Buyer is taker, seller is maker
      const buyerFee = tradeAmount.times(takerFeeBps).div(BPS_DIVISOR);
      const sellerFee = tradePrice.times(tradeAmount).times(makerFeeBps).div(BPS_DIVISOR);
      
      const tradeSeq = await getNextSeq();

      const [trade] = await db.insert(trades).values({
        symbol: input.symbol,
        buyOrderId: order.id,
        sellOrderId: makerOrder.id,
        buyerUserId: input.userId,
        sellerUserId: makerOrder.userId,
        price: tradePrice.toFixed(8),
        amount: tradeAmount.toFixed(8),
        buyerFee: buyerFee.toFixed(8),
        sellerFee: sellerFee.toFixed(8),
        seq: tradeSeq,
      }).returning();

      executedTrades.push({ id: trade.id, price: tradePrice.toFixed(8), amount: tradeAmount.toFixed(8) });
      // Record price for circuit breaker
      recordTradePrice(input.symbol, tradePrice.toNumber());

      // Update maker order
      const newMakerFilled = new Big(makerOrder.filled || '0').plus(tradeAmount);
      const newMakerRemaining = makerRemaining.minus(tradeAmount);
      await db.update(orders).set({
        filled: newMakerFilled.toFixed(8),
        remaining: newMakerRemaining.toFixed(8),
        status: newMakerRemaining.lte(EPSILON) ? 'filled' : 'partially_filled',
        updatedAt: new Date(),
      }).where(eq(orders.id, makerOrder.id));

      // Settle wallets
      const baseCurrency = input.symbol.split('_')[0];
      const quoteCurrency = input.symbol.split('_')[1];
      const quoteAmount = tradePrice.times(tradeAmount);

      const makerUserId = makerOrder.userId;

      // Buyer gets base currency (minus fee)
      const buyerReceives = tradeAmount.minus(buyerFee);
      await upsertWalletAdd(input.userId, baseCurrency, buyerReceives);
      await recordTransaction(input.userId, baseCurrency, 'trade', buyerReceives.toFixed(8), trade.id);

      // Seller gets quote currency (minus fee)
      const sellerReceives = quoteAmount.minus(sellerFee);
      await unfreezeWallet(makerUserId, baseCurrency, tradeAmount);
      await upsertWalletAdd(makerUserId, quoteCurrency, sellerReceives);
      await recordTransaction(makerUserId, quoteCurrency, 'trade', sellerReceives.toFixed(8), trade.id);

      // Unfreeze buyer's quote currency
      await unfreezeWallet(input.userId, quoteCurrency, quoteAmount);

      if (buyerFee.gt(ZERO)) {
        await recordTransaction(input.userId, baseCurrency, 'fee', `-${buyerFee.toFixed(8)}`, trade.id);
      }
      if (sellerFee.gt(ZERO)) {
        await recordTransaction(makerUserId, quoteCurrency, 'fee', `-${sellerFee.toFixed(8)}`, trade.id);
      }

      filledAmount = filledAmount.plus(tradeAmount);
      remainingAmount = remainingAmount.minus(tradeAmount);
    }
  } else {
    // Sell side
    const matchingOrders = await db
      .select()
      .from(orders)
      .where(and(
        eq(orders.symbol, input.symbol),
        eq(orders.side, 'buy'),
        sql`${orders.status} IN ('new', 'partially_filled')`,
        sql`${orders.userId} != ${input.userId}`,
        isMarket ? sql`true` : gte(orders.price, input.price!),
      ))
      .orderBy(desc(orders.price), asc(orders.seq));

    for (const makerOrder of matchingOrders) {
      if (remainingAmount.lte(EPSILON)) break;

      const makerRemaining = new Big(makerOrder.remaining || '0');
      const tradeAmount = remainingAmount.lt(makerRemaining) ? remainingAmount : makerRemaining;
      const tradePrice = new Big(makerOrder.price!);

      // Circuit breaker check before executing trade
      const cbCheck = checkCircuitBreaker(input.symbol, tradePrice.toNumber());
      if (!cbCheck.allowed) break; // Stop matching, leave remaining as open order

      const [pair] = await db
        .select()
        .from(tradingPairs)
        .where(eq(tradingPairs.symbol, input.symbol))
        .limit(1);

      const makerFeeBps = new Big(pair?.makerFeeBps || 10);
      const takerFeeBps = new Big(pair?.takerFeeBps || 10);
      
      // Seller is taker, buyer is maker
      const sellerFee = tradePrice.times(tradeAmount).times(takerFeeBps).div(BPS_DIVISOR);
      const buyerFee = tradeAmount.times(makerFeeBps).div(BPS_DIVISOR);

      const tradeSeq = await getNextSeq();

      const [trade] = await db.insert(trades).values({
        symbol: input.symbol,
        buyOrderId: makerOrder.id,
        sellOrderId: order.id,
        buyerUserId: makerOrder.userId,
        sellerUserId: input.userId,
        price: tradePrice.toFixed(8),
        amount: tradeAmount.toFixed(8),
        buyerFee: buyerFee.toFixed(8),
        sellerFee: sellerFee.toFixed(8),
        seq: tradeSeq,
      }).returning();

      executedTrades.push({ id: trade.id, price: tradePrice.toFixed(8), amount: tradeAmount.toFixed(8) });
      // Record price for circuit breaker
      recordTradePrice(input.symbol, tradePrice.toNumber());

      // Update maker order
      const newMakerFilled = new Big(makerOrder.filled || '0').plus(tradeAmount);
      const newMakerRemaining = makerRemaining.minus(tradeAmount);
      await db.update(orders).set({
        filled: newMakerFilled.toFixed(8),
        remaining: newMakerRemaining.toFixed(8),
        status: newMakerRemaining.lte(EPSILON) ? 'filled' : 'partially_filled',
        updatedAt: new Date(),
      }).where(eq(orders.id, makerOrder.id));

      // Settle wallets
      const baseCurrency = input.symbol.split('_')[0];
      const quoteCurrency = input.symbol.split('_')[1];
      const quoteAmount = tradePrice.times(tradeAmount);

      // Buyer (maker) gets base currency (minus fee)
      const buyerReceives = tradeAmount.minus(buyerFee);
      await unfreezeWallet(makerOrder.userId, quoteCurrency, quoteAmount);
      await upsertWalletAdd(makerOrder.userId, baseCurrency, buyerReceives);
      await recordTransaction(makerOrder.userId, baseCurrency, 'trade', buyerReceives.toFixed(8), trade.id);

      // Seller (taker) gets quote currency (minus fee)
      const sellerReceives = quoteAmount.minus(sellerFee);
      await unfreezeWallet(input.userId, baseCurrency, tradeAmount);
      await upsertWalletAdd(input.userId, quoteCurrency, sellerReceives);
      await recordTransaction(input.userId, quoteCurrency, 'trade', sellerReceives.toFixed(8), trade.id);

      if (buyerFee.gt(ZERO)) {
        await recordTransaction(makerOrder.userId, baseCurrency, 'fee', `-${buyerFee.toFixed(8)}`, trade.id);
      }
      if (sellerFee.gt(ZERO)) {
        await recordTransaction(input.userId, quoteCurrency, 'fee', `-${sellerFee.toFixed(8)}`, trade.id);
      }

      filledAmount = filledAmount.plus(tradeAmount);
      remainingAmount = remainingAmount.minus(tradeAmount);
    }
  }

  // Update taker order status
  const orderStatus = remainingAmount.lte(EPSILON) ? 'filled' :
    filledAmount.gt(ZERO) ? 'partially_filled' : 'new';

  const finalStatus = input.type === 'market' && filledAmount.eq(ZERO) ? 'cancelled' :
    input.type === 'market' && remainingAmount.gt(EPSILON) ? 'cancelled' : orderStatus;

  const finalRemaining = remainingAmount.lt(ZERO) ? ZERO : remainingAmount;

  await db.update(orders).set({
    filled: filledAmount.toFixed(8),
    remaining: finalRemaining.toFixed(8),
    status: finalStatus as any,
    updatedAt: new Date(),
  }).where(eq(orders.id, order.id));

  return {
    orderId: order.id,
    status: finalStatus,
    filled: filledAmount.toFixed(8),
    remaining: finalRemaining.toFixed(8),
    trades: executedTrades,
  };
}

async function upsertWalletAdd(userId: string, currency: string, amount: Big) {
  const amountStr = amount.toFixed(8);
  try {
    const existing = await db.execute(sql`
      SELECT id FROM wallets WHERE user_id = ${userId} AND currency = ${currency} LIMIT 1
    `);

    if (existing.length > 0) {
      await db.execute(sql`
        UPDATE wallets 
        SET available = available + ${amountStr}::numeric, updated_at = NOW()
        WHERE id = ${existing[0].id}
      `);
    } else {
      await db.execute(sql`
        INSERT INTO wallets (user_id, currency, available, frozen)
        VALUES (${userId}, ${currency}, ${amountStr}::numeric, 0)
      `);
    }
  } catch (err: any) {
    console.error('[WALLET] upsertWalletAdd error:', err?.message);
  }
}

async function unfreezeWallet(userId: string, currency: string, amount: Big) {
  const amountStr = amount.toFixed(8);
  try {
    await db.execute(sql`
      UPDATE wallets 
      SET frozen = GREATEST(frozen - ${amountStr}::numeric, 0), updated_at = NOW()
      WHERE user_id = ${userId} AND currency = ${currency}
    `);
  } catch (err: any) {
    console.error('unfreezeWallet error:', err?.message, { userId, currency, amount: amountStr });
  }
}

async function recordTransaction(userId: string, currency: string, type: 'trade' | 'fee', amount: string, referenceId: string) {
  try {
    const [wallet] = await db
      .select()
      .from(wallets)
      .where(and(eq(wallets.userId, userId), eq(wallets.currency, currency)))
      .limit(1);

    await db.insert(walletTransactions).values({
      userId,
      currency,
      type,
      amount,
      balance: wallet?.available || '0',
      referenceId,
      referenceType: 'trade',
    });
  } catch (err: any) {
    console.error('recordTransaction error:', err?.message);
  }
}

export async function freezeBalance(userId: string, currency: string, amount: number): Promise<boolean> {
  const amountBig = new Big(amount);
  const amountStr = amountBig.toFixed(8);
  const result = await db.execute(sql`
    UPDATE wallets 
    SET available = available - ${amountStr}::numeric,
        frozen = frozen + ${amountStr}::numeric,
        updated_at = NOW()
    WHERE user_id = ${userId} AND currency = ${currency} AND available >= ${amountStr}::numeric
    RETURNING id
  `);

  return result.length > 0;
}

export async function unfreezeBalanceOnCancel(userId: string, currency: string, amount: number): Promise<void> {
  const amountBig = new Big(amount);
  const amountStr = amountBig.toFixed(8);
  await db.execute(sql`
    UPDATE wallets 
    SET available = available + ${amountStr}::numeric,
        frozen = GREATEST(frozen - ${amountStr}::numeric, 0),
        updated_at = NOW()
    WHERE user_id = ${userId} AND currency = ${currency}
  `);
}
