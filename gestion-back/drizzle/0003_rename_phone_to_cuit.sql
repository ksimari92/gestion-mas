-- Migration to add cuit column and migrate data from phone
ALTER TABLE clients ADD COLUMN cuit text;
UPDATE clients SET cuit = phone WHERE phone IS NOT NULL;
