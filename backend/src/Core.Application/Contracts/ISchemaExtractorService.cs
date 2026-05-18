using System.Threading.Tasks;

namespace Core.Application.Contracts;

/// <summary>
/// Dynamically extracts the schema (tables, columns, types, keys, relationships)
/// from any user-connected database. The result is a text representation
/// suitable for injecting into an LLM prompt as catalog context.
/// </summary>
public interface ISchemaExtractorService
{
    /// <summary>
    /// Extracts the schema from the user's database and returns it as a structured text
    /// that can be injected into the SQL Planner agent's prompt.
    /// </summary>
    Task<string> ExtractSchemaAsync(DatabaseConfig config);
}
