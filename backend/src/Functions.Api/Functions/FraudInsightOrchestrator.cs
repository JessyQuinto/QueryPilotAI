using Core.Application.Contracts;
using Core.Domain.Policies;
using Infrastructure.AzureOpenAI;
using Infrastructure.Sql;
using Microsoft.Azure.Functions.Worker;
using Microsoft.DurableTask;
using System.Text;
using System.Text.Json;
using System.Text.RegularExpressions;

namespace Functions.Api.Functions;

public class FraudInsightOrchestrator
{
    [Function(nameof(FraudInsightOrchestrator))]
    public async Task<InsightResponse> Run([OrchestrationTrigger] TaskOrchestrationContext context)
    {
        var request = context.GetInput<QueryRequest>()
            ?? throw new InvalidOperationException("QueryRequest is required.");

        var requestId = Guid.Parse(context.InstanceId.Length >= 32
            ? context.InstanceId[..32].Replace("-", "")
            : context.InstanceId.PadRight(32, '0'));

        // =====================================================
        // Step 0: Concierge (Foundry Agent) — Conversational vs Analytical
        // =====================================================
        context.SetCustomStatus(new PipelineStep("concierge_routing", "El Agente Conversacional está analizando el contexto", "Active", context.CurrentUtcDateTime));

        var classification = await context.CallActivityAsync<ConversationalClassification?>(
            nameof(ClassifyWithConciergeActivity), request);

        if (classification is not null && !string.Equals(classification.Category, "analytical", StringComparison.OrdinalIgnoreCase))
        {
            context.SetCustomStatus(new PipelineStep("conversational", "El Agente respondió directamente", "Completed", context.CurrentUtcDateTime));
            await PersistConversationExchangeAsync(
                context,
                request,
                classification.FriendlyReply ?? "Hola, ¿en qué puedo ayudarte?",
                agentResponse: classification.FriendlyReply ?? "Hola, ¿en qué puedo ayudarte?",
                intentType: "conversational");
            return new InsightResponse(
                context.InstanceId, "Conversational",
                classification.FriendlyReply ?? "Hola, ¿en qué puedo ayudarte?",
                Array.Empty<string>(), string.Empty, Array.Empty<string>(),
                new List<Dictionary<string, object?>>(),
                new AuditMetadata("None", null));
        }

        context.SetCustomStatus(new PipelineStep("concierge_routing", "Requiere análisis de datos — invocando Pipeline", "Completed", context.CurrentUtcDateTime));

        // =====================================================
        // Step 1: Prompt Safety
        // =====================================================
        context.SetCustomStatus(new PipelineStep("safety_check", "Verificando seguridad del prompt", "Active", context.CurrentUtcDateTime));

        var safety = await context.CallActivityAsync<PromptSafetyResult>(nameof(AnalyzePromptSafetyActivity), request);

        if (!safety.IsSafe)
        {
            context.SetCustomStatus(new PipelineStep("safety_check", "Prompt bloqueado por seguridad", "Failed", context.CurrentUtcDateTime));
            await context.CallActivityAsync(nameof(SaveAuditTrailActivity), new AuditTrailRecord(
                requestId, request.UserId, request.Role, request.Question,
                null, null, null, "Blocked", context.CurrentUtcDateTime, context.CurrentUtcDateTime));
            await PersistConversationExchangeAsync(
                context,
                request,
                "La solicitud fue bloqueada por controles de seguridad.",
                agentResponse: safety.Reason,
                intentType: "blocked");
            return new InsightResponse(
                context.InstanceId, "Blocked",
                "La solicitud fue bloqueada por controles de seguridad.",
                new[] { safety.Reason }, string.Empty, Array.Empty<string>(),
                new List<Dictionary<string, object?>>(),
                new AuditMetadata("Critical", null));
        }

        context.SetCustomStatus(new PipelineStep("safety_check", "Prompt seguro", "Completed", context.CurrentUtcDateTime));

        // =====================================================
        // Step 2: Conversation Context (from persistent DB)
        // =====================================================
        int turnCount = 0;
        string? conversationContext = null;
        string? lastSqlFromConversation = null;

        if (request.SessionId is not null && Guid.TryParse(request.SessionId, out var sessionGuid))
        {
            context.SetCustomStatus(new PipelineStep("conversation_context", "Recuperando contexto de conversación", "Active", context.CurrentUtcDateTime));

            var recentTurns = await context.CallActivityAsync<List<ConversationTurnRecord>>(
                nameof(GetRecentTurnsActivity), new RecentTurnsInput(sessionGuid, 6));

            turnCount = recentTurns.Count;

            if (recentTurns.Count > 0)
            {
                var lastAnalyticalTurn = recentTurns.LastOrDefault(t => !string.IsNullOrWhiteSpace(t.SqlGenerated));
                lastSqlFromConversation = lastAnalyticalTurn?.SqlGenerated;

                conversationContext = JsonSerializer.Serialize(new
                {
                    latest = lastAnalyticalTurn is null
                        ? null
                        : new
                        {
                            question = lastAnalyticalTurn.Question,
                            summary = lastAnalyticalTurn.Summary,
                            sql = lastAnalyticalTurn.SqlGenerated,
                            intent = lastAnalyticalTurn.IntentType,
                            timestamp = lastAnalyticalTurn.CreatedAt
                        },
                    turns = recentTurns.Select(t => new
                    {
                        question = t.Question,
                        summary = t.Summary,
                        sql = t.SqlGenerated,
                        intent = t.IntentType,
                        timestamp = t.CreatedAt
                    })
                });
            }

            context.SetCustomStatus(new PipelineStep("conversation_context", "Contexto recuperado", "Completed", context.CurrentUtcDateTime));
        }

        // =====================================================
        // Step 3: Extract Database Schema (dynamic, from user's DB)
        // =====================================================
        string dbSchema = "";
        bool extractFresh = true;

        if (request.Connection is not null)
        {
            if (request.ConnectionId.HasValue && turnCount % 3 != 0)
            {
                var cachedSchema = await context.CallActivityAsync<string?>(nameof(GetSchemaFromCacheActivity), request.ConnectionId.Value);
                if (!string.IsNullOrEmpty(cachedSchema))
                {
                    dbSchema = cachedSchema;
                    extractFresh = false;
                    context.SetCustomStatus(new PipelineStep("schema_extraction", "Esquema recuperado desde caché", "Completed", context.CurrentUtcDateTime));
                }
            }

            if (extractFresh)
            {
                context.SetCustomStatus(new PipelineStep("schema_extraction", "Extrayendo esquema desde la base de datos origen", "Active", context.CurrentUtcDateTime));

                try
                {
                    dbSchema = await context.CallActivityAsync<string>(nameof(ExtractSchemaActivity), request.Connection);
                    
                    if (request.ConnectionId.HasValue)
                    {
                        await context.CallActivityAsync(nameof(SaveSchemaCacheActivity), new SchemaCacheInput(request.ConnectionId.Value, dbSchema));
                    }
                }
                catch (TaskFailedException ex)
                {
                    var msg = ex.FailureDetails?.ErrorMessage ?? ex.Message;
                    return new InsightResponse(
                        context.InstanceId, "Error",
                        $"No fue posible conectarse a la base de datos. Detalle: {msg}",
                        new[] { "Error al extraer esquema de la BD" }, string.Empty, Array.Empty<string>(),
                        new List<Dictionary<string, object?>>(),
                        new AuditMetadata("High", null));
                }

                context.SetCustomStatus(new PipelineStep("schema_extraction", "Esquema extraído y cacheado", "Completed", context.CurrentUtcDateTime));
            }
        }
        else
        {
            dbSchema = "No se proporcionó conexión a base de datos. No hay esquema disponible.";
        }

        // =====================================================
        // Step 4: SQL Planner (Foundry Agent)
        // — Replaces IntentService + SqlGenerationService
        // =====================================================
        context.SetCustomStatus(new PipelineStep("sql_planning", "El Agente SQL Planner está analizando la consulta", "Active", context.CurrentUtcDateTime));

        SqlPlannerResponse plannerResponse;
        try
        {
            plannerResponse = await context.CallActivityAsync<SqlPlannerResponse>(
                nameof(PlanSqlActivity),
                new SqlPlannerInput(request.Question, dbSchema, conversationContext));
        }
        catch (TaskFailedException ex)
        {
            var plannerError = ex.FailureDetails?.ErrorMessage ?? ex.Message;
            context.SetCustomStatus(new PipelineStep("sql_planning", "Error al invocar SQL Planner", "Failed", context.CurrentUtcDateTime));

            return new InsightResponse(
                context.InstanceId,
                "Error",
                $"No fue posible invocar el agente SQL Planner en Foundry. Verifica los valores FoundryAgent__SqlPlannerAgentRef/Id y su versión. Detalle: {plannerError}",
                new[] { "Error de integración con Foundry SQL Planner" },
                string.Empty,
                Array.Empty<string>(),
                new List<Dictionary<string, object?>>(),
                new AuditMetadata("High", null));
        }

        if (CanRecoverWithPreviousSql(plannerResponse.Status, request.Question, lastSqlFromConversation))
        {
            plannerResponse = new SqlPlannerResponse
            {
                Status = "ready",
                UserQuestion = request.Question,
                Sql = new SqlInfo
                {
                    Dialect = "tsql",
                    Query = lastSqlFromConversation!,
                    Explanation = "Se reutiliza el SQL válido de la consulta previa para resolver una solicitud de seguimiento contextual."
                },
                Governance = new GovernanceInfo
                {
                    SafeToExecute = true,
                    RiskLevel = "low",
                    ApprovalRequired = false,
                    ApprovalReason = string.Empty,
                    PolicyFlags = Array.Empty<string>()
                }
            };

            context.SetCustomStatus(new PipelineStep(
                "sql_planning",
                "Se reutilizó SQL previo para resolver el seguimiento de la conversación",
                "Completed",
                context.CurrentUtcDateTime));
        }

        // Handle non-ready statuses
        if (plannerResponse.Status != "ready")
        {
            var statusMessage = plannerResponse.Status switch
            {
                "needs_clarification" => BuildClarificationQuestionnaire(plannerResponse.Clarification?.QuestionForUser),
                "unsupported" => "La consulta no puede resolverse con el esquema de datos disponible.",
                "blocked" => "La solicitud fue bloqueada por políticas de seguridad del agente.",
                _ => "No fue posible generar una consulta para esta solicitud."
            };

            await PersistConversationExchangeAsync(
                context,
                request,
                statusMessage,
                agentResponse: JsonSerializer.Serialize(plannerResponse),
                intentType: plannerResponse.Status);

            return new InsightResponse(
                context.InstanceId, plannerResponse.Status,
                statusMessage,
                Array.Empty<string>(), string.Empty, Array.Empty<string>(),
                new List<Dictionary<string, object?>>(),
                new AuditMetadata(plannerResponse.Governance?.RiskLevel ?? "low", null));
        }

        var sqlQuery = plannerResponse.Sql?.Query ?? string.Empty;
        context.SetCustomStatus(new PipelineStep("sql_planning", "SQL planificado", "Completed", context.CurrentUtcDateTime));

        // =====================================================
        // Step 5: SQL Policy Validation
        // =====================================================
        context.SetCustomStatus(new PipelineStep("sql_validation", "Aplicando políticas y scoring de riesgo", "Active", context.CurrentUtcDateTime));

        var validation = await context.CallActivityAsync<SqlValidationResult>(nameof(ValidateSqlPolicyActivity), sqlQuery);

        if (!validation.IsValid)
        {
            context.SetCustomStatus(new PipelineStep("sql_validation", "SQL rechazado por política", "Failed", context.CurrentUtcDateTime));
            await context.CallActivityAsync(nameof(SaveAuditTrailActivity), new AuditTrailRecord(
                requestId, request.UserId, request.Role, request.Question,
                plannerResponse.Status, sqlQuery, string.Join("; ", validation.Reasons),
                "PolicyBlocked", context.CurrentUtcDateTime, context.CurrentUtcDateTime));
            await PersistConversationExchangeAsync(
                context,
                request,
                "La consulta generada no superó la validación de política.",
                sqlGenerated: sqlQuery,
                agentResponse: string.Join("; ", validation.Reasons),
                intentType: "policy_blocked");
            return new InsightResponse(
                context.InstanceId, "Blocked",
                "La consulta generada no superó la validación de política.",
                validation.Reasons, sqlQuery, Array.Empty<string>(),
                new List<Dictionary<string, object?>>(),
                new AuditMetadata(validation.RiskLevel, null));
        }

        context.SetCustomStatus(new PipelineStep("sql_validation", "SQL validado", "Completed", context.CurrentUtcDateTime));

        // =====================================================
        // Step 6: Approval Flow (if required)
        // =====================================================
        if (validation.RequiresApproval)
        {
            context.SetCustomStatus(new
            {
                Step = "approval",
                Label = "Esperando aprobación humana",
                Status = "PendingApproval",
                Timestamp = context.CurrentUtcDateTime,
                Message = "Esta consulta requiere aprobación manual antes de ejecutarse.",
                Sql = validation.NormalizedSql,
                RiskLevel = validation.RiskLevel,
                Reasons = validation.Reasons
            });

            await context.CallActivityAsync(nameof(SaveAuditTrailActivity), new AuditTrailRecord(
                requestId, request.UserId, request.Role, request.Question,
                plannerResponse.Status, validation.NormalizedSql, string.Join("; ", validation.Reasons),
                "PendingApproval", context.CurrentUtcDateTime, null));

            ApprovalDecision decision;
            try
            {
                decision = await context.WaitForExternalEvent<ApprovalDecision>("ApprovalEvent", TimeSpan.FromMinutes(30));
            }
            catch (TaskCanceledException)
            {
                context.SetCustomStatus(new PipelineStep("approval", "Tiempo de aprobación agotado", "Failed", context.CurrentUtcDateTime));
                await PersistConversationExchangeAsync(
                    context,
                    request,
                    "La solicitud de aprobación expiró. El SQL no fue ejecutado.",
                    sqlGenerated: validation.NormalizedSql,
                    intentType: "approval_timeout");
                return new InsightResponse(
                    context.InstanceId, "TimedOut",
                    "La solicitud de aprobación expiró. El SQL no fue ejecutado.",
                    validation.Reasons, validation.NormalizedSql, Array.Empty<string>(),
                    new List<Dictionary<string, object?>>(),
                    new AuditMetadata(validation.RiskLevel, null));
            }

            if (!string.Equals(decision.Decision, "Approved", StringComparison.OrdinalIgnoreCase))
            {
                context.SetCustomStatus(new PipelineStep("approval", "Rechazado por " + decision.ApproverUserId, "Failed", context.CurrentUtcDateTime));
                await context.CallActivityAsync(nameof(SaveAuditTrailActivity), new AuditTrailRecord(
                    requestId, request.UserId, request.Role, request.Question,
                    plannerResponse.Status, validation.NormalizedSql, $"Rejected: {decision.Comments}",
                    "Rejected", context.CurrentUtcDateTime, context.CurrentUtcDateTime));
                await PersistConversationExchangeAsync(
                    context,
                    request,
                    $"La consulta fue rechazada. Motivo: {decision.Comments ?? "Sin comentario"}",
                    sqlGenerated: validation.NormalizedSql,
                    agentResponse: decision.Comments,
                    intentType: "approval_rejected");
                return new InsightResponse(
                    context.InstanceId, "Rejected",
                    $"La consulta fue rechazada. Motivo: {decision.Comments ?? "Sin comentario"}",
                    validation.Reasons, validation.NormalizedSql, Array.Empty<string>(),
                    new List<Dictionary<string, object?>>(),
                    new AuditMetadata(validation.RiskLevel, decision.ApproverUserId));
            }

            context.SetCustomStatus(new PipelineStep("approval", "Aprobado por " + decision.ApproverUserId, "Completed", context.CurrentUtcDateTime));
        }

        // =====================================================
        // Step 7: SQL Execution (on user's database)
        // =====================================================
        context.SetCustomStatus(new PipelineStep("sql_execution", "Ejecutando SQL", "Active", context.CurrentUtcDateTime));

        var rows = await context.CallActivityAsync<List<Dictionary<string, object?>>>(
            nameof(ExecuteSqlActivity), new SqlExecutionInput(validation.NormalizedSql, request.Connection));

        context.SetCustomStatus(new PipelineStep("sql_execution", "Consulta ejecutada", "Completed", context.CurrentUtcDateTime));

        // =====================================================
        // Step 8: Result Interpreter (Foundry Agent)
        // — Replaces SummaryService
        // =====================================================
        context.SetCustomStatus(new PipelineStep("interpretation", "El Agente de Interpretación está analizando los resultados", "Active", context.CurrentUtcDateTime));

        var intentJson = plannerResponse.Intent.HasValue
            ? plannerResponse.Intent.Value.GetRawText()
            : "{}";
        var governanceJson = plannerResponse.Governance != null
            ? JsonSerializer.Serialize(plannerResponse.Governance)
            : null;

        var interpretation = await context.CallActivityAsync<ResultInterpretation>(
            nameof(InterpretResultsActivity),
            new ResultInterpreterInput(request.Question, intentJson, validation.NormalizedSql, rows, governanceJson));

        context.SetCustomStatus(new PipelineStep("interpretation", "Insight generado", "Completed", context.CurrentUtcDateTime));

        // =====================================================
        // Step 9: Save conversation turn + audit
        // =====================================================
        var summary = BuildUserNarrativeSummary(interpretation, rows.Count);
        var warnings = BuildWarnings(interpretation);
        var suggestedChart = BuildSuggestedChart(interpretation, rows.Count);

        await PersistConversationExchangeAsync(
            context,
            request,
            summary,
            sqlGenerated: validation.NormalizedSql,
            agentResponse: JsonSerializer.Serialize(interpretation),
            intentType: "analytical");

        await context.CallActivityAsync(nameof(SaveAuditTrailActivity), new AuditTrailRecord(
            requestId, request.UserId, request.Role, request.Question,
            plannerResponse.Status, validation.NormalizedSql, null,
            "Completed", context.CurrentUtcDateTime, context.CurrentUtcDateTime));

        return new InsightResponse(
            context.InstanceId, "Completed", summary,
            interpretation.KeyFindings?.Select(f => f.Title ?? "").ToArray() ?? Array.Empty<string>(),
            validation.NormalizedSql, warnings,
            rows, new AuditMetadata(interpretation.Risk?.Level ?? "low", null), suggestedChart);
    }

    private static string BuildUserNarrativeSummary(ResultInterpretation interpretation, int rowCount)
    {
        var primary = FirstNonEmpty(
            interpretation.ResponseForUser,
            interpretation.ExecutiveSummary,
            interpretation.QuestionAnswered);

        if (string.IsNullOrWhiteSpace(primary))
        {
            if (rowCount == 0)
            {
                primary = "No se encontraron registros que coincidan con tu consulta para el período analizado. Intenta ampliar el rango de fechas o verificar los filtros utilizados.";
            }
            else
            {
                primary = $"Se procesó la consulta correctamente y se obtuvieron {rowCount} registros. A continuación se muestran los resultados para facilitar el análisis.";
            }
        }

        var warnings = BuildWarnings(interpretation);
        if (warnings.Length == 0)
        {
            return primary;
        }

        return $"{primary} Considera estas alertas: {string.Join(" ", warnings)}";
    }

    private static string[] BuildWarnings(ResultInterpretation interpretation)
    {
        return interpretation.Warnings
            ?? interpretation.Limitations
            ?? Array.Empty<string>();
    }

    private static SuggestedChartOutput? BuildSuggestedChart(ResultInterpretation interpretation, int rowCount)
    {
        if (interpretation.SuggestedChart is not null)
        {
            var normalizedType = NormalizeChartType(interpretation.SuggestedChart.Type);
            if (normalizedType is null)
            {
                return null;
            }

            return new SuggestedChartOutput(
                normalizedType,
                string.IsNullOrWhiteSpace(interpretation.SuggestedChart.Title) ? "Visualización sugerida" : interpretation.SuggestedChart.Title,
                interpretation.SuggestedChart.Description,
                interpretation.SuggestedChart.XAxisLabel,
                interpretation.SuggestedChart.YAxisLabel,
                interpretation.SuggestedChart.XField,
                interpretation.SuggestedChart.YField,
                interpretation.SuggestedChart.GroupBy,
                interpretation.SuggestedChart.FilteredRowsCount ?? rowCount);
        }

        // Legacy format fallback: should_render_chart + chart_type + x_axis/y_axis/category_field
        if (interpretation.ShouldRenderChart != true)
        {
            return null;
        }

        var fallbackType = NormalizeChartType(interpretation.ChartType);
        if (fallbackType is null)
        {
            return null;
        }

        var title = FirstNonEmpty(interpretation.Title, "Visualización sugerida")!;
        var xField = interpretation.XAxis;
        var yField = interpretation.YAxis;
        var groupBy = interpretation.CategoryField;

        if (string.IsNullOrWhiteSpace(xField) || string.IsNullOrWhiteSpace(yField))
        {
            return null;
        }

        return new SuggestedChartOutput(
            fallbackType,
            title,
            interpretation.Subtitle,
            interpretation.XAxis,
            interpretation.YAxis,
            xField,
            yField,
            groupBy,
            interpretation.TopN ?? rowCount);
    }

    private static string? NormalizeChartType(string? chartType)
    {
        if (string.IsNullOrWhiteSpace(chartType))
        {
            return null;
        }

        return chartType.Trim().ToLowerInvariant() switch
        {
            "line"           => "line",
            "bar"            => "bar",
            "horizontal_bar" => "horizontal_bar",
            "stacked_bar"    => "stacked_bar",
            "stackedbar"     => "stacked_bar",
            "pie"            => "pie",
            "donut"          => "donut",
            "doughnut"       => "donut",
            "area"           => "area",
            "scatter"        => "scatter",
            "heatmap"        => "heatmap",
            "combo"          => "combo",
            "table"          => "table",
            "none"           => null,
            _                => null
        };
    }

    private static async Task PersistConversationExchangeAsync(
        TaskOrchestrationContext context,
        QueryRequest request,
        string assistantSummary,
        string? sqlGenerated = null,
        string? agentResponse = null,
        string? intentType = null,
        string? metric = null)
    {
        if (request.SessionId is null || !Guid.TryParse(request.SessionId, out var sessionGuid))
        {
            return;
        }

        try
        {
            await context.CallActivityAsync(nameof(SaveConversationTurnActivity),
                new ConversationTurnRecord(
                    Guid.Empty,
                    sessionGuid,
                    request.UserId,
                    "user",
                    request.Question,
                    null,
                    null,
                    null,
                    null,
                    null,
                    DateTimeOffset.UtcNow));

            await context.CallActivityAsync(nameof(SaveConversationTurnActivity),
                new ConversationTurnRecord(
                    Guid.Empty,
                    sessionGuid,
                    request.UserId,
                    "assistant",
                    request.Question,
                    sqlGenerated,
                    agentResponse,
                    assistantSummary,
                    intentType,
                    metric,
                    DateTimeOffset.UtcNow));
        }
        catch (Exception ex)
        {
            Console.WriteLine($"[WARNING] SaveConversationTurn failed: {ex.Message}");
        }
    }

    private static bool CanRecoverWithPreviousSql(string plannerStatus, string question, string? previousSql)
    {
        if (string.IsNullOrWhiteSpace(previousSql))
        {
            return false;
        }

        if (!string.Equals(plannerStatus, "unsupported", StringComparison.OrdinalIgnoreCase)
            && !string.Equals(plannerStatus, "needs_clarification", StringComparison.OrdinalIgnoreCase))
        {
            return false;
        }

        if (string.IsNullOrWhiteSpace(question))
        {
            return false;
        }

        var normalizedQuestion = question.ToLowerInvariant();
        var followUpHints = new[]
        {
            "dicha",
            "esa",
            "ese",
            "anterior",
            "mismo",
            "misma",
            "grafica",
            "gráfica",
            "grafico",
            "gráfico",
            "chart",
            "visual",
            "tendencia"
        };

        return followUpHints.Any(normalizedQuestion.Contains);
    }

    private static string? FirstNonEmpty(params string?[] values)
    {
        foreach (var value in values)
        {
            if (!string.IsNullOrWhiteSpace(value))
            {
                return value.Trim();
            }
        }

        return null;
    }

    private static string BuildClarificationQuestionnaire(string? questionForUser)
    {
        var questions = ExtractClarificationQuestions(questionForUser);

        if (questions.Count == 0)
        {
            questions.Add("¿Qué métrica o resultado exacto quieres analizar?");
            questions.Add("¿Qué periodo de tiempo debo considerar?");
            questions.Add("¿Debo aplicar algún filtro específico (cliente, país, producto, estado, etc.)?");
        }

        var sb = new StringBuilder();
        sb.AppendLine("Para darte una respuesta precisa, ayúdame con este mini cuestionario:");

        for (var i = 0; i < questions.Count; i++)
        {
            sb.AppendLine($"{i + 1}) {questions[i]}");
        }

        sb.Append("Responde en un solo mensaje y con eso continúo el análisis.");
        return sb.ToString();
    }

    private static List<string> ExtractClarificationQuestions(string? raw)
    {
        var results = new List<string>();
        if (string.IsNullOrWhiteSpace(raw))
        {
            return results;
        }

        var lines = raw
            .Split(new[] { "\r\n", "\n" }, StringSplitOptions.RemoveEmptyEntries)
            .Select(line => line.Trim())
            .Where(line => !string.IsNullOrWhiteSpace(line));

        foreach (var line in lines)
        {
            var cleaned = Regex.Replace(line, @"^(?:\d+[\)\.\-:]|[-*•])\s*", string.Empty).Trim();
            if (!string.IsNullOrWhiteSpace(cleaned) && line != cleaned)
            {
                results.Add(cleaned.TrimEnd('.', ';'));
            }
        }

        if (results.Count > 0)
        {
            return results.Distinct(StringComparer.OrdinalIgnoreCase).Take(3).ToList();
        }

        var fallback = raw
            .Split(new[] { '?', '\n' }, StringSplitOptions.RemoveEmptyEntries)
            .Select(part => part.Trim())
            .Where(part => part.Length > 0)
            .Select(part => part.EndsWith("?") ? part : $"{part}?")
            .Take(3)
            .ToList();

        return fallback;
    }
}
