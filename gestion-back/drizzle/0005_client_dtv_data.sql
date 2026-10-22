-- Datos del DTV (Documento de Tránsito Vegetal, SENASA) en la ficha del cliente.
-- Son datos fijos que se reutilizan al emitir cada documento, por eso viven en
-- `clients` y no en una tabla por operación. Todos opcionales: un cliente que
-- sólo compra en efectivo no necesita ninguno.

ALTER TABLE `clients` ADD COLUMN `renspa` text;
ALTER TABLE `clients` ADD COLUMN `senasa_holder` text;
ALTER TABLE `clients` ADD COLUMN `establishment` text;
ALTER TABLE `clients` ADD COLUMN `locality` text;
ALTER TABLE `clients` ADD COLUMN `province` text;
ALTER TABLE `clients` ADD COLUMN `dtv_notes` text;

CREATE INDEX IF NOT EXISTS `idx_clients_company` ON `clients` (`company_id`);
