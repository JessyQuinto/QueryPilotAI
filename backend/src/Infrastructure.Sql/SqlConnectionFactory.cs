using Core.Application.Contracts;
using Microsoft.Data.SqlClient;

namespace Infrastructure.Sql;

public static class SqlConnectionFactory
{
    public static SqlConnection Create(DatabaseConfig config, int timeoutSeconds = 30)
    {
        if (config == null)
        {
            throw new ArgumentNullException(nameof(config));
        }

        if (string.Equals(config.AuthType, "AzureADToken", StringComparison.OrdinalIgnoreCase))
        {
            if (string.IsNullOrWhiteSpace(config.Password))
            {
                throw new InvalidOperationException("AzureADToken authentication requires an access token.");
            }

            var builder = new SqlConnectionStringBuilder
            {
                DataSource = string.IsNullOrWhiteSpace(config.Port) ? config.Host : $"{config.Host},{config.Port}",
                InitialCatalog = config.Database,
                Encrypt = true,
                TrustServerCertificate = true,
                ConnectTimeout = timeoutSeconds
            };

            return new SqlConnection(builder.ConnectionString)
            {
                AccessToken = config.Password
            };
        }

        return new SqlConnection(ConnectionStringBuilder.Build(config, timeoutSeconds));
    }
}
