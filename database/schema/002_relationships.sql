IF OBJECT_ID(N'dbo.FK_accounts_customers', N'F') IS NULL
BEGIN
	ALTER TABLE dbo.accounts
	ADD CONSTRAINT FK_accounts_customers
	FOREIGN KEY (customer_id) REFERENCES dbo.customers(customer_id);
END;

IF OBJECT_ID(N'dbo.FK_devices_customers', N'F') IS NULL
BEGIN
	ALTER TABLE dbo.devices
	ADD CONSTRAINT FK_devices_customers
	FOREIGN KEY (customer_id) REFERENCES dbo.customers(customer_id);
END;

IF OBJECT_ID(N'dbo.FK_transactions_customers', N'F') IS NULL
BEGIN
	ALTER TABLE dbo.transactions
	ADD CONSTRAINT FK_transactions_customers
	FOREIGN KEY (customer_id) REFERENCES dbo.customers(customer_id);
END;

IF OBJECT_ID(N'dbo.FK_transactions_accounts', N'F') IS NULL
BEGIN
	ALTER TABLE dbo.transactions
	ADD CONSTRAINT FK_transactions_accounts
	FOREIGN KEY (account_id) REFERENCES dbo.accounts(account_id);
END;

IF OBJECT_ID(N'dbo.FK_transactions_merchants', N'F') IS NULL
BEGIN
	ALTER TABLE dbo.transactions
	ADD CONSTRAINT FK_transactions_merchants
	FOREIGN KEY (merchant_id) REFERENCES dbo.merchants(merchant_id);
END;

IF OBJECT_ID(N'dbo.FK_transactions_devices', N'F') IS NULL
BEGIN
	ALTER TABLE dbo.transactions
	ADD CONSTRAINT FK_transactions_devices
	FOREIGN KEY (device_id) REFERENCES dbo.devices(device_id);
END;

IF OBJECT_ID(N'dbo.FK_chargebacks_transactions', N'F') IS NULL
BEGIN
	ALTER TABLE dbo.chargebacks
	ADD CONSTRAINT FK_chargebacks_transactions
	FOREIGN KEY (transaction_id) REFERENCES dbo.transactions(transaction_id);
END;

IF OBJECT_ID(N'dbo.FK_fraud_alerts_customers', N'F') IS NULL
BEGIN
	ALTER TABLE dbo.fraud_alerts
	ADD CONSTRAINT FK_fraud_alerts_customers
	FOREIGN KEY (customer_id) REFERENCES dbo.customers(customer_id);
END;

IF OBJECT_ID(N'dbo.FK_fraud_alerts_transactions', N'F') IS NULL
BEGIN
	ALTER TABLE dbo.fraud_alerts
	ADD CONSTRAINT FK_fraud_alerts_transactions
	FOREIGN KEY (transaction_id) REFERENCES dbo.transactions(transaction_id);
END;

IF OBJECT_ID(N'dbo.FK_risk_signals_customers', N'F') IS NULL
BEGIN
	ALTER TABLE dbo.risk_signals
	ADD CONSTRAINT FK_risk_signals_customers
	FOREIGN KEY (customer_id) REFERENCES dbo.customers(customer_id);
END;

IF OBJECT_ID(N'dbo.FK_analytics_approvals_requests', N'F') IS NULL
BEGIN
	ALTER TABLE dbo.analytics_approvals
	ADD CONSTRAINT FK_analytics_approvals_requests
	FOREIGN KEY (request_id) REFERENCES dbo.analytics_requests_audit(request_id);
END;
