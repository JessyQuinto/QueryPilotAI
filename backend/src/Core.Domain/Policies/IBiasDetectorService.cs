using System.Collections.Generic;

namespace Core.Domain.Policies;

public interface IBiasDetectorService
{
    List<string> DetectBias(List<Dictionary<string, object?>> rows);
}
