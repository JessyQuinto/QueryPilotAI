# Semantic Kernel Integration - InsightForge

Esta guía documenta la integración completa de **Microsoft Semantic Kernel** con los agentes de **Azure Foundry** en InsightForge.

## 📋 Contenido

- [Visión General](#visión-general)
- [Arquitectura](#arquitectura)
- [3 Patrones Avanzados](#3-patrones-avanzados)
- [Uso](#uso)
- [Observabilidad](#observabilidad)
- [Ejemplos de API](#ejemplos-de-api)

---

## Visión General

**Semantic Kernel** es un framework de Microsoft que:
1. ✅ Abstraje las llamadas a modelos LLM (Azure OpenAI)
2. ✅ Permite registrar plugins que el LLM puede invocar automáticamente
3. ✅ Soporta **automatic function calling** - el LLM decide qué funciones invocar
4. ✅ Proporciona primitivas para **RAG** (Retrieval-Augmented Generation)
5. ✅ Integra observabilidad con OpenTelemetry

**En InsightForge**, Semantic Kernel articiza:
- **SQL Planner Agent** ← Plugin: `invoke_sql_planner`
- **Result Interpreter Agent** ← Plugin: `invoke_result_interpreter`
- **Visualization Planner Agent** ← Plugin: `invoke_visualization_planner`
- **Concierge Agent** ← Coordinador de flujo

---

## Arquitectura

```
┌─────────────────────────────────────────────────────────────────┐
│                     Frontend / HTTP Client                       │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌──────────────────────────────────────────────────────────────────┐
│     SemanticKernelQueryFunction (HTTP Trigger)                   │
│  - Acepta: UserQuestion, UserId, SessionId, Pattern             │
│  - Rutea a AdvancedSemanticKernelPatterns                       │
└──────────────────────┬───────────────────────────────────────────┘
                       │
        ┌──────────────┼──────────────┐
        │              │              │
        ▼              ▼              ▼
   ┌─────────┐   ┌──────────┐   ┌──────────────┐
   │Automatic │   │   RAG    │   │   Multi-    │
   │Function  │   │ Pattern  │   │   Agent     │
   │Calling   │   │          │   │ Orchestration│
   └────┬────┘   └──────┬───┘   └──────┬──────┘
        │               │              │
        └───────────────┼──────────────┘
                        │
                        ▼
        ┌──────────────────────────────┐
        │      Semantic Kernel         │
        │  (Azure OpenAI Chat Service) │
        └─────────┬──────────┬─────────┘
                  │          │
        ┌─────────▼──┐   ┌──▼─────────┐
        │  Plugins   │   │  Settings  │
        ├────────────┤   ├────────────┤
        │SQL Planner │   │  Auto      │
        │Result Interp│  │  Function  │
        │Visualization│  │  Calling   │
        └─────────┬──┘   └──┬────────┘
                  │          │
                  └─────┬────┘
                        ▼
        ┌──────────────────────────────┐
        │  FoundryAgentsPlugin         │
        │  - invoke_sql_planner        │
        │  - invoke_result_interpreter │
        │  - invoke_visualization_planner
        └──────────────────────────────┘
                        │
        ┌───────────────┼───────────────┐
        │               │               │
        ▼               ▼               ▼
    ┌────────┐   ┌─────────────┐  ┌──────────┐
    │Foundry │   │Conversation │  │Database  │
    │Agents  │   │Memory Store │  │Service   │
    └────────┘   └─────────────┘  └──────────┘
```

---

## 3 Patrones Avanzados

### 1. Automatic Function Calling

El LLM **automáticamente decide** qué plugins invocar basado en la pregunta del usuario.

#### ¿Cuándo usarlo?
- Preguntas abiertas donde el flujo no es predecible
- Cuando quieres que el LLM orqueste inteligentemente
- Conversaciones multi-turno complejas

#### Ejemplo
```
User: "Show me fraud transactions by region in the last 30 days"

System:
1. LLM recibe question + lista de plugins disponibles
2. LLM decide: "Necesito SQL Planner → Result Interpreter → Visualization Planner"
3. Kernel invoca automáticamente cada plugin en orden
4. LLM sintetiza respuesta final con todos los resultados

Response: 
{
  "sql": "SELECT region, COUNT(*) as fraud_count FROM transactions WHERE ...",
  "insights": "South region has 45% more fraud than average",
  "visualization": "Use bar chart grouped by region"
}
```

#### Implementación
```csharp
var settings = new OpenAIPromptExecutionSettings
{
    FunctionChoiceBehavior = FunctionChoiceBehavior.Auto(),  // ← Automatic calling
    Temperature = 0.7,
    MaxTokens = 4096
};

var response = await chatService.GetChatMessageContentAsync(
    chatHistory,
    executionSettings: settings,
    kernel: kernel);
```

---

### 2. RAG Pattern (Retrieval-Augmented Generation)

**Recupera** contexto de conversaciones previas, **aumenta** el prompt con ese contexto, y luego **genera** respuestas más informadas.

#### ¿Cuándo usarlo?
- El usuario hace seguimiento de análisis anteriores
- Necesitas mantener coherencia con historia conversacional
- Querés reusar insights de interacciones previas

#### Ejemplo
```
Conversation Memory:
1. User: "Analyze Q1 fraud by merchant type"
   Assistant: "Discovered: subscription merchants have 40% higher fraud"
   
2. User: "What about Q2?"
   
System:
1. RETRIEVE: Get last 5 turns from memory
2. AUGMENT: Build prompt with context:
   - "Previous analysis (Q1) found subscription merchants problematic..."
   - "User interested in merchant-type trends..."
3. GENERATE: LLM responds with Q2 insights in same context

Response: "Q2 confirms the trend. Subscription fraud increased 15% vs Q1"
```

#### Implementación
```csharp
var conversationHistory = await _memoryService.GetRecentTurnsAsync(
    userId, sessionId, maxTurns: 5);

var augmentedPrompt = BuildRagPrompt(userQuestion, conversationHistory);

var response = await chatService.GetChatMessageContentAsync(
    new ChatHistory(systemPrompt) { augmentedPrompt });
```

---

### 3. Multi-Agent Orchestration

**Cadena de llamadas** a múltiples agentes donde la salida de uno alimenta la entrada del siguiente.

#### ¿Cuándo usarlo?
- Flujo predecible y secuencial
- Necesitas máximo control sobre cada paso
- Cada agente debe tomar decisiones independientes
- Quieres auditoría detallada de cada invocación

#### Ejemplo
```
User: "Fraud analysis for Q1"

System:
1. SQL Planner
   Input: "Fraud transactions Q1"
   Output: "SELECT * FROM transactions WHERE date BETWEEN '2026-01-01' AND '2026-03-31'"

2. Execute SQL
   Input: Above SQL
   Output: [10,000 rows of transaction data]

3. Result Interpreter
   Input: SQL + Results + Original Question
   Output: "Primary fraud pattern: unauthorized cards from Eastern Europe, 
            $2.3M total impact, 34% of all fraud"

4. Visualization Planner
   Input: Data schema + Analytical goal
   Output: "Recommend: Time series (fraud over days) + Geographic heatmap 
            + Customer segment breakdown"

5. Generate Final Response
   Synthesize all 4 results into coherent narrative
```

#### Implementación
```csharp
// Step by step
var sqlFunc = foundryPlugin["invoke_sql_planner"];
var sqlResult = await kernel.InvokeAsync(sqlFunc, args);

var interpretFunc = foundryPlugin["invoke_result_interpreter"];
var interpretation = await kernel.InvokeAsync(interpretFunc, args);

var vizFunc = foundryPlugin["invoke_visualization_planner"];
var visualization = await kernel.InvokeAsync(vizFunc, args);
```

---

## Uso

### Registración en Program.cs

```csharp
// En Program.cs, ya está configurado:
services.AddSemanticKernelServices(
    configuration: config,
    enableObservability: true);

// Registra automáticamente:
// - Kernel instance
// - FoundryAgentsPlugin
// - OpenTelemetry tracing
// - SemanticKernelObservabilityService
```

### Inyección en Functions

```csharp
public class QueryFunction
{
    private readonly Kernel _kernel;
    private readonly AdvancedSemanticKernelPatterns _patterns;

    public QueryFunction(Kernel kernel, AdvancedSemanticKernelPatterns patterns)
    {
        _kernel = kernel;
        _patterns = patterns;
    }

    [Function("Query")]
    public async Task<HttpResponseData> RunAsync(
        [HttpTrigger(AuthorizationLevel.Anonymous, "post", Route = "query")] 
        HttpRequestData req)
    {
        var result = await _patterns.ProcessQueryWithAutomaticFunctionCallingAsync(
            userId: "user123",
            userQuestion: req.Body.ToString(),
            cancellationToken: CancellationToken.None);

        return req.CreateResponse(HttpStatusCode.OK); // with result
    }
}
```

---

## Observabilidad

### OpenTelemetry Activities

Cada invocación de función registra:
- ⏱️ **Duration** - Tiempo de ejecución
- 📊 **Status** - OK / Error
- 🏷️ **Attributes** - Plugin, función, argumentos
- 🔗 **Exceptions** - Stack trace si falla

#### Salida de ejemplo
```
Activity: FoundryAgents.invoke_sql_planner
├── Duration: 1250ms
├── Status: Ok
├── Attributes:
│   ├── plugin.name: FoundryAgents
│   ├── function.name: invoke_sql_planner
│   ├── arg.userQuestion: "Fraud by region"
└── Log: "Semantic Kernel function completed"
```

### Acceder a Traces en Código

```csharp
// Injected service
var observability = serviceProvider.GetRequiredService<
    SemanticKernelObservabilityService>();

var result = await observability.RecordFunctionInvocationAsync(
    functionName: "invoke_sql_planner",
    pluginName: "FoundryAgents",
    invocation: async () => await sqlFunc.InvokeAsync(...),
    args: new() { { "userQuestion", "Fraud by region" } });
```

---

## Ejemplos de API

### POST /query/semantic-kernel

**Patrón: Automatic Function Calling**

```bash
curl -X POST https://localhost:7071/api/query/semantic-kernel \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "user123",
    "question": "Show me fraud transactions by region in the last 30 days",
    "sessionId": "session-abc",
    "pattern": 0,
    "contextTurns": 5
  }'
```

**Response:**
```json
{
  "pattern": "automatic_function_calling",
  "question": "Show me fraud transactions by region in the last 30 days",
  "response": "Based on analysis, South region shows 45% higher fraud rate...",
  "timestamp": "2026-03-22T14:30:00Z"
}
```

---

**Patrón: RAG Pattern**

```bash
curl -X POST https://localhost:7071/api/query/semantic-kernel \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "user123",
    "question": "How does this compare to last month?",
    "sessionId": "session-abc",
    "pattern": 1,
    "contextTurns": 10
  }'
```

**Response:**
```json
{
  "pattern": "rag",
  "question": "How does this compare to last month?",
  "response": "Last month showed..., this month shows..., representing a 15% increase",
  "contextTurnsUsed": 10,
  "timestamp": "2026-03-22T14:35:00Z"
}
```

---

**Patrón: Multi-Agent Orchestration**

```bash
curl -X POST https://localhost:7071/api/query/semantic-kernel \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "user123",
    "question": "Complete fraud analysis for Q1 2026",
    "sessionId": "session-abc",
    "pattern": 2
  }'
```

**Response:**
```json
{
  "pattern": "multi_agent_orchestration",
  "success": true,
  "question": "Complete fraud analysis for Q1 2026",
  "generatedSql": "SELECT * FROM transactions WHERE date BETWEEN '2026-01-01' AND '2026-03-31'",
  "findings": "Primary fraud pattern: unauthorized cards, $2.3M impact",
  "visualizationRecommendation": "Time series + Geographic heatmap",
  "finalResponse": "Analysis Complete: Generated Query... Findings... Recommended Visualization...",
  "timestamp": "2026-03-22T14:40:00Z"
}
```

---

## Checklist de Integración

- ✅ NuGet packages agregados: `Microsoft.SemanticKernel`, `OpenTelemetry`
- ✅ `SemanticKernelConfiguration` registra Kernel en DI
- ✅ `FoundryAgentsPlugin` expone 3 funciones como SK plugins
- ✅ `AdvancedSemanticKernelPatterns` implementa 3 patrones
- ✅ `SemanticKernelQueryFunction` HTTP trigger con routing
- ✅ `Program.cs` llama `AddSemanticKernelServices()`
- ✅ OpenTelemetry observability integrada
- ✅ Conversation memory integrada

---

## Próximos Pasos

1. **Testear localmente**
   ```bash
   cd backend
   func start
   # Hacer requests POST a http://localhost:7071/api/query/semantic-kernel
   ```

2. **Integrar en frontend**
   - Actualizar cliente Next.js para consumir `/query/semantic-kernel`
   - Mostrar pattern selector (Automatic / RAG / Orchestration)

3. **Monitoreo en producción**
   - Conectar OpenTelemetry a Azure Monitor
   - Crear dashboards de latencia por patrón

4. **Optimizar prompts**
   - Ajustar system prompts en `SemanticKernelConfiguration`
   - Tuning de temperature/max_tokens por patrón

---

## Referencias

- [Semantic Kernel Docs](https://learn.microsoft.com/semantic-kernel/)
- [Automatic Function Calling](https://learn.microsoft.com/semantic-kernel/concepts/planning?pivots=programming-language-csharp#using-automatic-function-calling)
- [RAG Pattern](https://learn.microsoft.com/semantic-kernel/concepts/plugins/using-data-retrieval-functions-for-rag)
- [OpenTelemetry .NET](https://opentelemetry.io/docs/instrumentation/net/)
