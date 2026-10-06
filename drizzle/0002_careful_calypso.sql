CREATE TABLE "admin_users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"customer_id" uuid,
	"neon_auth_user_id" varchar(255),
	"email" varchar(255) NOT NULL,
	"full_name" varchar(255),
	"role" varchar(50) DEFAULT 'ADMIN',
	"status" varchar(50) DEFAULT 'ACTIVE',
	"permissions" jsonb,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "admin_users_neon_auth_user_id_unique" UNIQUE("neon_auth_user_id"),
	CONSTRAINT "admin_users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "coupon_usages" (
	"id" varchar(255) PRIMARY KEY NOT NULL,
	"coupon_id" varchar(255) NOT NULL,
	"customer_id" uuid NOT NULL,
	"order_id" varchar(255) NOT NULL,
	"discount_amount" numeric NOT NULL,
	"used_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "legal_pages" (
	"id" varchar(255) PRIMARY KEY NOT NULL,
	"slug" varchar(255),
	"title" varchar(255) NOT NULL,
	"content" text,
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "legal_pages_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "maintenance_settings" (
	"id" varchar(50) PRIMARY KEY DEFAULT 'main' NOT NULL,
	"enabled" boolean DEFAULT false,
	"message" text DEFAULT 'System is under maintenance. Please try again later.',
	"until" timestamp,
	"duration_minutes" integer,
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "payment_proofs" (
	"id" varchar(255) PRIMARY KEY NOT NULL,
	"order_id" varchar(255),
	"payment_id" varchar(255),
	"customer_id" uuid,
	"r2_key" text,
	"proof_url" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "support_messages" (
	"id" varchar(255) PRIMARY KEY NOT NULL,
	"ticket_id" varchar(255) NOT NULL,
	"sender_type" varchar(50) NOT NULL,
	"sender_id" varchar(255),
	"sender_name" varchar(255) NOT NULL,
	"message" text NOT NULL,
	"attachment_url" text,
	"attachment_r2_key" text,
	"is_internal_note" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "support_tickets" (
	"id" varchar(255) PRIMARY KEY NOT NULL,
	"ticket_number" varchar(100),
	"customer_id" uuid,
	"order_id" varchar(255),
	"customer_name" varchar(255) NOT NULL,
	"customer_email" varchar(255) NOT NULL,
	"customer_phone" varchar(50),
	"subject" varchar(255) NOT NULL,
	"category" varchar(100) DEFAULT 'General Inquiry',
	"status" varchar(50) DEFAULT 'pending',
	"priority" varchar(50) DEFAULT 'NORMAL',
	"admin_reply" text,
	"replied_at" timestamp,
	"replied_by" varchar(255),
	"resolved_at" timestamp,
	"closed_at" timestamp,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "support_tickets_ticket_number_unique" UNIQUE("ticket_number")
);
--> statement-breakpoint
CREATE TABLE "wallet_transactions" (
	"id" varchar(255) PRIMARY KEY NOT NULL,
	"wallet_id" uuid NOT NULL,
	"customer_id" uuid NOT NULL,
	"type" varchar(50) NOT NULL,
	"amount" numeric NOT NULL,
	"balance_before" numeric NOT NULL,
	"balance_after" numeric NOT NULL,
	"status" varchar(50) DEFAULT 'COMPLETED',
	"payment_method" varchar(50),
	"reference" varchar(255),
	"description" text,
	"order_id" varchar(255),
	"admin_verified" boolean DEFAULT false,
	"admin_verified_by" varchar(255),
	"admin_notes" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "wallets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"customer_id" uuid NOT NULL,
	"balance" numeric DEFAULT '0.00' NOT NULL,
	"currency" varchar(10) DEFAULT 'NPR',
	"status" varchar(50) DEFAULT 'ACTIVE',
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "wallets_customer_id_unique" UNIQUE("customer_id")
);
--> statement-breakpoint
ALTER TABLE "notifications" DROP CONSTRAINT "notifications_customer_id_customers_id_fk";
--> statement-breakpoint
ALTER TABLE "app_settings" ALTER COLUMN "support_email" SET DEFAULT 'hii.binodthalal@gmail.com';--> statement-breakpoint
ALTER TABLE "app_settings" ALTER COLUMN "company_address" SET DEFAULT 'Deelasaini-6, Baitadi, Nepal';--> statement-breakpoint
ALTER TABLE "notifications" ALTER COLUMN "customer_id" SET DATA TYPE varchar(255);--> statement-breakpoint
ALTER TABLE "reviews" ALTER COLUMN "rating" SET DEFAULT 5;--> statement-breakpoint
ALTER TABLE "app_settings" ADD COLUMN "app_tagline" text DEFAULT 'Nepal''s #1 Instant Gaming Top-Up Platform';--> statement-breakpoint
ALTER TABLE "app_settings" ADD COLUMN "ordering_enabled" boolean DEFAULT true;--> statement-breakpoint
ALTER TABLE "app_settings" ADD COLUMN "maintenance_until" timestamp;--> statement-breakpoint
ALTER TABLE "app_settings" ADD COLUMN "maintenance_duration_minutes" integer;--> statement-breakpoint
ALTER TABLE "app_settings" ADD COLUMN "terms_and_conditions" text;--> statement-breakpoint
ALTER TABLE "app_settings" ADD COLUMN "privacy_policy" text;--> statement-breakpoint
ALTER TABLE "app_settings" ADD COLUMN "r2_account_id" text;--> statement-breakpoint
ALTER TABLE "app_settings" ADD COLUMN "r2_access_key_id" text;--> statement-breakpoint
ALTER TABLE "app_settings" ADD COLUMN "r2_secret_access_key" text;--> statement-breakpoint
ALTER TABLE "app_settings" ADD COLUMN "r2_bucket_name" text;--> statement-breakpoint
ALTER TABLE "app_settings" ADD COLUMN "r2_public_domain" text;--> statement-breakpoint
ALTER TABLE "banners" ADD COLUMN "type" varchar(50) DEFAULT 'hero';--> statement-breakpoint
ALTER TABLE "banners" ADD COLUMN "action_type" varchar(50);--> statement-breakpoint
ALTER TABLE "banners" ADD COLUMN "action_target" varchar(255);--> statement-breakpoint
ALTER TABLE "banners" ADD COLUMN "link_url" text;--> statement-breakpoint
ALTER TABLE "banners" ADD COLUMN "views" integer DEFAULT 0;--> statement-breakpoint
ALTER TABLE "banners" ADD COLUMN "clicks" integer DEFAULT 0;--> statement-breakpoint
ALTER TABLE "coupons" ADD COLUMN "name" varchar(255);--> statement-breakpoint
ALTER TABLE "coupons" ADD COLUMN "description" text;--> statement-breakpoint
ALTER TABLE "coupons" ADD COLUMN "discount_type" varchar(50) DEFAULT 'PERCENTAGE';--> statement-breakpoint
ALTER TABLE "coupons" ADD COLUMN "discount_value" numeric DEFAULT '10';--> statement-breakpoint
ALTER TABLE "coupons" ADD COLUMN "category" varchar(100) DEFAULT 'All';--> statement-breakpoint
ALTER TABLE "coupons" ADD COLUMN "minimum_order_amount" numeric DEFAULT '0';--> statement-breakpoint
ALTER TABLE "coupons" ADD COLUMN "maximum_discount_amount" numeric DEFAULT '0';--> statement-breakpoint
ALTER TABLE "coupons" ADD COLUMN "min_order_amount" numeric DEFAULT '0';--> statement-breakpoint
ALTER TABLE "coupons" ADD COLUMN "max_discount" numeric DEFAULT '0';--> statement-breakpoint
ALTER TABLE "coupons" ADD COLUMN "usage_limit" integer DEFAULT 1000;--> statement-breakpoint
ALTER TABLE "coupons" ADD COLUMN "usage_per_customer" integer DEFAULT 1;--> statement-breakpoint
ALTER TABLE "coupons" ADD COLUMN "used_count" integer DEFAULT 0;--> statement-breakpoint
ALTER TABLE "coupons" ADD COLUMN "starts_at" timestamp;--> statement-breakpoint
ALTER TABLE "coupons" ADD COLUMN "expires_at" timestamp;--> statement-breakpoint
ALTER TABLE "coupons" ADD COLUMN "is_active" boolean DEFAULT true;--> statement-breakpoint
ALTER TABLE "coupons" ADD COLUMN "applicable_product_id" varchar(255);--> statement-breakpoint
ALTER TABLE "coupons" ADD COLUMN "applicable_category_id" varchar(255);--> statement-breakpoint
ALTER TABLE "coupons" ADD COLUMN "created_by" varchar(255);--> statement-breakpoint
ALTER TABLE "coupons" ADD COLUMN "updated_at" timestamp DEFAULT now();--> statement-breakpoint
ALTER TABLE "customers" ADD COLUMN "security_pin" varchar(255);--> statement-breakpoint
ALTER TABLE "customers" ADD COLUMN "game_uids" jsonb;--> statement-breakpoint
ALTER TABLE "customers" ADD COLUMN "setup_completed" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "customers" ADD COLUMN "setup_step" integer DEFAULT 1;--> statement-breakpoint
ALTER TABLE "customers" ADD COLUMN "favorite_games" jsonb;--> statement-breakpoint
ALTER TABLE "customers" ADD COLUMN "notification_preferences" jsonb;--> statement-breakpoint
ALTER TABLE "customers" ADD COLUMN "location" varchar(255);--> statement-breakpoint
ALTER TABLE "customers" ADD COLUMN "address" text;--> statement-breakpoint
ALTER TABLE "customers" ADD COLUMN "district" varchar(100);--> statement-breakpoint
ALTER TABLE "customers" ADD COLUMN "city" varchar(100);--> statement-breakpoint
ALTER TABLE "customers" ADD COLUMN "two_factor_enabled" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "customers" ADD COLUMN "backup_codes" jsonb;--> statement-breakpoint
ALTER TABLE "games" ADD COLUMN "r2_key" text;--> statement-breakpoint
ALTER TABLE "news" ADD COLUMN "category" varchar(255) DEFAULT 'all-updates';--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "coupon_id" varchar(255);--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "coupon_code_snapshot" varchar(255);--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "coupon_discount" numeric DEFAULT '0';--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "r2_key" text;--> statement-breakpoint
ALTER TABLE "reviews" ADD COLUMN "order_id" varchar(255);--> statement-breakpoint
ALTER TABLE "reviews" ADD COLUMN "user_photo" text;--> statement-breakpoint
ALTER TABLE "reviews" ADD COLUMN "product_image" text;--> statement-breakpoint
ALTER TABLE "reviews" ADD COLUMN "package_name" varchar(255);--> statement-breakpoint
ALTER TABLE "reviews" ADD COLUMN "is_verified_buyer" boolean DEFAULT true;--> statement-breakpoint
ALTER TABLE "reviews" ADD COLUMN "status" varchar(50) DEFAULT 'published';--> statement-breakpoint
ALTER TABLE "reviews" ADD COLUMN "user_location" varchar(255);--> statement-breakpoint
ALTER TABLE "reviews" ADD COLUMN "admin_reply" text;--> statement-breakpoint
ALTER TABLE "reviews" ADD COLUMN "admin_reply_at" timestamp;--> statement-breakpoint
ALTER TABLE "reviews" ADD COLUMN "updated_at" timestamp DEFAULT now();--> statement-breakpoint
ALTER TABLE "admin_users" ADD CONSTRAINT "admin_users_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment_proofs" ADD CONSTRAINT "payment_proofs_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "support_messages" ADD CONSTRAINT "support_messages_ticket_id_support_tickets_id_fk" FOREIGN KEY ("ticket_id") REFERENCES "public"."support_tickets"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "support_tickets" ADD CONSTRAINT "support_tickets_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wallet_transactions" ADD CONSTRAINT "wallet_transactions_wallet_id_wallets_id_fk" FOREIGN KEY ("wallet_id") REFERENCES "public"."wallets"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wallet_transactions" ADD CONSTRAINT "wallet_transactions_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wallets" ADD CONSTRAINT "wallets_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE no action ON UPDATE no action;