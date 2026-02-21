import {
  pgTable,
  pgEnum,
  uuid,
  varchar,
  text,
  timestamp,
  decimal,
  integer,
  boolean,
  bigint,
  index,
  uniqueIndex,
  jsonb,
} from 'drizzle-orm/pg-core';

// ============================================
// Enums
// ============================================
export const userRoleEnum = pgEnum('user_role', ['user', 'admin']);
export const userStatusEnum = pgEnum('user_status', ['active', 'suspended', 'locked']);
export const kycLevelEnum = pgEnum('kyc_level', ['level_0', 'level_1', 'level_2', 'level_3']);
export const orderSideEnum = pgEnum('order_side', ['buy', 'sell']);
export const orderTypeEnum = pgEnum('order_type', ['limit', 'market']);
export const orderStatusEnum = pgEnum('order_status', ['new', 'partially_filled', 'filled', 'cancelled']);
export const tradingPairStatusEnum = pgEnum('trading_pair_status', ['active', 'suspended']);
export const depositStatusEnum = pgEnum('deposit_status', ['pending', 'confirming', 'completed', 'failed']);
export const withdrawalStatusEnum = pgEnum('withdrawal_status', ['pending', 'approved', 'processing', 'completed', 'rejected']);
export const transactionTypeEnum = pgEnum('transaction_type', ['deposit', 'withdrawal', 'trade', 'fee', 'freeze', 'unfreeze']);

// ============================================
// Tables
// ============================================

export const users = pgTable('users', {
  id: uuid('id').defaultRandom().primaryKey(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  nickname: varchar('nickname', { length: 100 }),
  role: userRoleEnum('role').default('user').notNull(),
  status: userStatusEnum('status').default('active').notNull(),
  kycLevel: kycLevelEnum('kyc_level').default('level_0').notNull(),
  twoFactorSecret: text('two_factor_secret'),
  twoFactorEnabled: boolean('two_factor_enabled').default(false).notNull(),
  failedLoginAttempts: integer('failed_login_attempts').default(0).notNull(),
  lockedUntil: timestamp('locked_until'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => [
  uniqueIndex('users_email_idx').on(table.email),
]);

export const tradingPairs = pgTable('trading_pairs', {
  id: uuid('id').defaultRandom().primaryKey(),
  symbol: varchar('symbol', { length: 20 }).notNull().unique(),
  baseCurrency: varchar('base_currency', { length: 10 }).notNull(),
  quoteCurrency: varchar('quote_currency', { length: 10 }).notNull(),
  pricePrecision: integer('price_precision').notNull().default(2),
  amountPrecision: integer('amount_precision').notNull().default(6),
  minAmount: decimal('min_amount', { precision: 20, scale: 8 }).notNull().default('0.0001'),
  minTotal: decimal('min_total', { precision: 20, scale: 8 }).notNull().default('10'),
  makerFeeBps: integer('maker_fee_bps').notNull().default(10),
  takerFeeBps: integer('taker_fee_bps').notNull().default(10),
  status: tradingPairStatusEnum('status').default('active').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => [
  uniqueIndex('trading_pairs_symbol_idx').on(table.symbol),
]);

export const wallets = pgTable('wallets', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').notNull().references(() => users.id),
  currency: varchar('currency', { length: 10 }).notNull(),
  available: decimal('available', { precision: 30, scale: 8 }).notNull().default('0'),
  frozen: decimal('frozen', { precision: 30, scale: 8 }).notNull().default('0'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => [
  uniqueIndex('wallets_user_currency_idx').on(table.userId, table.currency),
  index('wallets_user_id_idx').on(table.userId),
]);

export const orders = pgTable('orders', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').notNull().references(() => users.id),
  symbol: varchar('symbol', { length: 20 }).notNull(),
  side: orderSideEnum('side').notNull(),
  type: orderTypeEnum('type').notNull(),
  price: decimal('price', { precision: 20, scale: 8 }),
  amount: decimal('amount', { precision: 20, scale: 8 }).notNull(),
  filled: decimal('filled', { precision: 20, scale: 8 }).notNull().default('0'),
  remaining: decimal('remaining', { precision: 20, scale: 8 }).notNull(),
  status: orderStatusEnum('status').default('new').notNull(),
  seq: bigint('seq', { mode: 'number' }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => [
  index('orders_user_id_idx').on(table.userId),
  index('orders_symbol_idx').on(table.symbol),
  index('orders_status_idx').on(table.status),
  index('orders_symbol_side_price_idx').on(table.symbol, table.side, table.price),
]);

export const trades = pgTable('trades', {
  id: uuid('id').defaultRandom().primaryKey(),
  symbol: varchar('symbol', { length: 20 }).notNull(),
  buyOrderId: uuid('buy_order_id').notNull().references(() => orders.id),
  sellOrderId: uuid('sell_order_id').notNull().references(() => orders.id),
  buyerUserId: uuid('buyer_user_id').notNull().references(() => users.id),
  sellerUserId: uuid('seller_user_id').notNull().references(() => users.id),
  price: decimal('price', { precision: 20, scale: 8 }).notNull(),
  amount: decimal('amount', { precision: 20, scale: 8 }).notNull(),
  buyerFee: decimal('buyer_fee', { precision: 20, scale: 8 }).notNull().default('0'),
  sellerFee: decimal('seller_fee', { precision: 20, scale: 8 }).notNull().default('0'),
  seq: bigint('seq', { mode: 'number' }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => [
  index('trades_symbol_idx').on(table.symbol),
  index('trades_created_at_idx').on(table.createdAt),
]);

export const candles = pgTable('candles', {
  id: uuid('id').defaultRandom().primaryKey(),
  symbol: varchar('symbol', { length: 20 }).notNull(),
  interval: varchar('interval', { length: 5 }).notNull(),
  openTime: timestamp('open_time').notNull(),
  open: decimal('open', { precision: 20, scale: 8 }).notNull(),
  high: decimal('high', { precision: 20, scale: 8 }).notNull(),
  low: decimal('low', { precision: 20, scale: 8 }).notNull(),
  close: decimal('close', { precision: 20, scale: 8 }).notNull(),
  volume: decimal('volume', { precision: 30, scale: 8 }).notNull().default('0'),
  quoteVolume: decimal('quote_volume', { precision: 30, scale: 8 }).notNull().default('0'),
  tradeCount: integer('trade_count').notNull().default(0),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => [
  uniqueIndex('candles_symbol_interval_time_idx').on(table.symbol, table.interval, table.openTime),
  index('candles_symbol_interval_idx').on(table.symbol, table.interval),
]);

export const deposits = pgTable('deposits', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').notNull().references(() => users.id),
  currency: varchar('currency', { length: 10 }).notNull(),
  amount: decimal('amount', { precision: 20, scale: 8 }).notNull(),
  status: depositStatusEnum('status').default('pending').notNull(),
  txHash: varchar('tx_hash', { length: 255 }),
  confirmations: integer('confirmations').default(0).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => [
  index('deposits_user_id_idx').on(table.userId),
]);

export const withdrawals = pgTable('withdrawals', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').notNull().references(() => users.id),
  currency: varchar('currency', { length: 10 }).notNull(),
  amount: decimal('amount', { precision: 20, scale: 8 }).notNull(),
  fee: decimal('fee', { precision: 20, scale: 8 }).notNull().default('0'),
  address: varchar('address', { length: 255 }).notNull(),
  status: withdrawalStatusEnum('status').default('pending').notNull(),
  txHash: varchar('tx_hash', { length: 255 }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => [
  index('withdrawals_user_id_idx').on(table.userId),
]);

export const walletTransactions = pgTable('wallet_transactions', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').notNull().references(() => users.id),
  currency: varchar('currency', { length: 10 }).notNull(),
  type: transactionTypeEnum('type').notNull(),
  amount: decimal('amount', { precision: 20, scale: 8 }).notNull(),
  balance: decimal('balance', { precision: 30, scale: 8 }).notNull(),
  referenceId: uuid('reference_id'),
  referenceType: varchar('reference_type', { length: 50 }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => [
  index('wallet_transactions_user_id_idx').on(table.userId),
  index('wallet_transactions_created_at_idx').on(table.createdAt),
]);

export const loginHistory = pgTable('login_history', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').notNull().references(() => users.id),
  ip: varchar('ip', { length: 45 }),
  userAgent: text('user_agent'),
  success: boolean('success').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => [
  index('login_history_user_id_idx').on(table.userId),
]);

export const refreshTokens = pgTable('refresh_tokens', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').notNull().references(() => users.id),
  token: text('token').notNull().unique(),
  expiresAt: timestamp('expires_at').notNull(),
  revoked: boolean('revoked').default(false).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => [
  index('refresh_tokens_user_id_idx').on(table.userId),
  uniqueIndex('refresh_tokens_token_idx').on(table.token),
]);

export const apiKeys = pgTable('api_keys', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').notNull().references(() => users.id),
  name: varchar('name', { length: 100 }).notNull(),
  keyHash: text('key_hash').notNull(),
  permissions: jsonb('permissions').default([]).notNull(),
  active: boolean('active').default(true).notNull(),
  lastUsedAt: timestamp('last_used_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => [
  index('api_keys_user_id_idx').on(table.userId),
]);

export const orderSequence = pgTable('order_sequence', {
  id: integer('id').primaryKey().default(1),
  lastSeq: bigint('last_seq', { mode: 'number' }).notNull().default(0),
});
