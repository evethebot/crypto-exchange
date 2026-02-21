import { db } from './db';
import { orders, trades, wallets, walletTransactions, tradingPairs, orderSequence } from './db/schema';
import { eq, and, sql, asc, desc, gte, lte } from 'drizzle-orm';

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
  
  // For limit orders, create the order first
  const [order] = await db.insert(orders).values({
    userId: input.userId,
    symbol: input.symbol,
    side: input.side,
    type: input.type,
    price: input.price || null,
    amount: input.amount,
    filled: '0',
    remaining: input.amount,
    status: 'new',
    seq,
  }).returning();

  const executedTrades: Array<{ id: string; price: string; amount: string }> = [];
  let filledAmount = 0;
  let remainingAmount = Number(input.amount);

  // Find matching orders
  // For a buy order, match against sell orders (asks) at price <= buy price
  // For a sell order, match against buy orders (bids) at price >= sell price
  const isMarket = input.type === 'market';

  if (input.side === 'buy') {
    // Match against sell orders, lowest price first
    const matchingOrders = await db
      .select()
      .from(orders)
      .where(and(
        eq(orders.symbol, input.symbol),
        eq(orders.side, 'sell'),
        sql`${orders.status} IN ('new', 'partially_filled')`,
        // Self-trade prevention: don't match own orders
        sql`${orders.userId} != ${input.userId}`,
        // For limit orders, only match at or below buy price
        isMarket ? sql`true` : lte(orders.price, input.price!),
      ))
      .orderBy(asc(orders.price), asc(orders.seq));

    for (const makerOrder of matchingOrders) {
      if (remainingAmount <= 0) break;

      const makerRemaining = Number(makerOrder.remaining);
      const tradeAmount = Math.min(remainingAmount, makerRemaining);
      const tradePrice = makerOrder.price!; // Execute at maker's price

      // Get trading pair for fee calculation
      const [pair] = await db
        .select()
        .from(tradingPairs)
        .where(eq(tradingPairs.symbol, input.symbol))
        .limit(1);

      const makerFeeBps = pair?.makerFeeBps || 10;
      const takerFeeBps = pair?.takerFeeBps || 10;
      
      const buyerFee = (tradeAmount * takerFeeBps / 10000).toFixed(8);
      const sellerFee = (Number(tradePrice) * tradeAmount * makerFeeBps / 10000).toFixed(8);
      
      const tradeSeq = await getNextSeq();

      // Create trade record
      const [trade] = await db.insert(trades).values({
        symbol: input.symbol,
        buyOrderId: order.id,
        sellOrderId: makerOrder.id,
        buyerUserId: input.userId,
        sellerUserId: makerOrder.userId,
        price: tradePrice,
        amount: tradeAmount.toFixed(8),
        buyerFee,
        sellerFee,
        seq: tradeSeq,
      }).returning();

      executedTrades.push({ id: trade.id, price: tradePrice, amount: tradeAmount.toFixed(8) });

      // Update maker order
      const newMakerFilled = Number(makerOrder.filled) + tradeAmount;
      const newMakerRemaining = makerRemaining - tradeAmount;
      await db.update(orders).set({
        filled: newMakerFilled.toFixed(8),
        remaining: newMakerRemaining.toFixed(8),
        status: newMakerRemaining <= 0.00000001 ? 'filled' : 'partially_filled',
        updatedAt: new Date(),
      }).where(eq(orders.id, makerOrder.id));

      // Settle wallets
      const baseCurrency = input.symbol.split('_')[0];
      const quoteCurrency = input.symbol.split('_')[1];
      const quoteAmount = Number(tradePrice) * tradeAmount;

      const makerUserId = makerOrder.userId;

      // Buyer gets base currency (minus fee)
      const buyerReceives = tradeAmount - Number(buyerFee);
      await upsertWalletAdd(input.userId, baseCurrency, buyerReceives);
      await recordTransaction(input.userId, baseCurrency, 'trade', buyerReceives.toFixed(8), trade.id);

      // Seller gets quote currency (minus fee) - unfreeze from their frozen balance
      const sellerReceives = quoteAmount - Number(sellerFee);
      // Unfreeze maker's base currency
      await unfreezeWallet(makerUserId, baseCurrency, tradeAmount);
      // Credit maker with quote currency
      await upsertWalletAdd(makerUserId, quoteCurrency, sellerReceives);
      await recordTransaction(makerUserId, quoteCurrency, 'trade', sellerReceives.toFixed(8), trade.id);

      // Deduct buyer's quote currency (unfreezing frozen amount)
      await unfreezeWallet(input.userId, quoteCurrency, quoteAmount);

      if (Number(buyerFee) > 0) {
        await recordTransaction(input.userId, baseCurrency, 'fee', `-${buyerFee}`, trade.id);
      }
      if (Number(sellerFee) > 0) {
        await recordTransaction(makerUserId, quoteCurrency, 'fee', `-${sellerFee}`, trade.id);
      }

      filledAmount += tradeAmount;
      remainingAmount -= tradeAmount;
    }
  } else {
    // Sell side - match against buy orders, highest price first
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
      if (remainingAmount <= 0) break;

      const makerRemaining = Number(makerOrder.remaining);
      const tradeAmount = Math.min(remainingAmount, makerRemaining);
      const tradePrice = makerOrder.price!;

      const [pair] = await db
        .select()
        .from(tradingPairs)
        .where(eq(tradingPairs.symbol, input.symbol))
        .limit(1);

      const makerFeeBps = pair?.makerFeeBps || 10;
      const takerFeeBps = pair?.takerFeeBps || 10;
      
      const sellerFee = (Number(tradePrice) * tradeAmount * takerFeeBps / 10000).toFixed(8);
      const buyerFee = (tradeAmount * makerFeeBps / 10000).toFixed(8);

      const tradeSeq = await getNextSeq();

      const [trade] = await db.insert(trades).values({
        symbol: input.symbol,
        buyOrderId: makerOrder.id,
        sellOrderId: order.id,
        buyerUserId: makerOrder.userId,
        sellerUserId: input.userId,
        price: tradePrice,
        amount: tradeAmount.toFixed(8),
        buyerFee,
        sellerFee,
        seq: tradeSeq,
      }).returning();

      executedTrades.push({ id: trade.id, price: tradePrice, amount: tradeAmount.toFixed(8) });

      // Update maker order
      const newMakerFilled = Number(makerOrder.filled) + tradeAmount;
      const newMakerRemaining = makerRemaining - tradeAmount;
      await db.update(orders).set({
        filled: newMakerFilled.toFixed(8),
        remaining: newMakerRemaining.toFixed(8),
        status: newMakerRemaining <= 0.00000001 ? 'filled' : 'partially_filled',
        updatedAt: new Date(),
      }).where(eq(orders.id, makerOrder.id));

      // Settle wallets
      const baseCurrency = input.symbol.split('_')[0];
      const quoteCurrency = input.symbol.split('_')[1];
      const quoteAmount = Number(tradePrice) * tradeAmount;

      // Buyer (maker) gets base currency (minus fee)
      const buyerReceives = tradeAmount - Number(buyerFee);
      // Unfreeze maker's quote currency
      await unfreezeWallet(makerOrder.userId, quoteCurrency, quoteAmount);
      await upsertWalletAdd(makerOrder.userId, baseCurrency, buyerReceives);
      await recordTransaction(makerOrder.userId, baseCurrency, 'trade', buyerReceives.toFixed(8), trade.id);

      // Seller (taker) gets quote currency (minus fee)
      const sellerReceives = quoteAmount - Number(sellerFee);
      // Unfreeze seller's base currency
      await unfreezeWallet(input.userId, baseCurrency, tradeAmount);
      await upsertWalletAdd(input.userId, quoteCurrency, sellerReceives);
      await recordTransaction(input.userId, quoteCurrency, 'trade', sellerReceives.toFixed(8), trade.id);

      if (Number(buyerFee) > 0) {
        await recordTransaction(makerOrder.userId, baseCurrency, 'fee', `-${buyerFee}`, trade.id);
      }
      if (Number(sellerFee) > 0) {
        await recordTransaction(input.userId, quoteCurrency, 'fee', `-${sellerFee}`, trade.id);
      }

      filledAmount += tradeAmount;
      remainingAmount -= tradeAmount;
    }
  }

  // Update taker order status
  const orderStatus = remainingAmount <= 0.00000001 ? 'filled' :
    filledAmount > 0 ? 'partially_filled' : 'new';

  // For market orders with no liquidity, cancel remaining
  const finalStatus = input.type === 'market' && filledAmount === 0 ? 'cancelled' :
    input.type === 'market' && remainingAmount > 0 ? 'cancelled' : orderStatus;

  await db.update(orders).set({
    filled: filledAmount.toFixed(8),
    remaining: Math.max(0, remainingAmount).toFixed(8),
    status: finalStatus as any,
    updatedAt: new Date(),
  }).where(eq(orders.id, order.id));

  return {
    orderId: order.id,
    status: finalStatus,
    filled: filledAmount.toFixed(8),
    remaining: Math.max(0, remainingAmount).toFixed(8),
    trades: executedTrades,
  };
}

async function upsertWalletAdd(userId: string, currency: string, amount: number) {
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

async function unfreezeWallet(userId: string, currency: string, amount: number) {
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
  const amountStr = amount.toFixed(8);
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
  const amountStr = amount.toFixed(8);
  await db.execute(sql`
    UPDATE wallets 
    SET available = available + ${amountStr}::numeric,
        frozen = GREATEST(frozen - ${amountStr}::numeric, 0),
        updated_at = NOW()
    WHERE user_id = ${userId} AND currency = ${currency}
  `);
}
