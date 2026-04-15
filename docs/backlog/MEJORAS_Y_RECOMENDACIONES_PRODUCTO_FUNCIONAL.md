# Improvements and Recommendations to Transform InsightForge AI into a Functional Product

## Objective
This document consolidates the prioritized improvements identified to take the project from a technical MVP or advanced demo to a functional, stable, secure, and operable product.

## Summary of Current State
- A functional end-to-end flow exists: natural language question, SQL generation, validation, execution, interpretation, and auditing.
- The backend already implements orchestration using Azure Functions and Durable Functions.
- The frontend provides a usable operational experience with chat, sessions, connections, and state tracking.
- The solution still presents significant gaps in security, operational hardening, maintainability, infrastructure alignment, and product quality.

## Functional Product Criteria
To consider the product functional, it must at least meet the following:
- Real authentication and authorization, not just partial claim extraction.
- Secrets management outside the repository.
- Robust SQL validation with allowlists and auditable controls.
- Deployable infrastructure aligned with the actual architecture.
- Consistent persistence of sessions, audits, and approvals.
- Stable user experience with explicit error and state handling.
- Sufficient observability to operate, diagnose, and audit.
- Minimal automated testing on critical flows and abuse scenarios.

## Priority 1 - Security and Governance

### 1. Fix secrets exposure
- Remove credentials, API keys, and sensitive values from the repository, documentation, and local configuration files.
- Immediately rotate all exposed credentials.
- Move secrets to Azure Key Vault and secure environment variables per environment.
- Add validations to prevent secrets from being committed again.

### 2. Implement real JWT validation
- Validate token signature, issuer, audience, and expiration in the backend.
- Reject any request with an invalid or untrustworthy token.
- Map Entra ID roles to internal product roles.
- Audit authenticated user, role, and request origin.

### 3. Harden the SQL policy engine
- Implement explicit allowlists for authorized tables, views, and columns.
- Prohibit any object outside the certified catalog.
- Detect costly or risky queries due to wide joins, broad scans, and lack of limits.
- Apply mandatory `TOP` or pagination where appropriate.
- Separate security, compliance, and performance validations.

### 4. Harden human approval
- Persist approval requests with complete state and traceability.
- Validate that only authorized roles can approve or reject.
- Log reason, timestamp, and approving user.
- Handle expiration, retries, and auditing of the approval cycle.

## Priority 2 - Backend Stability

### 5. Consolidate the AI architecture
- Officially choose between Azure AI Foundry as the primary route and legacy Azure OpenAI services.
- Remove or isolate legacy code that no longer participates in the main flow.
- Version prompts, JSON contracts, and expected responses per agent.
- Define fallback when an agent responds with unstructured text or invalid JSON.

### 6. Strengthen error handling and contracts
- Normalize backend error responses with consistent DTOs.
- Avoid sending ambiguous messages to the frontend.
- Clearly distinguish authentication, validation, connection, policy, execution, and orchestration errors.
- Log useful context without filtering sensitive information.

### 7. Stabilize user database connections
- Explicitly support the engines genuinely permitted by the product.
- Better validate connection configuration, connectivity, and permissions before executing queries.
- Review the connection fallback logic to prevent executions in an unexpected database.
- Add timeouts, retry policies, and transient error classification.

### 8. Strengthen application persistence
- Complete the application database schema for sessions, organizations, turns, and connections.
- Review foreign keys, soft deletes, and transactional consistency.
- Ensure integrity between session, audit, approval, and conversation.
- Define a retention policy for history and auditing.

## Priority 3 - Infrastructure and Deployment

### 9. Align Bicep with the actual implementation
- Incorporate all resources and settings necessary for the current backend version.
- Include `AppDbConnectionString` configuration, Foundry, and any real mandatory dependency.
- Clearly separate operational data resources from analytical data.
- Properly parameterize dev, test, and prod.

### 10. Prepare reproducible deployment
- Ensure one person can deploy the system without hidden manual steps.
- Document prerequisites, permissions, deployment order, and post-configuration.
- Add post-deploy validations to check system health.
- Include database bootstrap scripts and controlled test data.

### 11. Harden configuration per environment
- Separate local configuration from dev, QA, and production.
- Remove implicit dependencies on non-versionable local files.
- Define naming conventions, tagging, and Azure resource conventions.
- Add smoke checks to detect incomplete configuration when starting the Function App.

## Priority 4 - Frontend and User Experience

### 12. Refactor the main chat component
- Split the current large component into domain modules: chat, approval, results, connections, sessions, and panels.
- Separate UI state, business logic, polling, and rendering.
- Add stricter types for backend states and contracts.
- Reduce dependency on `localStorage` as the primary source of truth.

### 13. Improve operational UX
- Show actionable errors to the end-user.
- Clearly differentiate states: processing, waiting for approval, blocked, error, completed.
- Present SQL, risk, justification, and results consistently.
- Improve the reconnection flow, session expiration, and retries.

### 14. Consolidate client authentication
- Review scopes, token usage, and compatibility with the backend.
- Align the used token type with actual server validation.
- Avoid relying on tokens not intended for first-party API authorization.
- Define a clear login, logout, and expired session experience.

## Priority 5 - Observability and Operation

### 15. Implement useful operational telemetry
- Measure duration per pipeline stage.
- Measure safety blocks, policy rejections, and required approvals.
- Measure failures by error type and external integration.
- Correlate frontend, backend, orchestration, and SQL execution with a single identifier.

### 16. Standardize structured logs
- Log `requestId`, `userId`, `sessionId`, `role`, `riskLevel`, `status`, and duration.
- Avoid logs containing full sensitive payloads, secrets, or tokens.
- Include sufficient traces to diagnose agent, SQL, and approval failures.

### 17. Create a minimal operational dashboard
- Monitor throughput, errors, latency, pending approvals, and blocks.
- Add alerts for dependency drops or repeated errors.
- Define business health and technical health metrics.

## Priority 6 - Quality, Testing, and Release

### 18. Add automated backend tests
- Happy paths for analytical queries.
- Ambiguous cases requiring clarification.
- Cases blocked by prompt safety.
- Cases blocked by SQL policy.
- Cases with required, approved, and rejected approvals.

### 19. Add frontend and contract tests
- UI primary state tests.
- Integration tests for polling and rendering results.
- Contract tests between frontend and backend to prevent DTO drift.

### 20. Prepare production release checklist
- Security validated.
- Infrastructure aligned.
- Active logs and metrics.
- Critical tests passing.
- Operational manual available.
- Documented incident runbook and fallback.

## Concrete Technical Recommendations

### Backend
- Replace current JWT middleware with real validation using standard auth libraries.
- Convert the policy engine into a richer, more testable component, with explicit rules by type.
- Isolate the Foundry client behind stable, versioned contracts.
- Review places where exceptions are currently caught silently to avoid losing traceability.

### Frontend
- Extract specialized hooks for sessions, polling, approvals, and connections.
- Create small, reusable presentation components.
- Establish a more predictable state model for messages and pipelines.
- Prepare a consistent error and empty state design.

### Database
- Use certified views as the primary surface for the SQL generator.
- Limit exposure of sensitive columns from the analytical layer.
- Review whether auditing should reside in the operational database instead of the analytical one.

### Infrastructure
- Version environments and parameters.
- Prepare a complete deployment of application, data, configuration, and observability.
- Add automated checks post-provisioning.

## Executable Roadmap Proposal

### Phase 1 - Security and deployment blockers
- Secrets remediation.
- Real JWT validation.
- Bicep alignment and mandatory configuration.
- Minimal reproducible startup checklist.

### Phase 2 - Analytical pipeline hardening
- Robust policy engine.
- Persistent approvals.
- Uniform error handling.
- Stable contracts with Foundry.

### Phase 3 - Product quality and UX
- Frontend refactor.
- Clear operational states.
- Cross-cutting observability.
- Essential automated tests.

### Phase 4 - Production readiness
- Final hardening.
- Runbooks.
- Metrics and alerts.
- End-to-end release validation.

## Recommended Definition of Done
A backlog improvement should only be considered finished if:
- It has implemented code.
- It has associated validation or tests.
- It has an observable impact on logs, UI, or behavior.
- It has minimal operations documentation if it affects deployment or support.
- It does not introduce secrets or shortcuts incompatible with production.
