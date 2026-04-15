using Core.Application.Contracts;
using System.Globalization;
using System.Text.Json;
using System.Text.Json.Serialization;
using System.Text.RegularExpressions;

namespace Infrastructure.AzureOpenAI;

public interface IIntentService
{
    Task<AnalyticalIntent> ParseIntentAsync(QueryRequest request, List<ConversationTurn> conversationContext);
}

internal sealed class IntentLlmOutput
{
    [JsonPropertyName("intentType")]
    public string? IntentType { get; set; }

    [JsonPropertyName("metric")]
    public string? Metric { get; set; }

    [JsonPropertyName("dimensions")]
    public List<string>? Dimensions { get; set; }

    [JsonPropertyName("timeWindowCurrent")]
    public string? TimeWindowCurrent { get; set; }

    [JsonPropertyName("timeWindowBaseline")]
    public string? TimeWindowBaseline { get; set; }

    [JsonPropertyName("grain")]
    public string? Grain { get; set; }

    [JsonPropertyName("sensitivity")]
    public string? Sensitivity { get; set; }

    [JsonPropertyName("confidence")]
    public double? Confidence { get; set; }

    [JsonPropertyName("clarificationNeeded")]
    public bool? ClarificationNeeded { get; set; }

    [JsonPropertyName("top")]
    public int? Top { get; set; }
}

public sealed class IntentService : IIntentService
{
    private static readonly AzureOpenAiChatClient ChatClient = new();

    public async Task<AnalyticalIntent> ParseIntentAsync(QueryRequest request, List<ConversationTurn> conversationContext)
    {
        var question = request.Question.Trim();
        var questionLower = question.ToLowerInvariant();
        var latestTurn = conversationContext.LastOrDefault();
        var aiIntent = await TryInferWithAiAsync(request, conversationContext);

        if (aiIntent is not null)
        {
            var aiFilters = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase)
            {
                ["question"] = question
            };

            if (latestTurn is not null)
            {
                aiFilters["previous_question"] = latestTurn.Question;
                aiFilters["conversation_turns"] = conversationContext.Count.ToString(CultureInfo.InvariantCulture);
            }

            if (TryExtractTop(questionLower, out var topFromQuestion))
            {
                aiFilters["top"] = topFromQuestion.ToString(CultureInfo.InvariantCulture);
            }
            else if (aiIntent.Top is > 0)
            {
                aiFilters["top"] = Math.Clamp(aiIntent.Top.Value, 1, 100).ToString(CultureInfo.InvariantCulture);
            }

            var currentWindow = NormalizeWindow(aiIntent.TimeWindowCurrent) ?? "last_7_days";
            var baselineWindow = NormalizeWindow(aiIntent.TimeWindowBaseline) ?? InferBaseline(currentWindow);

            return new AnalyticalIntent(
                "fraud",
                NormalizeIntentType(aiIntent.IntentType) ?? "overview",
                NormalizeMetric(aiIntent.Metric) ?? "fraud_rate",
                NormalizeDimensions(aiIntent.Dimensions),
                aiFilters,
                new TimeWindow(currentWindow, baselineWindow),
                NormalizeGrain(aiIntent.Grain) ?? "daily",
                NormalizeSensitivity(aiIntent.Sensitivity) ?? InferSensitivity(request.Role, questionLower),
                NormalizeConfidence(aiIntent.Confidence),
                aiIntent.ClarificationNeeded ?? false);
        }

        var followUp = IsFollowUpQuestion(questionLower);

        var intentType = InferIntentType(questionLower);
        var metric = InferMetric(questionLower);
        var dimensions = InferDimensions(questionLower);
        var window = InferWindow(questionLower);

        if (followUp && latestTurn is not null)
        {
            if (IsGenericIntent(intentType))
            {
                intentType = latestTurn.IntentType;
            }

            if (metric == "fraud_rate")
            {
                metric = InferMetricFromSql(latestTurn.Sql);
            }

            if (dimensions.SequenceEqual(["time"]))
            {
                dimensions = InferDimensionsFromSql(latestTurn.Sql);
            }

            if (window.Current == "last_7_days")
            {
                window = InferWindowFromSql(latestTurn.Sql);
            }
        }

        var sensitivity = InferSensitivity(request.Role, questionLower);

        var filters = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase)
        {
            ["question"] = question
        };

        if (latestTurn is not null)
        {
            filters["previous_question"] = latestTurn.Question;
            filters["conversation_turns"] = conversationContext.Count.ToString(CultureInfo.InvariantCulture);
        }

        if (TryExtractTop(questionLower, out var top))
        {
            filters["top"] = top.ToString(CultureInfo.InvariantCulture);
        }

        var intent = new AnalyticalIntent(
            "fraud",
            intentType,
            metric,
            dimensions,
            filters,
            window,
            "daily",
            sensitivity,
            0.81,
            false);

        return intent;
    }

    private static async Task<IntentLlmOutput?> TryInferWithAiAsync(QueryRequest request, List<ConversationTurn> conversationContext)
    {
        var conversationJson = JsonSerializer.Serialize(conversationContext.TakeLast(6));
        var systemPrompt =
            "Eres un parser de intencion para analitica antifraude. " +
            "Devuelve SOLO JSON valido sin markdown. " +
            "Debes usar exclusivamente valores permitidos para mantener seguridad. " +
            "intentType permitido: overview, trend_analysis, ranking, anomaly_detection. " +
            "metric permitido: fraud_rate, chargeback_rate, customer_risk_score, failed_then_successful, device_reuse_risk. " +
            "dimensions permitido: time, merchant, customer, device, channel, city. " +
            "timeWindowCurrent permitido: last_7_days, last_30_days, last_90_days. " +
            "timeWindowBaseline permitido: previous_7_days, previous_30_days, previous_90_days. " +
            "grain permitido: daily, weekly, monthly. " +
            "sensitivity permitido: low, medium, high. " +
            "Si falta contexto, marca clarificationNeeded=true.";

        var userPrompt =
            "Analiza esta consulta con su historial y devuelve JSON con esta estructura exacta: " +
            "{\"intentType\":string,\"metric\":string,\"dimensions\":string[],\"timeWindowCurrent\":string,\"timeWindowBaseline\":string,\"grain\":string,\"sensitivity\":string,\"confidence\":number,\"clarificationNeeded\":boolean,\"top\":number|null}. " +
            "No agregues llaves extra. " +
            $"Pregunta actual: {request.Question}\n" +
            $"Rol: {request.Role}\n" +
            $"Historial JSON: {conversationJson}";

        var aiRaw = await ChatClient.CompleteAsync(systemPrompt, userPrompt, jsonResponse: true, maxTokens: 450, temperature: 0.0);
        if (string.IsNullOrWhiteSpace(aiRaw))
        {
            return null;
        }

        try
        {
            return JsonSerializer.Deserialize<IntentLlmOutput>(aiRaw, JsonDefaults.Options);
        }
        catch
        {
            return null;
        }
    }

    private static string[] NormalizeDimensions(List<string>? dimensions)
    {
        var allowed = new HashSet<string>(StringComparer.OrdinalIgnoreCase)
        {
            "time",
            "merchant",
            "customer",
            "device",
            "channel",
            "city"
        };

        var normalized = (dimensions ?? new List<string>())
            .Select(d => d?.Trim().ToLowerInvariant())
            .Where(d => !string.IsNullOrWhiteSpace(d) && allowed.Contains(d!))
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .Cast<string>()
            .ToArray();

        return normalized.Length > 0 ? normalized : ["time"];
    }

    private static string? NormalizeIntentType(string? intentType)
    {
        return intentType?.Trim().ToLowerInvariant() switch
        {
            "overview" => "overview",
            "trend_analysis" => "trend_analysis",
            "ranking" => "ranking",
            "anomaly_detection" => "anomaly_detection",
            _ => null
        };
    }

    private static string? NormalizeMetric(string? metric)
    {
        return metric?.Trim().ToLowerInvariant() switch
        {
            "fraud_rate" => "fraud_rate",
            "chargeback_rate" => "chargeback_rate",
            "customer_risk_score" => "customer_risk_score",
            "failed_then_successful" => "failed_then_successful",
            "device_reuse_risk" => "device_reuse_risk",
            _ => null
        };
    }

    private static string? NormalizeWindow(string? window)
    {
        return window?.Trim().ToLowerInvariant() switch
        {
            "last_7_days" => "last_7_days",
            "last_30_days" => "last_30_days",
            "last_90_days" => "last_90_days",
            "previous_7_days" => "previous_7_days",
            "previous_30_days" => "previous_30_days",
            "previous_90_days" => "previous_90_days",
            _ => null
        };
    }

    private static string InferBaseline(string currentWindow)
    {
        return currentWindow switch
        {
            "last_30_days" => "previous_30_days",
            "last_90_days" => "previous_90_days",
            _ => "previous_7_days"
        };
    }

    private static string? NormalizeGrain(string? grain)
    {
        return grain?.Trim().ToLowerInvariant() switch
        {
            "daily" => "daily",
            "weekly" => "weekly",
            "monthly" => "monthly",
            _ => null
        };
    }

    private static string? NormalizeSensitivity(string? sensitivity)
    {
        return sensitivity?.Trim().ToLowerInvariant() switch
        {
            "low" => "low",
            "medium" => "medium",
            "high" => "high",
            _ => null
        };
    }

    private static double NormalizeConfidence(double? confidence)
    {
        if (!confidence.HasValue)
        {
            return 0.8;
        }

        return Math.Clamp(confidence.Value, 0.0, 1.0);
    }

    private static string InferIntentType(string questionLower)
    {
        if (questionLower.Contains("tendencia") || questionLower.Contains("trend"))
        {
            return "trend_analysis";
        }

        if (questionLower.Contains("top") || questionLower.Contains("ranking"))
        {
            return "ranking";
        }

        if (questionLower.Contains("anom") || questionLower.Contains("outlier"))
        {
            return "anomaly_detection";
        }

        return "overview";
    }

    private static bool IsGenericIntent(string intentType) =>
        intentType is "overview";

    private static string InferMetric(string questionLower)
    {
        if (questionLower.Contains("chargeback"))
        {
            return "chargeback_rate";
        }

        if (questionLower.Contains("device") || questionLower.Contains("dispositivo"))
        {
            return "device_reuse_risk";
        }

        if (questionLower.Contains("failed") || questionLower.Contains("fallid"))
        {
            return "failed_then_successful";
        }

        if (questionLower.Contains("customer") || questionLower.Contains("cliente"))
        {
            return "customer_risk_score";
        }

        return "fraud_rate";
    }

    private static string[] InferDimensions(string questionLower)
    {
        var dimensions = new List<string>();

        if (questionLower.Contains("merchant") || questionLower.Contains("comercio"))
        {
            dimensions.Add("merchant");
        }

        if (questionLower.Contains("customer") || questionLower.Contains("cliente"))
        {
            dimensions.Add("customer");
        }

        if (questionLower.Contains("device") || questionLower.Contains("dispositivo"))
        {
            dimensions.Add("device");
        }

        if (dimensions.Count == 0)
        {
            dimensions.Add("time");
        }

        return dimensions.ToArray();
    }

    private static string[] InferDimensionsFromSql(string sql)
    {
        var normalized = sql.ToLowerInvariant();

        if (normalized.Contains("merchant_"))
        {
            return ["merchant"];
        }

        if (normalized.Contains("customer_"))
        {
            return ["customer"];
        }

        if (normalized.Contains("device_") || normalized.Contains("fingerprint"))
        {
            return ["device"];
        }

        return ["time"];
    }

    private static TimeWindow InferWindow(string questionLower)
    {
        if (questionLower.Contains("30") || questionLower.Contains("mes") || questionLower.Contains("month"))
        {
            return new TimeWindow("last_30_days", "previous_30_days");
        }

        if (questionLower.Contains("90") || questionLower.Contains("quarter") || questionLower.Contains("trimestre"))
        {
            return new TimeWindow("last_90_days", "previous_90_days");
        }

        return new TimeWindow("last_7_days", "previous_7_days");
    }

    private static TimeWindow InferWindowFromSql(string sql)
    {
        var normalized = sql.ToLowerInvariant();
        if (normalized.Contains("last_90_days"))
        {
            return new TimeWindow("last_90_days", "previous_90_days");
        }

        if (normalized.Contains("last_30_days"))
        {
            return new TimeWindow("last_30_days", "previous_30_days");
        }

        return new TimeWindow("last_7_days", "previous_7_days");
    }

    private static string InferMetricFromSql(string sql)
    {
        var normalized = sql.ToLowerInvariant();

        if (normalized.Contains("vw_merchant_chargeback_trends"))
        {
            return "chargeback_rate";
        }

        if (normalized.Contains("vw_high_risk_device_reuse"))
        {
            return "device_reuse_risk";
        }

        if (normalized.Contains("vw_failed_then_successful_transactions"))
        {
            return "failed_then_successful";
        }

        if (normalized.Contains("vw_customer_risk_profile"))
        {
            return "customer_risk_score";
        }

        return "fraud_rate";
    }

    private static bool IsFollowUpQuestion(string questionLower)
    {
        return questionLower.Contains("y ahora") ||
            questionLower.Contains("ahora") ||
            questionLower.Contains("tambien") ||
            questionLower.Contains("mismo") ||
            questionLower.Contains("eso") ||
            questionLower.Contains("those") ||
            questionLower.Contains("same") ||
            questionLower.Contains("also");
    }

    private static string InferSensitivity(string role, string questionLower)
    {
        var roleLower = role.ToLowerInvariant();
        var asksSensitive = questionLower.Contains("customer_id") ||
            questionLower.Contains("full_name") ||
            questionLower.Contains("cliente") ||
            questionLower.Contains("customer");

        if (asksSensitive && !roleLower.Contains("admin"))
        {
            return "high";
        }

        return asksSensitive ? "medium" : "low";
    }

    private static bool TryExtractTop(string questionLower, out int top)
    {
        top = 0;
        var match = Regex.Match(questionLower, @"\btop\s+(\d{1,3})\b", RegexOptions.IgnoreCase);
        if (!match.Success)
        {
            return false;
        }

        if (!int.TryParse(match.Groups[1].Value, NumberStyles.Integer, CultureInfo.InvariantCulture, out var parsed))
        {
            return false;
        }

        top = Math.Clamp(parsed, 1, 100);
        return true;
    }
}
