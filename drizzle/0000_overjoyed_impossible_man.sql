CREATE TABLE "audit_logs" (
	"id" varchar(255) PRIMARY KEY NOT NULL,
	"actor_id" varchar(255),
	"actor_role" varchar(50),
	"action" varchar(255) NOT NULL,
	"entity_type" varchar(100),
	"entity_id" varchar(255),
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "banners" (
	"id" varchar(255) PRIMARY KEY NOT NULL,
	"title" varchar(255),
	"subtitle" text,
	"image_url" text NOT NULL,
	"r2_key" text,
	"link_type" varchar(50),
	"link_value" text,
	"active" boolean DEFAULT true,
	"display_order" integer DEFAULT 0,
	"start_at" timestamp,
	"end_at" timestamp,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "categories" (
	"id" varchar(255) PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"slug" varchar(255),
	"description" text,
	"icon_url" text,
	"image_url" text,
	"active" boolean DEFAULT true,
	"display_order" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "categories_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "customers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"neon_auth_user_id" varchar(255),
	"full_name" varchar(255) NOT NULL,
	"email" varchar(255) NOT NULL,
	"mobile" varchar(50),
	"username" varchar(255),
	"gamer_id" varchar(255),
	"avatar_url" text,
	"email_verified" boolean DEFAULT false,
	"mobile_verified" boolean DEFAULT false,
	"role" varchar(50) DEFAULT 'CUSTOMER',
	"status" varchar(50) DEFAULT 'ACTIVE',
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	"last_login_at" timestamp,
	CONSTRAINT "customers_neon_auth_user_id_unique" UNIQUE("neon_auth_user_id"),
	CONSTRAINT "customers_email_unique" UNIQUE("email"),
	CONSTRAINT "customers_username_unique" UNIQUE("username")
);
--> statement-breakpoint
CREATE TABLE "games" (
	"id" varchar(255) PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"slug" varchar(255),
	"description" text,
	"short_description" text,
	"category_id" varchar(255),
	"image_url" text,
	"banner_url" text,
	"platform" varchar(100),
	"region" varchar(100),
	"required_fields" jsonb,
	"active" boolean DEFAULT true,
	"featured" boolean DEFAULT false,
	"display_order" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "games_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "news" (
	"id" varchar(255) PRIMARY KEY NOT NULL,
	"title" varchar(255) NOT NULL,
	"slug" varchar(255),
	"summary" text,
	"content" text,
	"image_url" text,
	"r2_key" text,
	"author_id" varchar(255),
	"published" boolean DEFAULT false,
	"published_at" timestamp,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "news_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" varchar(255) PRIMARY KEY NOT NULL,
	"customer_id" uuid,
	"title" varchar(255) NOT NULL,
	"message" text NOT NULL,
	"type" varchar(50),
	"read" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "offers" (
	"id" varchar(255) PRIMARY KEY NOT NULL,
	"title" varchar(255) NOT NULL,
	"description" text,
	"image_url" text,
	"r2_key" text,
	"product_id" varchar(255),
	"discount" numeric,
	"active" boolean DEFAULT true,
	"start_at" timestamp,
	"end_at" timestamp,
	"display_order" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "order_status_history" (
	"id" varchar(255) PRIMARY KEY NOT NULL,
	"order_id" varchar(255) NOT NULL,
	"old_status" varchar(50),
	"new_status" varchar(50),
	"changed_by" varchar(255),
	"note" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "orders" (
	"id" varchar(255) PRIMARY KEY NOT NULL,
	"order_number" varchar(255) NOT NULL,
	"customer_id" uuid NOT NULL,
	"product_id" varchar(255),
	"package_id" varchar(255),
	"game_id" varchar(255),
	"customer_name_snapshot" varchar(255),
	"customer_email_snapshot" varchar(255),
	"customer_mobile_snapshot" varchar(50),
	"game_uid" varchar(255),
	"game_server" varchar(255),
	"game_username" varchar(255),
	"region" varchar(100),
	"quantity" integer DEFAULT 1,
	"unit_price" numeric,
	"discount" numeric DEFAULT '0',
	"total_amount" numeric NOT NULL,
	"currency" varchar(10) DEFAULT 'NPR',
	"payment_id" varchar(255),
	"payment_status" varchar(50) DEFAULT 'pending_verification',
	"order_status" varchar(50) DEFAULT 'pending_payment',
	"notes" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "orders_order_number_unique" UNIQUE("order_number")
);
--> statement-breakpoint
CREATE TABLE "payment_settings" (
	"id" varchar(50) PRIMARY KEY NOT NULL,
	"method" varchar(50),
	"enabled" boolean DEFAULT true,
	"display_name" varchar(255),
	"account_name" varchar(255),
	"account_number" varchar(255),
	"merchant_id" varchar(255),
	"instructions" text,
	"qr_image_url" text,
	"qr_r2_key" text,
	"display_order" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "payments" (
	"id" varchar(255) PRIMARY KEY NOT NULL,
	"order_id" varchar(255) NOT NULL,
	"customer_id" uuid,
	"method" varchar(50),
	"amount" numeric NOT NULL,
	"currency" varchar(10) DEFAULT 'NPR',
	"transaction_id" varchar(255),
	"payment_status" varchar(50) DEFAULT 'pending',
	"proof_url" text,
	"proof_r2_key" text,
	"customer_note" text,
	"submitted_at" timestamp DEFAULT now(),
	"verified_at" timestamp,
	"verified_by" varchar(255),
	"rejected_at" timestamp,
	"rejected_by" varchar(255),
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "product_packages" (
	"id" varchar(255) PRIMARY KEY NOT NULL,
	"product_id" varchar(255) NOT NULL,
	"name" varchar(255) NOT NULL,
	"amount" numeric NOT NULL,
	"unit" varchar(50),
	"price" numeric NOT NULL,
	"compare_at_price" numeric,
	"discount" numeric,
	"badge" varchar(100),
	"active" boolean DEFAULT true,
	"display_order" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "products" (
	"id" varchar(255) PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"slug" varchar(255),
	"description" text,
	"short_description" text,
	"category_id" varchar(255),
	"game_id" varchar(255),
	"image_url" text,
	"banner_url" text,
	"currency" varchar(10) DEFAULT 'NPR',
	"region" varchar(100),
	"delivery_type" varchar(50),
	"required_fields" jsonb,
	"featured" boolean DEFAULT false,
	"popular" boolean DEFAULT false,
	"best_value" boolean DEFAULT false,
	"active" boolean DEFAULT true,
	"archived" boolean DEFAULT false,
	"display_order" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "products_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "settings" (
	"id" varchar(50) PRIMARY KEY NOT NULL,
	"key" varchar(255) NOT NULL,
	"value" text,
	"type" varchar(50),
	"updated_at" timestamp DEFAULT now(),
	"updated_by" varchar(255),
	CONSTRAINT "settings_key_unique" UNIQUE("key")
);
--> statement-breakpoint
ALTER TABLE "games" ADD CONSTRAINT "games_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "offers" ADD CONSTRAINT "offers_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_package_id_product_packages_id_fk" FOREIGN KEY ("package_id") REFERENCES "public"."product_packages"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_game_id_games_id_fk" FOREIGN KEY ("game_id") REFERENCES "public"."games"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_packages" ADD CONSTRAINT "product_packages_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_game_id_games_id_fk" FOREIGN KEY ("game_id") REFERENCES "public"."games"("id") ON DELETE no action ON UPDATE no action;