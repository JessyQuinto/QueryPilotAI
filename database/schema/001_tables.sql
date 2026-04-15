IF OBJECT_ID(N'dbo.customers', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.customers (
        customer_id        VARCHAR(20)  NOT NULL PRIMARY KEY,
        full_name          NVARCHAR(200) NOT NULL,
        segment            VARCHAR(40) NOT NULL,
        city               VARCHAR(80) NOT NULL,
        country            VARCHAR(80) NOT NULL,
        risk_level         VARCHAR(20) NOT NULL,
        created_at         DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME()
    );
END;

IF OBJECT_ID(N'dbo.accounts', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.accounts (
        account_id         VARCHAR(20) NOT NULL PRIMARY KEY,
        customer_id        VARCHAR(20) NOT NULL,
        account_type       VARCHAR(40) NOT NULL,
        status             VARCHAR(20) NOT NULL,
        opened_at          DATETIME2 NOT NULL
    );
END;

IF OBJECT_ID(N'dbo.merchants', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.merchants (
        merchant_id        VARCHAR(20) NOT NULL PRIMARY KEY,
        merchant_name      NVARCHAR(200) NOT NULL,
        category           VARCHAR(80) NOT NULL,
        city               VARCHAR(80) NOT NULL,
        country            VARCHAR(80) NOT NULL,
        risk_profile       VARCHAR(20) NOT NULL
    );
END;

IF OBJECT_ID(N'dbo.devices', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.devices (
        device_id          VARCHAR(40) NOT NULL PRIMARY KEY,
        customer_id        VARCHAR(20) NOT NULL,
        fingerprint        VARCHAR(128) NOT NULL,
        first_seen_at      DATETIME2 NOT NULL,
        is_trusted         BIT NOT NULL
    );
END;

IF OBJECT_ID(N'dbo.transactions', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.transactions (
        transaction_id     VARCHAR(30) NOT NULL PRIMARY KEY,
        customer_id        VARCHAR(20) NOT NULL,
        account_id         VARCHAR(20) NOT NULL,
        merchant_id        VARCHAR(20) NOT NULL,
        device_id          VARCHAR(40) NOT NULL,
        channel            VARCHAR(30) NOT NULL,
        amount             DECIMAL(18,2) NOT NULL,
        currency           CHAR(3) NOT NULL,
        transaction_ts     DATETIME2 NOT NULL,
        status             VARCHAR(20) NOT NULL,
        response_code      VARCHAR(20) NOT NULL,
        geo_city           VARCHAR(80) NOT NULL,
        geo_country        VARCHAR(80) NOT NULL
    );
END;

IF OBJECT_ID(N'dbo.chargebacks', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.chargebacks (
        chargeback_id      VARCHAR(30) NOT NULL PRIMARY KEY,
        transaction_id     VARCHAR(30) NOT NULL,
        chargeback_reason  VARCHAR(80) NOT NULL,
        chargeback_ts      DATETIME2 NOT NULL,
        amount             DECIMAL(18,2) NOT NULL
    );
END;

IF OBJECT_ID(N'dbo.fraud_alerts', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.fraud_alerts (
        alert_id           VARCHAR(30) NOT NULL PRIMARY KEY,
        customer_id        VARCHAR(20) NOT NULL,
        transaction_id     VARCHAR(30) NULL,
        alert_type         VARCHAR(60) NOT NULL,
        alert_score        DECIMAL(5,2) NOT NULL,
        created_at         DATETIME2 NOT NULL,
        status             VARCHAR(20) NOT NULL
    );
END;

IF OBJECT_ID(N'dbo.risk_signals', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.risk_signals (
        signal_id          VARCHAR(30) NOT NULL PRIMARY KEY,
        customer_id        VARCHAR(20) NOT NULL,
        signal_type        VARCHAR(80) NOT NULL,
        signal_value       NVARCHAR(200) NOT NULL,
        signal_ts          DATETIME2 NOT NULL
    );
END;

IF OBJECT_ID(N'dbo.analytics_requests_audit', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.analytics_requests_audit (
        request_id         UNIQUEIDENTIFIER NOT NULL PRIMARY KEY,
        user_id            NVARCHAR(200) NOT NULL,
        role_name          VARCHAR(40) NOT NULL,
        original_question  NVARCHAR(MAX) NOT NULL,
        analytical_intent  NVARCHAR(MAX) NULL,
        generated_sql      NVARCHAR(MAX) NULL,
        validation_result  NVARCHAR(MAX) NULL,
        status             VARCHAR(30) NOT NULL,
        created_at         DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
        completed_at       DATETIME2 NULL
    );
END;

IF OBJECT_ID(N'dbo.analytics_approvals', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.analytics_approvals (
        approval_id        UNIQUEIDENTIFIER NOT NULL PRIMARY KEY,
        request_id         UNIQUEIDENTIFIER NOT NULL,
        approver_user_id   NVARCHAR(200) NULL,
        decision           VARCHAR(20) NOT NULL,
        comments           NVARCHAR(1000) NULL,
        decided_at         DATETIME2 NULL
    );
END;
