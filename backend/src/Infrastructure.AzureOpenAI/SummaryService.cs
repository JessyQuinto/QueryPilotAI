using System.Globalization;
using System.Text.Json;

namespace Infrastructure.AzureOpenAI;

public interface ISummaryService
{
    Task<string> SummarizeAsync(string question, string sql, List<Dictionary<string, object?>> rows);
}

public sealed class SummaryService : ISummaryService
{
    private static readonly AzureOpenAiChatClient ChatClient = new();

    public async Task<string> SummarizeAsync(string question, string sql, List<Dictionary<string, object?>> rows)
    {
        if (rows.Count == 0)
        {
            var emptyJson = new
            {
                summary = "No encontré registros que cumplan esa condición en este momento. Si quieres, podemos ajustar la ventana de tiempo o el filtro para ampliar la búsqueda.",
                chart = new { type = "none" }
            };
            return JsonSerializer.Serialize(emptyJson, JsonDefaults.Options);
        }

        var aiSummary = await TrySummarizeWithAiAsync(question, sql, rows);
        if (!string.IsNullOrWhiteSpace(aiSummary))
        {
            return aiSummary;
        }

        var first = rows[0];

        if (first.ContainsKey("merchant_name") && first.ContainsKey("chargeback_rate"))
        {
            var topMerchant = AsString(first, "merchant_name", "N/D");
            var topRate = AsDecimal(first, "chargeback_rate");
            var baseline = AsDecimal(first, "baseline_rate");
            var delta = AsDecimal(first, "delta_factor");

            var trendText = delta.HasValue
                ? $"con una variación de {FormatDecimal(delta)}x frente a su línea base"
                : "sin variación calculable frente a la línea base";

            var json = new
            {
                summary = $"### Análisis Rápido\n\nAnalicé **{rows.Count}** comercios. El principal foco es **{topMerchant}**, con una tasa de contracargos de **{FormatDecimal(topRate)}** y **{trendText}**.\n\n### Recomendación\nVerificar transacciones recientes de este comercio.",
                extendedReport = $"# Análisis Detallado: Riesgo en Comercios\n\nEste reporte proporciona una vista profunda sobre el comercio **{topMerchant}**.\n\n### Observaciones Clave\n- **Tasa de Contracargos:** {FormatDecimal(topRate)}\n- **Línea Base:** {FormatDecimal(baseline)}\n- **Variación:** {trendText}\n\n### Recomendación Estratégica\nSe sugiere mantener en observación preventiva a este comercio, validando la legitimidad de sus últimas operaciones para determinar si el aumento en la tasa responde a un ataque estructurado o estacionalidad.",
                chart = new
                {
                    type = "bar",
                    title = "Tendencia de Comercios",
                    xAxisKey = "merchant_name",
                    yAxisKey = "chargeback_rate"
                }
            };
            return JsonSerializer.Serialize(json, JsonDefaults.Options);
        }

        if (first.ContainsKey("risk_level") && first.ContainsKey("total_chargebacks"))
        {
            var customer = AsString(first, "customer_id", "N/D");
            var riskLevel = AsString(first, "risk_level", "N/D");
            var chargebacks = AsInt(first, "total_chargebacks");
            var alerts = AsInt(first, "total_alerts");

            var json = new
            {
                summary = $"### Análisis de Riesgo Cliente\n\nEncontré **{rows.Count}** perfiles relevantes. El cliente **{customer}** es prioridad (Riesgo: **{riskLevel}**), con **{chargebacks}** contracargos y **{alerts}** alertas.\n\n### Acción Recomendada\nRevisar manualmente este segmento antes de escalar límites transaccionales.",
                extendedReport = $"# Perfilamiento de Riesgo por Cliente\n\nEl sistema ha identificado comportamientos atípicos en **{rows.Count}** clientes, destacando severamente el cliente **{customer}**.\n\n### Métricas del Cliente\n- **Nivel de Riesgo Evaluado:** {riskLevel}\n- **Alertas Totales:** {alerts}\n- **Contracargos Históricos:** {chargebacks}\n\n### Recomendación Operativa\nUn perfil con riesgo '{riskLevel}' y esta cantidad de contracargos requiere intervención inmediata. Congelar subida de límites e iniciar proceso de debida diligencia ampliada.",
                chart = new
                {
                    type = "bar",
                    title = "Riesgo de Clientes",
                    xAxisKey = "customer_id",
                    yAxisKey = "total_chargebacks"
                }
            };
            return JsonSerializer.Serialize(json, JsonDefaults.Options);
        }

        if (first.ContainsKey("fingerprint") && first.ContainsKey("distinct_customers"))
        {
            var fingerprint = AsString(first, "fingerprint", "N/D");
            var customers = AsInt(first, "distinct_customers");
            var risk = AsString(first, "max_risk_level", "N/D");

            var json = new
            {
                summary = $"### Alerta de Abuso Coordinado\n\nDetecté **{rows.Count}** dispositivos compartidos con señal de riesgo. El fingerprint **{fingerprint}** está asociado a **{customers}** clientes y su riesgo máximo es **{risk}**.\n\n### Conclusión\nEste patrón suele indicar abuso coordinado o account sharing.",
                extendedReport = $"# Análisis de Dispositivos y Redes\n\nLa huella digital (fingerprint) cruzada revela un cluster de riesgo.\n\n### Detalles de la Huella\n- **Fingerprint ID:** {fingerprint}\n- **Clientes Únicos Vinculados:** {customers}\n- **Riesgo Máximo en Cluster:** {risk}\n\n### Diagnóstico y Mitigación\nLa superposición de más de múltiples cuentas en un solo dispositivo físico o red de origen ('fingerprint') levanta alertas de robo de cuentas sistemático o granjas de fraude. Validar IP, geolocalización e implementar fricción MFA a los implicados.",
                chart = new
                {
                    type = "none"
                }
            };
            return JsonSerializer.Serialize(json, JsonDefaults.Options);
        }

        if (first.ContainsKey("attempts_count") && first.ContainsKey("customer_id"))
        {
            var customer = AsString(first, "customer_id", "N/D");
            var account = AsString(first, "account_id", "N/D");
            var attempts = AsInt(first, "attempts_count");

            var json = new
            {
                summary = $"### Secuencias Iterativas\n\nIdentifiqué **{rows.Count}** secuencias de intentos fallidos. El cliente **{customer}** (cuenta **{account}**) cuenta con **{attempts}** intentos.\n\n### Impacto\nComportamiento compatible con prueba escalonada de credenciales.",
                extendedReport = $"# Detección de Fricción Baja o Carding\n\nSe han observado patrones continuos de falla y éxito que simulan pruebas de autorización.\n\n### Anomalía Primaria\n- **Cliente:** {customer}\n- **Cuenta Afectada:** {account}\n- **Secuencia de Intentos:** {attempts}\n\n### Mitigación\nBloquear preventivamente el origen de estas pruebas temporalmente e instalar lógicas de rate-limiting (velocity checks) más estrictas para rechazar iteraciones.",
                chart = new
                {
                    type = "none"
                }
            };
            return JsonSerializer.Serialize(json, JsonDefaults.Options);
        }

        var preview = first
            .Where(kv => kv.Value is not null)
            .Take(3)
            .Select(kv => $"{kv.Key}: {kv.Value}")
            .ToArray();

        var previewText = preview.Length == 0 ? "sin métricas clave" : string.Join(", ", preview);

        var fallbackJson = new
        {
            summary = $"### Informe Analítico\n\nProcesé tu consulta y devolví **{rows.Count}** registros. El primer hallazgo muestra: `{previewText}`.\n\n### Nota\nNo se detectó un patrón predefinido de hiper-riesgo, pero los datos han sido extraídos exitosamente.",
            extendedReport = $"# Resumen Extendido de Datos\n\nLa base de datos retornó **{rows.Count}** entidades que cumplen los filtros indicados.\n\n### Exploración Inicial\nUna muestra rápida de los datos arroja los siguientes valores:\n> {previewText}\n\n### Próximos Pasos Recomendados\nSe sugiere realizar cruces adicionales con bases de listas negras (watchlists) o acotar temporalmente la búsqueda para aislar comportamientos anómalos más focalizados.",
            chart = new { type = "none" }
        };
        return JsonSerializer.Serialize(fallbackJson, JsonDefaults.Options);
    }

    private static async Task<string?> TrySummarizeWithAiAsync(string question, string sql, List<Dictionary<string, object?>> rows)
    {
        var sampleRows = rows.Take(25).ToList();
        var rowsJson = JsonSerializer.Serialize(sampleRows);

        var systemPrompt =
            "Eres un analista senior de fraude. Responde generando un JSON válido. No inventes datos ni menciones la base de datos subyacente.\n" +
            "Debe contener:\n" +
            "1. 'summary': Un resumen profesional visual en formato Markdown (usa ### títulos de sección, **negritas** y viñetas). Debe incluir siempre '### Resumen', '### Hallazgos Clave' y '### Recomendación'.\n" +
            "2. 'extendedReport': Un reporte analítico profundo en Markdown para lectura detallada (al menos 3 párrafos y viñetas). Explica contexto, riesgos y planes de acción extendidos.\n" +
            "3. 'chart': La configuracion visual detallada. Sigue estas REGLAS DE DECISION:\n" +
            "   - Usa 'bar' o 'horizontal_bar' para top N de comercios, clientes, canales o ciudades.\n" +
            "   - Usa 'line' para series de tiempo o fechas.\n" +
            "   - Usa 'donut' (o pie) si hay max 5 categorias para mostrar participacion.\n" +
            "   - Usa 'none' si no se debe o no se puede graficar.\n" +
            "Estructura JSON requerida (todo en un solo root JSON):\n" +
            "{\n" +
            "  \"summary\": \"Resumen ejecutivo en Markdown...\",\n" +
            "  \"extendedReport\": \"Reporte largo en Markdown...\",\n" +
            "  \"chart\": {\n" +
            "    \"should_render_chart\": true,\n" +
            "    \"chart_type\": \"bar|line|donut|horizontal_bar|none\",\n" +
            "    \"title\": \"Titulo de la visualización\",\n" +
            "    \"subtitle\": \"Subtítulo descriptivo\",\n" +
            "    \"x_axis\": \"nombre_columna_x\",\n" +
            "    \"y_axis\": \"nombre_columna_y\",\n" +
            "    \"category_field\": \"\",\n" +
            "    \"sort_by\": \"\",\n" +
            "    \"sort_direction\": \"asc|desc\",\n" +
            "    \"formatting\": {\n" +
            "      \"x_label\": \"\",\n" +
            "      \"y_label\": \"\",\n" +
            "      \"value_format\": \"number|currency|percentage\",\n" +
            "      \"show_legend\": true,\n" +
            "      \"show_data_labels\": false\n" +
            "    },\n" +
            "    \"reason\": \"Por qué elegiste esta gráfica\"\n" +
            "  }\n" +
            "}";

        var userPrompt =
            $"Pregunta del usuario: {question}\n" +
            $"Filas devueltas: {rows.Count}\n" +
            $"Muestra JSON (max 25 filas): {rowsJson}\n" +
            "Genera el JSON estructurado respondiendo a la pregunta de manera profesional.";

        var raw = await ChatClient.CompleteAsync(systemPrompt, userPrompt, jsonResponse: true, maxTokens: 1200, temperature: 0.2);
        if (string.IsNullOrWhiteSpace(raw))
        {
            return null;
        }

        raw = raw.Trim();
        if (raw.StartsWith("```json", StringComparison.OrdinalIgnoreCase))
        {
            raw = raw.Substring(7);
        }
        else if (raw.StartsWith("```", StringComparison.OrdinalIgnoreCase))
        {
            raw = raw.Substring(3);
        }

        if (raw.EndsWith("```", StringComparison.OrdinalIgnoreCase))
        {
            raw = raw.Substring(0, raw.Length - 3);
        }

        return raw.Trim();
    }

    private static string AsString(Dictionary<string, object?> row, string key, string fallback)
    {
        if (!row.TryGetValue(key, out var value) || value is null)
        {
            return fallback;
        }

        return Convert.ToString(value, CultureInfo.InvariantCulture) ?? fallback;
    }

    private static decimal? AsDecimal(Dictionary<string, object?> row, string key)
    {
        if (!row.TryGetValue(key, out var value) || value is null)
        {
            return null;
        }

        return value switch
        {
            decimal d => d,
            double db => Convert.ToDecimal(db, CultureInfo.InvariantCulture),
            float f => Convert.ToDecimal(f, CultureInfo.InvariantCulture),
            int i => i,
            long l => l,
            _ when decimal.TryParse(
                Convert.ToString(value, CultureInfo.InvariantCulture),
                NumberStyles.Any,
                CultureInfo.InvariantCulture,
                out var parsed) => parsed,
            _ => null
        };
    }

    private static int AsInt(Dictionary<string, object?> row, string key)
    {
        if (!row.TryGetValue(key, out var value) || value is null)
        {
            return 0;
        }

        return value switch
        {
            int i => i,
            long l => (int)l,
            decimal d => (int)d,
            double db => (int)db,
            _ when int.TryParse(
                Convert.ToString(value, CultureInfo.InvariantCulture),
                NumberStyles.Any,
                CultureInfo.InvariantCulture,
                out var parsed) => parsed,
            _ => 0
        };
    }

    private static string FormatDecimal(decimal? value)
    {
        if (!value.HasValue)
        {
            return "N/D";
        }

        return value.Value.ToString("0.####", CultureInfo.InvariantCulture);
    }
}
