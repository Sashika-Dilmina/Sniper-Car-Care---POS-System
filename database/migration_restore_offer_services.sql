-- Migration to restore offer services and ensure active products are not soft deleted
UPDATE products SET is_deleted = 0, is_active = 1 WHERE is_deleted = 1 AND (category = 'Services' OR category LIKE '%Service%') AND (name LIKE '%OFFER%' OR name LIKE '%offer%' OR name LIKE '%عرض%' OR name LIKE '%Saloon%' OR name LIKE '%4x4%');
