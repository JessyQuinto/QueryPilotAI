# QueryPilotAI — Natural Language to SQL Analytics Engine

**Agentic AI-Powered Database Query Assistant**

QueryPilotAI is an enterprise-grade agentic analytics system that converts natural language questions into validated SQL queries against any connected database. It orchestrates three specialized Azure AI Foundry agents through a 9-step Durable Functions pipeline with defense-in-depth security, RBAC rewriting, bias detection, schema-aware query planning, and full audit transparency.

---

## Table of Contents

- [Architecture](#architecture)
- [Azure Services](#azure-services)
- [Responsible AI Principles](#responsible-ai-principles)
- [Setup & Deployment](#setup--deployment)
- [Local Development](#local-development)
- [API Reference](#api-reference)
- [Security Model](#security-model)
- [Database Schema Auto-Discovery](#database-schema-auto-discovery)
- [Next Steps](#next-steps)

---

## Architecture

```
┌───────────────────────────────────────────────────────────────────────┐
│                          CLIENT TIER                                  │
│               Next.js 15 (React + TypeScript + App Router)           │
│                                                                       │
│   LandingPage │ ChatArea │ ChartSuggestion │ ConnectionManager        │
│   Sidebar     │ IDEArea  │ TerminalLogs    │ WorkspaceOnboarding      │
└───────────────────────────┬───────────────────────────────────────────┘
                            │  HTTPS / Proxy → http://127.0.0.1:7071
┌───────────────────────────▼───────────────────────────────────────────┐
│                          API TIER                                      │
│         Azure Functions (Isolated Worker, .NET 8, Durable Tasks)      │
│                                                                        │
│   QueryIntakeFunction  │  AppDatabaseFunctions  │  Activities          │
│                                                                        │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │              9-Step Agentic Query Pipeline                       │  │
│  │                                                                  │  │
│  │  0. Conversation Context → 1. Concierge Agent (routing) →       │  │
│  │  2. Prompt Safety → 3. Schema Extraction → 4. SQL Planner       │  │
│  │  Agent → 5. SQL Policy Validation + RBAC Rewrite →              │  │
│  │  6. Approval Flow → 7. SQL Execution → 7.5. Bias Detection →   │  │
│  │  8. Result Interpreter Agent → 9. Audit Trail                   │  │
│  └──────────────────────────────────────────────────────────────────┘  │
└──────┬──────────────┬──────────────┬──────────────┬───────────────────┘
       │              │              │              │
┌──────▼──────┐ ┌─────▼──────┐ ┌────▼────┐ ┌──────▼──────────────────┐
│  Azure SQL  │ │   Azure    │ │  Azure  │ │    Azure Storage        │
│  Database   │ │  OpenAI    │ │   AI    │ │    Account              │
│             │ │  Service   │ │ Foundry │ │                         │
│ • App state │ │            │ │         │ │ • Durable task state    │
│   tables    │ │ • gpt-4o   │ │ • Hub   │ │ • Function host keys   │
│ • User DB   │ │   deploy   │ │ • Proj  │ │ • Blob/Queue/Table     │
│ • Audit log │ │            │ │ • 3     │ │                         │
│ • Sessions  │ │            │ │  agents │ │                         │
└─────────────┘ └────────────┘ └─────────┘ └─────────────────────────┘

       ┌─────────────────────────────────────────────┐
       │           SECRETS & IDENTITY                │
       │  Azure Key Vault  │  Entra ID (JWT auth)    │
       └─────────────────────────────────────────────┘
```

### Query Pipeline — Step by Step

```
POST /api/query { "question": "¿Cuántas órdenes están pendientes?" }
          │
          ▼
 0.  Conversation Context      Load recent turns from persistent DB
          │
          ▼
 1.  Concierge Agent           Foundry Agent: classify as analytical vs conversational
     (routing)                 Conversational → return friendly reply, skip pipeline
          │
          ▼
 2.  Prompt Safety             Block harmful, injection, or policy-violating input
          │
          ▼
 3.  Schema Extraction         Dynamic schema from user's connected DB (cached per 3 turns)
          │
          ▼
 4.  SQL Planner Agent         Foundry Agent: NL → T-SQL with governance metadata
                               Handles: ready | needs_clarification | unsupported | blocked
          │
          ▼
 5.  SQL Policy Validation     AST-based policy engine: mutation blocking, risk scoring
 5.5 RBAC Rewrite              Inject row-level access filters per user role
          │
          ▼
 6.  Approval Flow             High-risk queries: wait for human approval (30min timeout)
          │
          ▼
 7.  SQL Execution             Execute on user's DB via dynamic connection; 500-row cap
          │
          ▼
 7.5 Bias Detection            Scan results for demographic disparities >20%
          │
          ▼
 8.  Result Interpreter Agent  Foundry Agent: executive summary, key findings, chart spec
          │
          ▼
 9.  Audit Trail + Persist     Save turn to conversation_turns + audit_trail table
          │
          ▼
     JSON Response
     (summary, SQL, data[], chart, warnings, audit metadata)
```

### Project Structure

```
QueryPilotAI/
├── backend/
│   └── src/
│       ├── Core.Domain/                       # Domain policies & validation rules
│       │   └── Policies/
│       │       ├── ISqlPolicyEngine.cs         # SQL validation contract
│       │       ├── ISqlRewriterService.cs      # RBAC rewrite contract
│       │       ├── IBiasDetectorService.cs     # Bias detection contract
│       │       └── SqlValidationResult.cs      # Validation result model
│       │
│       ├── Core.Application/                  # Application contracts & models
│       │   ├── Contracts/
│       │   │   ├── IFoundryAgentClient.cs      # Azure AI Foundry agent interface
│       │   │   ├── IAppDatabaseService.cs      # App state persistence interface
│       │   │   ├── ISqlExecutionService.cs     # SQL execution contract
│       │   │   ├── ISchemaExtractorService.cs  # Dynamic schema extraction
│       │   │   ├── IPromptSafetyService.cs     # Prompt safety contract
│       │   │   └── QueryContracts.cs           # Request/response DTOs
│       │   ├── Models/
│       │   │   └── ResultInterpreterModels.cs  # Foundry agent response models
│       │   └── Services/
│       │
│       ├── Infrastructure.AzureOpenAI/        # Azure OpenAI & Foundry integration
│       │   ├── FoundryAgentService.cs          # Assistants API client (3 agents)
│       │   ├── SharedClient.cs                 # HTTP client + auth management
│       │   ├── IntentService.cs                # Intent classification fallback
│       │   ├── SqlGenerationService.cs         # Direct SQL generation fallback
│       │   ├── SummaryService.cs               # Result summarization fallback
│       │   └── ConversationMemoryService.cs    # In-memory conversation context
│       │
│       ├── Infrastructure.Sql/                # SQL Server data access
│       │   ├── AppDatabaseService.cs           # Sessions, connections, orgs, turns
│       │   ├── SqlExecutionService.cs          # Dynamic SQL execution engine
│       │   ├── SchemaExtractorService.cs       # Auto-discover table/column metadata
│       │   └── SqlConnectionFactory.cs         # Connection string builder
│       │
│       ├── Infrastructure.Security/           # Security & governance services
│       │   ├── SqlPolicyEngine.cs              # AST-based SQL validation
│       │   ├── SqlRewriterService.cs           # RBAC row-level filter injection
│       │   ├── BiasDetectorService.cs          # Demographic disparity detection
│       │   └── PromptSafetyService.cs          # Input content safety screening
│       │
│       └── Functions.Api/                     # Azure Functions host
│           ├── Program.cs                      # DI container & middleware setup
│           ├── Auth/
│           │   └── AuthContextHelpers.cs       # JWT claim extraction + dev mode
│           ├── Middleware/
│           │   └── JwtValidationMiddleware.cs  # Entra ID JWT validation
│           └── Functions/
│               ├── QueryIntakeFunction.cs       # HTTP trigger → Durable orchestration
│               ├── FraudInsightOrchestrator.cs  # 9-step pipeline orchestrator
│               ├── Activities.cs                # Durable activity functions
│               └── AppDatabaseFunctions.cs      # CRUD: connections, sessions, orgs
│
└── frontend/
    ├── app/
    │   ├── layout.tsx                          # Root layout with providers
    │   ├── page.tsx                            # Landing page entry
    │   └── dashboard/
    │       └── page.tsx                        # Main workspace page
    ├── components/
    │   ├── ChatArea.tsx                        # Real-time chat with streaming status
    │   ├── UnifiedChat.tsx                     # Unified message renderer
    │   ├── ChartSuggestion.tsx                 # AI-suggested chart visualization
    │   ├── ConnectionManager.tsx               # Database connection CRUD UI
    │   ├── WorkspaceOnboarding.tsx             # First-time setup wizard
    │   ├── Sidebar.tsx                         # Session list + navigation
    │   ├── IDEArea.tsx                         # SQL viewer panel
    │   ├── TerminalLogs.tsx                    # Pipeline step trace
    │   ├── LandingPage.tsx                     # Hero page with typewriter effect
    │   └── InteractiveBackground.tsx           # Animated particle background
    ├── hooks/
    │   ├── useChatEngine.ts                    # Pipeline orchestration hook
    │   ├── useChatSessions.ts                  # Session lifecycle management
    │   ├── useConnections.ts                   # Connection state management
    │   └── useApi.ts                           # Authenticated API client
    └── lib/
        ├── authConfig.ts                       # MSAL / dev-mode auth config
        └── logger.ts                           # Structured frontend logging
```

---

## Azure Services

| Service | Purpose | Configuration |
|---------|---------|---------------|
| **Azure SQL Database** | Hosts application state tables (`user_connections`, `chat_sessions`, `conversation_turns`, `organizations`, `organization_members`) and serves as the execution target for user queries | Connection string in `DatabaseConnectionString`; SQL auth or Entra ID |
| **Azure OpenAI Service** | Powers the gpt-4o deployment used by all three Foundry agents for SQL generation, result interpretation, and conversational routing | Set `AzureOpenAI__Endpoint`, `AzureOpenAI__ApiKey`, `AzureOpenAI__Deployment` |
| **Azure AI Foundry** | Hosts three specialized Assistants: SqlPlanner, ResultInterpreter, and Concierge with persistent thread management | Set `FoundryAgent__ProjectEndpoint` and individual `*AgentId` values |
| **Azure Storage Account** | Durable Functions state storage (orchestration history, task hub queues, blob leases) | Set `AzureWebJobsStorage` with full connection string |
| **Azure Key Vault** | Stores all secrets: SQL connection strings, OpenAI API key, storage keys, JWT signing key | App Service uses managed identity with Key Vault references |
| **Azure App Service** | Hosts the Functions.Api backend (isolated worker, .NET 8) with Durable Task Framework | Startup command: `func start`; configure all env vars from Key Vault |
| **Azure Static Web Apps** | Hosts the Next.js 15 frontend with global CDN | Build: `npm run build`; output: `.next/`; configure proxy to backend URL |

---

## Responsible AI Principles

| Microsoft RAI Principle | Implementation | Where in Code |
|------------------------|----------------|---------------|
| **Fairness** | `BiasDetectorService` scans query results for demographic dimensions (race, gender, ethnicity, age) paired with outcome measures. Flags disparities >20% with contextual fairness notices. | `Infrastructure.Security/BiasDetectorService.cs` → Pipeline Step 7.5 |
| **Reliability & Safety** | Prompt safety screening blocks harmful input before any agent interaction. SQL policy engine validates generated SQL against AST rules with mutation blocking. Read-only execution prevents data modifications. | `PromptSafetyService.cs`, `SqlPolicyEngine.cs` |
| **Privacy & Security** | JWT-based authentication via Azure Entra ID. RBAC rewriter injects row-level filters unconditionally after SQL generation. Connection passwords encrypted at rest via `IConnectionSecretProtector`. | `JwtValidationMiddleware.cs`, `SqlRewriterService.cs` |
| **Inclusiveness** | Dynamic schema extraction allows any SQL Server, Azure SQL, or PostgreSQL database to be connected without configuration. Natural language interface removes SQL expertise barrier. | `SchemaExtractorService.cs`, `ChatArea.tsx` |
| **Transparency** | Every response includes the generated SQL, pipeline step trace, governance metadata, and risk level. Users see real-time pipeline progress via `SetCustomStatus`. | `FraudInsightOrchestrator.cs`, `TerminalLogs.tsx` |
| **Accountability** | Every query attempt (including blocked/denied) is persisted to `conversation_turns` and audit trail with: user identity, role, SQL, timing, status, and denial reason. | `FraudInsightOrchestrator.cs` Step 9, `AppDatabaseService.cs` |

---

## Setup & Deployment

### Prerequisites

- Azure subscription with access to: SQL Database, OpenAI Service, AI Foundry, Storage Account, Key Vault
- .NET 8 SDK
- Azure Functions Core Tools v4+
- Node.js 22+ (`nvm use 22`)
- Azure CLI (`az`)

### 1. Azure Infrastructure

1. Create a resource group and provision core services:
   ```bash
   az group create --name rg-querypilot-ai --location eastus2

   # Storage Account
   az storage account create --name querypilotaistg \
     --resource-group rg-querypilot-ai --sku Standard_LRS

   # Key Vault
   az keyvault create --name querypilotai-kv \
     --resource-group rg-querypilot-ai --location eastus2

   # Azure OpenAI
   az cognitiveservices account create --name querypilotai-openai \
     --resource-group rg-querypilot-ai --kind OpenAI --sku S0 \
     --location eastus2
   ```

2. Deploy gpt-4o model:
   ```bash
   az cognitiveservices account deployment create \
     --name querypilotai-openai --resource-group rg-querypilot-ai \
     --deployment-name gpt-4o --model-name gpt-4o \
     --model-version 2024-11-20 --model-format OpenAI \
     --sku-capacity 80 --sku-name GlobalStandard
   ```

### 2. AI Foundry Agents

Create three Assistants via the Azure OpenAI Assistants API:

| Agent | Role | System Prompt Focus |
|-------|------|---------------------|
| **SqlPlanner** | Converts natural language → validated T-SQL with governance metadata | Schema-aware SQL generation, risk assessment, clarification handling |
| **ResultInterpreter** | Analyzes SQL results → executive summary, key findings, chart spec | Data storytelling, visualization recommendations, warning extraction |
| **Concierge** | Routes input → analytical pipeline or conversational reply | Greeting detection, context-aware routing, friendly responses |

### 3. Database Setup

1. Create Azure SQL Server and database:
   ```bash
   az sql server create --name qpilot-sql \
     --resource-group rg-querypilot-ai --location eastus2 \
     --admin-user sqladmin --admin-password '<password>'

   az sql db create --name QueryPilotDB \
     --server qpilot-sql --resource-group rg-querypilot-ai \
     --edition GeneralPurpose --compute-model Serverless \
     --family Gen5 --capacity 1 --auto-pause-delay 60
   ```

2. The application automatically creates its internal tables on first connection:
   - `user_connections` — saved database connections
   - `chat_sessions` — conversation sessions
   - `conversation_turns` — individual Q&A exchanges
   - `organizations` — user organizations
   - `organization_members` — organization memberships

### 4. Key Vault Secrets

Store the following secrets in Azure Key Vault:

| Secret Name | Value |
|------------|-------|
| `sql-connection-string` | Full SQL connection string (admin) |
| `openai-api-key` | Azure OpenAI API key |
| `storage-connection-string` | Azure Storage Account connection string |
| `jwt-secret-key` | 32-byte hex secret for JWT signing |

### 5. Backend Deployment

```bash
cd backend/src/Functions.Api
dotnet publish -c Release -o publish
cd publish
func azure functionapp publish <app-name>
```

### 6. Frontend Deployment

```bash
cd frontend
npm install
npm run build
az staticwebapp deploy --app-name <static-app-name> --source .next
```

---

## Local Development

### Environment — `backend/src/Functions.Api/local.settings.json`

```json
{
  "IsEncrypted": false,
  "Values": {
    "AzureWebJobsStorage": "<storage-connection-string>",
    "FUNCTIONS_WORKER_RUNTIME": "dotnet-isolated",
    "DatabaseConnectionString": "Server=tcp:<server>.database.windows.net,1433;Initial Catalog=<db>;User ID=<user>;Password=<pass>;Encrypt=True;TrustServerCertificate=False;",
    "AzureOpenAI__Endpoint": "https://<resource>.openai.azure.com/",
    "AzureOpenAI__Deployment": "gpt-4o",
    "AzureOpenAI__ApiKey": "<key>",
    "FoundryAgent__ProjectEndpoint": "https://<resource>.openai.azure.com/",
    "FoundryAgent__SqlPlannerAgentId": "asst_<id>",
    "FoundryAgent__ResultInterpreterAgentId": "asst_<id>",
    "FoundryAgent__ConciergeAgentId": "asst_<id>",
    "Auth__SkipValidation": "true",
    "Auth__AuthorityHost": "https://login.microsoftonline.com",
    "Auth__ClientId": "<entra-app-id>",
    "Auth__AllowedAudiences": "<entra-app-id>"
  }
}
```

### Backend

```bash
cd backend/src/Functions.Api
func start
# API: http://localhost:7071
```

### Frontend

```bash
cd frontend
npm install
npm run dev
# UI: http://localhost:3000
```

> **Dev Mode:** Set `Auth__SkipValidation=true` in `local.settings.json` to bypass JWT validation. The middleware will inject a mock `dev-user@local` identity for all requests.

---

## API Reference

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `POST` | `/api/query` | JWT | **Main pipeline** — start Durable orchestration for NL-to-SQL |
| `GET` | `/api/query/status/{instanceId}` | JWT | Poll orchestration status and pipeline step trace |
| `GET` | `/api/connections` | JWT | List user's saved database connections |
| `POST` | `/api/connections` | JWT | Save a new database connection |
| `POST` | `/api/connections/test` | JWT | Test a database connection before saving |
| `DELETE` | `/api/connections/{id}` | JWT | Soft-delete a connection |
| `GET` | `/api/sessions/me` | JWT | List user's chat sessions |
| `POST` | `/api/sessions` | JWT | Create a new chat session |
| `PUT` | `/api/sessions/{id}/title` | JWT | Update session title |
| `DELETE` | `/api/sessions/{id}` | JWT | Delete session and all turns |
| `GET` | `/api/organizations/me` | JWT | List user's organizations |
| `POST` | `/api/organizations` | JWT | Create an organization |
| `DELETE` | `/api/organizations/{id}` | JWT | Delete an organization (admin only) |

### Query Request / Response

**Request:**
```json
POST /api/query
{
  "question": "¿Cuántas órdenes están pendientes?",
  "sessionId": "a1b2c3d4-...",
  "connectionId": "e5f6g7h8-...",
  "userId": "dev-user@local"
}
```

**Response:**
```json
{
  "instanceId": "abc123...",
  "status": "Completed",
  "summary": "Hay 5 órdenes con estado 'Pending' en el sistema...",
  "keyFindings": ["5 órdenes pendientes", "Concentradas en mayo 2026"],
  "sql": "SELECT COUNT(*) AS PendingOrders FROM dbo.Orders WHERE Status = 'Pending'",
  "warnings": [],
  "data": [{"PendingOrders": 5}],
  "audit": {"riskLevel": "low", "approvedBy": null},
  "suggestedChart": {
    "type": "metric",
    "title": "Órdenes Pendientes",
    "xField": null,
    "yField": "PendingOrders"
  }
}
```

---

## Security Model

| Layer | Control | Mechanism |
|-------|---------|-----------|
| **1 — Authentication** | Stateless JWT session | Azure Entra ID tokens; dev-mode bypass with `Auth__SkipValidation` |
| **2 — Input Safety** | Block harmful prompts | `PromptSafetyService` screens input before any agent interaction |
| **3 — SQL Policy Engine** | Block dangerous SQL | AST-based validation: mutation blocking, system table access prevention, risk scoring |
| **4 — RBAC Rewrite** | Enforce row-level access | `SqlRewriterService` injects WHERE filters post-generation, unconditionally |
| **5 — Approval Flow** | Human-in-the-loop | High-risk queries require manual approval via Durable External Event (30min timeout) |
| **6 — Read-only Execution** | Prevent DB mutations | SQL execution service enforces read-only operations; 500-row result cap |
| **7 — Bias Detection** | Fairness monitoring | `BiasDetectorService` flags demographic disparities >20% in result sets |
| **8 — Secret Protection** | Encrypt connection passwords | `IConnectionSecretProtector` encrypts DB passwords at rest in app state |
| **9 — Audit Trail** | Full accountability | Every query attempt logged with user, role, SQL, timing, status, and denial reason |

---

## Database Schema Auto-Discovery

QueryPilotAI dynamically extracts the schema from any connected database, eliminating the need for manual schema configuration. The `SchemaExtractorService` supports:

| Database | Connection Method | Schema Extraction |
|----------|-------------------|-------------------|
| **Azure SQL** | SQL Authentication or Entra ID | `INFORMATION_SCHEMA.TABLES` + `COLUMNS` |
| **SQL Server** | SQL Authentication | `INFORMATION_SCHEMA.TABLES` + `COLUMNS` |
| **PostgreSQL** | Standard authentication | `information_schema.tables` + `columns` |

**Schema caching:** Extracted schemas are cached per connection and refreshed every 3 conversation turns to balance freshness with performance.

---

## Three-Agent Architecture

```
┌──────────────────────────┐
│      Concierge Agent     │
│                          │
│  "¿Cuántas órdenes hay?" │──── analytical ───▶ Pipeline continues
│  "Hola, ¿cómo estás?"   │──── conversational ─▶ Direct reply
│  "Gracias"               │──── conversational ─▶ Direct reply
└──────────────────────────┘

┌──────────────────────────┐
│    SQL Planner Agent     │
│                          │
│  Input:  NL question     │
│          + DB schema     │
│          + conversation  │
│                          │
│  Output: T-SQL query     │
│          + governance    │
│          + risk level    │
│          + clarification │
└──────────────────────────┘

┌──────────────────────────┐
│  Result Interpreter Agent│
│                          │
│  Input:  SQL + results   │
│          + intent        │
│          + governance    │
│                          │
│  Output: Summary         │
│          + key findings  │
│          + chart spec    │
│          + warnings      │
└──────────────────────────┘
```

---

## Next Steps

### Production Hardening

| Area | Item |
|------|------|
| **Infrastructure** | Deploy Functions.Api to Azure Container Apps for horizontal autoscaling; add Azure Front Door for WAF and global load balancing |
| **Database** | Enable Azure SQL Always Encrypted for sensitive columns; configure geo-replication for disaster recovery |
| **Secrets** | Implement Azure Key Vault managed rotation for all API keys and connection strings |
| **Observability** | Integrate Azure Application Insights with custom dimensions per pipeline step (latency, risk level, agent tokens) |
| **CI/CD** | GitHub Actions: backend (`dotnet test`, `dotnet build`), frontend (`eslint`, `next build`), infrastructure (`bicep deploy`) |

### Security & Compliance

| Area | Item |
|------|------|
| **Authentication** | Replace dev-mode bypass with full Azure Entra ID SSO + group-to-role mapping |
| **Network isolation** | Deploy Functions and SQL into Azure Virtual Network; restrict via Private Endpoints |
| **Penetration testing** | Structured prompt injection testing against all three agents; RBAC bypass validation |
| **Compliance** | SOC 2 Type II readiness assessment; data residency documentation |

### Feature Roadmap

| Priority | Feature | Description |
|----------|---------|-------------|
| High | **Multi-database support** | Extend connection manager to support MySQL, Oracle, and Cosmos DB alongside SQL Server and PostgreSQL |
| High | **Persistent agent threads** | Maintain Foundry agent threads across sessions for improved context continuity |
| Medium | **Scheduled reports** | Save queries and receive results on a schedule via Azure Logic Apps + email/Teams notifications |
| Medium | **Export & sharing** | CSV/Excel/PDF export for result tables; shareable links with RBAC-aware access control |
| Medium | **Query history dashboard** | Admin-visible audit dashboard with query volume, denial rates, and latency trends |
| Low | **Multi-model support** | Abstract LLM layer to support GPT-4o, GPT-4 Turbo, and fine-tuned domain models |
| Low | **Natural language alerts** | Subscribe to threshold-based alerts ("notify me when pending orders exceed 100") backed by Azure Monitor |

### Responsible AI Maturity

| Item | Description |
|------|-------------|
| **Red team evaluation** | Systematic adversarial testing of all three agents for prompt injection, jailbreak, and data exfiltration |
| **Bias audit** | Quarterly review of bias detection thresholds; domain-expert calibration of the 20% disparity threshold |
| **Explainability panel** | Expand pipeline trace to show RBAC filter details, sensitivity classification rationale, and agent token usage |
| **Fairness dashboard** | Aggregate bias alerts into admin-visible fairness trend reports with time-series analysis |
| **RAI Impact Assessment** | Complete a formal Microsoft RAI Impact Assessment before connecting to production databases with sensitive data |

---

> This system is designed for development and demonstration purposes. All AI-generated SQL and analysis should be reviewed and validated by qualified professionals before being used for business decisions. QueryPilotAI does not replace expert judgment.
