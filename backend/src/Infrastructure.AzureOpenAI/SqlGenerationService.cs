using Core.Application.Contracts;
using System.Text.Json;
using System.Text.RegularExpressions;

namespace Infrastructure.AzureOpenAI;

public interface ISqlGenerationService
{
    Task<string> GenerateSqlAsync(AnalyticalIntent intent);
}

public sealed class SqlGenerationService : ISqlGenerationService
{
    private const int MinTop = 1;
    private const int MaxTop = 100;
    private const int DefaultTop = 25;

    private static readonly string[] AllowedObservationWindows = ["last_7_days", "previous_7_days"];
    private static readonly Regex CodeFenceRegex = new("^```[a-zA-Z]*\\s*|\\s*```$", RegexOptions.Singleline | RegexOptions.Compiled);
    private static readonly AzureOpenAiChatClient ChatClient = new();

    public async Task<string> GenerateSqlAsync(AnalyticalIntent intent)
    {
        var top = intent.Filters.TryGetValue("top", out var topText) && int.TryParse(topText, out var parsedTop)
            ? Math.Clamp(parsedTop, MinTop, MaxTop)
            : DefaultTop;

        var observationWindowFilter = string.Join(", ", AllowedObservationWindows.Select(static w => $"'{w}'"));
        var sql = intent.Metric switch
        {
            "chargeback_rate" => $@"
SELECT TOP {top}
    merchant_id,
    merchant_name,
    chargeback_rate,
    baseline_rate,
    delta_factor,
    observation_window
FROM dbo.vw_merchant_chargeback_trends
WHERE observation_window IN ({observationWindowFilter})
ORDER BY chargeback_rate DESC",

            "customer_risk_score" => $@"
SELECT TOP {top}
    customer_id,
    segment,
    city,
    risk_level,
    total_transactions,
    total_alerts,
    total_chargebacks
FROM dbo.vw_customer_risk_profile
ORDER BY total_chargebacks DESC, total_alerts DESC",

            "failed_then_successful" => $@"
SELECT TOP {top}
    customer_id,
    account_id,
    first_attempt_ts,
    last_attempt_ts,
    attempts_count
FROM dbo.vw_failed_then_successful_transactions
ORDER BY attempts_count DESC, last_attempt_ts DESC",

            "device_reuse_risk" => $@"
SELECT TOP {top}
    device_id,
    fingerprint,
    distinct_customers,
    max_risk_level
FROM dbo.vw_high_risk_device_reuse
ORDER BY distinct_customers DESC",

            _ => $@"
SELECT TOP {top}
    metric_date,
    channel,
    geo_city,
    total_transactions,
    total_chargebacks,
    chargeback_rate
FROM dbo.vw_daily_fraud_metrics
ORDER BY metric_date DESC"
        };

        var aiSql = await TryGenerateWithAiAsync(intent, top);
        if (!string.IsNullOrWhiteSpace(aiSql))
        {
            return aiSql;
        }

        return sql.Trim();
    }

    private static async Task<string?> TryGenerateWithAiAsync(AnalyticalIntent intent, int top)
    {
        var intentJson = JsonSerializer.Serialize(intent);
        var systemPrompt =
            "Eres un generador de SQL para Azure SQL en un sistema antifraude. " +
            "Devuelve SOLO una sentencia SQL valida, sin markdown ni texto adicional. " +
            "Reglas obligatorias: una sola sentencia SELECT, sin comentarios, sin ; extra, sin DML/DDL, sin EXEC, sin CTE recursiva. " +
            "Solo se permite consultar estas vistas con estos esquemas exactos:\n" +
            "- dbo.vw_daily_fraud_metrics (metric_date, channel, geo_city, total_transactions, total_chargebacks, chargeback_rate)\n" +
            "- dbo.vw_merchant_chargeback_trends (merchant_id, merchant_name, chargeback_rate, baseline_rate, delta_factor, observation_window) — observation_window values disponibles: 'last_7_days', 'previous_7_days'\n" +
            "- dbo.vw_customer_risk_profile (customer_id, segment, city, risk_level, total_transactions, total_alerts, total_chargebacks)\n" +
            "- dbo.vw_failed_then_successful_transactions (customer_id, account_id, first_attempt_ts, last_attempt_ts, attempts_count)\n" +
            "- dbo.vw_high_risk_device_reuse (device_id, fingerprint, distinct_customers, max_risk_level)\n\n" +
            "IMPORTANTE: Para observation_window, SOLO usa los valores 'last_7_days' o 'previous_7_days'. No uses 'last_30_days' ni 'last_90_days' porque no existen en la base de datos.\n" +
            "Debes incluir TOP con el valor solicitado y ordenar por relevancia.";

        var userPrompt =
            $"Genera SQL para esta intencion: {intentJson}\n" +
            $"TOP solicitado: {top}\n" +
            "Para la vista de chargebacks, usa observation_window IN ('last_7_days', 'previous_7_days') para obtener datos.";

        var raw = await ChatClient.CompleteAsync(systemPrompt, userPrompt, jsonResponse: false, maxTokens: 450, temperature: 0.1);
        if (string.IsNullOrWhiteSpace(raw))
        {
            return null;
        }

        var cleaned = raw.Trim();
        if (cleaned.StartsWith("```", StringComparison.Ordinal))
        {
            cleaned = CodeFenceRegex.Replace(cleaned, string.Empty).Trim();
        }

        return cleaned;
    }
}
