CREATE TABLE `analyses` (
	`id` text PRIMARY KEY NOT NULL,
	`license_id` text,
	`style` text NOT NULL,
	`filename` text,
	`summary` text,
	`full_data` text,
	`score` integer,
	`created_at` integer,
	FOREIGN KEY (`license_id`) REFERENCES `licenses`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `license_devices` (
	`id` text PRIMARY KEY NOT NULL,
	`license_id` text,
	`fingerprint` text NOT NULL,
	`user_agent` text,
	`last_seen_at` integer,
	`created_at` integer,
	FOREIGN KEY (`license_id`) REFERENCES `licenses`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `licenses` (
	`id` text PRIMARY KEY NOT NULL,
	`code` text NOT NULL,
	`plan` text NOT NULL,
	`status` text DEFAULT 'unused',
	`email` text,
	`fingerprint` text,
	`device_limit` integer DEFAULT 2,
	`activated_at` integer,
	`expires_at` integer,
	`stripe_session_id` text,
	`created_at` integer
);
--> statement-breakpoint
CREATE UNIQUE INDEX `licenses_code_unique` ON `licenses` (`code`);