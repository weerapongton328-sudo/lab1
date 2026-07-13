ALTER TABLE "orders" ALTER COLUMN "points_earned" SET DATA TYPE numeric(12, 2);--> statement-breakpoint
ALTER TABLE "orders" ALTER COLUMN "points_earned" SET DEFAULT '0.00';