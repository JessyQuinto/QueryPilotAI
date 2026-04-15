# GitHub Copilot Instructions — InsightForge AI

## Contexto del producto
Este repositorio implementa un agente de ingeniería analítica para fraude. La prioridad es seguridad, corrección, explicabilidad y confiabilidad operativa, no velocidad de prototipado sin controles.

## Principios obligatorios
1. Nunca generar código que ejecute SQL arbitrario enviado por el frontend.
2. Toda consulta debe pasar por:
   - parsing de intención,
   - generación de SQL restringido,
   - validación de política,
   - decisión de aprobación,
   - ejecución controlada.
3. Favorecer arquitectura limpia, objetos tipados, DTOs claros y logs estructurados.
4. Todo componente debe ser observable y testeable.
5. Priorizar código explícito sobre magia implícita.

## Backend (.NET)
- Usar .NET 8 y Azure Functions Isolated Worker.
- Separar en capas:
  - Domain
  - Application
  - Infrastructure
  - Functions
- Preferir `record` para contratos inmutables.
- Usar `CancellationToken`.
- Inyectar dependencias mediante DI.
- Modelar errores con resultados tipados y mensajes auditables.
- No capturar excepciones para ocultarlas; registrar contexto y traducirlas a errores controlados.

## Reglas de SQL y seguridad
- Solo permitir `SELECT`.
- Prohibir múltiples sentencias.
- Validar tablas/vistas contra allowlist.
- Aplicar límites de filas cuando corresponda.
- Nunca interpolar texto directo del usuario en SQL.
- Usar parámetros siempre que sea posible.
- Mantener un `SqlPolicyEngine`.

## Frontend (Next.js)
- TypeScript estricto.
- Componentes pequeños y orientados a dominio.
- Separar UI, hooks, clients y schemas.
- Mostrar siempre el estado de validación, riesgo y aprobación.
- No ocultar advertencias operativas al usuario.

## Prompts y LLM
- Separar prompts por responsabilidad:
  - intent parsing
  - SQL generation
  - summarization
- Forzar salida estructurada JSON cuando aplique.
- No pedir al modelo que decida políticas de seguridad finales; esas decisiones son del backend.

## Testing
- Crear pruebas para:
  - prompts felices,
  - prompts ambiguos,
  - abuso/jailbreak,
  - SQL inválido,
  - approval flow.
- Añadir casos de regresión cuando aparezcan fallos.

## Estilo
- Nombres claros y consistentes.
- Métodos pequeños.
- Comentarios solo cuando agreguen contexto.
- No introducir dependencias innecesarias.
