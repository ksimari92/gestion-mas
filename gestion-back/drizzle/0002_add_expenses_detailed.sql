DROP TABLE IF EXISTS `expenses`;
CREATE TABLE `expenses` (
  `id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  `company_id` integer NOT NULL,
  `user_id` integer NOT NULL,
  `description` text NOT NULL,
  `detail` text,
  `amount` real NOT NULL,
  `category` text NOT NULL,
  `payment_source` text NOT NULL,
  `receipt_base64` text,
  `receipt_mime_type` text,
  `expense_date` text NOT NULL,
  `created_at` text DEFAULT 'CURRENT_TIMESTAMP',
  FOREIGN KEY (`company_id`) REFERENCES `companies`(`id`),
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`)
);
