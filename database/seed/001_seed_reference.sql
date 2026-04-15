IF NOT EXISTS (SELECT 1 FROM dbo.customers WHERE customer_id = 'C001')
	INSERT INTO dbo.customers (customer_id, full_name, segment, city, country, risk_level)
	VALUES ('C001', 'Ana Torres', 'Retail', 'Bogota', 'Colombia', 'Medium');

IF NOT EXISTS (SELECT 1 FROM dbo.customers WHERE customer_id = 'C002')
	INSERT INTO dbo.customers (customer_id, full_name, segment, city, country, risk_level)
	VALUES ('C002', 'Luis Perez', 'SMB', 'Medellin', 'Colombia', 'High');

IF NOT EXISTS (SELECT 1 FROM dbo.customers WHERE customer_id = 'C003')
	INSERT INTO dbo.customers (customer_id, full_name, segment, city, country, risk_level)
	VALUES ('C003', 'Maria Rojas', 'Retail', 'Cali', 'Colombia', 'Low');

IF NOT EXISTS (SELECT 1 FROM dbo.accounts WHERE account_id = 'A001')
	INSERT INTO dbo.accounts (account_id, customer_id, account_type, status, opened_at)
	VALUES ('A001', 'C001', 'Checking', 'Active', DATEADD(DAY, -420, SYSUTCDATETIME()));

IF NOT EXISTS (SELECT 1 FROM dbo.accounts WHERE account_id = 'A002')
	INSERT INTO dbo.accounts (account_id, customer_id, account_type, status, opened_at)
	VALUES ('A002', 'C002', 'Checking', 'Active', DATEADD(DAY, -310, SYSUTCDATETIME()));

IF NOT EXISTS (SELECT 1 FROM dbo.accounts WHERE account_id = 'A003')
	INSERT INTO dbo.accounts (account_id, customer_id, account_type, status, opened_at)
	VALUES ('A003', 'C003', 'Savings', 'Active', DATEADD(DAY, -250, SYSUTCDATETIME()));

IF NOT EXISTS (SELECT 1 FROM dbo.merchants WHERE merchant_id = 'M101')
	INSERT INTO dbo.merchants (merchant_id, merchant_name, category, city, country, risk_profile)
	VALUES ('M101', 'BlueMarket', 'Retail', 'Bogota', 'Colombia', 'Low');

IF NOT EXISTS (SELECT 1 FROM dbo.merchants WHERE merchant_id = 'M102')
	INSERT INTO dbo.merchants (merchant_id, merchant_name, category, city, country, risk_profile)
	VALUES ('M102', 'Northwind Fuel', 'Fuel', 'Bogota', 'Colombia', 'High');

IF NOT EXISTS (SELECT 1 FROM dbo.merchants WHERE merchant_id = 'M103')
	INSERT INTO dbo.merchants (merchant_id, merchant_name, category, city, country, risk_profile)
	VALUES ('M103', 'SkyTravel', 'Travel', 'Medellin', 'Colombia', 'Medium');

IF NOT EXISTS (SELECT 1 FROM dbo.devices WHERE device_id = 'D001')
	INSERT INTO dbo.devices (device_id, customer_id, fingerprint, first_seen_at, is_trusted)
	VALUES ('D001', 'C001', 'fp-001', DATEADD(DAY, -180, SYSUTCDATETIME()), 1);

IF NOT EXISTS (SELECT 1 FROM dbo.devices WHERE device_id = 'D002')
	INSERT INTO dbo.devices (device_id, customer_id, fingerprint, first_seen_at, is_trusted)
	VALUES ('D002', 'C002', 'fp-002', DATEADD(DAY, -150, SYSUTCDATETIME()), 0);

IF NOT EXISTS (SELECT 1 FROM dbo.devices WHERE device_id = 'D003')
	INSERT INTO dbo.devices (device_id, customer_id, fingerprint, first_seen_at, is_trusted)
	VALUES ('D003', 'C003', 'fp-002', DATEADD(DAY, -20, SYSUTCDATETIME()), 0);
