ALTER TABLE "members" ALTER COLUMN "points" SET DATA TYPE numeric(12, 2);--> statement-breakpoint
ALTER TABLE "members" ALTER COLUMN "points" SET DEFAULT '0.00';--> statement-breakpoint
ALTER TABLE "store_settings" ADD COLUMN "min_purchase_for_points_redeem" numeric(12, 2) DEFAULT '0.00' NOT NULL;