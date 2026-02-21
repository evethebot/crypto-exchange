import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import { sql } from 'drizzle-orm';
import bcryptjs from 'bcryptjs';

const connectionString = process.env.DATABASE_URL || 'postgresql://vmansus@localhost:5432/crypto_exchange';

async function seed() {
  const client = postgres(connectionString);
  const db = drizzle(client);

  console.log('Seeding database...');

  // Seed trading pairs
  const pairs = [
    { symbol: 'BTC_USDT', baseCurrency: 'BTC', quoteCurrency: 'USDT', pricePrecision: 2, amountPrecision: 6, minAmount: '0.0001', minTotal: '10', makerFeeBps: 10, takerFeeBps: 10 },
    { symbol: 'ETH_USDT', baseCurrency: 'ETH', quoteCurrency: 'USDT', pricePrecision: 2, amountPrecision: 5, minAmount: '0.001', minTotal: '10', makerFeeBps: 10, takerFeeBps: 10 },
    { symbol: 'ETH_BTC', baseCurrency: 'ETH', quoteCurrency: 'BTC', pricePrecision: 6, amountPrecision: 4, minAmount: '0.01', minTotal: '0.001', makerFeeBps: 10, takerFeeBps: 10 },
    { symbol: 'DOGE_USDT', baseCurrency: 'DOGE', quoteCurrency: 'USDT', pricePrecision: 6, amountPrecision: 0, minAmount: '1', minTotal: '10', makerFeeBps: 10, takerFeeBps: 10 },
    { symbol: 'XRP_USDT', baseCurrency: 'XRP', quoteCurrency: 'USDT', pricePrecision: 4, amountPrecision: 1, minAmount: '1', minTotal: '10', makerFeeBps: 10, takerFeeBps: 10 },
  ];

  for (const pair of pairs) {
    await db.execute(sql.raw(`
      INSERT INTO trading_pairs (symbol, base_currency, quote_currency, price_precision, amount_precision, min_amount, min_total, maker_fee_bps, taker_fee_bps, status)
      VALUES ('${pair.symbol}', '${pair.baseCurrency}', '${pair.quoteCurrency}', ${pair.pricePrecision}, ${pair.amountPrecision}, ${pair.minAmount}, ${pair.minTotal}, ${pair.makerFeeBps}, ${pair.takerFeeBps}, 'active')
      ON CONFLICT (symbol) DO NOTHING;
    `));
    console.log(`  ✓ ${pair.symbol}`);
  }

  // Seed admin user
  const adminEmail = process.env.ADMIN_SEED_EMAIL || 'admin@exchange.local';
  const adminPassword = process.env.ADMIN_SEED_PASSWORD || 'Admin1234!';
  const passwordHash = await bcryptjs.hash(adminPassword, 10);

  await db.execute(sql.raw(`
    INSERT INTO users (email, password_hash, role, status, kyc_level)
    VALUES ('${adminEmail}', '${passwordHash}', 'admin', 'active', 'level_3')
    ON CONFLICT (email) DO NOTHING;
  `));
  console.log(`  ✓ Admin user: ${adminEmail}`);

  console.log('Seeding completed!');
  await client.end();
}

seed().catch((err) => {
  console.error('Seeding failed:', err);
  process.exit(1);
});
