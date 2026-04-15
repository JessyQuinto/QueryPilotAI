using Core.Application.Contracts;
using Microsoft.Data.SqlClient;

namespace Infrastructure.Sql;

/// <summary>
/// Centralizes the construction of SQL connection strings from a DatabaseConfig.
/// Used by SqlExecutionService, SchemaExtractorService, and ConnectionFunctions
/// to avoid code duplication and subtle inconsistencies.
/// </summary>
public static class ConnectionStringBuilder
{
    /// <summary>
    /// Builds a SqlConnection connection string from a DatabaseConfig.
    /// Supports Azure SQL with SQL Auth, Active Directory Password, and Active Directory Default.
    /// </summary>
    public static string Build(DatabaseConfig config, int timeoutSeconds = 30)
    {
        if (config == null || string.IsNullOrWhiteSpace(config.Host))
            throw new ArgumentException("Host is required to build a connection string.");

        if (string.IsNullOrWhiteSpace(config.Database))
            throw new ArgumentException("Database name is required to build a connection string.");

        var portPart = string.IsNullOrWhiteSpace(config.Port) ? "" : $",{config.Port}";

        var builder = new SqlConnectionStringBuilder
        {
            DataSource = $"{config.Host}{portPart}",
            InitialCatalog = config.Database,
            Encrypt = true,
            TrustServerCertificate = true,
            ConnectTimeout = timeoutSeconds
        };

        var isAzureAdPassword = string.Equals(config.AuthType, "AzureAD", StringComparison.OrdinalIgnoreCase);
        var isAzureAdToken = string.Equals(config.AuthType, "AzureADToken", StringComparison.OrdinalIgnoreCase);

        if (isAzureAdToken)
        {
            builder.Authentication = SqlAuthenticationMethod.NotSpecified;
        }
        else if (isAzureAdPassword)
        {
            if (!string.IsNullOrWhiteSpace(config.Username) && !string.IsNullOrWhiteSpace(config.Password))
            {
                builder.UserID = config.Username;
                builder.Password = config.Password;
                builder.Authentication = SqlAuthenticationMethod.ActiveDirectoryPassword;
            }
            else
            {
                builder.Authentication = SqlAuthenticationMethod.ActiveDirectoryDefault;
            }
        }
        else if (!string.IsNullOrWhiteSpace(config.Username))
        {
            // SQL Authentication
            builder.UserID = config.Username;
            builder.Password = config.Password;
        }
        else
        {
            // No credentials → try Active Directory Default
            builder.Authentication = SqlAuthenticationMethod.ActiveDirectoryDefault;
        }

        return builder.ConnectionString;
    }

    /// <summary>
    /// Builds a connection string from a UserConnectionRecord (used for test connections and frontend operations).
    /// If a decryptPassword function is provided, the password will be decrypted before use.
    /// </summary>
    public static string BuildFromUserConnection(
        UserConnectionRecord record,
        Func<string, string>? decryptPassword = null)
    {
        var password = record.EncryptedPassword;
        if (decryptPassword != null && !string.IsNullOrEmpty(password))
        {
            try
            {
                password = decryptPassword(password);
            }
            catch
            {
                // If decryption fails, it might be a legacy plain-text password.
                // Use as-is for backward compatibility during migration.
            }
        }

        var config = new DatabaseConfig(
            Type: record.DbType,
            Host: record.Host,
            Port: record.Port ?? "",
            Database: record.DatabaseName,
            Username: record.Username ?? "",
            Password: password ?? "",
            AuthType: record.AuthType);

        return Build(config);
    }
}
