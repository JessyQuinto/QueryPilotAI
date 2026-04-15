IF NOT EXISTS (
	SELECT 1
	FROM dbo.analytics_requests_audit
	WHERE user_id = 'analyst@contoso.com'
	  AND role_name = 'FraudAnalyst'
	  AND original_question = N'¿Qué comercios muestran incremento anómalo de chargebacks?'
	  AND status = 'Seeded'
)
BEGIN
	INSERT INTO dbo.analytics_requests_audit (request_id, user_id, role_name, original_question, status)
	VALUES
	(NEWID(), 'analyst@contoso.com', 'FraudAnalyst', N'¿Qué comercios muestran incremento anómalo de chargebacks?', 'Seeded');
END;
