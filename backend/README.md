# Backend

Azure Functions Isolated Worker (.NET 8) con Durable Functions y componentes desacoplados para:
- intake de preguntas,
- orquestación del flujo,
- seguridad,
- generación y validación de SQL,
- ejecución,
- resumen,
- auditoría.

## Proyectos
- `Functions.Api`: endpoints HTTP.
- `Core.Domain`: contratos y reglas de negocio.
- `Core.Application`: casos de uso y orquestación lógica.
- `Infrastructure.AzureOpenAI`: clientes y prompts.
- `Infrastructure.Sql`: repositorios y ejecución SQL.
- `Infrastructure.Security`: policy engine y safety adapters.
- `Infrastructure.Observability`: métricas, traces y logging.
