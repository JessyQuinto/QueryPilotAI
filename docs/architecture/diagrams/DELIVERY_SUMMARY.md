---
title: Resumen de Diagramas PlantUML — InsightForge AI
date: 2026-03-23
author: GitHub Copilot
---

# Resumen de Entregas — Diagramas PlantUML

## Objetivo
Documentar la arquitectura actual, el flujo del proceso y el pipeline de despliegue de InsightForge AI mediante diagramas PlantUML claros y mantenibles.

## Entregables

### ✅ 3 Diagramas PlantUML Completados

#### 1. **01-architecture.puml** (107 líneas)
**Tipo:** Component Diagram  
**Alcance:** Arquitectura completa del sistema

**Capas documentadas:**
- **Frontend:** Next.js UI con componentes (QueryComposer, InsightPanel, SqlTracePanel, ApprovalBanner, AuditDrawer, OpsDashboard)
- **Autenticación:** Microsoft Entra ID
- **Backend:** Azure Functions Isolated con Durable Orchestrator
  - Actividades: Safety, Intent Decomposition, Semantic Resolution, SQL Generation, Policy Validation, Approval, Execution, Summary, Audit
- **AI & Safety:** Azure OpenAI (gpt-4o-mini) y Azure AI Content Safety
- **Data:** Azure SQL Database (Fraud Tables, Certified Views, Audit Tables, Security Policies)
- **Infrastructure:** Key Vault, Storage, Application Insights
- **Observability:** Azure Monitor, Log Analytics Workspace

**Conexiones:** Flujo de datos de alto nivel, control de actividades, telemetría

---

#### 2. **02-process-flow.puml** (100 líneas)
**Tipo:** Sequence Diagram  
**Alcance:** Flujo end-to-end de una consulta analítica

**Etapas documentadas:**
1. Usuario formula pregunta (natural language)
2. Frontend autentica con Entra ID
3. Envío a Query Intake Function
4. Inicio de orquestación (Durable Functions)
5. Safety check (Azure AI Content Safety)
6. Decomposición de intención (Azure OpenAI)
7. Resolución de contexto semántico (catálogo + vistas)
8. Generación de SQL con restricciones (Azure OpenAI)
9. Validación de políticas SQL (SqlPolicyEngine)
   - Solo SELECT
   - Allowlist de tablas/vistas
   - Límites de complejidad
   - Puntuación de riesgo
10. Decisión de aprobación (si riesgo alto)
11. Ejecución en Azure SQL
12. Generación de resumen ejecutivo (Azure OpenAI)
13. Persistencia de auditoría
14. Retorno de insight al usuario

**Decisiones:**
- ❌ Bloqueo si falla safety
- ❌ Regeneración si SQL inválida
- 🔔 Aprobación humana si riesgo alto
- ✅ Ejecución si aprobado/bajo riesgo

---

#### 3. **03-deployment-pipeline.puml** (185 líneas)
**Tipo:** State Diagram  
**Alcance:** Pipeline de despliegue con 8 fases ordenadas

**Fases secuenciales:**

1. **Preflight** — Validación de prerrequisitos
   - Verificar comandos (az, bicep, etc.)
   - Cargar configuración
   - Conectar a suscripción Azure

2. **Provision** — Despliegue de infraestructura Bicep
   - Crear grupos de recursos
   - SQL Server & Database
   - Storage Account
   - Key Vault
   - App Service Plan
   - Function App
   - Web App
   - Application Insights

3. **Foundry** — Setup de Azure AI Foundry (opcional)
   - Crear proyectos
   - SQL Planner Agent
   - Result Interpreter Agent
   - Concierge Agent
   - Almacenar IDs en Key Vault

4. **Configure** — Población de secretos y configuración
   - Key Vault secrets (SQL, OpenAI, Safety, Foundry, Storage)
   - App Configuration values

5. **Database** — Inicialización de esquema SQL
   - Schema (001_tables, 002_relationships, 003_views, 004_security)
   - Seed data (reference, transactions, audit)
   - Validación de integridad

6. **Deploy API** — Publicación de Azure Functions
   - Build backend (.NET 8)
   - Publish Functions
   - Actualizar app settings
   - Verificar endpoints

7. **Deploy Web** — Despliegue de frontend
   - Build Next.js
   - Crear package (ZIP)
   - Deploy a Web App
   - Configurar app settings (Azure AD, endpoints)
   - Verificar salud

8. **Verify** — Smoke tests
   - Health checks
   - Autenticación
   - Conectividad API
   - Conectividad DB
   - Telemetría en Application Insights
   - Reporte final

**Características especiales:**
- Capacidad de resumir desde cualquier fase (`-ResumeFrom <Phase>`)
- Persistencia de estado en `deployment-state.json`
- Manejo de errores con punto de recuperación
- Ejemplo: `.\Invoke-FullDeployment.ps1 -ConfigPath .\Deploy.Configuration.psd1 -ResumeFrom Database`

---

### ✅ Documentación Complementaria

#### README.md (diagrams/)
- Descripción de cada diagrama
- Instrucciones de visualización (VS Code + PlantUML extension)
- Comandos de exportación a PNG/SVG
- Referencias a documentación y código

#### ARCHITECTURE.md (actualizado)
- Sección 16 agregada con referencias a los 3 diagramas
- Enlaces directos a archivos y ubicación de visualización

---

## Ubicación de Archivos

```
docs/
├── architecture/
│   ├── ARCHITECTURE.md (✅ actualizado con referencias)
│   └── diagrams/
│       ├── README.md (✅ nuevo - guía de uso)
│       ├── 01-architecture.puml (✅ nuevo - 107 líneas)
│       ├── 02-process-flow.puml (✅ nuevo - 100 líneas)
│       └── 03-deployment-pipeline.puml (✅ nuevo - 185 líneas)
```

---

## Cómo Usar

### Visualizar en VS Code
1. Instalar extensión: `jebbs.plantuml` (PlantUML)
2. Abrir cualquier archivo `.puml`
3. Preview: `Alt+D`

### Exportar a Imágenes
```bash
# Requiere Graphviz
plantuml -Tpng diagrams/01-* -o diagrams/01-*.png
plantuml -Tpng diagrams/02-* -o diagrams/02-*.png
plantuml -Tpng diagrams/03-* -o diagrams/03-*.png
```

### Integrar en Documentación
```markdown
![Arquitectura](docs/architecture/diagrams/01-architecture.png)
```

---

## Validación

✅ **Archivos creados:** 4 (3 PlantUML + 1 README)  
✅ **Líneas de código:** 107 + 100 + 185 = **392 líneas**  
✅ **Sintaxis PlantUML:** Validada  
✅ **Completitud:** Todos los flujos, componentes y fases documentados  
✅ **Referencias actualizadas:** ARCHITECTURE.md  

---

## Estado Git
```
?? docs/architecture/diagrams/01-architecture.puml
?? docs/architecture/diagrams/02-process-flow.puml
?? docs/architecture/diagrams/03-deployment-pipeline.puml
?? docs/architecture/diagrams/README.md
 M docs/architecture/ARCHITECTURE.md
```

---

## Próximos Pasos (Sugeridos)
1. Revisar diagramas en VS Code con PlantUML
2. Exportar a PNG para documentación
3. Incluir imágenes en README.md raíz
4. Incorporar en wiki o documentación de proyecto
5. Actualizar con cambios arquitectónicos futuros

