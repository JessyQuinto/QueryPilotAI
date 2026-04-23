namespace Core.Domain.Policies;

public interface ISqlRewriterService
{
    string RewriteSql(string originalSql, string userRole);
}
