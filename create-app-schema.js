const sql = require('mssql');

const config = {
  user: 'sqladmin',
  password: 'QpDev2026!#x',
  server: 'qpilot-sql-west.database.windows.net',
  database: 'QueryPilotTestDB',
  options: { encrypt: true, trustServerCertificate: false }
};

async function run() {
  const pool = await sql.connect(config);

  // Create app internal tables
  await pool.request().query(`
    -- user_connections table
    IF OBJECT_ID(N'dbo.user_connections', N'U') IS NULL
    BEGIN
      CREATE TABLE dbo.user_connections (
        id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
        user_id NVARCHAR(256) NOT NULL,
        connection_name NVARCHAR(150) NOT NULL,
        db_type NVARCHAR(50) NOT NULL,
        host NVARCHAR(256) NOT NULL,
        port NVARCHAR(10) NULL,
        database_name NVARCHAR(128) NOT NULL,
        auth_type NVARCHAR(50) NULL,
        username NVARCHAR(128) NULL,
        encrypted_password NVARCHAR(MAX) NULL,
        schema_cache NVARCHAR(MAX) NULL,
        schema_extracted_at DATETIME2 NULL,
        is_active BIT NOT NULL DEFAULT 1,
        created_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
        updated_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME()
      );
      CREATE INDEX IX_user_connections_user_id ON dbo.user_connections(user_id);
    END;

    -- chat_sessions table
    IF OBJECT_ID(N'dbo.chat_sessions', N'U') IS NULL
    BEGIN
      CREATE TABLE dbo.chat_sessions (
        id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
        user_id NVARCHAR(256) NOT NULL,
        connection_id UNIQUEIDENTIFIER NULL REFERENCES dbo.user_connections(id),
        title NVARCHAR(256) NULL,
        is_active BIT NOT NULL DEFAULT 1,
        created_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
        last_activity DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME()
      );
      CREATE INDEX IX_chat_sessions_user_id ON dbo.chat_sessions(user_id);
    END;

    -- conversation_turns table
    IF OBJECT_ID(N'dbo.conversation_turns', N'U') IS NULL
    BEGIN
      CREATE TABLE dbo.conversation_turns (
        id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
        session_id UNIQUEIDENTIFIER NOT NULL REFERENCES dbo.chat_sessions(id),
        user_id NVARCHAR(256) NOT NULL,
        role NVARCHAR(50) NOT NULL,
        question NVARCHAR(MAX) NOT NULL,
        sql_generated NVARCHAR(MAX) NULL,
        agent_response NVARCHAR(MAX) NULL,
        summary NVARCHAR(MAX) NULL,
        intent_type NVARCHAR(50) NULL,
        metric NVARCHAR(MAX) NULL,
        created_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME()
      );
      CREATE INDEX IX_conversation_turns_session_id ON dbo.conversation_turns(session_id);
    END;

    -- organizations table
    IF OBJECT_ID(N'dbo.organizations', N'U') IS NULL
    BEGIN
      CREATE TABLE dbo.organizations (
        id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
        name NVARCHAR(150) NOT NULL,
        industry NVARCHAR(100) NULL,
        created_at DATETIMEOFFSET NOT NULL DEFAULT SYSUTCDATETIME()
      );
    END;

    -- organization_members table
    IF OBJECT_ID(N'dbo.organization_members', N'U') IS NULL
    BEGIN
      CREATE TABLE dbo.organization_members (
        organization_id UNIQUEIDENTIFIER NOT NULL REFERENCES dbo.organizations(id) ON DELETE CASCADE,
        user_id NVARCHAR(256) NOT NULL,
        role NVARCHAR(50) NOT NULL DEFAULT 'Member',
        joined_at DATETIMEOFFSET NOT NULL DEFAULT SYSUTCDATETIME(),
        CONSTRAINT PK_organization_members PRIMARY KEY (organization_id, user_id)
      );
      CREATE INDEX IX_organization_members_user_id ON dbo.organization_members(user_id);
    END;
  `);

  console.log('All app tables created successfully!');

  // Verify
  const result = await pool.request().query(`
    SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = 'dbo' ORDER BY TABLE_NAME
  `);
  console.table(result.recordset);

  await pool.close();
}

run().catch(err => { console.error(err); process.exit(1); });
