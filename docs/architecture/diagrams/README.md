# Diagramas de Arquitectura - InsightForge AI

Este directorio contiene tres diagramas PlantUML que documentan la arquitectura actual, el flujo del proceso y el pipeline de despliegue del proyecto InsightForge AI.

## Diagramas

### 1. [01-architecture.puml](01-architecture.puml) — Arquitectura del Sistema
**Enfoque:** Componentes, capas y relaciones estructurales.

**Contiene:**
- **Frontend Layer:** Next.js UI con componentes como QueryComposer, InsightPanel, SqlTracePanel, etc.
- **Authentication & Identity:** Microsoft Entra ID (Azure AD)
- **Backend Layer:** Azure Functions Isolated con el orquestador Durable Functions
- **AI & Safety Layer:** Azure OpenAI (gpt-4o-mini) y Azure AI Content Safety
- **Data Layer:** Azure SQL Database con tablas core, vistas certificadas, auditoría y políticas de seguridad
- **Infrastructure Layer:** Key Vault, Storage, Application Insights
- **Observability:** Azure Monitor y Log Analytics Workspace

**Conexiones clave:**
- UI → Autenticación → Query Intake Function
- Orquestación de actividades (Safety → Intent → Semantic → SQL Gen → Validation → Approval → Execution → Summary → Audit)
- Observabilidad centralizada en Application Insights

---

### 2. [02-process-flow.puml](02-process-flow.puml) — Flujo del Proceso End-to-End
**Enfoque:** Secuencia de actividades desde la pregunta del usuario hasta el insight final.

**Fases principales:**
1. **Autenticación:** Usuario se autentica vía Entra ID
2. **Intake:** Frontend envía pregunta a Query Intake Function
3. **Safety Check:** Azure AI Content Safety analiza abuso/jailbreak
4. **Intent Decomposition:** Azure OpenAI descompone la intención analítica
5. **Semantic Resolution:** Se resuelve el contexto contra vistas autorizadas
6. **SQL Generation:** Se genera SQL con restricciones
7. **Policy Validation:** SqlPolicyEngine aplica reglas (SELECT-only, allowlist, complejidad, riesgo)
8. **Approval (si aplica):** Si riesgo es alto, se solicita aprobación humana
9. **Execution:** Se ejecuta SELECT contra Azure SQL
10. **Summary:** Se genera resumen ejecutivo
11. **Audit:** Se persiste log de auditoría
12. **Response:** Se devuelve insight al frontend

**Decisiones:**
- ❌ Si falla safety → Bloqueado
- ❌ Si SQL no válida → Se intenta regenerar una vez
- 🔔 Si riesgo alto → Requiere aprobación
- ✅ Si aprobado o bajo riesgo → Se ejecuta

---

### 3. [03-deployment-pipeline.puml](03-deployment-pipeline.puml) — Pipeline de Despliegue
**Enfoque:** Fases sequenciales del despliegue completo con capacidad de resumir.

**Fases ordenadas:**
1. **Preflight:** Validación de prerrequisitos (comandos, config, suscripción Azure)
2. **Provision:** Despliegue de template Bicep (RG, SQL, Storage, Key Vault, Functions, Web App, Insights)
3. **Foundry (Opcional):** Setup de Azure AI Foundry (projects, agentes SQL Planner, Result Interpreter, Concierge)
4. **Configure:** Poblado de Key Vault y App Configuration (conexiones, keys, endpoints, IDs)
5. **Database:** Ejecución de scripts SQL (schema, relaciones, vistas, seguridad, semillas)
6. **Deploy API:** Build y publish de Azure Functions (.NET 8)
7. **Deploy Web:** Build de Next.js, packaging y deploy a Web App
8. **Verify:** Health checks, autenticación, conectividad, telemetría

**Características:**
- Resume desde cualquier fase (ej: `-ResumeFrom Database`)
- Guarda estado en `deployment-state.json`
- Manejo de errores con punto de recuperación
- Cada fase es autónoma pero depende del estado de fases previas

---

## Cómo usar estos diagramas

### Ver en VS Code
- Instala la extensión "PlantUML" (PlantUML: `jebbs.plantuml`)
- Abre cualquiera de los archivos `.puml`
- Previsualiza con `Alt+D` o haz clic en el icono de preview

### Exportar a imagen
```bash
# Requiere Graphviz instalado
plantuml -Tpng 01-architecture.puml -o 01-architecture.png
plantuml -Tpng 02-process-flow.puml -o 02-process-flow.png
plantuml -Tpng 03-deployment-pipeline.puml -o 03-deployment-pipeline.png
```

### Integrar en documentación
Los diagramas pueden incluirse en markdown:
```markdown
![Arquitectura](docs/architecture/diagrams/01-architecture.png)
```

---

## Referencias
- **Arquitectura:** [ARCHITECTURE.md](../ARCHITECTURE.md)
- **Código backend:** `backend/src/`
- **Deploy script:** `deploy/Invoke-FullDeployment.ps1`
- **Bicep template:** `infra/bicep/main.bicep`
- **Scripts SQL:** `database/schema/`

