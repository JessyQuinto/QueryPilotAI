using Core.Domain.Policies;
using System;
using System.Collections.Generic;
using System.Linq;

namespace Infrastructure.Security;

public class BiasDetectorService : IBiasDetectorService
{
    private readonly string[] _sensitiveColumns = { "gender", "race", "ethnicity", "agegroup", "sex", "genero", "raza" };

    public List<string> DetectBias(List<Dictionary<string, object?>> rows)
    {
        var warnings = new List<string>();

        if (rows == null || rows.Count == 0)
            return warnings;

        // Find if any row has sensitive columns
        var sampleRow = rows.FirstOrDefault();
        if (sampleRow == null) return warnings;

        var detectedColumns = sampleRow.Keys
            .Where(k => _sensitiveColumns.Any(sc => k.Contains(sc, StringComparison.OrdinalIgnoreCase)))
            .ToList();

        foreach (var col in detectedColumns)
        {
            var frequencies = new Dictionary<string, int>(StringComparer.OrdinalIgnoreCase);
            
            foreach (var row in rows)
            {
                if (row.TryGetValue(col, out var val) && val != null)
                {
                    var valStr = val.ToString() ?? "Unknown";
                    if (!frequencies.ContainsKey(valStr)) frequencies[valStr] = 0;
                    frequencies[valStr]++;
                }
            }

            if (frequencies.Count > 1)
            {
                var total = frequencies.Values.Sum();
                var maxFreq = frequencies.Values.Max();
                var minFreq = frequencies.Values.Min();

                // If disparity > 20%
                var disparity = (double)(maxFreq - minFreq) / total;
                if (disparity > 0.20)
                {
                    var maxCategory = frequencies.First(x => x.Value == maxFreq).Key;
                    warnings.Add($"[ALERTA DE EQUIDAD] Los resultados muestran una disparidad demográfica significativa (>20%) en la dimensión '{col}'. El grupo '{maxCategory}' está sobrerrepresentado.");
                }
            }
        }

        return warnings;
    }
}
