
import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema.js';

declare global {
  var _postgresPool: Pool | undefined;
}

function resolveConnectionString(): string | undefined {
  const candidateUrls = [
    process.env.SUPABASE_DATABASE_URL,
    process.env.DATABASE_URL,
  ];

  for (const c of candidateUrls) {
    if (c && c.trim() && !c.trim().startsWith('http://') && !c.trim().startsWith('https://')) {
      const normalized = normalizeConnectionString(c.trim());
      process.env.DATABASE_URL = normalized;
      return normalized;
    }
  }

  return undefined;
}

// Immediately resolve connection string on module load
resolveConnectionString();

function normalizeConnectionString(connStr: string): string {
  if (!connStr || (!connStr.startsWith('postgres://') && !connStr.startsWith('postgresql://'))) {
    return connStr;
  }
  try {
    const lastAt = connStr.lastIndexOf('@');
    if (lastAt !== -1) {
      const userPart = connStr.substring(0, lastAt);
      const hostPart = connStr.substring(lastAt + 1);
      const prefix = connStr.startsWith('postgresql://') ? 'postgresql://' : 'postgres://';
      const firstColon = userPart.indexOf(':', prefix.length);
      if (firstColon !== -1) {
        const user = userPart.substring(prefix.length, firstColon);
        let rawPass = userPart.substring(firstColon + 1);
        if (rawPass.startsWith('[') && rawPass.endsWith(']')) {
          rawPass = rawPass.slice(1, -1);
        }
        // Properly URL encode the password to safely handle @, +, #, %, etc.
        const encodedPass = encodeURIComponent(rawPass);
        return `${prefix}${user}:${encodedPass}@${hostPart}`;
      }
    }
  } catch {}
  return connStr;
}

export const createPool = () => {
  if (!global._postgresPool) {
    const connectionString = resolveConnectionString();
    if (!connectionString) {
      console.warn('⚠️ [AI Studio] Database connection string not set — using mock pool');
      const mockPool: any = {
        query: async () => ({ rows: [], rowCount: 0 }),
        connect: async () => ({
          query: async () => ({ rows: [], rowCount: 0 }),
          release: () => {},
        }),
        on: () => mockPool,
        end: async () => {},
      };
      return mockPool;
    }
    try {
      const isCloudPg = connectionString?.includes('supabase.co') || 
                        connectionString?.includes('pooler.supabase.com') || 
                        connectionString?.includes('sslmode=');
      global._postgresPool = new Pool({
        connectionString,
        max: 5,
        connectionTimeoutMillis: 15000,
        idleTimeoutMillis: 10000,
        allowExitOnIdle: true,
        ssl: isCloudPg ? { rejectUnauthorized: false } : undefined,
      });
      global._postgresPool.on('error', (err) => {
        console.error('Unexpected error on idle SQL pool client:', err);
      });
    } catch (poolErr) {
      console.warn('⚠️ [AI Studio] Failed to initialize PostgreSQL pool — using mock pool:', poolErr);
      const mockPool: any = {
        query: async () => ({ rows: [], rowCount: 0 }),
        connect: async () => ({
          query: async () => ({ rows: [], rowCount: 0 }),
          release: () => {},
        }),
        on: () => mockPool,
        end: async () => {},
      };
      return mockPool;
    }
  }
  return global._postgresPool;
};

export const isDbConnected = () => Boolean(resolveConnectionString());

export const pool = createPool();

let dbInstance: any;
try {
  if (resolveConnectionString()) {
    dbInstance = drizzle(pool, { schema });
  } else {
    throw new Error('No DB connection string');
  }
} catch {
  console.warn('[AI Studio] Database not connected — using drizzle mock proxy');
  const noOp = {
    findMany: async () => [],
    findFirst: async () => null,
    findUnique: async () => null,
    create: async (d: any) => d?.data ?? {},
    update: async (d: any) => d?.data ?? {},
    delete: async () => ({}),
  };
  const mockQueryBuilder = {
    from: () => mockQueryBuilder,
    where: () => mockQueryBuilder,
    limit: () => mockQueryBuilder,
    offset: () => mockQueryBuilder,
    orderBy: () => mockQueryBuilder,
    values: () => mockQueryBuilder,
    set: () => mockQueryBuilder,
    returning: () => Promise.resolve([]),
    then: (resolve: any) => Promise.resolve([]).then(resolve),
  };
  dbInstance = new Proxy({}, {
    get: (_, prop) => {
      if (prop === 'query') {
        return new Proxy({}, { get: () => noOp });
      }
      if (prop === 'select' || prop === 'insert' || prop === 'update' || prop === 'delete') {
        return () => mockQueryBuilder;
      }
      if (prop === 'execute') {
        return async () => ({ rows: [], rowCount: 0 });
      }
      if (prop === 'transaction') {
        return async (cb: any) => cb(dbInstance);
      }
      return async () => [];
    },
  });
}

export const db = dbInstance;


export const runMigrations = async () => {
  const connStr = resolveConnectionString();
  if (!connStr) {
    console.warn("Skipping migrations: DATABASE_URL not set.");
    return;
  }
  try {
    const schemaSqlPath = path.resolve(process.cwd(), 'server', 'schema.sql');
    if (fs.existsSync(schemaSqlPath)) {
      const sqlContent = fs.readFileSync(schemaSqlPath, 'utf8');
      await pool.query(sqlContent);
      console.log('✅ Authoritative relational database schema applied successfully from schema.sql');
    }

    // Apply Supabase migrations in sorted sequence
    const migrationsDir = path.resolve(process.cwd(), 'supabase', 'migrations');
    if (fs.existsSync(migrationsDir)) {
      const migFiles = fs.readdirSync(migrationsDir).filter(f => f.endsWith('.sql')).sort();
      for (const migFile of migFiles) {
        try {
          const migSql = fs.readFileSync(path.join(migrationsDir, migFile), 'utf8');
          await pool.query(migSql);
          console.log(`✅ Applied migration: ${migFile}`);
        } catch (migErr: any) {
          console.warn(`Notice applying migration ${migFile}:`, migErr?.message || migErr);
        }
      }
    }
  } catch (schemaErr: any) {
    console.warn('Notice applying schema.sql:', schemaErr?.message || schemaErr);
  }

  try {
    await pool.query(`
      ALTER TABLE customers ADD COLUMN IF NOT EXISTS supabase_auth_user_id VARCHAR(255);
      ALTER TABLE customers ADD COLUMN IF NOT EXISTS security_pin VARCHAR(255);
      ALTER TABLE customers ADD COLUMN IF NOT EXISTS uid VARCHAR(255);
      ALTER TABLE customers ADD COLUMN IF NOT EXISTS setup_completed BOOLEAN DEFAULT FALSE;
      ALTER TABLE customers ADD COLUMN IF NOT EXISTS setup_step INTEGER DEFAULT 1;
      ALTER TABLE customers ADD COLUMN IF NOT EXISTS favorite_games JSONB;
      ALTER TABLE customers ADD COLUMN IF NOT EXISTS notification_preferences JSONB;
      ALTER TABLE customers ADD COLUMN IF NOT EXISTS game_uids JSONB;

      ALTER TABLE app_settings ADD COLUMN IF NOT EXISTS business_registration_number VARCHAR(255);
      ALTER TABLE app_settings ADD COLUMN IF NOT EXISTS business_pan VARCHAR(255);
      ALTER TABLE app_settings ADD COLUMN IF NOT EXISTS vat_number VARCHAR(255);
      ALTER TABLE app_settings ADD COLUMN IF NOT EXISTS complaint_contact TEXT;
      ALTER TABLE app_settings ADD COLUMN IF NOT EXISTS responsible_business_info TEXT;

      ALTER TABLE orders ADD COLUMN IF NOT EXISTS order_code VARCHAR(50);
      CREATE UNIQUE INDEX IF NOT EXISTS orders_order_code_unique ON orders(order_code);

      CREATE TABLE IF NOT EXISTS team_applications (
        id VARCHAR(255) PRIMARY KEY,
        user_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
        role_applied_for VARCHAR(100) NOT NULL,
        experience_notes TEXT,
        status VARCHAR(50) DEFAULT 'PENDING',
        applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        reviewed_at TIMESTAMP,
        reviewed_by VARCHAR(255)
      );

      ALTER TABLE team_applications ADD COLUMN IF NOT EXISTS full_name VARCHAR(255);
      ALTER TABLE team_applications ADD COLUMN IF NOT EXISTS gamer_username VARCHAR(255);
      ALTER TABLE team_applications ADD COLUMN IF NOT EXISTS email VARCHAR(255);
      ALTER TABLE team_applications ADD COLUMN IF NOT EXISTS mobile_number VARCHAR(100);
      ALTER TABLE team_applications ADD COLUMN IF NOT EXISTS gaming_experience TEXT;
      ALTER TABLE team_applications ADD COLUMN IF NOT EXISTS games_played TEXT;
      ALTER TABLE team_applications ADD COLUMN IF NOT EXISTS game_uid VARCHAR(255);
      ALTER TABLE team_applications ADD COLUMN IF NOT EXISTS discord_username VARCHAR(255);
      ALTER TABLE team_applications ADD COLUMN IF NOT EXISTS why_join TEXT;
      ALTER TABLE team_applications ADD COLUMN IF NOT EXISTS skills TEXT;
      ALTER TABLE team_applications ADD COLUMN IF NOT EXISTS availability VARCHAR(255);
      ALTER TABLE team_applications ADD COLUMN IF NOT EXISTS profile_image_url TEXT;
      ALTER TABLE team_applications ADD COLUMN IF NOT EXISTS stage VARCHAR(100) DEFAULT 'INITIAL_SUBMISSION';
      ALTER TABLE team_applications ADD COLUMN IF NOT EXISTS current_reviewer_id VARCHAR(255);
      ALTER TABLE team_applications ADD COLUMN IF NOT EXISTS current_reviewer_name VARCHAR(255);
      ALTER TABLE team_applications ADD COLUMN IF NOT EXISTS internal_notes TEXT;
      ALTER TABLE team_applications ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

      CREATE INDEX IF NOT EXISTS idx_team_apps_user ON team_applications(user_id);
      CREATE INDEX IF NOT EXISTS idx_team_apps_status ON team_applications(status);

      CREATE TABLE IF NOT EXISTS team_officers (
        id VARCHAR(255) PRIMARY KEY,
        user_id UUID NOT NULL UNIQUE REFERENCES customers(id) ON DELETE CASCADE,
        full_name VARCHAR(255),
        email VARCHAR(255),
        mobile VARCHAR(100),
        title VARCHAR(255) DEFAULT 'Team Officer',
        status VARCHAR(50) DEFAULT 'ACTIVE',
        assigned_by VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS team_members (
        id VARCHAR(255) PRIMARY KEY,
        user_id UUID NOT NULL UNIQUE REFERENCES customers(id) ON DELETE CASCADE,
        full_name VARCHAR(255),
        email VARCHAR(255),
        mobile VARCHAR(100),
        role VARCHAR(100) DEFAULT 'MEMBER',
        position_title VARCHAR(255) DEFAULT 'Team Member',
        status VARCHAR(50) DEFAULT 'ACTIVE',
        location VARCHAR(255),
        avatar_url TEXT,
        is_owner BOOLEAN DEFAULT FALSE,
        joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS team_application_reviews (
        id VARCHAR(255) PRIMARY KEY,
        application_id VARCHAR(255) NOT NULL REFERENCES team_applications(id) ON DELETE CASCADE,
        reviewer_id VARCHAR(255) NOT NULL,
        reviewer_name VARCHAR(255),
        reviewer_role VARCHAR(100),
        previous_status VARCHAR(50),
        new_status VARCHAR(50) NOT NULL,
        review_note TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      

      CREATE TABLE IF NOT EXISTS team_activity_logs (
        id VARCHAR(255) PRIMARY KEY,
        actor_id VARCHAR(255),
        actor_name VARCHAR(255),
        actor_role VARCHAR(100),
        action VARCHAR(255) NOT NULL,
        resource_id VARCHAR(255),
        metadata JSONB,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS team_notifications (
        id VARCHAR(255) PRIMARY KEY,
        user_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
        title VARCHAR(255) NOT NULL,
        message TEXT NOT NULL,
        type VARCHAR(100) DEFAULT 'APPLICATION_STATUS',
        is_read BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS team_settings (
        key VARCHAR(100) PRIMARY KEY,
        value TEXT,
        description TEXT,
        updated_by VARCHAR(255),
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      

      

      

      

      CREATE TABLE IF NOT EXISTS audit_logs (
        id VARCHAR(255) PRIMARY KEY,
        actor_id VARCHAR(255),
        actor_role VARCHAR(50),
        action VARCHAR(255) NOT NULL,
        entity_type VARCHAR(100),
        entity_id VARCHAR(255),
        metadata JSONB,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      INSERT INTO roles (id, key, name, description, hierarchy_level, is_system_role)
      VALUES 
        ('SUPPORT_STAFF', 'SUPPORT_STAFF', 'Support Staff', 'Basic support, catalog viewing and operational monitoring', 1, true),
        ('STORE_MANAGER', 'STORE_MANAGER', 'Store Manager', 'Day-to-day store operations, sales, catalog, coupon and support management', 2, true),
        ('SUPER_ADMIN', 'SUPER_ADMIN', 'Super Admin', 'Full store administration and configuration access', 3, true),
        ('STORE_OWNER', 'STORE_OWNER', 'Store Owner', 'Highest-authority owner role with complete control', 4, true)
      ON CONFLICT (id) DO UPDATE SET 
        name = EXCLUDED.name,
        description = EXCLUDED.description,
        hierarchy_level = EXCLUDED.hierarchy_level;

      INSERT INTO permissions (id, key, name, description, resource, action)
      VALUES
        ('team.dashboard.view', 'team.dashboard.view', 'View Team Dashboard', 'Access team summary metrics and overview', 'team', 'view'),
        ('team.applications.view', 'team.applications.view', 'View Applications', 'View list of team applications', 'team', 'view'),
        ('team.applications.review', 'team.applications.review', 'Review Applications', 'Add notes and change application stage', 'team', 'review'),
        ('team.applications.approve', 'team.applications.approve', 'Approve Applications', 'Approve applicants and assign role', 'team', 'approve'),
        ('team.applications.reject', 'team.applications.reject', 'Reject Applications', 'Reject team applications', 'team', 'reject'),
        ('team.members.view', 'team.members.view', 'View Team Members', 'View active officer and member directory', 'team', 'view'),
        ('team.members.manage', 'team.members.manage', 'Manage Members', 'Manage active team member positions and roles', 'team', 'manage'),
        ('team.officers.view', 'team.officers.view', 'View Officers', 'View list of active team officers', 'team', 'view'),
        ('team.officers.manage', 'team.officers.manage', 'Manage Officers', 'Create, update, or deactivate team officers', 'team', 'manage'),
        ('team.notifications.send', 'team.notifications.send', 'Send Team Notifications', 'Broadcast notifications to team applicants and members', 'team', 'send'),
        ('team.settings.view', 'team.settings.view', 'View Team Settings', 'View team module settings', 'team', 'view'),
        ('team.settings.manage', 'team.settings.manage', 'Manage Team Settings', 'Modify team operational rules and settings', 'team', 'manage'),
        ('team.audit.view', 'team.audit.view', 'View Team Audit Logs', 'Inspect team activity and audit history', 'team', 'view')
      ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description;
    `);
    console.log('Database schema patched successfully.');
  } catch (err: any) {
    console.warn('Migration warning:', err?.message || err);
  }
};

