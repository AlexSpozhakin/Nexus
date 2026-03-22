ALTER TABLE comments
    DROP COLUMN IF EXISTS is_edited,
    DROP COLUMN IF EXISTS updated_at;
