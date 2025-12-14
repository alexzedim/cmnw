-- Remove duplicate character entries, keeping only the latest record by updated_at timestamp
-- This script identifies duplicate GUIDs and deletes older records, preserving the most recent data

WITH ranked_characters AS (
  SELECT
    uuid,
    guid,
    ROW_NUMBER() OVER (PARTITION BY guid ORDER BY updated_at DESC, uuid DESC) as rn
  FROM characters
)
DELETE FROM characters
WHERE uuid IN (
  SELECT uuid FROM ranked_characters WHERE rn > 1
);

-- Verify the cleanup
SELECT
  guid,
  COUNT(*) as count,
  MAX(updated_at) as latest_update
FROM characters
GROUP BY guid
HAVING COUNT(*) > 1;
