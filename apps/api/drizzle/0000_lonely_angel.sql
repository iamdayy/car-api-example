CREATE TABLE "api_keys" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"developer_id" uuid NOT NULL,
	"key_hash" text NOT NULL,
	"tier" text DEFAULT 'free' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_used_at" timestamp with time zone,
	CONSTRAINT "api_keys_key_hash_unique" UNIQUE("key_hash")
);
--> statement-breakpoint
CREATE TABLE "brands" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"country" text,
	"logo_url" text,
	CONSTRAINT "brands_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "car_parameter_values" (
	"car_id" text NOT NULL,
	"parameter_id" text NOT NULL,
	"value" text NOT NULL,
	"source_url" text,
	"verified_at" timestamp with time zone,
	"reviewed_by" text,
	CONSTRAINT "car_parameter_values_car_id_parameter_id_pk" PRIMARY KEY("car_id","parameter_id")
);
--> statement-breakpoint
CREATE TABLE "cars" (
	"id" text PRIMARY KEY NOT NULL,
	"brand_id" text NOT NULL,
	"model" text NOT NULL,
	"variant" text,
	"year" integer NOT NULL,
	"body_type" text NOT NULL,
	"powertrain" text NOT NULL,
	"seats" integer,
	"price_idr" integer,
	"status" text DEFAULT 'published' NOT NULL,
	"length_mm" integer,
	"width_mm" integer,
	"height_mm" integer,
	"wheelbase_mm" integer,
	"weight_kg" integer,
	"transmission" text,
	"drivetrain" text,
	"top_speed_kmh" integer,
	"acceleration_0_100_s" real,
	"engine_displacement_cc" integer,
	"cylinders" integer,
	"engine_type" text,
	"fuel_type" text,
	"power_hp" integer,
	"torque_nm" integer,
	"fuel_consumption_l_100_km" real,
	"fuel_tank_l" integer,
	"co2_g_km" integer,
	"battery_kwh" real,
	"battery_type" text,
	"motor_power_kw" integer,
	"motor_type" text,
	"range_wltp_km" integer,
	"energy_consumption_kwh_100_km" real,
	"charging_ac_kw" integer,
	"charging_dc_kw" integer,
	"charging_time_10_80_min" integer,
	"system_power_hp" integer,
	"electric_range_km" integer,
	"combined_range_km" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "developers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"password_hash" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "developers_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "parameters" (
	"id" text PRIMARY KEY NOT NULL,
	"key" text NOT NULL,
	"label" text NOT NULL,
	"group" text NOT NULL,
	"unit" text,
	"applicable_powertrains" text[] DEFAULT '{}' NOT NULL,
	CONSTRAINT "parameters_key_unique" UNIQUE("key")
);
--> statement-breakpoint
CREATE TABLE "payments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"developer_id" uuid NOT NULL,
	"plan_id" text NOT NULL,
	"amount_idr" integer NOT NULL,
	"midtrans_order_id" text,
	"status" text DEFAULT 'pending' NOT NULL,
	"paid_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "payments_midtrans_order_id_unique" UNIQUE("midtrans_order_id")
);
--> statement-breakpoint
CREATE TABLE "plans" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"price_idr" integer DEFAULT 0 NOT NULL,
	"daily_limit" integer NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE "usage_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"api_key_id" uuid NOT NULL,
	"endpoint" text NOT NULL,
	"status_code" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "api_keys" ADD CONSTRAINT "api_keys_developer_id_developers_id_fk" FOREIGN KEY ("developer_id") REFERENCES "public"."developers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "car_parameter_values" ADD CONSTRAINT "car_parameter_values_car_id_cars_id_fk" FOREIGN KEY ("car_id") REFERENCES "public"."cars"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "car_parameter_values" ADD CONSTRAINT "car_parameter_values_parameter_id_parameters_id_fk" FOREIGN KEY ("parameter_id") REFERENCES "public"."parameters"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cars" ADD CONSTRAINT "cars_brand_id_brands_id_fk" FOREIGN KEY ("brand_id") REFERENCES "public"."brands"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_developer_id_developers_id_fk" FOREIGN KEY ("developer_id") REFERENCES "public"."developers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_plan_id_plans_id_fk" FOREIGN KEY ("plan_id") REFERENCES "public"."plans"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "usage_logs" ADD CONSTRAINT "usage_logs_api_key_id_api_keys_id_fk" FOREIGN KEY ("api_key_id") REFERENCES "public"."api_keys"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "cars_brand_id_idx" ON "cars" USING btree ("brand_id");--> statement-breakpoint
CREATE INDEX "cars_powertrain_idx" ON "cars" USING btree ("powertrain");--> statement-breakpoint
CREATE INDEX "cars_year_idx" ON "cars" USING btree ("year");--> statement-breakpoint
CREATE INDEX "cars_status_idx" ON "cars" USING btree ("status");--> statement-breakpoint
CREATE INDEX "usage_logs_key_created_idx" ON "usage_logs" USING btree ("api_key_id","created_at");