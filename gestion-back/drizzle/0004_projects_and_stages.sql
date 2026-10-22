-- Proyectos (campañas / lotes / obras / centros de costo) y sus etapas configurables.
-- Las columnas nuevas de `expenses` son nullable: los gastos existentes quedan "sin proyecto".

CREATE TABLE IF NOT EXISTS `projects` (
  `id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  `company_id` integer NOT NULL,
  `name` text NOT NULL,
  `code` text,
  `description` text,
  `start_date` text,
  `end_date` text,
  `size` real,
  `size_unit` text,
  `budget` real,
  `status` text DEFAULT 'activo',
  `created_at` text DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`company_id`) REFERENCES `companies`(`id`)
);

CREATE TABLE IF NOT EXISTS `project_stages` (
  `id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  `project_id` integer NOT NULL,
  `company_id` integer NOT NULL,
  `name` text NOT NULL,
  `sort_order` integer DEFAULT 0,
  `planned_budget` real,
  `color` text,
  `created_at` text DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`),
  FOREIGN KEY (`company_id`) REFERENCES `companies`(`id`)
);

CREATE INDEX IF NOT EXISTS `idx_projects_company` ON `projects` (`company_id`);
CREATE INDEX IF NOT EXISTS `idx_stages_project` ON `project_stages` (`project_id`);

ALTER TABLE `expenses` ADD COLUMN `project_id` integer REFERENCES `projects`(`id`);
ALTER TABLE `expenses` ADD COLUMN `stage_id` integer REFERENCES `project_stages`(`id`);
ALTER TABLE `expenses` ADD COLUMN `supplier` text;
ALTER TABLE `expenses` ADD COLUMN `quantity` real;
ALTER TABLE `expenses` ADD COLUMN `unit` text;
ALTER TABLE `expenses` ADD COLUMN `unit_cost` real;
ALTER TABLE `expenses` ADD COLUMN `invoice_number` text;

CREATE INDEX IF NOT EXISTS `idx_expenses_project` ON `expenses` (`project_id`);
CREATE INDEX IF NOT EXISTS `idx_expenses_company_date` ON `expenses` (`company_id`, `expense_date`);
