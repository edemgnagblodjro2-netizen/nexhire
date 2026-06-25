-- Phase 40 : ON DELETE CASCADE sur connector_departments.connector_id
-- Sans ce CASCADE, supprimer un connecteur laisse des lignes orphelines
-- dans connector_departments (connector_id devient une FK cassée).

ALTER TABLE connector_departments
    DROP CONSTRAINT IF EXISTS connector_departments_connector_id_fkey;

ALTER TABLE connector_departments
    ADD CONSTRAINT connector_departments_connector_id_fkey
    FOREIGN KEY (connector_id)
    REFERENCES connectors(id)
    ON DELETE CASCADE;
