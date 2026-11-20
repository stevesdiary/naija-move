CREATE TYPE "public"."rider_kyc_status" AS ENUM('unverified', 'pending', 'verified', 'rejected');--> statement-breakpoint
ALTER TABLE "riders" ADD COLUMN "kyc_status" "rider_kyc_status" DEFAULT 'unverified' NOT NULL;--> statement-breakpoint
ALTER TABLE "riders" ADD COLUMN "nin" text;--> statement-breakpoint
ALTER TABLE "riders" ADD COLUMN "nin_verified" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "riders" ADD COLUMN "nin_data" text;--> statement-breakpoint
ALTER TABLE "riders" ADD COLUMN "kyc_verified_at" timestamp with time zone;