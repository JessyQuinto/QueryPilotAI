# Documento de Arquitectura — InsightForge AI

## 1. Propósito
Construir un agente de ingeniería analítica especializado en fraude que convierta preguntas en lenguaje natural en consultas SQL validadas y auditables, ejecutadas de forma segura sobre Azure SQL, con explicaciones claras para negocio, guardrails de IA responsable y confiabilidad operativa.

## 2. Objetivos de negocio
- Reducir el tiempo de análisis antifraude.
- Aumentar la confianza en respuestas generadas por IA.
- Evitar consultas inseguras, costosas o no autorizadas.
- Proveer trazabilidad completa del proceso analítico.

## 3. Principios de diseño
1. **Security by design**: solo `SELECT`, allowlists, aprobación humana y auditoría.
2. **Correctness first**: uso de vistas certificadas y grounding semántico.
3. **Explainability**: toda respuesta muestra intención, SQL y advertencias.
4. **Operational reliability**: orquestación durable, telemetría y manejo elegante de errores.
5. **Composable architecture**: separación por etapas y responsabilidades.

## 4. Alcance funcional
### Incluye
- Recepción de preguntas en lenguaje natural.
- Clasificación de intención y parsing estructurado.
- Evaluación de seguridad del prompt.
- Generación de SQL bajo restricciones.
- Validación de política SQL.
- Aprobación humana cuando aplique.
- Ejecución contra Azure SQL.
- Resumen ejecutivo de hallazgos.
- Auditoría y observabilidad.

### No incluye en MVP
- Autoaprendizaje del modelo en línea.
- Dashboards complejos tipo BI embebido.
- Soporte multi-tenant completo.
- Conectividad a múltiples motores SQL.

## 5. Casos de uso prioritarios
1. Anomalía de chargebacks por comercio.
2. Clientes con múltiples transacciones fallidas y luego exitosas.
3. Reutilización sospechosa de dispositivos.
4. Cuentas con incremento abrupto en alertas de fraude.
5. Comparativos por canal, ciudad y franja horaria.

## 6. Arquitectura lógica
### Frontend
Aplicación Next.js con:
- chat principal,
- panel de intención analítica,
- panel de SQL validado,
- tabla de resultados,
- resumen ejecutivo,
- panel de trazabilidad.

### Backend
Azure Functions Isolated:
- HTTP API para intake,
- Durable orchestrator,
- actividades para safety, intent, SQL, validación, ejecución y summary,
- endpoints de aprobación y auditoría.

### Data Layer
Azure SQL con:
- tablas core de fraude,
- vistas certificadas,
- tablas de auditoría,
- políticas de seguridad y catálogos.

### AI Layer
Azure OpenAI para:
- decomposición de intención,
- generación SQL,
- corrección de errores recuperables,
- resumen ejecutivo.

### Safety Layer
Azure AI Content Safety para:
- análisis de abuso de prompt,
- detección de jailbreak,
- filtrado previo.

### Observability Layer
Application Insights + Azure Monitor:
- traces por request,
- latencia por etapa,
- fallos por actividad,
- consultas bloqueadas,
- aprobaciones,
- SQL execution metrics.

## 7. Flujo end-to-end
1. Usuario formula una pregunta.
2. Se registra `requestId`.
3. Safety analiza el input.
4. Se genera una intención estructurada.
5. Se resuelve el grounding contra catálogo y vistas permitidas.
6. Se genera SQL preliminar.
7. El validador aplica reglas:
   - solo SELECT,
   - allowlist,
   - límite de complejidad,
   - sensibilidad,
   - scoring de riesgo.
8. Si el riesgo es alto, se envía a aprobación humana.
9. Si es aprobado o es de bajo riesgo, se ejecuta en Azure SQL.
10. Se resume el resultado y se devuelve al frontend.
11. Se persiste auditoría y telemetría.

## 8. Componentes
### 8.1 Frontend
- `QueryComposer`
- `InsightPanel`
- `SqlTracePanel`
- `ApprovalBanner`
- `AuditDrawer`
- `OpsDashboard`

### 8.2 Backend
- `QueryIntakeFunction`
- `FraudInsightOrchestrator`
- `AnalyzePromptSafetyActivity`
- `DecomposeIntentActivity`
- `ResolveSemanticContextActivity`
- `GenerateSqlActivity`
- `ValidateSqlPolicyActivity`
- `SubmitApprovalActivity`
- `ExecuteSqlActivity`
- `SummarizeInsightActivity`
- `PersistAuditActivity`

### 8.3 Policy Engine
Evalúa:
- comandos prohibidos,
- múltiples sentencias,
- objetos no autorizados,
- acceso a columnas sensibles,
- estimación de costo,
- detalle vs agregado,
- score de riesgo.

## 9. Contratos principales
### 9.1 QueryRequest
```json
{
  "question": "¿Qué comercios muestran incremento anómalo de chargebacks en los últimos 7 días?",
  "userId": "user@contoso.com",
  "role": "FraudAnalyst",
  "correlationId": "optional-client-id"
}
```

### 9.2 AnalyticalIntent
```json
{
  "domain": "fraud",
  "intentType": "anomaly_detection",
  "metric": "chargeback_rate",
  "dimensions": ["merchant"],
  "filters": [],
  "timeWindow": {
    "current": "last_7_days",
    "baseline": "last_30_days"
  },
  "grain": "daily",
  "sensitivity": "low",
  "confidence": 0.93,
  "clarificationNeeded": false
}
```

### 9.3 SqlValidationResult
```json
{
  "isValid": true,
  "riskLevel": "Medium",
  "requiresApproval": false,
  "reasons": [],
  "normalizedSql": "SELECT TOP 50 ..."
}
```

### 9.4 InsightResponse
```json
{
  "requestId": "guid",
  "status": "Completed",
  "executiveSummary": "Tres comercios concentran un aumento material de chargebacks.",
  "keyFindings": [
    "Merchant M102 elevó su tasa de chargeback 3.7x vs la línea base."
  ],
  "sql": "SELECT TOP 50 ...",
  "warnings": [],
  "resultPreview": [],
  "audit": {
    "riskLevel": "Medium",
    "approvedBy": null
  }
}
```

## 10. Seguridad
- Autenticación con Entra ID.
- Roles: `BusinessUser`, `FraudAnalyst`, `Approver`, `Admin`.
- Azure SQL con vistas certificadas.
- Dynamic Data Masking para columnas sensibles.
- Row-Level Security opcional en fases siguientes.
- Key Vault para secretos.
- No se ejecuta SQL arbitrario desde el cliente.

## 11. Observabilidad
### Métricas clave
- `RequestsTotal`
- `SafetyBlockedTotal`
- `ApprovalRequiredTotal`
- `ApprovalRejectedTotal`
- `SqlExecutionDurationMs`
- `SqlValidationFailedTotal`
- `InsightCompletedTotal`

### Logs estructurados
Campos mínimos:
- `requestId`
- `userId`
- `role`
- `intentType`
- `riskLevel`
- `requiresApproval`
- `executionDurationMs`
- `status`

## 12. Estrategia de errores
- Si falla safety: bloquear y explicar.
- Si falta contexto: solicitar aclaración.
- Si SQL no valida: regenerar una vez con feedback estructurado.
- Si la ejecución falla: entregar mensaje explicable y auditoría.
- Si la aprobación expira: marcar como `TimedOut`.

## 13. Riesgos y mitigaciones
| Riesgo | Mitigación |
|---|---|
| SQL incorrecto | vistas certificadas + validador + regeneración controlada |
| Exposición de datos | masking + roles + allowlists |
| Demo inestable | prompts curados + semillas + consultas demo |
| Se percibe como chatbot genérico | panel de transparencia + aprobación + auditoría |

## 14. Decisiones de arquitectura
- Frontend desacoplado para UX moderna y demo fuerte.
- Backend .NET por preferencia del equipo y compatibilidad con Azure Functions.
- Durable Functions para aprobación y trazabilidad.
- Azure SQL como único motor de datos del MVP.
- Bicep para reproducibilidad de infraestructura.

## 15. Roadmap sugerido
### Fase 1
- BD, semillas y vistas.
- Functions básicas.
- flujo end-to-end happy path.

### Fase 2
- aprobación humana,
- content safety,
- panel de trazabilidad.

### Fase 3
- telemetría fina,
- polish UX,
- pruebas de abuso y presentación.

## 16. Diagramas de Arquitectura
La arquitectura, proceso y despliegue se documentan en diagramas PlantUML ubicados en el directorio `diagrams/`:

- **[01-architecture.puml](diagrams/01-architecture.puml)** — Componentes, capas y relaciones estructurales de todo el sistema.
- **[02-process-flow.puml](diagrams/02-process-flow.puml)** — Secuencia end-to-end de una consulta desde el usuario hasta el insight final.
- **[03-deployment-pipeline.puml](diagrams/03-deployment-pipeline.puml)** — Pipeline de despliegue con 8 fases ordenadas y capacidad de resumir.

Ver [diagrams/README.md](diagrams/README.md) para instrucciones de visualización.
