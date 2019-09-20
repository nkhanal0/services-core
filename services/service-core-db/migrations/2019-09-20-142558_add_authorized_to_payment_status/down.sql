-- DELETE authorized FROM payment_status ENUM
DELETE FROM
	pg_catalog.pg_enum
WHERE
	enumlabel = 'authorized'
	AND enumtypid = (
		SELECT oid FROM pg_catalog.pg_type WHERE typname = 'payment_status'
	)
