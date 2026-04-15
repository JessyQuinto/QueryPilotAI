namespace Core.Domain.Policies;

public interface ISqlPolicyEngine
{
    SqlValidationResult Validate(string sql);
}
