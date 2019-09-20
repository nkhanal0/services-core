-- ADD authorized TO payment_status ENUM
-- ALTER TYPE
--   payment_service.payment_status
-- ADD VALUE
--   'authorized'
-- BEFORE
--   'paid'

INSERT INTO
  pg_catalog.pg_enum(enumtypid, enumlabel, enumsortorder)
SELECT
    (SELECT oid FROM pg_catalog.pg_type WHERE typname = 'payment_status'),
    'authorized',
    1.5
