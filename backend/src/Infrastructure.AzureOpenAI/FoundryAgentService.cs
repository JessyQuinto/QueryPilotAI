using Azure.Identity;
using Azure.Core;
using Azure.AI.Projects;
using Azure.AI.Extensions.OpenAI;
using Core.Application.Contracts;
using Microsoft.Extensions.Logging;
using OpenAI.Responses;
using System.Text.Json;
using System.Text.Json.Serialization;

namespace Infrastructure.AzureOpenAI;

/// <summary>
/// Client that invokes agents hosted in Azure AI Foundry.
/// Agents (SQL Planner, Result Interpreter, Concierge) are created and configured
/// in Foundry with their prompts managed there — not hardcoded in this codebase.
/// This service only sends messages and retrieves responses.
/// </summary>
public interface IFoundryAgentClient
{
    /// <summary>
    /// Sends the user's question + database schema to the SQL Planner agent in Foundry.
    /// Returns a structured JSON response with status, intent, SQL, and governance info.
    /// </summary>
    Task<SqlPlannerResponse> PlanSqlAsync(string question, string dbSchema, string? conversationContext = null);

    /// <summary>
    /// Sends the executed SQL results to the Result Interpreter agent in Foundry.
    /// Returns a structured JSON interpretation with findings, recommendations, etc.
    /// </summary>
    Task<ResultInterpretation> InterpretResultsAsync(
        string question, string intentJson, string sql,
        List<Dictionary<string, object?>> rows, string? governanceJson = null);

    /// <summary>
    /// Sends a message to the Concierge agent to classify whether it's conversational or analytical.
    /// </summary>
    Task<ConversationalClassification?> ClassifyMessageAsync(string userId, string message);
}

// --- Response DTOs ---

public sealed class SqlPlannerResponse
{
    [JsonPropertyName("status")]
    public string Status { get; set; } = "unsupported";

    [JsonPropertyName("user_question")]
    public string? UserQuestion { get; set; }

    [JsonPropertyName("intent")]
    public JsonElement? Intent { get; set; }

    [JsonPropertyName("understanding")]
    public JsonElement? Understanding { get; set; }

    [JsonPropertyName("data_mapping")]
    public JsonElement? DataMapping { get; set; }

    [JsonPropertyName("governance")]
    public GovernanceInfo? Governance { get; set; }

    [JsonPropertyName("sql")]
    public SqlInfo? Sql { get; set; }

    [JsonPropertyName("clarification")]
    public ClarificationInfo? Clarification { get; set; }
}

public sealed class GovernanceInfo
{
    [JsonPropertyName("safe_to_execute")]
    public bool SafeToExecute { get; set; }

    [JsonPropertyName("risk_level")]
    public string RiskLevel { get; set; } = "low";

    [JsonPropertyName("policy_flags")]
    public string[]? PolicyFlags { get; set; }

    [JsonPropertyName("approval_required")]
    public bool ApprovalRequired { get; set; }

    [JsonPropertyName("approval_reason")]
    public string? ApprovalReason { get; set; }
}

public sealed class SqlInfo
{
    [JsonPropertyName("dialect")]
    public string Dialect { get; set; } = "tsql";

    [JsonPropertyName("query")]
    public string Query { get; set; } = string.Empty;

    [JsonPropertyName("explanation")]
    public string? Explanation { get; set; }
}

public sealed class ClarificationInfo
{
    [JsonPropertyName("question_for_user")]
    public string? QuestionForUser { get; set; }
}

public sealed class ResultInterpretation
{
    [JsonPropertyName("status")]
    public string Status { get; set; } = "no_data";

    [JsonPropertyName("question_answered")]
    public string? QuestionAnswered { get; set; }

    [JsonPropertyName("executive_summary")]
    public string? ExecutiveSummary { get; set; }

    [JsonPropertyName("key_findings")]
    public List<KeyFinding>? KeyFindings { get; set; }

    [JsonPropertyName("observations")]
    public string[]? Observations { get; set; }

    [JsonPropertyName("inferences")]
    public string[]? Inferences { get; set; }

    [JsonPropertyName("recommendations")]
    public string[]? Recommendations { get; set; }

    [JsonPropertyName("risk_interpretation")]
    public RiskInterpretation? Risk { get; set; }

    [JsonPropertyName("limitations")]
    public string[]? Limitations { get; set; }

    [JsonPropertyName("follow_up_questions")]
    public string[]? FollowUpQuestions { get; set; }

    [JsonPropertyName("confidence")]
    public double Confidence { get; set; }

    [JsonPropertyName("response_for_user")]
    public string? ResponseForUser { get; set; }

    [JsonPropertyName("reason")]
    public string? Reason { get; set; }

    [JsonPropertyName("warnings")]
    public string[]? Warnings { get; set; }

    [JsonPropertyName("title")]
    public string? Title { get; set; }

    [JsonPropertyName("subtitle")]
    public string? Subtitle { get; set; }

    [JsonPropertyName("suggested_chart")]
    public SuggestedChart? SuggestedChart { get; set; }

    // Legacy chart response format compatibility
    [JsonPropertyName("should_render_chart")]
    public bool? ShouldRenderChart { get; set; }

    [JsonPropertyName("chart_type")]
    public string? ChartType { get; set; }

    [JsonPropertyName("x_axis")]
    public string? XAxis { get; set; }

    [JsonPropertyName("y_axis")]
    public string? YAxis { get; set; }

    [JsonPropertyName("category_field")]
    public string? CategoryField { get; set; }

    [JsonPropertyName("top_n")]
    public int? TopN { get; set; }
}

public sealed class SuggestedChart
{
    [JsonPropertyName("type")]
    public string Type { get; set; } = "line"; // line, bar, pie, area

    [JsonPropertyName("title")]
    public string Title { get; set; } = string.Empty;

    [JsonPropertyName("description")]
    public string? Description { get; set; }

    [JsonPropertyName("x_axis_label")]
    public string? XAxisLabel { get; set; }

    [JsonPropertyName("y_axis_label")]
    public string? YAxisLabel { get; set; }

    [JsonPropertyName("x_field")]
    public string? XField { get; set; }

    [JsonPropertyName("y_field")]
    public string? YField { get; set; }

    [JsonPropertyName("group_by")]
    public string? GroupBy { get; set; }

    [JsonPropertyName("filtered_rows")]
    public int? FilteredRowsCount { get; set; }
}

public sealed class KeyFinding
{
    [JsonPropertyName("title")]
    public string? Title { get; set; }

    [JsonPropertyName("description")]
    public string? Description { get; set; }

    [JsonPropertyName("evidence")]
    public string? Evidence { get; set; }
}

public sealed class RiskInterpretation
{
    [JsonPropertyName("level")]
    public string Level { get; set; } = "unknown";

    [JsonPropertyName("rationale")]
    public string? Rationale { get; set; }
}

// --- Implementation ---

public sealed class FoundryAgentClient : IFoundryAgentClient
{
    private readonly ProjectResponsesClient _sqlPlannerResponsesClient;
    private readonly ProjectResponsesClient _resultInterpreterResponsesClient;
    private readonly ProjectResponsesClient _conciergeResponsesClient;
    private readonly ILogger<FoundryAgentClient> _logger;

    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNameCaseInsensitive = true,
        ReadCommentHandling = JsonCommentHandling.Skip,
        AllowTrailingCommas = true
    };

    public FoundryAgentClient(
        string projectEndpoint,
        string sqlPlannerAgentReference,
        string resultInterpreterAgentReference,
        string conciergeAgentReference,
        ILogger<FoundryAgentClient> logger,
        string? apiKey = null,
        string? tenantId = null)
    {
        _logger = logger;

        var credentialOptions = new DefaultAzureCredentialOptions();
        if (!string.IsNullOrWhiteSpace(tenantId))
        {
            credentialOptions.TenantId = tenantId;
        }

        TokenCredential credential = new ChainedTokenCredential(
            new AzureCliCredential(new AzureCliCredentialOptions
            {
                TenantId = credentialOptions.TenantId
            }),
            new DefaultAzureCredential(credentialOptions));

        AIProjectClient projectClient = new(
            endpoint: new Uri(projectEndpoint.Trim()),
            tokenProvider: credential);

        var sqlPlannerAgent = ParseAgentReference(sqlPlannerAgentReference, nameof(sqlPlannerAgentReference));
        var resultInterpreterAgent = ParseAgentReference(resultInterpreterAgentReference, nameof(resultInterpreterAgentReference));
        var conciergeAgent = ParseAgentReference(conciergeAgentReference, nameof(conciergeAgentReference));

        _logger.LogInformation("[FOUNDRY AGENT CONFIG] SQL Planner: {AgentName}:{AgentVersion}", sqlPlannerAgent.Name, sqlPlannerAgent.Version);
        _logger.LogInformation("[FOUNDRY AGENT CONFIG] Result Interpreter: {AgentName}:{AgentVersion}", resultInterpreterAgent.Name, resultInterpreterAgent.Version);
        _logger.LogInformation("[FOUNDRY AGENT CONFIG] Concierge: {AgentName}:{AgentVersion}", conciergeAgent.Name, conciergeAgent.Version);

        _sqlPlannerResponsesClient = projectClient.OpenAI.GetProjectResponsesClientForAgent(sqlPlannerAgent);
        _resultInterpreterResponsesClient = projectClient.OpenAI.GetProjectResponsesClientForAgent(resultInterpreterAgent);
        _conciergeResponsesClient = projectClient.OpenAI.GetProjectResponsesClientForAgent(conciergeAgent);
    }

    public async Task<SqlPlannerResponse> PlanSqlAsync(string question, string dbSchema, string? conversationContext = null)
    {
        var userMessage = BuildSqlPlannerMessage(question, dbSchema, conversationContext);
        var responseText = await RunAgentAsync(_sqlPlannerResponsesClient, userMessage, "sql-planner");

        _logger.LogInformation("[SQL PLANNER RAW RESPONSE]: {ResponseText}", responseText);

        try
        {
            return JsonSerializer.Deserialize<SqlPlannerResponse>(responseText, JsonOptions)
                ?? new SqlPlannerResponse { Status = "unsupported" };
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "[SQL PLANNER DESERIALIZATION ERROR]");
            return new SqlPlannerResponse
            {
                Status = "needs_clarification",
                Clarification = new ClarificationInfo { QuestionForUser = responseText },
                UserQuestion = question
            };
        }
    }

    public async Task<ResultInterpretation> InterpretResultsAsync(
        string question, string intentJson, string sql,
        List<Dictionary<string, object?>> rows, string? governanceJson = null)
    {
        var userMessage = BuildResultInterpreterMessage(question, intentJson, sql, rows, governanceJson);
        var responseText = await RunAgentAsync(_resultInterpreterResponsesClient, userMessage, "result-interpreter");

        _logger.LogInformation("[RESULT INTERPRETER RAW RESPONSE]: {ResponseText}", responseText);

        try
        {
            return JsonSerializer.Deserialize<ResultInterpretation>(responseText, JsonOptions)
                ?? new ResultInterpretation { Status = "no_data" };
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "[RESULT INTERPRETER DESERIALIZATION ERROR]");
            // The agent responded conversationally — use its text directly
            return new ResultInterpretation
            {
                Status = "success",
                ResponseForUser = responseText,
                ExecutiveSummary = responseText
            };
        }
    }

    public async Task<ConversationalClassification?> ClassifyMessageAsync(string userId, string message)
    {
        try
        {
            var classificationPrompt = BuildConciergeClassificationMessage(message);
            var responseText = await RunAgentAsync(_conciergeResponsesClient, classificationPrompt, "concierge");

            _logger.LogInformation("[CONCIERGE RAW RESPONSE]: {ResponseText}", responseText);

            if (string.IsNullOrWhiteSpace(responseText) || responseText == "{}")
            {
                _logger.LogWarning("[CONCIERGE] Empty response; defaulting to analytical.");
                return new ConversationalClassification("analytical", string.Empty, 0.5);
            }

            try
            {
                var classification = JsonSerializer.Deserialize<ConciergeClassification>(responseText, JsonOptions);
                if (classification?.Category != null)
                {
                    _logger.LogInformation("[CONCIERGE CLASSIFICATION] Category={Category}, Confidence={Confidence}", classification.Category, classification.Confidence);
                    return new ConversationalClassification(
                        classification.Category,
                        classification.Reply ?? string.Empty,
                        classification.Confidence);
                }
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "[CONCIERGE DESERIALIZATION ERROR]. Raw response: {ResponseText}", responseText);
            }

            // Could not parse JSON — default to analytical so the pipeline runs.
            // The SQL Planner and safety checks will handle non-data queries gracefully.
            _logger.LogWarning("[CONCIERGE] Could not parse JSON classification; defaulting to analytical.");
            return new ConversationalClassification("analytical", string.Empty, 0.5);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "[CONCIERGE EXCEPTION]");
            return null;
        }
    }

    private async Task<string> RunAgentAsync(ProjectResponsesClient responseClient, string userMessage, string agentRole)
    {
        ResponseResult response = await responseClient.CreateResponseAsync(userMessage);
        var output = response.GetOutputText()?.Trim();

        if (string.IsNullOrWhiteSpace(output))
        {
            _logger.LogWarning("[FOUNDRY RESPONSE EMPTY] role={AgentRole}; responseId={ResponseId}; status={ResponseStatus}", agentRole, response.Id, response.Status);
            return "{}";
        }

        if (output.StartsWith("```json", StringComparison.OrdinalIgnoreCase))
            output = output[7..];
        else if (output.StartsWith("```", StringComparison.OrdinalIgnoreCase))
            output = output[3..];
        if (output.EndsWith("```", StringComparison.OrdinalIgnoreCase))
            output = output[..^3];

        return output.Trim();
    }

    private static AgentReference ParseAgentReference(string rawReference, string settingName)
    {
        if (string.IsNullOrWhiteSpace(rawReference))
        {
            throw new ArgumentException($"Missing Foundry agent reference: {settingName}.", settingName);
        }

        var trimmed = rawReference.Trim();
        var separatorIndex = trimmed.IndexOf(':');
        if (separatorIndex <= 0 || separatorIndex == trimmed.Length - 1)
        {
            return new AgentReference(name: trimmed);
        }

        var name = trimmed[..separatorIndex].Trim();
        var version = trimmed[(separatorIndex + 1)..].Trim();
        if (string.IsNullOrWhiteSpace(name) || string.IsNullOrWhiteSpace(version))
        {
            return new AgentReference(name: trimmed);
        }

        return new AgentReference(name: name, version: version);
    }

    private static string BuildConciergeClassificationMessage(string userMessage)
    {
        var sb = new System.Text.StringBuilder();
        sb.AppendLine("=== INSTRUCCIÓN DE CLASIFICACIÓN ===");
        sb.AppendLine("Tu tarea es clasificar si el mensaje del usuario requiere análisis de datos (consulta a base de datos, métricas, estadísticas, reportes, gráficas, tendencias, fraude) o es conversacional (saludo, pregunta general, ayuda, agradecimiento, prueba).");
        sb.AppendLine();
        sb.AppendLine("=== MENSAJE DEL USUARIO ===");
        sb.AppendLine(userMessage);
        sb.AppendLine();
        sb.AppendLine("=== INSTRUCCIÓN CRÍTICA DE RESPUESTA ===");
        sb.AppendLine("RESPONDE ÚNICAMENTE CON UN OBJETO JSON VÁLIDO. SIN TEXTO ADICIONAL, SIN MARKDOWN, SIN EXPLICACIONES.");
        sb.AppendLine("Reglas:");
        sb.AppendLine("- Si el mensaje pide datos, métricas, reportes, gráficas, estadísticas, consultas SQL o análisis → category: \"analytical\"");
        sb.AppendLine("- Si es un saludo, conversación casual, prueba o pregunta de ayuda → category: \"conversational\" y reply con tu respuesta");
        sb.AppendLine();
        sb.AppendLine("FORMATO SI ES ANALÍTICO:");
        sb.AppendLine("{");
        sb.AppendLine("  \"category\": \"analytical\",");
        sb.AppendLine("  \"reply\": \"\",");
        sb.AppendLine("  \"confidence\": 0.95");
        sb.AppendLine("}");
        sb.AppendLine();
        sb.AppendLine("FORMATO SI ES CONVERSACIONAL:");
        sb.AppendLine("{");
        sb.AppendLine("  \"category\": \"conversational\",");
        sb.AppendLine("  \"reply\": \"Tu respuesta amigable al usuario aquí\",");
        sb.AppendLine("  \"confidence\": 0.95");
        sb.AppendLine("}");
        return sb.ToString();
    }

    private static string BuildSqlPlannerMessage(string question, string dbSchema, string? conversationContext)
    {
        var sb = new System.Text.StringBuilder();
        sb.AppendLine("=== CATÁLOGO DE DATOS DISPONIBLE ===");
        sb.AppendLine(dbSchema);
        sb.AppendLine();

        if (!string.IsNullOrWhiteSpace(conversationContext))
        {
            sb.AppendLine("=== CONTEXTO DE CONVERSACIÓN PREVIO ===");
            sb.AppendLine(conversationContext);
            sb.AppendLine();
            sb.AppendLine("=== REGLAS CRÍTICAS DE MEMORIA CONVERSACIONAL ===");
            sb.AppendLine("1. REUTILIZA DECISIONES PREVIAS: Si la pregunta actual referencia análisis previo ('esa', 'dicha', 'la misma', 'eso', 'continúa', 'gráfica de eso'), reutiliza el SQL y la lógica del turno anterior sin pedir nuevas aclaraciones.");
            sb.AppendLine("2. NO REPITAS PREGUNTAS: Si el usuario ya respondió una aclaración en turnos previos (por ejemplo: 'usa el campo reason'), NO vuelvas a preguntar lo mismo. Aplica esa decisión directamente.");
            sb.AppendLine("3. MANTÉN COHERENCIA: Si el turno previo determinó tabla, vista, agregación o filtro, mantén esa coherencia a menos que el usuario lo contradiga explícitamente.");
            sb.AppendLine("4. INFERENCIA CONTEXTUAL: Si la pregunta actual es breve o vaga pero el contexto previo es claro, infiere la intención desde el contexto y procede.");
            sb.AppendLine("5. SOLO ACLARAR LO NUEVO: Usa 'needs_clarification' solo para ambigüedades nuevas. Nunca repitas el mismo mini cuestionario ya resuelto.");
            sb.AppendLine("6. EVITA 'UNSUPPORTED' POR FALTA DE MEMORIA: Si hay contexto suficiente en turnos previos, responde 'ready' con SQL ejecutable.");
            sb.AppendLine();
        }

        sb.AppendLine("=== REGLAS DE ACLARACIÓN Y REFINAMIENTO ===");
        sb.AppendLine("- Si la solicitud es ambigua, incompleta o tiene múltiples interpretaciones razonables, NO inventes supuestos críticos.");
        sb.AppendLine("- En ese caso responde con status: \"needs_clarification\" y formula de 1 a 3 preguntas concretas para resolver la ambigüedad.");
        sb.AppendLine("- Prioriza preguntas sobre: métrica exacta, rango temporal, filtros, entidad objetivo y nivel de agregación.");
        sb.AppendLine("- Solo usa status: \"unsupported\" cuando, incluso con aclaraciones razonables, la solicitud no pueda resolverse con el esquema disponible.");
        sb.AppendLine("- Si existe suficiente contexto para ejecutar, responde con status: \"ready\" y SQL ejecutable.");
        sb.AppendLine();

        sb.AppendLine("=== PREGUNTA DEL USUARIO ===");
        sb.AppendLine(question);
        sb.AppendLine();
        sb.AppendLine("=== INSTRUCCIÓN CRÍTICA DE RESPUESTA ===");
        sb.AppendLine("TU RESPUESTA DEBE SER ÚNICA Y EXCLUSIVAMENTE UN OBJETO JSON VÁLIDO QUE CUMPLA CON TU ESQUEMA DE SALIDA (status, sql, etc). NO DEBES ENVIAR NINGÚN TEXTO CONVERSACIONAL, SALUDOS, NI MARKDOWN FUERA DEL JSON. SOLO EL JSON PURO.");
        sb.AppendLine("FORMATO ESPERADO:");
        sb.AppendLine("{");
        sb.AppendLine("  \"status\": \"ready\",");
        sb.AppendLine("  \"sql\": {");
        sb.AppendLine("    \"dialect\": \"tsql\",");
        sb.AppendLine("    \"query\": \"TU CONSULTA SQL AQUÍ\",");
        sb.AppendLine("    \"explanation\": \"breve explicación opcional\"");
        sb.AppendLine("  }");
        sb.AppendLine("}");
        sb.AppendLine("O, si falta contexto:");
        sb.AppendLine("{");
        sb.AppendLine("  \"status\": \"needs_clarification\",");
        sb.AppendLine("  \"clarification\": {");
        sb.AppendLine("    \"question_for_user\": \"Necesito precisar algunos puntos: 1) ... 2) ...\"");
        sb.AppendLine("  }");
        sb.AppendLine("}");

        return sb.ToString();
    }

    private static string BuildResultInterpreterMessage(
        string question, string intentJson, string sql,
        List<Dictionary<string, object?>> rows, string? governanceJson)
    {
        var sampleRows = rows.Take(50).ToList();
        var rowsJson = JsonSerializer.Serialize(sampleRows);

        var sb = new System.Text.StringBuilder();
        sb.AppendLine("=== PREGUNTA ORIGINAL ===");
        sb.AppendLine(question);
        sb.AppendLine();
        sb.AppendLine("=== INTENCIÓN ANALÍTICA ===");
        sb.AppendLine(intentJson);
        sb.AppendLine();

        if (!string.IsNullOrWhiteSpace(governanceJson))
        {
            sb.AppendLine("=== GOBERNANZA ===");
            sb.AppendLine(governanceJson);
            sb.AppendLine();
        }

        sb.AppendLine("=== SQL EJECUTADO ===");
        sb.AppendLine(sql);
        sb.AppendLine();
        sb.AppendLine($"=== RESULTADOS ({rows.Count} filas totales, muestra de {sampleRows.Count}) ===");
        sb.AppendLine(rowsJson);
        sb.AppendLine();
        sb.AppendLine("=== INSTRUCCIÓN CRÍTICA DE RESPUESTA ===");
        sb.AppendLine("TU RESPUESTA DEBE SER ÚNICA Y EXCLUSIVAMENTE UN OBJETO JSON VÁLIDO. NO ENVÍES TEXTO CONVERSACIONAL FUERA DEL JSON.");
        sb.AppendLine();
        sb.AppendLine("=== REGLAS SOBRE GRÁFICAS ===");
        sb.AppendLine("Puedes sugerir gráficas CUANDO el contexto lo justifique:");
        sb.AppendLine("  • Series temporales o tendencias (datos por mes/año/período) → type: 'line'");
        sb.AppendLine("  • Comparativas entre categorías → type: 'bar'");
        sb.AppendLine("  • Distribuciones o proporciones → type: 'pie'");
        sb.AppendLine("Si el conjunto de datos es muy grande (muchas categorías, muchos períodos), RESUME/FILTRA:");
        sb.AppendLine("  • Si hay 50+ meses, muestra solo últimos 12 o agrupa por trimestre/año");
        sb.AppendLine("  • Si hay muchas categorías, agrupa las menores o muestra top-N");
        sb.AppendLine("  • Siempre documenta QUÉ datos incluiste en la visualización");
        sb.AppendLine();
        sb.AppendLine("CAMPO 'suggested_chart' (opcional, pero recomendado si los datos justifican visualización):");
        sb.AppendLine("  • type: 'line' | 'bar' | 'pie' — tipo de gráfica");
        sb.AppendLine("  • title: Título descriptivo y claro");
        sb.AppendLine("  • description: Breve explicación de qué visualiza");
        sb.AppendLine("  • x_field: Nombre exacto de la columna para eje X (ej: 'MES', 'CATEGORÍA')");
        sb.AppendLine("  • y_field: Nombre exacto de la columna para eje Y (ej: 'REGISTROS', 'PORCENTAJE_DEL_MES')");
        sb.AppendLine("  • group_by: (opcional) Columna para agrupar series (ej: 'ENFERMEDAD_O_MOTIVO')");
        sb.AppendLine("  • x_axis_label: Etiqueta para eje X");
        sb.AppendLine("  • y_axis_label: Etiqueta para eje Y");
        sb.AppendLine("  • filtered_rows: Cantidad de filas usadas en la visualización (IMPORTANTE documentar si filtraste)");
        sb.AppendLine();
        sb.AppendLine("FORMATO ESPERADO:");
        sb.AppendLine("{");
        sb.AppendLine("  \"status\": \"success\",");
        sb.AppendLine("  \"executive_summary\": \"Resumen ejecutivo claro de los resultados\",");
        sb.AppendLine("  \"response_for_user\": \"Explicación completa con datos concretos. Si incluiste gráfica, explica qué datos visualiza\",");
        sb.AppendLine("  \"observations\": [\"observación 1\", \"observación 2\"],");
        sb.AppendLine("  \"recommendations\": [\"recomendación 1\", \"recomendación 2\"],");
        sb.AppendLine("  \"suggested_chart\": {");
        sb.AppendLine("    \"type\": \"line\",");
        sb.AppendLine("    \"title\": \"Tendencia de datos a lo largo del tiempo\",");
        sb.AppendLine("    \"description\": \"Muestra la evolución mensual de los valores registrados\",");
        sb.AppendLine("    \"x_field\": \"MES\",");
        sb.AppendLine("    \"y_field\": \"REGISTROS\",");
        sb.AppendLine("    \"x_axis_label\": \"Período\",");
        sb.AppendLine("    \"y_axis_label\": \"Cantidad\",");
        sb.AppendLine("    \"filtered_rows\": 12");
        sb.AppendLine("  },");
        sb.AppendLine("  \"confidence\": 0.95");
        sb.AppendLine("}");
        sb.AppendLine();
        sb.AppendLine("NOTA: Incluye 'suggested_chart' SOLO si la visualización aporta valor real. Si no hay datos apropiados o son insuficientes, omite el campo.");

        return sb.ToString();
    }
}

// Internal DTO for Concierge parsing
internal sealed class ConciergeClassification
{
    [JsonPropertyName("category")]
    public string? Category { get; set; }

    [JsonPropertyName("reply")]
    public string? Reply { get; set; }

    [JsonPropertyName("confidence")]
    public double Confidence { get; set; } = 1.0;
}
