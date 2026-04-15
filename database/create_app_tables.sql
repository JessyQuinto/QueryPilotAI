-- ============================================
-- InsightForge Application Database Schema
-- Database: insightforge-appdb
-- Purpose: Workspace, session persistence, user connections, conversation history
-- ============================================

-- User database connections
IF OBJECT_ID(N'dbo.user_connections', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.user_connections (
        id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
        user_id NVARCHAR(256) NOT NULL,
        connection_name NVARCHAR(100) NOT NULL,
        db_type NVARCHAR(50) NOT NULL,            -- 'Azure SQL', 'SQL Server', 'PostgreSQL', etc.
        host NVARCHAR(256) NOT NULL,
        port NVARCHAR(10),
        database_name NVARCHAR(128) NOT NULL,
        auth_type NVARCHAR(50),                   -- 'SQL', 'AzureAD', 'Password'
        username NVARCHAR(256),
        encrypted_password NVARCHAR(512),         -- Should be encrypted via Key Vault
        schema_cache NVARCHAR(MAX),               -- Extracted DB schema (JSON)
        schema_extracted_at DATETIME2,
        created_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
        updated_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
        is_active BIT NOT NULL DEFAULT 1,
        CONSTRAINT UQ_user_connection_name UNIQUE(user_id, connection_name)
    );
END;

-- Organizations / workspaces
IF OBJECT_ID(N'dbo.organizations', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.organizations (
        id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
        name NVARCHAR(150) NOT NULL,
        industry NVARCHAR(100) NULL,
        created_at DATETIMEOFFSET NOT NULL DEFAULT SYSUTCDATETIME()
    );
END;

IF OBJECT_ID(N'dbo.organization_members', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.organization_members (
        organization_id UNIQUEIDENTIFIER NOT NULL
            REFERENCES dbo.organizations(id) ON DELETE CASCADE,
        user_id NVARCHAR(256) NOT NULL,
        role NVARCHAR(50) NOT NULL DEFAULT 'Member',
        joined_at DATETIMEOFFSET NOT NULL DEFAULT SYSUTCDATETIME(),
        CONSTRAINT PK_organization_members PRIMARY KEY (organization_id, user_id)
    );
END;

-- Chat sessions
IF OBJECT_ID(N'dbo.chat_sessions', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.chat_sessions (
        id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
        user_id NVARCHAR(256) NOT NULL,
        connection_id UNIQUEIDENTIFIER NULL REFERENCES dbo.user_connections(id) ON DELETE CASCADE,
        title NVARCHAR(200),
        created_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
        last_activity DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
        is_active BIT NOT NULL DEFAULT 1
    );
END;

-- Conversation turns (replaces in-memory ConcurrentDictionary)
IF OBJECT_ID(N'dbo.conversation_turns', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.conversation_turns (
        id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
        session_id UNIQUEIDENTIFIER NOT NULL REFERENCES dbo.chat_sessions(id) ON DELETE CASCADE,
        user_id NVARCHAR(256) NOT NULL,
        role NVARCHAR(20) NOT NULL DEFAULT 'user',   -- 'user' or 'assistant'
        question NVARCHAR(MAX) NOT NULL,
        sql_generated NVARCHAR(MAX),
        agent_response NVARCHAR(MAX),                 -- Full JSON from Foundry agent
        summary NVARCHAR(MAX),
        intent_type NVARCHAR(50),
        metric NVARCHAR(50),
        created_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME()
    );
END;

-- Audit trail (analytics requests)
IF OBJECT_ID(N'dbo.analytics_requests_audit', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.analytics_requests_audit (
        request_id UNIQUEIDENTIFIER PRIMARY KEY,
        session_id UNIQUEIDENTIFIER NULL REFERENCES dbo.chat_sessions(id),
        user_id NVARCHAR(256) NOT NULL,
        role_name NVARCHAR(100),
        original_question NVARCHAR(MAX),
        analytical_intent NVARCHAR(MAX),
        generated_sql NVARCHAR(MAX),
        validation_result NVARCHAR(MAX),
        status NVARCHAR(50) NOT NULL,
        created_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
        completed_at DATETIME2
    );
END;

-- Indexes
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_user_connections_user_id' AND object_id = OBJECT_ID(N'dbo.user_connections'))
BEGIN
    CREATE INDEX IX_user_connections_user_id ON dbo.user_connections(user_id);
END;

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_organization_members_user_id' AND object_id = OBJECT_ID(N'dbo.organization_members'))
BEGIN
    CREATE INDEX IX_organization_members_user_id ON dbo.organization_members(user_id);
END;

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_chat_sessions_user_id' AND object_id = OBJECT_ID(N'dbo.chat_sessions'))
BEGIN
    CREATE INDEX IX_chat_sessions_user_id ON dbo.chat_sessions(user_id, last_activity DESC);
END;

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_chat_sessions_connection' AND object_id = OBJECT_ID(N'dbo.chat_sessions'))
BEGIN
    CREATE INDEX IX_chat_sessions_connection ON dbo.chat_sessions(connection_id);
END;

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_conversation_turns_session' AND object_id = OBJECT_ID(N'dbo.conversation_turns'))
BEGIN
    CREATE INDEX IX_conversation_turns_session ON dbo.conversation_turns(session_id, created_at);
END;

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_audit_user_date' AND object_id = OBJECT_ID(N'dbo.analytics_requests_audit'))
BEGIN
    CREATE INDEX IX_audit_user_date ON dbo.analytics_requests_audit(user_id, created_at DESC);
END;
