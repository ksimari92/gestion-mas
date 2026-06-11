ALTER TABLE clients ADD `cuit` text;--> statement-breakpoint
ALTER TABLE expenses ADD `detail` text;--> statement-breakpoint
ALTER TABLE expenses ADD `payment_source` text NOT NULL;--> statement-breakpoint
ALTER TABLE expenses ADD `receipt_base64` text;--> statement-breakpoint
ALTER TABLE expenses ADD `receipt_mime_type` text;--> statement-breakpoint
ALTER TABLE `clients` DROP COLUMN `phone`;