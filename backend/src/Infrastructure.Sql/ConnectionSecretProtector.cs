using Microsoft.AspNetCore.DataProtection;

namespace Infrastructure.Sql;

public interface IConnectionSecretProtector
{
    string Protect(string plainText);
    string? Unprotect(string? protectedText);
}

public sealed class ConnectionSecretProtector : IConnectionSecretProtector
{
    private const string ProtectedPrefix = "dp:";
    private readonly IDataProtector _dataProtector;

    public ConnectionSecretProtector(IDataProtectionProvider dataProtectionProvider)
    {
        _dataProtector = dataProtectionProvider.CreateProtector("InsightForge.ConnectionSecrets.v1");
    }

    public string Protect(string plainText)
    {
        if (string.IsNullOrWhiteSpace(plainText))
        {
            return plainText;
        }

        if (plainText.StartsWith(ProtectedPrefix, StringComparison.Ordinal))
        {
            return plainText;
        }

        return ProtectedPrefix + _dataProtector.Protect(plainText);
    }

    public string? Unprotect(string? protectedText)
    {
        if (string.IsNullOrWhiteSpace(protectedText))
        {
            return protectedText;
        }

        if (!protectedText.StartsWith(ProtectedPrefix, StringComparison.Ordinal))
        {
            return protectedText;
        }

        return _dataProtector.Unprotect(protectedText[ProtectedPrefix.Length..]);
    }
}