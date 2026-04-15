<div align="center">
  <h1>I N S I G H T F O R G E &nbsp; A I</h1>
  <h3>The Enterprise SQL Intelligence Layer</h3>
  <br/>
  <em>Transforming the barrier of code into the power of conversation.</em>
  <br/><br/>
  <a href="https://github.com/darovero/QueryPilotAI/blob/OML-v0.2/docs/InsightForge_AI_Governed_Fraud_Analytics%20final.pdf">View Pitch Presentation (PDF)</a>
  <br/>
  <a href="https://ifdev4-dev-web-mtijb.azurewebsites.net/">View Live Demo Prototype</a>
</div>

<br/>
<hr/>
<br/>

## 1. Executive Summary

**InsightForge AI** is an enterprise-grade, ontology-driven Web Platform designed to bridge the gap between human intent and complex relational databases. Tailored specifically for the high-stakes environment of *Corporate Fraud Analytics*, the platform empowers domain experts—such as Risk Analysts and Fraud Investigators—to interrogate immense data lakes using natural language.

By unifying a powerful semantic AI engine with a **Zero-Trust architecture**, InsightForge AI eliminates traditional Data Engineering bottlenecks. It reduces the time-to-insight from days to mere seconds, all while ensuring immutable governance and strictly audited compliance.

<br/>
<hr/>
<br/>

## 2. The Problem It Solves

Enterprise analytics teams face three critical operational bottlenecks:

> **I. The SQL Barrier (Time Latency)**
> Financial analysts know *what* to ask, but lack the technical fluency to script it. They rely on over-burdened Data Engineers, causing a backlog that delays critical fraud interventions.

> **II. The "Rogue AI" Risk (Data Hallucinations)**
> Generic LLM wrappers often hallucinate table schemas, execute non-performant queries, or worse—expose highly sensitive Personally Identifiable Information (PII) uncontrollably.

> **III. The Black Box (Lack of Auditability)**
> Traditional data visualization tools obscure backend operations, lacking the transparent audit trails demanded by regulatory compliance frameworks.

<br/>
<hr/>
<br/>

## 3. The Solution & Platform Experience

InsightForge AI is not a generic "chat-to-database" API wrapper; it is a fully-fledged, interactive workspace that proxies the data directly to the user safely and transparently.

### End-to-End User Journey

Through a sleek, intent-focused GUI, analysts engage with a unified dashboard:

* **Frictionless Onboarding:** Users securely connect to primary environments (`Azure SQL`, `PostgreSQL`) directly from the web application, utilizing Azure Key Vault credential proxying.
* **Unified Data Hub:** Analysts manage multiple databases seamlessly without switching context or manually editing connection string configurations.
* **Conversational Analytics:** Users ask real business questions (*e.g., "Show me the accounts with the highest risk scores that haven't been audited this month"*). The intelligent agent maps the intent and instantly translates it to localized, optimized SQL.
* **Transparent Execution Terminal:** Trust is paramount. A live terminal shows the analyst the exact SQL generated, the specific schema constraints checked, and the precise latency of the database operation.
* **Executive Insights:** The platform applies secondary analytical agents to interpret the returned tabular data, automatically drafting a ready-to-use executive markdown report explaining the anomalies.

<br/>
<hr/>
<br/>

## 4. Enterprise-Grade Differentiators

Unlike consumer-facing Text-to-SQL tools, InsightForge AI prioritizes risk compliance and precision above all else:

- **Ontology-Driven Reasoning:** The intelligence layer is pre-trained on domain-specific fraud patterns and internal jargon, ensuring that terms like *"Customer LTV"* or *"Risk Tier 1"* map precisely to certified database views.
- **Human-in-the-Loop Quarantine (HITL):** When a query touches highly sensitive constraints (e.g., unmasked credit scores), the system's Orchestrator pauses execution. The query is sent to a quarantine queue for an administrator to approve manually before releasing the data payload.
- **Governed SQL Generation:** SQL execution is constrained strictly by read-only policies and strict semantic ontologies, structurally preventing data exfiltration or massive `DROP TABLE` prompt injections.

<br/>
<hr/>
<br/>

## 5. Architecture & Technology Stack

Built from the ground up to scale securely in the cloud, powered predominantly by **Microsoft Azure**:

**Experience Layer (Frontend)** 
* `Next.js 14` & `React`
* Tailored UI components with real-time UI/UX state management.

**Orchestration & Workflow (Backend)** 
* `.NET 8` Isolated Worker APIs.
* `Azure Durable Functions` (Stateful Serverless infrastructure driving the asynchronous HITL pause/resume flows).

**Intelligence Layer (AI)** 
* `Azure OpenAI (GPT-4o)` for deterministic query mapping.
* `Azure AI Content Safety` for real-time prompt injection blocking and abusive language filtering.

**Data Hub** 
* `Azure SQL Database` accessed strictly via Managed Identities and Vault secrets.

<br/>
<hr/>
<br/>

## 6. Business Impact (Expected ROI)

Implementing InsightForge AI fundamentally transforms how intelligence operates within the enterprise:

1. **Time-to-Insight Acceleration:** Drastically reduced from 3-5 days to under **30 seconds**.
2. **Operational Savings:** Eliminates the SQL technical bottleneck, saving organizations hundreds of thousands of dollars in specialized Data Engineering hours annually.
3. **Risk Mitigation:** Immediate, on-demand insights enable lightning-fast reactions to emerging corporate fraud networks, directly reducing organizational financial exposure.

<br/>
<hr/>
