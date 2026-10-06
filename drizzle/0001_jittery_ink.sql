CREATE TABLE "activity_logs" (
	"id" varchar(255) PRIMARY KEY NOT NULL,
	"action" varchar(255) NOT NULL,
	"description" text,
	"target_id" varchar(255),
	"target_type" varchar(100),
	"admin_id" varchar(255),
	"admin_name" varchar(255),
	"admin_email" varchar(255),
	"created_by" varchar(255),
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "app_settings" (
	"id" varchar(50) PRIMARY KEY NOT NULL,
	"site_name" varchar(255) DEFAULT 'Game Hub Nepal',
	"logo_url" text,
	"support_phone" varchar(50) DEFAULT '9768914027',
	"whatsapp_number" varchar(50) DEFAULT '9768914027',
	"viber_number" varchar(50) DEFAULT '9768914027',
	"support_email" varchar(255) DEFAULT 'support@gamehubnepal.com',
	"company_address" text DEFAULT 'Deelasaini 6 Baitadi Nepal',
	"maintenance_mode" boolean DEFAULT false,
	"maintenance_message" text DEFAULT 'Top-up service is temporarily unavailable due to maintenance.',
	"announcement_ticker" jsonb,
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "cancellation_requests" (
	"id" varchar(255) PRIMARY KEY NOT NULL,
	"order_id" varchar(255) NOT NULL,
	"reason" text,
	"status" varchar(50) DEFAULT 'pending',
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "coupons" (
	"id" varchar(255) PRIMARY KEY NOT NULL,
	"code" varchar(255) NOT NULL,
	"discount_percentage" numeric,
	"active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "coupons_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "email_otps" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"password_hash" varchar(255),
	"uid" varchar(255),
	"email" varchar(255) NOT NULL,
	"otp_code" varchar(10) NOT NULL,
	"is_global" boolean DEFAULT false,
	"type" varchar(50) NOT NULL,
	"user_payload" jsonb,
	"expires_at" timestamp NOT NULL,
	"verified" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "password_reset_requests" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"proposed_password_hash" text NOT NULL,
	"status" varchar(50) DEFAULT 'PENDING',
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "reviews" (
	"id" varchar(255) PRIMARY KEY NOT NULL,
	"user_id" varchar(255),
	"user_name" varchar(255),
	"product_id" varchar(255),
	"product_name" varchar(255),
	"rating" integer NOT NULL,
	"comment" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"session_token_hash" text NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"expires_at" timestamp NOT NULL,
	"last_activity_at" timestamp DEFAULT now(),
	"revoked_at" timestamp
);
--> statement-breakpoint
ALTER TABLE "banners" ADD COLUMN "mobile_image_url" text;--> statement-breakpoint
ALTER TABLE "banners" ADD COLUMN "sort_order" integer DEFAULT 0;--> statement-breakpoint
ALTER TABLE "banners" ADD COLUMN "button_text" varchar(255);--> statement-breakpoint
ALTER TABLE "banners" ADD COLUMN "badge" varchar(255);--> statement-breakpoint
ALTER TABLE "customers" ADD COLUMN "password_hash" varchar(255);--> statement-breakpoint
ALTER TABLE "customers" ADD COLUMN "uid" varchar(255);--> statement-breakpoint
ALTER TABLE "news" ADD COLUMN "active" boolean DEFAULT true;--> statement-breakpoint
ALTER TABLE "news" ADD COLUMN "tag" varchar(255);--> statement-breakpoint
ALTER TABLE "news" ADD COLUMN "author" varchar(255);--> statement-breakpoint
ALTER TABLE "notifications" ADD COLUMN "order_id" varchar(255);--> statement-breakpoint
ALTER TABLE "notifications" ADD COLUMN "recipient_role" varchar(50);--> statement-breakpoint
ALTER TABLE "notifications" ADD COLUMN "recipient_uid" varchar(255);--> statement-breakpoint
ALTER TABLE "notifications" ADD COLUMN "is_global" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "offers" ADD COLUMN "target_product_id" varchar(255);--> statement-breakpoint
ALTER TABLE "offers" ADD COLUMN "button_text" varchar(255);--> statement-breakpoint
ALTER TABLE "offers" ADD COLUMN "badge" varchar(255);--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "admin_notes" text;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "recipient_uid" varchar(255);--> statement-breakpoint
ALTER TABLE "payment_settings" ADD COLUMN "qr_enabled" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "payment_settings" ADD COLUMN "esewa_name" varchar(255);--> statement-breakpoint
ALTER TABLE "payment_settings" ADD COLUMN "khalti_name" varchar(255);--> statement-breakpoint
ALTER TABLE "payment_settings" ADD COLUMN "imepay_name" varchar(255);--> statement-breakpoint
ALTER TABLE "payment_settings" ADD COLUMN "esewa_id" varchar(255);--> statement-breakpoint
ALTER TABLE "payment_settings" ADD COLUMN "khalti_id" varchar(255);--> statement-breakpoint
ALTER TABLE "payment_settings" ADD COLUMN "imepay_id" varchar(255);--> statement-breakpoint
ALTER TABLE "payment_settings" ADD COLUMN "bank_account_name" varchar(255);--> statement-breakpoint
ALTER TABLE "payment_settings" ADD COLUMN "bank_account_number" varchar(255);--> statement-breakpoint
ALTER TABLE "payment_settings" ADD COLUMN "bank_name" varchar(255);--> statement-breakpoint
ALTER TABLE "payment_settings" ADD COLUMN "esewa_enabled" boolean DEFAULT true;--> statement-breakpoint
ALTER TABLE "payment_settings" ADD COLUMN "khalti_enabled" boolean DEFAULT true;--> statement-breakpoint
ALTER TABLE "payment_settings" ADD COLUMN "imepay_enabled" boolean DEFAULT true;--> statement-breakpoint
ALTER TABLE "payment_settings" ADD COLUMN "bank_enabled" boolean DEFAULT true;--> statement-breakpoint
ALTER TABLE "payments" ADD COLUMN "gateway_response" jsonb;--> statement-breakpoint
ALTER TABLE "payments" ADD COLUMN "status" varchar(50);--> statement-breakpoint
ALTER TABLE "payments" ADD COLUMN "reference_code" varchar(255);--> statement-breakpoint
ALTER TABLE "payments" ADD COLUMN "recipient_uid" varchar(255);--> statement-breakpoint
ALTER TABLE "settings" ADD COLUMN "is_global" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "password_reset_requests" ADD CONSTRAINT "password_reset_requests_user_id_customers_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."customers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_customers_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."customers"("id") ON DELETE no action ON UPDATE no action;