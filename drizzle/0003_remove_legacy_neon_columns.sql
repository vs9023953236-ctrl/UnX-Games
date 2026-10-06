-- Safe Supabase PostgreSQL migration to remove legacy Neon columns & constraints
DO $$ 
BEGIN
  -- Drop neon_auth_user_id from customers if exists
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'customers' AND column_name = 'neon_auth_user_id'
  ) THEN
    ALTER TABLE customers DROP COLUMN neon_auth_user_id;
  END IF;

  -- Drop neon_auth_user_id from admin_users if exists
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'admin_users' AND column_name = 'neon_auth_user_id'
  ) THEN
    ALTER TABLE admin_users DROP COLUMN neon_auth_user_id;
  END IF;
END $$;
