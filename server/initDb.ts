import { db, pool, runMigrations } from '../src/db/index.js';
import { sql } from 'drizzle-orm';

let dbInitPromise: Promise<void> | null = null;

/**
 * Verifies Supabase PostgreSQL database connection on server startup.
 * Applies base schema and performance indexes safely.
 */
export async function ensureDatabaseSchema(): Promise<void> {
  if (dbInitPromise) return dbInitPromise;

  dbInitPromise = (async () => {
    try {
      const connString = process.env.SUPABASE_DATABASE_URL || process.env.SUPABASE_DATABASE || process.env.DATABASE_URL;
      if (!connString) {
        console.log('ℹ️ [DB] No database connection string provided.');
        return;
      }

      console.log('🔄 Checking Supabase PostgreSQL database connection...');
      await db.execute(sql`SELECT 1`);
      console.log('✅ Supabase PostgreSQL database connection verified successfully.');

      // Safely apply base migrations if required
      await runMigrations().catch((mErr) => {
        console.warn('⚠️ [DB] Migration check note:', mErr?.message || mErr);
      });

      // Create user_invitations table via raw pool query (supports multi-statement)
      await pool.query(`
        CREATE TABLE IF NOT EXISTS user_invitations (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          email VARCHAR(255) NOT NULL,
          full_name VARCHAR(255),
          role VARCHAR(50) DEFAULT 'CUSTOMER',
          invited_by VARCHAR(255),
          invited_by_name VARCHAR(255),
          status VARCHAR(50) DEFAULT 'pending',
          user_id VARCHAR(255),
          invited_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          accepted_at TIMESTAMP WITH TIME ZONE,
          expires_at TIMESTAMP WITH TIME ZONE,
          metadata JSONB,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
        CREATE INDEX IF NOT EXISTS idx_user_invitations_email ON user_invitations(email);
        CREATE INDEX IF NOT EXISTS idx_user_invitations_status ON user_invitations(status);
      `);

      // Performance Indexes for Ultra-Fast Queries (applied safely individually if target tables exist)
      const indexQueries = [
        `CREATE INDEX IF NOT EXISTS idx_orders_customer_id ON orders(customer_id);`,
        `CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);`,
        `CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at DESC);`,
        `CREATE INDEX IF NOT EXISTS idx_products_active ON products(active);`,
        `CREATE INDEX IF NOT EXISTS idx_wallet_tx_customer_id ON wallet_transactions(customer_id);`,
        `CREATE INDEX IF NOT EXISTS idx_wallet_tx_created_at ON wallet_transactions(created_at DESC);`,
        `CREATE INDEX IF NOT EXISTS idx_system_events_created_at ON system_events(created_at DESC);`,
        `CREATE INDEX IF NOT EXISTS idx_rate_limits_expires_at ON rate_limits(expires_at);`
      ];

      for (const idxQuery of indexQueries) {
        try {
          await pool.query(idxQuery);
        } catch (_idxErr) {
          // Ignore if target table or column does not exist yet
        }
      }

      // Ensure legal_pages table & columns exist safely
      try {
        await pool.query(`
          CREATE TABLE IF NOT EXISTS legal_pages (
            id VARCHAR(255) PRIMARY KEY,
            slug VARCHAR(255) UNIQUE NOT NULL,
            title VARCHAR(255) NOT NULL,
            content TEXT,
            is_published BOOLEAN DEFAULT true,
            version VARCHAR(50) DEFAULT '1.0',
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
          );
          ALTER TABLE legal_pages ADD COLUMN IF NOT EXISTS is_published BOOLEAN DEFAULT true;
          ALTER TABLE legal_pages ADD COLUMN IF NOT EXISTS version VARCHAR(50) DEFAULT '1.0';
          ALTER TABLE legal_pages ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
          ALTER TABLE legal_pages ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

          -- Auto-seed all 8 policies if not already present
          INSERT INTO legal_pages (id, slug, title, content, is_published, version, created_at, updated_at)
          VALUES 
            ('lp_terms', 'terms', 'Terms of Service', '# Terms of Service - Unx Games\n\n1. **Player UID Accuracy**: Customers bear full responsibility for correct Player UID.\n2. **Age & Payment Authority**: Must be 13+ or parental consent.\n3. **Anti-Fraud Enforcement**: Fake slips result in permanent ban.\n4. **Publisher Rights**: All trademarks belong to respective publishers.\n5. **Support Rules**: Professional customer support.', true, '1.0', now(), now()),
            ('lp_privacy', 'privacy', 'Privacy Policy', '# Privacy Policy - Unx Games\n\n1. **Data We Collect**: Name, email, mobile number, UID.\n2. **Zero Password Sharing**: We never ask for MPIN/OTP.\n3. **256-Bit SSL**: All customer data encrypted.\n4. **Account Removal**: Email info@unxgames.np for deletion.', true, '1.0', now(), now()),
            ('lp_refund', 'refund-policy', 'Refund & Cancellation Policy', '# Refund & Cancellation Policy - Unx Games\n\n1. **100% Money-Back**: Full refund if order unfulfilled within 2 hours.\n2. **Duplicate Payment**: Instant refund of duplicate scan.\n3. **Wrong UID**: Orders sent to wrong user UID cannot be reversed.\n4. **Turnaround**: 5-30 minutes processing to eSewa/Khalti.', true, '1.0', now(), now()),
            ('lp_delivery', 'delivery-policy', 'Instant Delivery Guarantee', '# Instant Delivery Guarantee - Unx Games\n\n1. **5-15 Minute Delivery**: Over 98% completed instantly.\n2. **24/7 Automation**: Operating uninterrupted daily.\n3. **Live Status**: Real-time order tracking.', true, '1.0', now(), now()),
            ('lp_kyc', 'kyc-policy', 'KYC & Anti-Money Laundering (AML) Policy', '# KYC & AML Policy - Unx Games\n\n1. **Compliance**: High-volume transactions require one-time identity pass.\n2. **Fraud Prevention**: Protects gamer balances from theft.\n3. **Encrypted Storage**: Verification documents securely protected.', true, '1.0', now(), now()),
            ('lp_payment', 'payment-policy', 'Payment Methods & Security Policy', '# Payment Methods & Security - Unx Games\n\n1. **Channels**: eSewa QR, Khalti QR, Fonepay, Preloaded Wallet.\n2. **Remarks**: Put Order ID in transaction remarks.\n3. **Zero MPIN**: Staff never asks for your PIN/OTP.', true, '1.0', now(), now()),
            ('lp_security', 'security-policy', 'Account & Platform Security Policy', '# Account Security - Unx Games\n\n1. **2FA Protection**: Email OTP and Authenticator supported.\n2. **AI Sentinel**: Monitors suspicious logins and transactions.\n3. **TLS 1.3**: Military-grade database security.', true, '1.0', now(), now()),
            ('lp_about', 'about-us', 'About Unx Games', '# About Unx Games\n\n**Unx Games** (intraX Pvt Ltd) is Nepal''s premier verified digital gaming platform, registered in Deelasaini-6, Baitadi, Nepal.\n\n- **Phone**: 9768914027\n- **Email**: info@unxgames.np\n- **Hours**: 8:00 AM - 11:00 PM', true, '1.0', now(), now())
          ON CONFLICT (slug) DO NOTHING;
        `);
      } catch (_tblErr) {
        // Continue safely
      }

      // Sync and sanitize all legal_pages & app_settings to official Unx Games branding
      try {
        await pool.query(`
          UPDATE legal_pages 
          SET title = REPLACE(REPLACE(title, 'Game Hub Nepal', 'Unx Games'), 'Game Hub', 'Unx Games'),
              content = REPLACE(REPLACE(content, 'Game Hub Nepal', 'Unx Games'), 'Game Hub', 'Unx Games')
          WHERE title ILIKE '%game hub%' OR content ILIKE '%game hub%';

          UPDATE legal_pages
          SET title = 'About Unx Games'
          WHERE slug = 'about-us' AND (title ILIKE '%game hub%' OR title ILIKE '%gamehub%');

          UPDATE app_settings
          SET privacy_policy = REPLACE(REPLACE(privacy_policy, 'Game Hub Nepal', 'Unx Games'), 'Game Hub', 'Unx Games'),
              terms_and_conditions = REPLACE(REPLACE(terms_and_conditions, 'Game Hub Nepal', 'Unx Games'), 'Game Hub', 'Unx Games')
          WHERE privacy_policy ILIKE '%game hub%' OR terms_and_conditions ILIKE '%game hub%';
        `);
      } catch (_syncErr) {
        // Table may not exist yet in dev mode
      }
    } catch (connErr: any) {
      console.warn('⚠️ [DB] PostgreSQL database connection check warning:', connErr?.message || connErr);
    }
  })();

  return dbInitPromise;
}
