namespace Core.Application.Contracts;

public interface IConnectionSecretProtector
{
    string Protect(string plainText);
    string? Unprotect(string? protectedText);
}
