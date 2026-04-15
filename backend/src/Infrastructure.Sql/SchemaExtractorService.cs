using Core.Application.Contracts;
using Microsoft.Data.SqlClient;
using System.Text;
using System.Text.Json;

namespace Infrastructure.Sql;

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

public sealed class SchemaExtractorService : ISchemaExtractorService
{
    public async Task<string> ExtractSchemaAsync(DatabaseConfig config)
    {
        await using var connection = SqlConnectionFactory.Create(config);
        await connection.OpenAsync();

        var sb = new StringBuilder();
        sb.AppendLine("=== DATABASE SCHEMA CATALOG ===");
        sb.AppendLine($"Server: {config.Host}");
        sb.AppendLine($"Database: {config.Database}");
        sb.AppendLine();

        // 1. Extract tables and views
        await AppendTablesAndViewsAsync(connection, sb);

        // 2. Extract columns with types
        await AppendColumnsAsync(connection, sb);

        // 3. Extract primary keys
        await AppendPrimaryKeysAsync(connection, sb);

        // 4. Extract foreign keys (relationships)
        await AppendForeignKeysAsync(connection, sb);

        // 5. Extract indexes (for performance context)
        await AppendIndexesAsync(connection, sb);

        return sb.ToString();
    }

    private static async Task AppendTablesAndViewsAsync(SqlConnection connection, StringBuilder sb)
    {
        const string sql = @"
SELECT TABLE_SCHEMA, TABLE_NAME, TABLE_TYPE
FROM INFORMATION_SCHEMA.TABLES
WHERE TABLE_SCHEMA NOT IN ('sys', 'INFORMATION_SCHEMA')
ORDER BY TABLE_TYPE, TABLE_SCHEMA, TABLE_NAME";

        sb.AppendLine("--- TABLES AND VIEWS ---");
        await using var cmd = new SqlCommand(sql, connection);
        await using var reader = await cmd.ExecuteReaderAsync();
        while (await reader.ReadAsync())
        {
            var schema = reader.GetString(0);
            var table = reader.GetString(1);
            var type = reader.GetString(2) == "VIEW" ? "[VIEW]" : "[TABLE]";
            sb.AppendLine($"  {type} {schema}.{table}");
        }
        sb.AppendLine();
    }

    private static async Task AppendColumnsAsync(SqlConnection connection, StringBuilder sb)
    {
        const string sql = @"
SELECT 
    c.TABLE_SCHEMA, c.TABLE_NAME, c.COLUMN_NAME, c.DATA_TYPE, 
    c.CHARACTER_MAXIMUM_LENGTH, c.IS_NULLABLE, c.COLUMN_DEFAULT
FROM INFORMATION_SCHEMA.COLUMNS c
INNER JOIN INFORMATION_SCHEMA.TABLES t 
    ON c.TABLE_SCHEMA = t.TABLE_SCHEMA AND c.TABLE_NAME = t.TABLE_NAME
WHERE c.TABLE_SCHEMA NOT IN ('sys', 'INFORMATION_SCHEMA')
ORDER BY c.TABLE_SCHEMA, c.TABLE_NAME, c.ORDINAL_POSITION";

        sb.AppendLine("--- COLUMNS ---");
        string lastTable = string.Empty;
        await using var cmd = new SqlCommand(sql, connection);
        await using var reader = await cmd.ExecuteReaderAsync();
        while (await reader.ReadAsync())
        {
            var schema = reader.GetString(0);
            var table = reader.GetString(1);
            var fullTable = $"{schema}.{table}";
            var column = reader.GetString(2);
            var dataType = reader.GetString(3);
            var maxLen = reader.IsDBNull(4) ? null : reader.GetValue(4)?.ToString();
            var nullable = reader.GetString(5) == "YES" ? "NULL" : "NOT NULL";

            if (fullTable != lastTable)
            {
                sb.AppendLine();
                sb.AppendLine($"  {fullTable}:");
                lastTable = fullTable;
            }

            var typeStr = maxLen != null && maxLen != "-1" ? $"{dataType}({maxLen})" : dataType;
            sb.AppendLine($"    - {column} : {typeStr} {nullable}");
        }
        sb.AppendLine();
    }

    private static async Task AppendPrimaryKeysAsync(SqlConnection connection, StringBuilder sb)
    {
        const string sql = @"
SELECT 
    kcu.TABLE_SCHEMA, kcu.TABLE_NAME, kcu.COLUMN_NAME, tc.CONSTRAINT_NAME
FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS tc
INNER JOIN INFORMATION_SCHEMA.KEY_COLUMN_USAGE kcu
    ON tc.CONSTRAINT_NAME = kcu.CONSTRAINT_NAME AND tc.TABLE_SCHEMA = kcu.TABLE_SCHEMA
WHERE tc.CONSTRAINT_TYPE = 'PRIMARY KEY'
    AND tc.TABLE_SCHEMA NOT IN ('sys', 'INFORMATION_SCHEMA')
ORDER BY kcu.TABLE_SCHEMA, kcu.TABLE_NAME, kcu.ORDINAL_POSITION";

        sb.AppendLine("--- PRIMARY KEYS ---");
        await using var cmd = new SqlCommand(sql, connection);
        await using var reader = await cmd.ExecuteReaderAsync();
        while (await reader.ReadAsync())
        {
            sb.AppendLine($"  {reader.GetString(0)}.{reader.GetString(1)} -> PK({reader.GetString(2)})");
        }
        sb.AppendLine();
    }

    private static async Task AppendForeignKeysAsync(SqlConnection connection, StringBuilder sb)
    {
        const string sql = @"
SELECT 
    fk.name AS fk_name,
    SCHEMA_NAME(tp.schema_id) AS parent_schema,
    tp.name AS parent_table,
    cp.name AS parent_column,
    SCHEMA_NAME(tr.schema_id) AS referenced_schema,
    tr.name AS referenced_table,
    cr.name AS referenced_column
FROM sys.foreign_keys fk
INNER JOIN sys.foreign_key_columns fkc ON fk.object_id = fkc.constraint_object_id
INNER JOIN sys.tables tp ON fkc.parent_object_id = tp.object_id
INNER JOIN sys.columns cp ON fkc.parent_object_id = cp.object_id AND fkc.parent_column_id = cp.column_id
INNER JOIN sys.tables tr ON fkc.referenced_object_id = tr.object_id
INNER JOIN sys.columns cr ON fkc.referenced_object_id = cr.object_id AND fkc.referenced_column_id = cr.column_id
ORDER BY parent_schema, parent_table";

        sb.AppendLine("--- FOREIGN KEYS (RELATIONSHIPS) ---");
        await using var cmd = new SqlCommand(sql, connection);
        await using var reader = await cmd.ExecuteReaderAsync();
        while (await reader.ReadAsync())
        {
            var parentSchema = reader.GetString(1);
            var parentTable = reader.GetString(2);
            var parentCol = reader.GetString(3);
            var refSchema = reader.GetString(4);
            var refTable = reader.GetString(5);
            var refCol = reader.GetString(6);
            sb.AppendLine($"  {parentSchema}.{parentTable}.{parentCol} -> {refSchema}.{refTable}.{refCol}");
        }
        sb.AppendLine();
    }

    private static async Task AppendIndexesAsync(SqlConnection connection, StringBuilder sb)
    {
        const string sql = @"
SELECT TOP 50
    SCHEMA_NAME(t.schema_id) AS table_schema,
    t.name AS table_name,
    i.name AS index_name,
    i.type_desc,
    STRING_AGG(c.name, ', ') WITHIN GROUP (ORDER BY ic.key_ordinal) AS columns
FROM sys.indexes i
INNER JOIN sys.index_columns ic ON i.object_id = ic.object_id AND i.index_id = ic.index_id
INNER JOIN sys.columns c ON ic.object_id = c.object_id AND ic.column_id = c.column_id
INNER JOIN sys.tables t ON i.object_id = t.object_id
WHERE i.name IS NOT NULL AND SCHEMA_NAME(t.schema_id) NOT IN ('sys')
GROUP BY SCHEMA_NAME(t.schema_id), t.name, i.name, i.type_desc
ORDER BY table_schema, table_name, index_name";

        sb.AppendLine("--- KEY INDEXES ---");
        await using var cmd = new SqlCommand(sql, connection);
        await using var reader = await cmd.ExecuteReaderAsync();
        while (await reader.ReadAsync())
        {
            sb.AppendLine($"  {reader.GetString(0)}.{reader.GetString(1)} [{reader.GetString(3)}] -> ({reader.GetString(4)})");
        }
    }
}
