-- Ejemplo básico de enmascaramiento dinámico.
IF NOT EXISTS (
	SELECT 1
	FROM sys.masked_columns
	WHERE object_id = OBJECT_ID(N'dbo.customers')
	  AND name = N'full_name'
)
BEGIN
	ALTER TABLE dbo.customers
	ALTER COLUMN full_name ADD MASKED WITH (FUNCTION = 'partial(1,"XXXX",1)');
END;

-- Nota:
-- Row-Level Security y roles específicos pueden agregarse en una siguiente iteración
-- según el modelo de identidad de Entra ID y el contexto de sesión.
