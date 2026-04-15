CREATE OR ALTER VIEW dbo.vw_daily_fraud_metrics
AS
SELECT
    CAST(t.transaction_ts AS DATE) AS metric_date,
    t.channel,
    t.geo_city,
    COUNT(*) AS total_transactions,
    SUM(CASE WHEN c.chargeback_id IS NOT NULL THEN 1 ELSE 0 END) AS total_chargebacks,
    CAST(SUM(CASE WHEN c.chargeback_id IS NOT NULL THEN 1 ELSE 0 END) * 1.0 / NULLIF(COUNT(*), 0) AS DECIMAL(18,4)) AS chargeback_rate
FROM dbo.transactions t
LEFT JOIN dbo.chargebacks c
    ON c.transaction_id = t.transaction_id
GROUP BY CAST(t.transaction_ts AS DATE), t.channel, t.geo_city;
GO

CREATE OR ALTER VIEW dbo.vw_merchant_chargeback_trends
AS
WITH base AS (
    SELECT
        m.merchant_id,
        m.merchant_name,
        CASE
            WHEN t.transaction_ts >= DATEADD(DAY, -7, SYSUTCDATETIME()) THEN 'last_7_days'
            WHEN t.transaction_ts >= DATEADD(DAY, -30, SYSUTCDATETIME()) THEN 'last_30_days'
            ELSE 'older'
        END AS observation_window,
        COUNT(*) AS total_transactions,
        SUM(CASE WHEN c.chargeback_id IS NOT NULL THEN 1 ELSE 0 END) AS total_chargebacks
    FROM dbo.transactions t
    INNER JOIN dbo.merchants m ON m.merchant_id = t.merchant_id
    LEFT JOIN dbo.chargebacks c ON c.transaction_id = t.transaction_id
    WHERE t.transaction_ts >= DATEADD(DAY, -30, SYSUTCDATETIME())
    GROUP BY m.merchant_id, m.merchant_name,
        CASE
            WHEN t.transaction_ts >= DATEADD(DAY, -7, SYSUTCDATETIME()) THEN 'last_7_days'
            WHEN t.transaction_ts >= DATEADD(DAY, -30, SYSUTCDATETIME()) THEN 'last_30_days'
            ELSE 'older'
        END
),
current_window AS (
    SELECT merchant_id, merchant_name,
           CAST(total_chargebacks * 1.0 / NULLIF(total_transactions,0) AS DECIMAL(18,4)) AS chargeback_rate
    FROM base
    WHERE observation_window = 'last_7_days'
),
baseline AS (
    SELECT merchant_id,
           CAST(total_chargebacks * 1.0 / NULLIF(total_transactions,0) AS DECIMAL(18,4)) AS baseline_rate
    FROM base
    WHERE observation_window = 'last_30_days'
)
SELECT
    c.merchant_id,
    c.merchant_name,
    'last_7_days' AS observation_window,
    c.chargeback_rate,
    b.baseline_rate,
    CAST(c.chargeback_rate / NULLIF(b.baseline_rate, 0) AS DECIMAL(18,4)) AS delta_factor
FROM current_window c
LEFT JOIN baseline b ON b.merchant_id = c.merchant_id;
GO

CREATE OR ALTER VIEW dbo.vw_customer_risk_profile
AS
SELECT
    cu.customer_id,
    cu.full_name,
    cu.segment,
    cu.city,
    cu.risk_level,
    COUNT(DISTINCT t.transaction_id) AS total_transactions,
    COUNT(DISTINCT fa.alert_id) AS total_alerts,
    COUNT(DISTINCT cb.chargeback_id) AS total_chargebacks
FROM dbo.customers cu
LEFT JOIN dbo.transactions t ON t.customer_id = cu.customer_id
LEFT JOIN dbo.fraud_alerts fa ON fa.customer_id = cu.customer_id
LEFT JOIN dbo.transactions tx ON tx.customer_id = cu.customer_id
LEFT JOIN dbo.chargebacks cb ON cb.transaction_id = tx.transaction_id
GROUP BY cu.customer_id, cu.full_name, cu.segment, cu.city, cu.risk_level;
GO

CREATE OR ALTER VIEW dbo.vw_failed_then_successful_transactions
AS
SELECT
    t.customer_id,
    t.account_id,
    MIN(t.transaction_ts) AS first_attempt_ts,
    MAX(t.transaction_ts) AS last_attempt_ts,
    COUNT(*) AS attempts_count
FROM dbo.transactions t
GROUP BY t.customer_id, t.account_id, CAST(t.transaction_ts AS DATE)
HAVING SUM(CASE WHEN t.status = 'DECLINED' THEN 1 ELSE 0 END) >= 2
   AND SUM(CASE WHEN t.status = 'APPROVED' THEN 1 ELSE 0 END) >= 1;
GO

CREATE OR ALTER VIEW dbo.vw_high_risk_device_reuse
AS
SELECT
    d.device_id,
    d.fingerprint,
    COUNT(DISTINCT d.customer_id) AS distinct_customers,
    MAX(cu.risk_level) AS max_risk_level
FROM dbo.devices d
INNER JOIN dbo.customers cu ON cu.customer_id = d.customer_id
GROUP BY d.device_id, d.fingerprint
HAVING COUNT(DISTINCT d.customer_id) >= 2;
GO
