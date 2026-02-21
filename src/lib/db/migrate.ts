import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import { sql } from 'drizzle-orm';
import * as schema from './schema';

async function migrate() {
  const connectionString = process.env.DATABASE_URL || 'postgresql://vmansus@localhost:5432/crypto_exchange';
  const client = postgres(connectionString);
  const db = drizzle(client, { schema });

  console.log('Running migrations...');
  
  // Create enum types
  const enumQueries = [
    `DO $$ BEGIN CREATE TYPE user_role AS ENUM ('user', 'admin'); EXCEPTION WHEN duplicate_object THEN null; END $$;`,
    `DO $$ BEGIN CREATE TYPE user_status AS ENUM ('active', 'suspended', 'locked'); EXCEPTION WHEN duplicate_object THEN null; END $$;`,
    `DO $$ BEGIN CREATE TYPE kyc_level AS ENUM ('level_0', 'level_1', 'level_2', 'level_3'); EXCEPTION WHEN duplicate_object THEN null; END $$;`,
    `DO $$ BEGIN CREATE TYPE order_side AS ENUM ('buy', 'sell'); EXCEPTION WHEN duplicate_object THEN null; END $$;`,
    `DO $$ BEGIN CREATE TYPE order_type AS ENUM ('limit', 'market'); EXCEPTION WHEN duplicate_object THEN null; END $$;`,
    `DO $$ BEGIN CREATE TYPE order_status AS ENUM ('new', 'partially_filled', 'filled', 'cancelled'); EXCEPTION WHEN duplicate_object THEN null; END $$;`,
    `DO $$ BEGIN CREATE TYPE trading_pair_status AS ENUM ('active', 'suspended'); EXCEPTION WHEN duplicate_object THEN null; END $$;`,
    `DO $$ BEGIN CREATE TYPE deposit_status AS ENUM ('pending', 'confirming', 'completed', 'failed'); EXCEPTION WHEN duplicate_object THEN null; END $$;`,
    `DO $$ BEGIN CREATE TYPE withdrawal_status AS ENUM ('pending', 'approved', 'processing', 'completed', 'rejected'); EXCEPTION WHEN duplicate_object THEN null; END $$;`,
    `DO $$ BEGIN CREATE TYPE transaction_type AS ENUM ('deposit', 'withdrawal', 'trade', 'fee', 'freeze', 'unfreeze'); EXCEPTION WHEN duplicate_object THEN null; END $$;`,
  ];

  for (const q of enumQueries) {
    await db.execute(sql.raw(q));
  }

  // Create tables
  await db.execute(sql.raw(`
    CREATE TABLE IF NOT EXISTS users (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      email VARCHAR(255) NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      nickname VARCHAR(100),
      role user_role NOT NULL DEFAULT 'user',
      status user_status NOT NULL DEFAULT 'active',
      kyc_level kyc_level NOT NULL DEFAULT 'level_0',
      two_factor_secret TEXT,
      two_factor_enabled BOOLEAN NOT NULL DEFAULT false,
      failed_login_attempts INTEGER NOT NULL DEFAULT 0,
      locked_until TIMESTAMP,
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP NOT NULL DEFAULT NOW()
    );
    CREATE UNIQUE INDEX IF NOT EXISTS users_email_idx ON users(email);
  `));

  await db.execute(sql.raw(`
    CREATE TABLE IF NOT EXISTS trading_pairs (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      symbol VARCHAR(20) NOT NULL UNIQUE,
      base_currency VARCHAR(10) NOT NULL,
      quote_currency VARCHAR(10) NOT NULL,
      price_precision INTEGER NOT NULL DEFAULT 2,
      amount_precision INTEGER NOT NULL DEFAULT 6,
      min_amount DECIMAL(20,8) NOT NULL DEFAULT 0.0001,
      min_total DECIMAL(20,8) NOT NULL DEFAULT 10,
      maker_fee_bps INTEGER NOT NULL DEFAULT 10,
      taker_fee_bps INTEGER NOT NULL DEFAULT 10,
      status trading_pair_status NOT NULL DEFAULT 'active',
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    );
    CREATE UNIQUE INDEX IF NOT EXISTS trading_pairs_symbol_idx ON trading_pairs(symbol);
  `));

  await db.execute(sql.raw(`
    CREATE TABLE IF NOT EXISTS wallets (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL REFERENCES users(id),
      currency VARCHAR(10) NOT NULL,
      available DECIMAL(30,8) NOT NULL DEFAULT 0,
      frozen DECIMAL(30,8) NOT NULL DEFAULT 0,
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP NOT NULL DEFAULT NOW()
    );
    CREATE UNIQUE INDEX IF NOT EXISTS wallets_user_currency_idx ON wallets(user_id, currency);
    CREATE INDEX IF NOT EXISTS wallets_user_id_idx ON wallets(user_id);
  `));

  await db.execute(sql.raw(`
    CREATE TABLE IF NOT EXISTS orders (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL REFERENCES users(id),
      symbol VARCHAR(20) NOT NULL,
      side order_side NOT NULL,
      type order_type NOT NULL,
      price DECIMAL(20,8),
      amount DECIMAL(20,8) NOT NULL,
      filled DECIMAL(20,8) NOT NULL DEFAULT 0,
      remaining DECIMAL(20,8) NOT NULL,
      status order_status NOT NULL DEFAULT 'new',
      seq BIGINT,
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP NOT NULL DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS orders_user_id_idx ON orders(user_id);
    CREATE INDEX IF NOT EXISTS orders_symbol_idx ON orders(symbol);
    CREATE INDEX IF NOT EXISTS orders_status_idx ON orders(status);
    CREATE INDEX IF NOT EXISTS orders_symbol_side_price_idx ON orders(symbol, side, price);
  `));

  await db.execute(sql.raw(`
    CREATE TABLE IF NOT EXISTS trades (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      symbol VARCHAR(20) NOT NULL,
      buy_order_id UUID NOT NULL REFERENCES orders(id),
      sell_order_id UUID NOT NULL REFERENCES orders(id),
      buyer_user_id UUID NOT NULL REFERENCES users(id),
      seller_user_id UUID NOT NULL REFERENCES users(id),
      price DECIMAL(20,8) NOT NULL,
      amount DECIMAL(20,8) NOT NULL,
      buyer_fee DECIMAL(20,8) NOT NULL DEFAULT 0,
      seller_fee DECIMAL(20,8) NOT NULL DEFAULT 0,
      seq BIGINT,
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS trades_symbol_idx ON trades(symbol);
    CREATE INDEX IF NOT EXISTS trades_created_at_idx ON trades(created_at);
  `));

  await db.execute(sql.raw(`
    CREATE TABLE IF NOT EXISTS candles (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      symbol VARCHAR(20) NOT NULL,
      interval VARCHAR(5) NOT NULL,
      open_time TIMESTAMP NOT NULL,
      open DECIMAL(20,8) NOT NULL,
      high DECIMAL(20,8) NOT NULL,
      low DECIMAL(20,8) NOT NULL,
      close DECIMAL(20,8) NOT NULL,
      volume DECIMAL(30,8) NOT NULL DEFAULT 0,
      quote_volume DECIMAL(30,8) NOT NULL DEFAULT 0,
      trade_count INTEGER NOT NULL DEFAULT 0,
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    );
    CREATE UNIQUE INDEX IF NOT EXISTS candles_symbol_interval_time_idx ON candles(symbol, interval, open_time);
    CREATE INDEX IF NOT EXISTS candles_symbol_interval_idx ON candles(symbol, interval);
  `));

  await db.execute(sql.raw(`
    CREATE TABLE IF NOT EXISTS deposits (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL REFERENCES users(id),
      currency VARCHAR(10) NOT NULL,
      amount DECIMAL(20,8) NOT NULL,
      status deposit_status NOT NULL DEFAULT 'pending',
      tx_hash VARCHAR(255),
      confirmations INTEGER NOT NULL DEFAULT 0,
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP NOT NULL DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS deposits_user_id_idx ON deposits(user_id);
  `));

  await db.execute(sql.raw(`
    CREATE TABLE IF NOT EXISTS withdrawals (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL REFERENCES users(id),
      currency VARCHAR(10) NOT NULL,
      amount DECIMAL(20,8) NOT NULL,
      fee DECIMAL(20,8) NOT NULL DEFAULT 0,
      address VARCHAR(255) NOT NULL,
      status withdrawal_status NOT NULL DEFAULT 'pending',
      tx_hash VARCHAR(255),
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP NOT NULL DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS withdrawals_user_id_idx ON withdrawals(user_id);
  `));

  await db.execute(sql.raw(`
    CREATE TABLE IF NOT EXISTS wallet_transactions (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL REFERENCES users(id),
      currency VARCHAR(10) NOT NULL,
      type transaction_type NOT NULL,
      amount DECIMAL(20,8) NOT NULL,
      balance DECIMAL(30,8) NOT NULL,
      reference_id UUID,
      reference_type VARCHAR(50),
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS wallet_transactions_user_id_idx ON wallet_transactions(user_id);
    CREATE INDEX IF NOT EXISTS wallet_transactions_created_at_idx ON wallet_transactions(created_at);
  `));

  await db.execute(sql.raw(`
    CREATE TABLE IF NOT EXISTS login_history (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL REFERENCES users(id),
      ip VARCHAR(45),
      user_agent TEXT,
      success BOOLEAN NOT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS login_history_user_id_idx ON login_history(user_id);
  `));

  await db.execute(sql.raw(`
    CREATE TABLE IF NOT EXISTS refresh_tokens (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL REFERENCES users(id),
      token TEXT NOT NULL UNIQUE,
      expires_at TIMESTAMP NOT NULL,
      revoked BOOLEAN NOT NULL DEFAULT false,
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS refresh_tokens_user_id_idx ON refresh_tokens(user_id);
    CREATE UNIQUE INDEX IF NOT EXISTS refresh_tokens_token_idx ON refresh_tokens(token);
  `));

  await db.execute(sql.raw(`
    CREATE TABLE IF NOT EXISTS api_keys (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL REFERENCES users(id),
      name VARCHAR(100) NOT NULL,
      key_hash TEXT NOT NULL,
      permissions JSONB NOT NULL DEFAULT '[]',
      active BOOLEAN NOT NULL DEFAULT true,
      last_used_at TIMESTAMP,
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS api_keys_user_id_idx ON api_keys(user_id);
  `));

  await db.execute(sql.raw(`
    CREATE TABLE IF NOT EXISTS order_sequence (
      id INTEGER PRIMARY KEY DEFAULT 1,
      last_seq BIGINT NOT NULL DEFAULT 0
    );
    INSERT INTO order_sequence (id, last_seq) VALUES (1, 0) ON CONFLICT (id) DO NOTHING;
  `));

  console.log('Migrations completed successfully!');
  await client.end();
}

migrate().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
